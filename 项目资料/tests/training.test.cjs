"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), P = require("../src/training.js");
const config = (x = {}) => ({ ...P.defaults("2026-01-01"), ...x });
test("四种卧推依次轮换并按160kg参考极限配重", () => {
 const c=config(), p=P.plan(c), b=p.filter(x=>x.type==='chest');
 assert.equal(p.length,16); assert.deepEqual(b.map(x=>x.day),[1,5,9,13]);
 assert.deepEqual(b.map(x=>`${x.sets}×${x.reps}`),['5×8','5×5','5×3','5×8']);
 assert.deepEqual(b.map(x=>x.benchDayName),['容量日','控制稳定日','赛推专项日','减载日']);
 assert.deepEqual(b.map(x=>x.weight),[110,120,130,87.5]);
 assert.deepEqual(b.map(x=>x.targetRpe),[7.5,7.5,7.5,6]);
 assert.deepEqual(c.benchWeights,P.seedBench(160,2.5,20));
});
test("胸背腿休四天节奏、腿A/B交替和默认120kg",()=>{
 const p=P.plan(config()); assert.deepEqual(p.slice(0,8).map(x=>x.type),['chest','back','legs','rest','chest','back','legs','rest']);
 const legs=p.filter(x=>x.type==='legs'); assert.deepEqual(legs.map(x=>x.legVariant),['A','B','A','B']); assert.ok(legs.every(x=>x.weight===120));
});
test("参考极限、配片、周期加重和日期边界",()=>{
 const c=config({tm:165,benchWeights:P.seedBench(165,2.5,20)}); assert.equal(P.plan(c)[0].weight,115);
 assert.deepEqual(P.plan({...c,benchWeights:P.seedBench(167.5,2.5,20)}).filter(x=>x.type==='chest').map(x=>x.weight),[115,125,137.5,90]);
 assert.match(P.validate(config({tm:0})),/估算极限/); assert.match(P.validate(config({benchIncrease:3})),/整数倍/); assert.match(P.validate(config({entryDay:17})),/最后一个训练日/);
});
test("延期和暂停顺延日期；休息日不必打卡",()=>{
 const c=config(), rows=P.plan(c,{1:{date:'2026-01-04'}},{},[{day:2,date:'2026-01-06'}]); assert.equal(rows[0].date,'2026-01-04');assert.equal(rows[1].date,'2026-01-06');assert.equal(rows[2].date,'2026-01-07');
 assert.equal(P.nextWorkout(P.plan(c),{1:{},2:{},3:{}}).day,5);
});
