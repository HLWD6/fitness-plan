"use strict";
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/fitness-plan-tools/node_modules/playwright');
const P=require('../src/training.js'),root=path.resolve(__dirname,'../..'),url=pathToFileURL(path.join(root,'index.html')).href;
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
 const c={...P.defaults(P.addDays(P.today(),-30))},ds=P.plan(c),records={};
 for(const d of ds){if(d.type!=='rest')records[d.day]={day:d.day,date:d.date,plan:d,result:'done',actualWeight:null,actual:'',notes:''};}
 const fullCycle=await b.newContext();await fullCycle.addInitScript(x=>localStorage.setItem('fitness-cycle-v15',JSON.stringify(x)),{version:15,config:c,records,attempts:[],archives:[],drafts:{}});
 const done=await fullCycle.newPage();await done.goto(url);assert.equal(await done.locator('#cycleFinish').isVisible(),true);assert.equal(await done.locator('#nextStart').inputValue(),P.addDays(ds.at(-1).date,6));
 await done.locator('#nextCycleForm button[type=submit]').click();let state=await done.evaluate(()=>JSON.parse(localStorage.getItem('fitness-cycle-v15')));assert.equal(state.config.startDate,P.addDays(ds.at(-1).date,6));assert.equal(state.archives.length,1);assert.equal(Object.keys(state.records).length,0);await fullCycle.close();
 const oldConfig={tm:160,tm2:170,increment:2.5,barWeight:20,benchWeights:[110,115,120,127.5,132.5,120,125,132.5,140,145],benchIncrease:5,cycleOffset:0,squatStart:120,squatIncrease:0,rounds:2,entryDay:1,startDate:P.addDays(P.today(),-10)};
 const previous={version:14,config:oldConfig,records:{1:{day:1,date:oldConfig.startDate,plan:{name:'卧推',weight:120,sets:5,reps:'8'},result:'done',actual:'历史训练',notes:''}},attempts:[],archives:[],drafts:{},squatOverrides:{}};
 const migrated=await b.newContext();await migrated.addInitScript(x=>localStorage.setItem('fitness-cycle-v14',JSON.stringify(x)),previous);const page=await migrated.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 const fresh=await page.evaluate(()=>JSON.parse(localStorage.getItem('fitness-cycle-v15')));assert.equal(fresh.config.startDate,P.today());assert.equal(fresh.records[1].actualWeight,120);assert.equal(fresh.records[1].actual,'5×8');assert.equal(fresh.archives.length,1);assert.deepEqual(fresh.archives[0].records,previous.records);
 assert.match(await page.locator('#sessionCard').innerText(),/引体向上/);
 await page.locator('[data-day="1"]').click();assert.match(await page.locator('#sessionCard').innerText(),/实重 120 kg/);assert.match(await page.locator('#sessionCard').innerText(),/参考约 120 kg/);assert.match(await page.locator('#sessionCard').innerText(),/5 × 8/);
 for(const [day,name,weight] of [[1,'快速卧推',120],[5,'胸前停顿卧推',135],[9,'比赛式卧推',150],[13,'无腿驱动卧推',100]]){await page.locator(`[data-day="${day}"]`).click();const text=await page.locator('#sessionCard').innerText();assert.match(text,new RegExp(name));assert.match(text,new RegExp(`参考约 ${weight} kg`));}
 await page.locator('[data-day="7"]').click();assert.match(await page.locator('#sessionCard').innerText(),/保加利亚分腿蹲/);
 assert.deepEqual(errors,[]);await migrated.close();await b.close();console.log('16天训练节奏、实重记录、腿部交替和周期归档正常。');})().catch(e=>{console.error(e);process.exit(1)});
