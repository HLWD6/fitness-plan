"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), P = require("../src/training.js");
const config = (x = {}) => ({ ...P.defaults("2026-01-01"), ...x });
test("卧推两轮使用指定组次和不同估算极限", () => {
 const c=config(), p=P.plan(c), b=p.filter(x=>x.type==='chest');
 assert.equal(p.length,40); assert.deepEqual(b.map(x=>x.day),[1,5,9,13,17,21,25,29,33,37]);
 assert.deepEqual(b.map(x=>`${x.sets}×${x.reps}`),['4×10','5×8','6×6','8×4','10×2','4×9','5×7','6×5','8×3','15×1']);
 assert.deepEqual(b.map(x=>x.weight),[110,115,120,127.5,132.5,120,125,132.5,140,145]);
 assert.ok(b.every(x=>x.targetRpe===7.5));
 assert.deepEqual(c.benchWeights,P.seedBench(160,170,2.5,20));
});
test("每四天胸背腿休、腿A/B交替并沿用120kg默认",()=>{
 const p=P.plan(config()); assert.deepEqual(p.slice(0,8).map(x=>x.type),['chest','back','legs','rest','chest','back','legs','rest']);
 const legs=p.filter(x=>x.type==='legs'); assert.deepEqual(legs.map(x=>x.legVariant),['A','B','A','B','A','B','A','B','A','B']); assert.ok(legs.every(x=>x.weight===120));
});
test("两轮估算极限、配片变化和新周期增重",()=>{
 const c=config({tm:170,tm2:170,benchWeights:P.seedBench(170,170,2.5,20)}); assert.equal(P.plan(c)[0].weight,117.5);
 const next={...c,cycleOffset:5}; assert.deepEqual(P.plan(next).filter(x=>x.type==='chest').map(x=>x.weight),P.plan(c).filter(x=>x.type==='chest').map(x=>x.weight+5));
 assert.match(P.validate(config({tm2:0})),/估算极限/); assert.match(P.validate(config({benchIncrease:3})),/整数倍/); assert.match(P.validate(config({rounds:3})),/两轮/);
});
test("延期和暂停顺延日期；休息日不必打卡",()=>{
 const c=config(), rows=P.plan(c,{1:{date:'2026-01-04'}},{},[{day:2,date:'2026-01-06'}]); assert.equal(rows[0].date,'2026-01-04');assert.equal(rows[1].date,'2026-01-06');assert.equal(rows[2].date,'2026-01-07');
 assert.equal(P.nextWorkout(P.plan(c),{1:{},2:{},3:{}}).day,5);
});
