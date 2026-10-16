/** Shared spatial contract: simulation, deployment and rendering use these bounds. */
export const MAP = {
  width: 27, height: 19, center: { x: 13, y: 9 },
  walls: { left: 7, right: 19, top: 5, bottom: 13 },
  deployment: { minX: .5, maxX: 25.5, minY: .5, maxY: 17.5, innerLeft: 5.7, innerRight: 20.3, innerTop: 3.7, innerBottom: 14.3 },
} as const;
export const LEVELS = [
  { name: 'Vault Gate', level: 1, gate: 9, core: { x: 13, y: 9 }, vault: { x: 9, y: 7 }, turret: { x: 17, y: 11 } },
  { name: 'Crossfire', level: 1, gate: 17, core: { x: 13, y: 9 }, vault: { x: 17, y: 7 }, turret: { x: 9, y: 11 } },
] as const;
