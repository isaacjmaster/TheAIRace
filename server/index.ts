import express from 'express';
import {backupBeforeIdentityMigration} from './identity-backup.js';
import { registerFoundation } from './foundation-api.js';
import { registerProgression } from './progression-api.js';
import { registerRaids } from './raid-api.js';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { CONTRACTS, HARDWARE, createInitialState, applyCommand } from '../src/game/index.js';
import type { GameState } from '../shared/contracts.js';
import { demoInterpret, liveConfig, liveInterpret, planSchema } from './interpreter.js';
import { registerExpeditions, readExpedition } from './expedition-api.js';

const production = process.env.NODE_ENV === 'production';
const databasePath = process.env.GAME_DB_PATH || 'data/integrated-game.sqlite';
if (production && (!process.env.GAME_DB_PATH || !isAbsolute(databasePath))) {
  throw new Error('Production requires GAME_DB_PATH to be an absolute path on a persistent volume.');
}
if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true });
if (production && !existsSync(resolve('dist/index.html'))) throw new Error('Build the frontend with npm run build before production startup.');
process.env.AI_MODE = 'demo'; process.env.AI_LIVE_ENABLED = 'false';
const db = new DatabaseSync(databasePath);
if(production)backupBeforeIdentityMigration(db);
export function closeDatabase() { db.close(); }
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS commands (session TEXT NOT NULL, id TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(session,id)); CREATE TABLE IF NOT EXISTS usage (day TEXT PRIMARY KEY, requests INTEGER NOT NULL);');
db.exec("CREATE TABLE IF NOT EXISTS onboarding (session TEXT PRIMARY KEY, storySeen INTEGER NOT NULL DEFAULT 0, tutorial TEXT NOT NULL DEFAULT 'available')");
export const app = express();
app.disable('x-powered-by');
// Railway terminates HTTPS at its single edge proxy; use its client address for rate limits.
if(production)app.set('trust proxy',1);
app.get('/healthz', (_req, res) => {
  try { db.prepare('SELECT 1').get(); res.status(200).json({status:'ok'}); }
  catch { res.status(503).json({status:'unavailable'}); }
});
app.use(express.json({ limit: '4kb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== req.headers.host) { res.status(403).json({ error: 'Request origin does not match this game.' }); return; } }
      catch { res.status(403).json({ error: 'Invalid request origin.' }); return; }
    }
    if (!req.is('application/json')) { res.status(400).json({ error: 'Send a JSON request.' }); return; }
  }
  next();
});
const previewOptions=production?{}:{cookieName:process.env.GAME_SESSION_COOKIE,legacyPaths:process.env.GAME_LEGACY_DB_PATHS?JSON.parse(process.env.GAME_LEGACY_DB_PATHS):[]};
registerFoundation(app,db,previewOptions);
function session(req: express.Request, res: express.Response): { id: string; state: GameState } {
  const candidate = /(?:^|;\s*)airace_integrated_session=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  const row = candidate ? db.prepare('SELECT state FROM sessions WHERE id=?').get(candidate) : undefined;
  if (row) return { id: candidate!, state: JSON.parse(row.state as string) };
  const id = randomUUID();
  const state = createInitialState();
  db.prepare('INSERT INTO sessions(id,state) VALUES (?,?)').run(id, JSON.stringify(state));
  db.prepare('INSERT INTO onboarding(session) VALUES (?)').run(id);
  res.cookie('airace_integrated_session', id, { httpOnly: true, sameSite: 'strict', secure: req.secure || production, maxAge: 365 * 86400000, path: '/' });
  return { id, state };
}
registerExpeditions(app, db, session);
registerRaids(app, db, session);
registerProgression(app, db, session);
function onboarding(id: string) {
  const row = db.prepare('SELECT storySeen,tutorial FROM onboarding WHERE session=?').get(id);
  return row ? { isNewPlayer: true, storySeen: !!row.storySeen, tutorial: row.tutorial } : { isNewPlayer: false, storySeen: true, tutorial: 'dismissed' };
}
app.get('/api/game', (req, res) => { const player = session(req, res); res.json({ state: player.state, contracts: CONTRACTS, hardware: HARDWARE, mode: liveConfig() ? 'live' : 'demo', onboarding: onboarding(player.id), expedition: readExpedition(db, player.id), serverTime: Date.now() }); });
app.post('/api/onboarding', (req, res) => {
  const parsed = z.object({ storySeen: z.literal(true).optional(), tutorial: z.enum(['active','dismissed','complete']).optional() }).strict().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid onboarding update.' }); return; }
  const player = session(req, res);
  const before = onboarding(player.id);
  if (!before.isNewPlayer) { res.json({ onboarding: before }); return; }
  if (parsed.data.tutorial === 'complete' && player.state.hardwareLevel < 1) { res.status(400).json({ error: 'Install your first hardware upgrade to complete the tutorial.' }); return; }
  const tutorial = before.tutorial === 'complete' ? 'complete' : parsed.data.tutorial || before.tutorial;
  db.prepare('UPDATE onboarding SET storySeen=?,tutorial=? WHERE session=?').run(before.storySeen || parsed.data.storySeen ? 1 : 0, tutorial as string, player.id);
  res.json({ onboarding: onboarding(player.id) });
});
const commandSchema = z.object({ requestId: z.string().uuid(), revision: z.number().int().min(0), command: z.discriminatedUnion('type', [
  z.object({ type: z.literal('rename'), name: z.string().min(1).max(32) }).strict(),
  z.object({ type: z.literal('start'), contractId: z.string().max(60), plan: planSchema, allocation: z.object({ execution: z.number().int().min(0).max(100), verification: z.number().int().min(0).max(100) }).strict() }).strict(),
  z.object({ type: z.literal('agent-upgrade') }).strict(), z.object({ type: z.literal('claim') }).strict(), z.object({ type: z.literal('upgrade') }).strict(),
]) }).strict();
app.post('/api/command', (req, res) => {
  const parsed = commandSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid game command.' }); return; }
  const { id } = session(req, res);
  const input = parsed.data;
  db.exec('BEGIN IMMEDIATE');
  try {
    const cached = db.prepare('SELECT response FROM commands WHERE session=? AND id=?').get(id, input.requestId);
    if (cached) { db.exec('COMMIT'); res.json(JSON.parse(cached.response as string)); return; }
    const row = db.prepare('SELECT state FROM sessions WHERE id=?').get(id)!;
    const state: GameState = JSON.parse(row.state as string);
    if (input.revision !== state.revision) { db.exec('ROLLBACK'); res.status(409).json({ error: 'Your company changed. Refresh and try again.' }); return; }
    if (input.command.type === 'start' && readExpedition(db, id).run) throw new Error('Pixel is exploring. Return to HQ before starting a contract.');
    if(state.campus && (input.command.type==='upgrade'||input.command.type==='agent-upgrade')) throw new Error('Use the timed building upgrade in your campus.');
    const next = applyCommand(state, input.command, Date.now());
    const response = JSON.stringify({ state: next });
    db.prepare('UPDATE sessions SET state=? WHERE id=?').run(JSON.stringify(next), id);
    db.prepare('INSERT INTO commands(session,id,response) VALUES (?,?,?)').run(id, input.requestId, response);
    db.exec('COMMIT');
    res.json({ state: next });
  } catch (error) { db.exec('ROLLBACK'); res.status(400).json({ error: error instanceof Error ? error.message : 'Command could not be completed.' }); }
});
const rates = new Map<string, number[]>();
const interpretations = new Map<string, { expires: number; response: unknown }>();
const pending = new Set<string>();
app.post('/api/interpret', async (req, res) => {
  const input = z.object({ instruction: z.string().trim().min(3).max(500), contractId: z.string().max(60) }).strict().safeParse(req.body);
  if (!input.success || !CONTRACTS.some(c => c.id === input.data.contractId)) { res.status(400).json({ error: 'Choose a contract and enter an instruction of 3–500 characters.' }); return; }
  const { id } = session(req, res);
  const now = Date.now();
  for (const [key, value] of interpretations) if (value.expires < now) interpretations.delete(key);
  const mode = liveConfig() ? 'live' : 'demo';
  const key = JSON.stringify([id, mode, input.data]);
  const cached = interpretations.get(key);
  if (cached) { res.json(cached.response); return; }
  const times = (rates.get(id) || []).filter(t => t > now - 60000);
  if (times.length >= 8 || pending.has(id)) { res.status(429).json({ error: 'Agent is busy. Wait a moment before asking again.' }); return; }
  times.push(now); rates.set(id, times);
  // Bound memory even if many anonymous sessions are opened.
  if (rates.size > 2000) for (const [sid, entries] of rates) if (!entries.some(t => t > now - 60000)) rates.delete(sid);
  if (rates.size > 10000 || interpretations.size > 10000) { res.status(429).json({ error: 'The garage is busy. Try again shortly.' }); return; }
  pending.add(id);
  try {
    const config = liveConfig();
    if (config) {
      const day = new Date().toISOString().slice(0, 10);
      const reservation = db.prepare('INSERT INTO usage(day,requests) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET requests=requests+1 WHERE requests < ? RETURNING requests').get(day, config.limit);
      if (!reservation) { res.status(429).json({ error: 'Daily AI request limit reached. Switch the server to demo mode or try another day.' }); return; }
    }
    const plan = config ? await liveInterpret(input.data.instruction) : demoInterpret(input.data.instruction);
    const response = { plan, mode };
    interpretations.set(key, { expires: now + 300000, response });
    res.json(response);
  } catch { res.status(503).json({ error: 'AI interpretation unavailable. No game resources were spent. Retry, or restart the server in demo mode.' }); }
  finally { pending.delete(id); }
});
const dist = resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => { if (req.path.startsWith('/api/')) res.status(404).json({ error: 'Unknown API route.' }); else res.sendFile(resolve(dist, 'index.html')); });
}
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(400).json({ error: 'Invalid or oversized request.' }); });
export function start() { return app.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => console.log(`The AI Race: http://localhost:${Number(process.env.PORT) || 3001} (${liveConfig() ? 'live' : 'demo'} AI)`)); }
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) start();

