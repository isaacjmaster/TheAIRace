# Railway deployment — The AI Race

Prepared for a first deployment; Railway has NOT been deployed or linked. Connecting this repository to Railway may immediately trigger deployment. Wait for owner approval before creating/linking a service or deploying.

## Source and commands

- Private GitHub repository: https://github.com/isaacjmaster/TheAIRace
- Deploy branch: `codex/railway-deploy`
- Integrated development branch: `codex/ai-race-integrated`
- GPU Rig baseline: `2fd57c626b3ef55973244c9ee8ad2842b169a84f`
- Runtime: Node.js 24 (required for built-in `node:sqlite`).
- Install/build: `npm ci --include=dev` then `npm run build`.
- Start: `npm start`.
- Validation: `npm test`, `npm run build`, `npm run test:production`.

Railway uses the checked-in two-stage Dockerfile and railway.json. The build stage includes TypeScript/Vite; the runtime installs only production dependencies, including tsx for the TypeScript server. Express serves dist and same-origin /api routes. No Vite dev server or separate frontend service is needed. The server binds 0.0.0.0 on Railway's assigned PORT. Do not hard-code PORT in Railway variables. /healthz checks database availability without creating player sessions. Production refuses startup without a built frontend and an explicit absolute database path.

## Persistent storage — required before the first deployment

Use ONE service instance and ONE persistent volume:

| Setting | Value |
| --- | --- |
| Volume mount path | `/app/data` |
| `GAME_DB_PATH` | `/app/data/integrated-game.sqlite` |
| `NODE_ENV` | `production` (also set by Dockerfile) |
| Health check | `/healthz` |

Do not use replicas or multiple services against this SQLite file. Keep the whole database directory on the volume, including SQLite WAL/SHM companion files. An absolute path alone does not provide persistence: the matching Railway volume must actually be attached. Files outside a volume are ephemeral across deployments. Configure Railway volume backups after deployment approval. Volume-backed deployments may have brief downtime.

Official references: https://docs.railway.com/volumes and https://docs.railway.com/deployments/healthchecks

## Steps after explicit deployment approval

1. Create/link the Railway service to this private repository and select codex/railway-deploy; avoid an automatic first deployment before the volume and variables are ready.
2. Attach the volume at /app/data and set GAME_DB_PATH above. Keep one replica. No AI API key is required: this integrated prototype forces demo mode and disables live AI calls.
3. Use the checked-in Dockerfile/configuration. Deploy only after all settings are ready.
4. Generate/use an HTTPS domain. Production cookies are Secure, HttpOnly and SameSite=Strict. Do not test production player sessions over plain HTTP.
5. Check /healthz, title, landscape HQ, portrait gate, build preview, purchase, construction, collection, move and 1/1 purchase limit.
6. Reload, then restart/redeploy using the same volume. Verify the same browser still has its rig, stored Compute, balance and duplicate-action protection.

## Saves and local-progress preservation

Foundation progress lives in foundation_saves; foundation_actions records idempotent rig actions. The airace_foundation_session browser cookie selects the save. There are no accounts, cloud login or cross-device recovery. Clearing cookies or changing the hostname creates a different session. Use one stable public hostname.

The original local data/integrated-game.sqlite and backups remain local and ignored by Git and Docker. No save data is uploaded by pushing source. Railway starts with new saves unless a separate, approved migration is performed. Moving the SQLite file alone does not transfer a browser's localhost/LAN cookie to the new domain. A migration needs both a consistent database backup and a deliberate session recovery/mapping plan; do not put cookies into repository files or logs. Never copy only an actively written SQLite main file; use SQLite backup/VACUUM INTO or stop the writer before taking a complete backup.

Reset Progress affects the active foundation only. The one-rig limit includes construction; reset generations reject delayed pre-reset actions. The production smoke test uses a disposable temporary database and confirms a rig survives server restart; it does not open the original local save.

## Safety and verification

No .env files, SQLite files, cookies or credentials belong in Git. .env.example contains only blank placeholders and local defaults. .gitignore excludes local saves, backups, credentials, session dumps and Railway local configuration. Docker uses explicit source COPY instructions and a matching .dockerignore.

Before the first push, the 206 blobs reachable from the GPU Rig baseline were checked for private filenames, common credential tokens, private keys and assigned secrets. The only pattern matches were the test-only-not-a-real-key fixture in two historical versions of server/backend.test.ts; no real secrets or private database files were found. Only the deployment branch is pushed; unrelated local branches/worktrees are not published or changed. Existing ancestor history is preserved without rewriting.

Validation on Windows / Node 24: 124 tests pass; TypeScript/Vite production build passes; production smoke passes (frontend/assets/API, assigned port, secure cookie, nested SQLite path, persisted GPU ownership/balance across restart and duplicate purchase rejection). The Docker image itself still needs a Docker-capable build environment; Docker is not installed on this workstation. No Railway deployment has been attempted.
