/** Deterministic heist simulation. Inputs are intentions; paths, clocks and loot are server-owned. */
export type Vec = [
    number,
    number
];
export type Tool = 'probe' | 'jammer';
export type Asset = {
    id: string;
    kind: 'hq' | 'gpu' | 'lab' | 'terminal';
    name: string;
    position: Vec;
    size: Vec;
    access?: Vec;
    hackSeconds?: number;
    compute: number;
    research: number;
    intel?: boolean;
};
export type Defense = {
    id: string;
    route: Vec[];
    radius: number;
    patrolSpeed: number;
    pursuitSpeed: number;
    warningSeconds: number;
};
export type TargetSnapshot = {
    version: 1;
    id: string;
    name: string;
    difficulty: string;
    entry: Vec;
    exit: Vec;
    assets: Asset[];
    defenses: Defense[];
    influence: number;
};
export const INFILTRATION = { stepMs: 100, operationMs: 180000, agentSpeed: 2.8, captureRadius: .65, jammerMs: 6000, jammerRange: 7, probeMs: 12000, cooldownMs: 7200000, awards: [25, 50] } as const;
const common: Asset[] = [{ id: 'hq', kind: 'hq', name: 'Founder HQ', position: [-1, -3], size: [7, 6], compute: 0, research: 0 }, { id: 'gpu', kind: 'gpu', name: 'Compute cache', position: [-6, 1], size: [4, 3], access: [-6, 3.2], hackSeconds: 3, compute: 20, research: 0 }, { id: 'lab', kind: 'lab', name: 'Research Lab', position: [6, 1], size: [3.8, 2.8], access: [6, 3.3], hackSeconds: 5, compute: 0, research: 12 }, { id: 'terminal', kind: 'terminal', name: 'Core terminal', position: [7, -5], size: [1.6, 1.4], access: [7, -3.5], hackSeconds: 7, compute: 10, research: 8, intel: true }];
export const INFILTRATION_TARGETS: TargetSnapshot[] = [{ version: 1, id: 'lumen-labs', name: 'Lumen Labs', difficulty: 'Startup', entry: [-10, 6], exit: [-10, 6], assets: common, defenses: [{ id: 'sentinel-1', route: [[0, 2], [4, 4], [8, 3], [8, -1]], radius: 3.1, patrolSpeed: 1.1, pursuitSpeed: 2, warningSeconds: 2.2 }], influence: 25 }, { version: 1, id: 'vector-works', name: 'Vector Works', difficulty: 'Established', entry: [-10, 6], exit: [-10, 6], assets: common.map(a => ({ ...a, position: a.id === 'gpu' ? [-6, -1] : a.id === 'lab' ? [6, -1] : a.id === 'terminal' ? [7, -6] : a.position, access: a.id === 'gpu' ? [-6, 1.2] : a.id === 'lab' ? [6, 1.3] : a.id === 'terminal' ? [7, -4.5] : a.access, hackSeconds: a.hackSeconds ? a.hackSeconds + 1 : undefined, compute: a.compute * 2, research: a.research * 2 })), defenses: [{ id: 'sentinel-1', route: [[-4, 3], [1, 4], [5, 3], [1, 2]], radius: 3.3, patrolSpeed: 1.2, pursuitSpeed: 2.2, warningSeconds: 2 }, { id: 'sentinel-2', route: [[6, 4], [9, 1], [9, -5], [5, -6]], radius: 3.2, patrolSpeed: 1.1, pursuitSpeed: 2.1, warningSeconds: 2 }], influence: 50 }];
export type DroneState = {
    id: string;
    position: Vec;
    segment: number;
    alert: number;
    lost: number;
    mode: 'patrol' | 'warning' | 'pursuit' | 'jammed';
    jammedUntil: number;
};
export type InfiltrationEvent = {
    at: number;
    type: string;
    detail?: string;
};
export type Operation = {
    version: 1;
    id: string;
    target: TargetSnapshot;
    tool: Tool;
    toolUsed: boolean;
    probeUntil: number;
    createdAt: number;
    startedAt?: number;
    lastTick: number;
    finishedAt?: number;
    status: 'ready' | 'active' | 'extracted' | 'caught' | 'abandoned' | 'timeout';
    agent: {
        position: Vec;
        path: Vec[];
        mode: 'idle' | 'moving' | 'hacking' | 'extracting';
        target?: string;
        hack: number;
        yaw: number;
    };
    drones: DroneState[];
    hacked: string[];
    carried: {
        compute: number;
        research: number;
        intel: boolean;
    };
    events: InfiltrationEvent[];
    orders?: {
        at: number;
        intent: InfiltrationCommand;
    }[];
    settlement?: {
        compute: number;
        research: number;
        influence: number;
        eligibleAt: number;
        pendingCompute: number;
        pendingResearch: number;
    };
};
export type InfiltrationCommand = {
    action: 'deploy';
} | {
    action: 'move';
    position: Vec;
} | {
    action: 'hack';
    assetId: string;
} | {
    action: 'tool';
} | {
    action: 'extract';
} | {
    action: 'abandon';
};
const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const event = (o: Operation, type: string, detail?: string) => { if (o.events.length < 256)
    o.events.push({ at: o.lastTick, type, detail }); };
