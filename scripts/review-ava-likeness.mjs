import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/socce/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/check.cjs')('playwright');
const stage=process.argv[2]||'before',out=`output/Wall_Ava/ava-${stage}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),evidence=[];
try{for(const [name,width,height] of [['phone',390,844],['small-phone',375,667],['desktop',1440,900]]){
 const context=await browser.newContext({viewport:{width,height}});
 try{const page=await context.newPage();for(const pose of ['fresh','thinking','research','encourage']){
 await page.goto(`http://127.0.0.1:3067/simple-preview/${pose}?testAudio=off`);await page.waitForTimeout(3000);const play=page.getByRole('button',{name:/^Play/i});if(await play.count())await play.click();
 const art=page.locator('.ava-character');await art.waitFor({timeout:25000});await art.evaluate(n=>n.decode());await page.waitForTimeout(700);
 evidence.push({name,pose,art:await art.boundingBox(),bubble:await page.locator('.ava-copy').boundingBox(),style:await art.evaluate(n=>{const s=getComputedStyle(n);return {position:s.position,transform:s.transform,objectFit:s.objectFit,zIndex:s.zIndex};})});
 await page.screenshot({path:`${out}/${name}-${pose}.png`});
 }}finally{await context.close();}
}}finally{await browser.close();}
writeFileSync(`${out}/measurements.json`,JSON.stringify(evidence,null,2));console.log(`${stage}: ${evidence.length} Ava views captured`);
