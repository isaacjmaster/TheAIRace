export type Strategy = 'balanced' | 'speed' | 'accuracy';
export type Check = 'review_uncertain' | 'privacy_filter';
export interface AgentPlan { strategy: Strategy; checks: Check[]; needsClarification: boolean; explanation: string }
export interface Allocation { execution: number; verification: number }
export interface Contract { id: string; title: string; description: string; baseReward: number; difficulty: number; privacyRequired: boolean }
export interface ContractResult { id: string; contractId: string; title: string; quality: number; credits: number; durationSeconds: number; explanation: string[] }
export interface ActiveJob { id: string; contractId: string; startedAt: number; completesAt: number; plan: AgentPlan; allocation: Allocation }
export interface GameState { version: 1; revision: number; companyName: string; credits: number; hardwareLevel: number; completedContracts: number; activeJob: ActiveJob | null; lastResult: ContractResult | null; claimedJobIds: string[] }
export interface Hardware { level: number; name: string; cost: number; capacity: number; description: string }
export interface Projection { quality: number; credits: number; durationSeconds: number; explanation: string[] }
export type PlayerCommand = { type: 'rename'; name: string } | { type: 'start'; contractId: string; plan: AgentPlan; allocation: Allocation } | { type: 'claim' } | { type: 'upgrade' };
export interface Bootstrap { state: GameState; contracts: Contract[]; hardware: Hardware[]; mode: 'demo' | 'live'; onboarding?: Onboarding }
export interface InterpretRequest { instruction: string; contractId: string }
export interface InterpretResponse { plan: AgentPlan; mode: 'demo' | 'live' }
export interface CommandRequest { command: PlayerCommand; revision: number; requestId: string }
export interface ApiError { error: string }
export interface Onboarding { isNewPlayer: boolean; storySeen: boolean; tutorial: 'available' | 'active' | 'dismissed' | 'complete' }