export function newOperation(id: string, targetId: string, tool: Tool, now: number): Operation { const target = INFILTRATION_TARGETS.find(t => t.id === targetId); if (!target)
    throw new Error('Choose an available company.'); return operationFromSnapshot(id, target, tool, now); }
export function operationFromSnapshot(id: string, target: TargetSnapshot, tool: Tool, now: number): Operation { return { version: 1, id, target: structuredClone(target), tool, toolUsed: false, probeUntil: 0, createdAt: now, lastTick: now, status: 'ready', orders: [], agent: { position: [...target.entry], path: [], mode: 'idle', hack: 0, yaw: 0 }, drones: target.defenses.map(d => ({ id: d.id, position: [...d.route[0]], segment: 1, alert: 0, lost: 0, mode: 'patrol', jammedUntil: 0 })), hacked: [], carried: { compute: 0, research: 0, intel: false }, events: [{ at: now, type: 'prepared' }] }; }
export function navigable(t: TargetSnapshot, p: Vec) { return p.every(Number.isFinite) && Math.abs(p[0]) <= 11.5 && Math.abs(p[1]) <= 7.5 && !t.assets.some(a => Math.abs(p[0] - a.position[0]) < a.size[0] / 2 + .3 && Math.abs(p[1] - a.position[1]) < a.size[1] / 2 + .3); }
/** Small bounded half-unit grid, deterministic and reusable by future target snapshots. */
export function infiltrationPath(t: TargetSnapshot, from: Vec, to: Vec): Vec[] { if (!navigable(t, to))
    return []; const snap = (p: Vec) => p.map(v => Math.round(v * 2)) as Vec, start = snap(from), end = snap(to), key = (p: Vec) => p.join(','), queue: Vec[] = [start], prev = new Map<string, string | null>([[key(start), null]]); for (let i = 0; i < queue.length && !prev.has(key(end)); i++)
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const q: Vec = [queue[i][0] + dx, queue[i][1] + dz], k = key(q);
        if (prev.has(k) || !navigable(t, [q[0] / 2, q[1] / 2]))
            continue;
        prev.set(k, key(queue[i]));
        queue.push(q);
    } if (!prev.has(key(end)))
    return []; const path: Vec[] = []; for (let k: string | null = key(end); k; k = prev.get(k) ?? null)
    path.unshift(k.split(',').map(v => Number(v) / 2) as Vec); path.push([...to]); return path; }
function finish(o: Operation, status: Operation['status']) { o.status = status; o.finishedAt = o.lastTick; o.agent.path = []; o.agent.mode = 'idle'; if (status !== 'extracted')
    o.carried = { compute: 0, research: 0, intel: false }; event(o, status); }
