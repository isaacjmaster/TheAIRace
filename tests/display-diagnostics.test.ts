import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bottomGap,displayMode} from '../src/ui/displayDiagnostics';
test('diagnostics distinguish a short root from a canvas gap without treating overfill as missing content',()=>{
 assert.equal(bottomGap(844,810),34);assert.equal(bottomGap(810,810),0);assert.equal(bottomGap(810,844),0);
});
test('standalone detection accepts either iOS or display-mode signal',()=>{
 assert.equal(displayMode(true,false),'standalone');assert.equal(displayMode(false,true),'standalone');assert.equal(displayMode(false,false),'browser');
});

import config from '../vite.config';
test('dedicated and legacy diagnostics HTML opens independently of game entry, development only',()=>{
 const plugin=(config.plugins as any[]).find(p=>p.name==='local-display-diagnostics');
 assert.equal(plugin.apply,'serve');
 const html='<link rel="manifest" href="/manifest.webmanifest"><div id="root"></div>';
 for(const path of ['/display-diagnostics?v=2','/display-diagnostics/','/diagnostics']){
  const result=plugin.transformIndexHtml(html,{originalUrl:path,path});
  assert.match(result,/diagnostic-boot/);assert.match(result,/installDisplayDiagnostics\(true\)/);assert.match(result,/module could not start/);assert.match(result,/href="\/diagnostics.webmanifest"/);
 }
 assert.equal(plugin.transformIndexHtml(html,{path:'/'}),html);
});
