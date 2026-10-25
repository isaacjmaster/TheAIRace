import assert from 'node:assert/strict';
import test from 'node:test';
import {wallReplacementAvailable} from '../src/ui/wallReplacement';

test('replacement action belongs only to unobstructed own-campus arrangement',()=>{
 const update={version:1 as const,acknowledged:true,pending:true,replacementCount:100};
 const ownArrangement={ownCampus:true,arranging:true,blocked:false};
 assert.equal(wallReplacementAvailable(update,ownArrangement),true);
 // Infiltration, scouting, visits, replays and loading all leave own-campus context.
 for(const arranging of [true,false])for(const blocked of [true,false])assert.equal(wallReplacementAvailable(update,{ownCampus:false,arranging,blocked}),false);
 assert.equal(wallReplacementAvailable(update,{...ownArrangement,arranging:false}),false);
 assert.equal(wallReplacementAvailable(update,{...ownArrangement,blocked:true}),false);
 assert.equal(wallReplacementAvailable({...update,acknowledged:false},ownArrangement),false);
 assert.deepEqual(update,{version:1,acknowledged:true,pending:true,replacementCount:100});
});

test('completed or absent wall replacement does not resurface',()=>{
 const context={ownCampus:true,arranging:true,blocked:false};
 assert.equal(wallReplacementAvailable(undefined,context),false);
 assert.equal(wallReplacementAvailable({version:1,acknowledged:true},context),false);
 assert.equal(wallReplacementAvailable({version:1,acknowledged:true,pending:false,replacementCount:0},context),false);
});