function walk(p: Vec, path: Vec[], budget: number) { const old: [
    number,
    number
] = [...p]; while (path.length && budget > 0) {
    const q = path[0], d = distance(p, q);
    if (d <= budget) {
        p[0] = q[0];
        p[1] = q[1];
        path.shift();
        budget -= d;
    }
    else {
        p[0] += (q[0] - p[0]) * budget / d;
        p[1] += (q[1] - p[1]) * budget / d;
        break;
    }
} return distance(old, p); }
export function advanceOperation(o: Operation, now: number) {
    if (o.status !== 'active')
        return;
    const end = Math.min(now, o.startedAt! + INFILTRATION.operationMs);
    while (o.status === 'active' && o.lastTick + INFILTRATION.stepMs <= end) {
        o.lastTick += INFILTRATION.stepMs;
        const dt = INFILTRATION.stepMs / 1000, a = o.agent, previous: Vec = [...a.position];
        walk(a.position, a.path, INFILTRATION.agentSpeed * dt);
        if (distance(previous, a.position) > .001)
            a.yaw = Math.atan2(a.position[0] - previous[0], a.position[1] - previous[1]);
        if (!a.path.length) {
            if (a.mode === 'extracting' && distance(a.position, o.target.exit) < 1.2) {
                finish(o, 'extracted');
                break;
            }
            if (a.target) {
                const asset = o.target.assets.find(x => x.id === a.target)!;
                if (asset.access && distance(a.position, asset.access) < .6) {
                    a.mode = 'hacking';
                    a.hack += dt;
                    if (a.hack + 1e-6 >= asset.hackSeconds!) {
                        o.hacked.push(asset.id);
                        o.carried.compute += asset.compute;
                        o.carried.research += asset.research;
                        o.carried.intel ||= !!asset.intel;
                        event(o, 'hacked', asset.id);
                        a.target = undefined;
                        a.hack = 0;
                        a.mode = 'idle';
                    }
                }
            }
            else
                a.mode = 'idle';
        }
        for (const d of o.drones) {
            const cfg = o.target.defenses.find(x => x.id === d.id)!;
            if (o.lastTick < d.jammedUntil) {
                d.mode = 'jammed';
                d.alert = 0;
                continue;
            }
            const near = distance(d.position, a.position) <= cfg.radius;
            if (near) {
                d.alert = Math.min(cfg.warningSeconds, d.alert + dt);
                d.lost = 0;
            }
            else {
                d.lost += dt;
                if (d.lost > 3)
                    d.alert = Math.max(0, d.alert - dt * 2);
            }
            const oldMode = d.mode;
            d.mode = d.alert >= cfg.warningSeconds ? 'pursuit' : d.alert > 0 ? 'warning' : 'patrol';
            if (d.mode === 'warning' && oldMode === 'patrol')
                event(o, 'detected', d.id);
            if (d.mode === 'pursuit') {
                const path = infiltrationPath(o.target, d.position, a.position);
                walk(d.position, path, cfg.pursuitSpeed * dt);
                if (distance(d.position, a.position) < INFILTRATION.captureRadius) {
                    finish(o, 'caught');
                    break;
                }
            }
            else if (d.mode === 'patrol') {
                const q = cfg.route[d.segment];
                walk(d.position, [[...q]], cfg.patrolSpeed * dt);
                if (distance(d.position, q) < .05)
                    d.segment = (d.segment + 1) % cfg.route.length;
            }
        }
    }
    if (o.status === 'active' && now >= o.startedAt! + INFILTRATION.operationMs) {
        o.lastTick = o.startedAt! + INFILTRATION.operationMs;
        finish(o, 'timeout');
    }
}
export function commandOperation(o: Operation, c: InfiltrationCommand, now: number) {
    advanceOperation(o, now);
    const record = () => { (o.orders ??= []).push({ at: now, intent: structuredClone(c) }); };
    if ((o.orders?.length ?? 0) >= 256 && c.action !== 'extract' && c.action !== 'abandon')
        throw new Error('Order limit reached. Extract or abandon this operation.');
    if (c.action === 'deploy') {
        if (o.status !== 'ready')
            throw new Error('Agent already deployed.');
        o.status = 'active';
        o.startedAt = now;
        o.lastTick = now;
        event(o, 'deployed');
        record();
        return;
    }
    if (c.action === 'abandon') {
        if (o.status === 'ready' || o.status === 'active') {
            finish(o, 'abandoned');
            record();
        }
        else
            throw new Error('This operation has ended.');
        return;
    }
    if (o.status !== 'active')
        throw new Error('Deploy the agent first, or return to HQ.');
    if (c.action === 'tool') {
        if (o.toolUsed)
            throw new Error('Tool already used.');
        if (o.tool === 'probe') {
            o.probeUntil = o.lastTick + INFILTRATION.probeMs;
        }
        else {
            const nearest = [...o.drones].sort((a, b) => distance(a.position, o.agent.position) - distance(b.position, o.agent.position))[0];
            if (!nearest || distance(nearest.position, o.agent.position) > INFILTRATION.jammerRange)
                throw new Error('Move within jammer range of a drone.');
            nearest.jammedUntil = o.lastTick + INFILTRATION.jammerMs;
            nearest.mode = 'jammed';
            nearest.alert = 0;
        }
        o.toolUsed = true;
        event(o, 'tool', o.tool);
        record();
        return;
    }
    if (c.action === 'hack' && o.agent.target === c.assetId && (o.agent.mode === 'moving' || o.agent.mode === 'hacking')) return;
    const asset = c.action === 'hack' ? o.target.assets.find(a => a.id === c.assetId && a.access) : undefined;
    if (c.action === 'hack' && (!asset || o.hacked.includes(asset.id)))
        throw new Error('Choose an unhacked technology asset.');
    const to = c.action === 'extract' ? o.target.exit : c.action === 'move' ? c.position : asset!.access!;
    const path = infiltrationPath(o.target, o.agent.position, to);
    if (!path.length)
        throw new Error('Choose reachable open ground.');
    o.agent.path = path;
    o.agent.target = asset?.id;
    o.agent.hack = 0;
    o.agent.mode = c.action === 'extract' ? 'extracting' : 'moving';
    event(o, c.action, asset?.id ?? to.join(','));
    record();
}
