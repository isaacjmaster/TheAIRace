import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bottomGap,displayMode} from '../src/ui/displayDiagnostics';
test('diagnostics distinguish a short root from a canvas gap without treating overfill as missing content',()=>{
 assert.equal(bottomGap(844,810),34);assert.equal(bottomGap(810,810),0);assert.equal(bottomGap(810,844),0);
});
test('standalone detection accepts either iOS or display-mode signal',()=>{
 assert.equal(displayMode(true,false),'standalone');assert.equal(displayMode(false,true),'standalone');assert.equal(displayMode(false,false),'browser');
});
