import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestLandscape} from '../src/ui/mobile';
test('orientation lock is optional and permission failures never prevent play',async()=>{
 await requestLandscape();await requestLandscape({});
 await requestLandscape({lock:async()=>{throw new Error('NotSupportedError');}});
 let requested='';await requestLandscape({lock:async(value:string)=>{requested=value;}});
 assert.equal(requested,'landscape');
});

