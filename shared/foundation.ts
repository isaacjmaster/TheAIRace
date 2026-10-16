export const STARTING_COMPUTE = 100;
export const COMPUTE_CAPACITY = 1000;
export type FoundationState = {version:1;revision:number;companyName:string;level:1;compute:number;capacity:number;builders:1};
export function initialFoundation(revision=0):FoundationState{return {version:1,revision,companyName:'Garage Intelligence',level:1,compute:STARTING_COMPUTE,capacity:COMPUTE_CAPACITY,builders:1};}
