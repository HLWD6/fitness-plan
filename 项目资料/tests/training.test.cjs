"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/training.js");
const config = (overrides = {}) => ({ ...P.defaults("2026-01-01"), entryDay: 1, ...overrides });

test("默认从今天第9天第三次卧推开始，不伪造过去记录或腿日重量", () => {
  const c = P.defaults("2026-01-01"), plan = P.plan(c);
  assert.equal(c.entryDay, 9);
  assert.equal(P.nextWorkout(plan, {}).day, 9);
  assert.equal(plan[8].date, "2026-01-01");
  assert.equal(plan[0].date, "2025-12-24");
  assert.equal(plan[0].beforeStart, true);
  assert.equal(plan[2].weight, null);
  assert.equal(plan[6].weight, null);
  assert.equal(plan[8].weight, 137.5);
  assert.equal(plan[10].weight, 120);
  assert.equal(plan[14].weight, 125);
});

test("四天胸背腿休，四组组成16天，最多三轮共48天", () => {
  const plan = P.plan(config());
  assert.equal(plan.length, 48);
  assert.deepEqual(plan.slice(0, 8).map((d) => d.type), ["chest", "back", "legs", "rest", "chest", "back", "legs", "rest"]);
  assert.deepEqual(plan.filter((d) => d.type === "chest").slice(0, 4).map((d) => d.day), [1, 5, 9, 13]);
  assert.deepEqual(plan.filter((d) => d.type === "back").slice(0, 4).map((d) => d.day), [2, 6, 10, 14]);
  assert.deepEqual(plan.filter((d) => d.type === "legs").slice(0, 4).map((d) => d.day), [3, 7, 11, 15]);
  assert.deepEqual(plan.filter((d) => d.type === "rest").slice(0, 4).map((d) => d.day), [4, 8, 12, 16]);
  assert.equal(plan.filter((d) => d.type !== "rest").length, 36);
});

test("第一轮使用指定的四个重量，每个16天循环四项均加5kg", () => {
  const bench = P.plan(config()).filter((d) => d.type === "chest");
  assert.deepEqual(bench.slice(0, 4).map((d) => [d.sets, d.reps, d.weight]), [[4, "9", 122.5], [5, "7", 130], [6, "5", 137.5], [8, "3", 145]]);
  assert.deepEqual(bench.slice(4, 8).map((d) => d.weight), [127.5, 135, 142.5, 150]);
  assert.deepEqual(bench.slice(8).map((d) => d.weight), [132.5, 140, 147.5, 155]);
  assert.deepEqual(bench.slice(0, 4).map((d) => d.referenceRatio), [.7, .75, .8, .85]);
});

test("深蹲每次增加5kg，腿部A/B辅助跨轮持续交替", () => {
  const legs = P.plan(config()).filter((d) => d.type === "legs");
  assert.deepEqual(legs.map((d) => d.weight), [120,125,130,135,140,145,150,155,160,165,170,175]);
  assert.deepEqual(legs.map((d) => d.legVariant), ["A","B","A","B","A","B","A","B","A","B","A","B"]);
  assert.ok(legs.every((d) => d.sets === 5 && d.reps === "5"));
});

test("调整某次深蹲后，从该重量继续递增，先前安排不变", () => {
  const legs = P.plan(config(), {}, { 7: 115, 19: 130 }).filter((d) => d.type === "legs");
  assert.deepEqual(legs.slice(0, 7).map((d) => d.weight), [120, 115, 120, 125, 130, 135, 140]);
});

test("支持输入不同档距、杆重、加重和1–3轮，拒绝无法配出的重量", () => {
  assert.equal(P.validate(config()), "");
  const c = config({ increment: 1.25, benchIncrease: 5, squatIncrease: 2.5, rounds: 2 });
  assert.equal(P.validate(c), "");
  assert.equal(P.plan(c).length, 32);
  assert.equal(P.plan(c)[0].weight, 122.5);
  assert.equal(P.seedBench(167.5, 1.25, 20)[0], 116.25);
  assert.match(P.validate(config({ increment: 5 })), /卧推重量/);
  assert.match(P.validate(config({ squatStart: 121 })), /深蹲起点/);
  assert.match(P.validate(config({ rounds: 4 })), /1–3/);
  assert.equal(P.validate(config({ benchIncrease: 0, squatIncrease: 0, rounds: 1 })), "");
});

test("训练晚到后整体顺延，已记录日期保留；跨月和闰日计算正确", () => {
  const c = config({ startDate: "2028-02-27", rounds: 1 });
  const records = { 1: { date: "2028-02-29" }, 2: { date: "2028-03-02" } };
  const plan = P.plan(c, records);
  assert.equal(plan[0].date, "2028-02-29");
  assert.equal(plan[1].date, "2028-03-02");
  assert.equal(plan[2].date, "2028-03-03");
  assert.equal(plan[3].date, "2028-03-04");
  assert.equal(P.validDate("2028-02-29"), true);
  assert.equal(P.validDate("2027-02-29"), false);
});

test("暂停发生在计划日期之后时，重试和后续日期随之顺延", () => {
  const all = P.plan(config({ rounds: 1 }), {}, {}, [{ day: 1, date: "2026-01-05" }]);
  assert.equal(all[0].date, "2026-01-05");
  assert.equal(all[1].date, "2026-01-06");
  assert.equal(P.nextWorkout(all, {}).day, 1);
});

test("按顺序寻找下次训练，休息日不需要手动记录", () => {
  const all = P.plan(config({ rounds: 1 }));
  const records = { 1: {}, 2: {}, 3: {} };
  assert.equal(P.nextWorkout(all, records).day, 5);
  for (const d of all.filter((x) => x.type !== "rest")) records[d.day] = {};
  assert.equal(P.nextWorkout(all, records), null);
});

test("结束末轮正常休息日后，再休满5天才能测试新1RM", () => {
  const all = P.plan(config({ rounds: 1 }));
  assert.equal(all.at(-1).date, "2026-01-16");
  assert.equal(P.testDate(all), "2026-01-22");
  const delayed = P.plan(config({ rounds: 1 }), { 15: { date: "2026-01-20" } });
  assert.equal(delayed.at(-1).date, "2026-01-21");
  assert.equal(P.testDate(delayed), "2026-01-27");
});
