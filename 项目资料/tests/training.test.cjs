"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), P = require("../src/training.js");
const config = (x = {}) => ({ ...P.defaults("2026-01-01"), ...x });
test("四种卧推依次轮换，计划只规定动作和组次", () => {
 const p=P.plan(config()), b=p.filter(x=>x.type==='chest');
 assert.equal(p.length,16); assert.deepEqual(b.map(x=>x.day),[1,5,9,13]);
 assert.deepEqual(b.map(x=>`${x.sets}×${x.reps}`),['5×8','5×5','5×3','5×8']);
 assert.deepEqual(b.map(x=>x.benchDayName),['容量日','控制稳定日','赛推专项日','减载日']);
 assert.ok(b.every(x=>x.weight===null));
});
test("胸背腿休四天节奏，腿日交替深蹲和保加利亚分腿蹲",()=>{
 const p=P.plan(config()); assert.deepEqual(p.slice(0,8).map(x=>x.type),['chest','back','legs','rest','chest','back','legs','rest']);
 const legs=p.filter(x=>x.type==='legs'); assert.deepEqual(legs.map(x=>x.legVariant),['A','B','A','B']);
 assert.deepEqual(legs.map(x=>x.name),['杠铃深蹲','保加利亚分腿蹲','杠铃深蹲','保加利亚分腿蹲']);
 assert.deepEqual(legs.map(x=>`${x.sets}×${x.reps}`),['5×5','3×8–10/腿','5×5','3×8–10/腿']);
 assert.ok(legs.every(x=>x.weight===null));
});
test("周期开始日期和天数边界",()=>{
 assert.equal(P.validate(config()),''); assert.match(P.validate(config({startDate:'bad'})),/有效的开始日期/);
 assert.match(P.validate(config({entryDay:17})),/最后一个训练日/);
});
test("延期和暂停顺延日期；休息日不必打卡",()=>{
 const c=config(), rows=P.plan(c,{1:{date:'2026-01-04'}},{},[{day:2,date:'2026-01-06'}]); assert.equal(rows[0].date,'2026-01-04');assert.equal(rows[1].date,'2026-01-06');assert.equal(rows[2].date,'2026-01-07');
 assert.equal(P.nextWorkout(P.plan(c),{1:{},2:{},3:{}}).day,5);
});
