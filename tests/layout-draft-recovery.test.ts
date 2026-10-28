import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverLayoutDraft,wallAdvance} from '../src/ui/layoutDraftRecovery';
import {layoutFingerprint} from '../shared/layout-draft';
import {initialFoundation} from '../shared/foundation';
test('rapid wall placement follows cardinal manual movement without skipping',()=>{
 assert.deepEqual(wallAdvance([0,0],[2,1],[1,0]),[1,0]);
 assert.deepEqual(wallAdvance([0,0],[0,-2],[1,0]),[0,-1]);
 assert.deepEqual(wallAdvance([1,1],[1,1],[0,1]),[0,1]);
});
test('draft recovery rejects stale ownership, malformed data and foreign item IDs',()=>{
 const s=initialFoundation(1000),d={version:1,expected:layoutFingerprint(s),placed:[],position:[.5,.5],orientation:0};
 assert.ok(recoverLayoutDraft(s,JSON.stringify(d)));
 assert.equal(recoverLayoutDraft(s,'broken'),null);
 assert.equal(recoverLayoutDraft(s,JSON.stringify({...d,expected:'other-account'})),null);
 assert.equal(recoverLayoutDraft(s,JSON.stringify({...d,placed:[{id:'foreign-wall',position:[.5,.5],orientation:0}]})),null);
 assert.equal(recoverLayoutDraft(s,JSON.stringify({...d,position:[0]})),null);
});

