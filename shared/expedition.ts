export type Resource = 'scrap' | 'gpu' | 'cells';
export interface Resources { scrap: number; gpu: number; cells: number }
export interface Point { x: number; y: number }
export interface Deposit { id: string; name: string; resource: Resource; position: Point; amount: number; charges: number; requiredRig: number }
export interface ExpeditionWorld { width: number; height: number; dock: Point; blocked: Point[]; hazards: Point[]; charger: Point; deposits: Deposit[] }
export interface ExpeditionRun { id: string; position: Point; energy: number; cargo: Resources; remaining: Record<string,number>; readyAt: number; lastPath: Point[]; recharged: boolean; operation?: import('./operation').Operation }
export interface ExpeditionResult { resources: Resources; evacuated: boolean; message: string }
export interface ExpeditionState { version: 1; revision: number; resources: Resources; rigLevel: number; completedRuns: number; run: ExpeditionRun|null; lastResult: ExpeditionResult|null }
export type ExpeditionCommand = {type:'depart'} | {type:'move';to:Point} | {type:'gather';depositId:string} | {type:'recharge'} | {type:'return'} | {type:'evacuate'} | {type:'upgrade'} | import('./operation').OperationCommand;
export interface ExpeditionRequest { command: ExpeditionCommand; revision:number; requestId:string }
