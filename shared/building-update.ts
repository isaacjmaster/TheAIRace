import type {FoundationState} from './foundation';
export function prepareBuildingUpdate(s:FoundationState){if(s.buildingUpdate)return false;
 const count=s.walls?.length??0;
 for(const w of s.walls??[])w.legacy=true;
 s.buildingUpdate={version:1,acknowledged:false,...(count>100?{pending:true,replacementCount:100}:{})};return true;
}
export function replacementLayout(s:FoundationState):FoundationState{
 if(!s.buildingUpdate?.pending)return s;
 if(s.wallRebuild&&!s.wallRebuild.completed)return {...s,walls:structuredClone([...(s.walls??[]),...s.wallRebuild.inventory]).map(w=>({...w,legacy:undefined}))};
 return {...s,walls:Array.from({length:100},(_,i)=>({id:'replacement-wall-'+i,position:[.5,.5] as [number,number],orientation:0 as const}))};
}
