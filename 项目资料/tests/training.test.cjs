"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), P = require("../src/training.js");
test("模板不绑定日期，卧推重量仅作参考", () => {
  const all = P.templates(), bench = all.filter(x => x.type === "chest");
  assert.equal(all.length, 7); assert.equal(all.some(x => x.type === "rest" || "date" in x), false);
  assert.deepEqual(bench.map(x => P.dose(x.main)), ["5×8", "5×5", "5×3", "5×8"]);
  assert.deepEqual(bench.map(x => x.main.referenceWeight), [120, 135, 150, 100]);
  assert.equal(P.template("squat-a").main.name, "杠铃深蹲");
  assert.equal(P.template("squat-b").main.name, "保加利亚分腿蹲");
});
test("卧推辅助组次和哑铃弯举参考准确", () => {
  assert.deepEqual(P.templates().slice(0, 3).map(x => x.accessories[0].name), ["实力推", "自重臂屈伸", "俯卧撑"]);
  assert.equal(P.template("bench-b").accessories[0].sets, 4);
  for (const t of P.templates().slice(0, 3)) {
    assert.equal(t.accessories.find(x => x.id === "triceps").sets, 5);
    const curl = t.accessories.find(x => x.id === "curl");
    assert.equal(P.dose(curl), "1×12"); assert.equal(curl.referenceWeight, 22.5);
  }
  assert.equal(P.template("bench-d").accessories.length, 0);
});
test("四条已确认记录包含休息及卧推B五组实重", () => {
  const records = P.seedRecords();
  assert.deepEqual(records.map(x => [x.date, x.templateId]), [["2026-11-09", "bench-a"], ["2026-11-10", "rest"], ["2026-11-11", "squat-a"], ["2026-11-12", "bench-b"]]);
  assert.deepEqual(records[3].setWeights, [120, 125, 125, 130, 130]);
  assert.deepEqual(records[2].setWeights, [null, null, null, null, null]);
  assert.equal(records[3].snapshot.main.referenceWeight, 135);
});
test("同模板可跨日期重复，实重可不同，未填写时不套用参考值", () => {
  const record = { id: "test", date: "2026-11-06", templateId: "bench-b", result: "done", setWeights: [120, 125, 125, 130, 130] };
  assert.equal(P.validateRecord(record, "2026-11-12"), "");
  let records = P.upsertRecord([], record);
  records = P.upsertRecord(records, { ...record, id: "repeat", date: "2026-11-07", setWeights: [null, null, null, null, null] });
  assert.equal(records.length, 2); assert.ok(records[1].setWeights.every(x => x === null));
  records = P.upsertRecord(records, { ...record, id: "new-click", setWeights: [121, 126, 126, 131, 131] });
  assert.equal(records.length, 2); assert.equal(records.find(x => x.date === "2026-11-06").id, "test");
  assert.equal(P.template("bench-b").main.referenceWeight, 135);
  assert.match(P.validateRecord({ ...record, date: "2026-11-13" }, "2026-11-12"), /日期/);
  assert.match(P.validateRecord({ ...record, setWeights: [120, -1, 125, 130, 130] }, "2026-11-12"), /重量/);
  assert.equal(P.validateRecord({ ...record, templateId: "rest", setWeights: [] }, "2026-11-12"), "");
});
test("迁移保留原始旧数据，覆盖已纠正日期，不编造逐组实重", () => {
  const previous = { version: 15, records: { 1: { day: 1, date: "2026-11-12", plan: { type: "chest", micro: 1 }, actualWeight: 120 }, 2: { day: 2, date: "2026-11-08", plan: { type: "back" }, actualWeight: 15, result: "done" } }, attempts: [], archives: [] };
  const original = JSON.stringify(previous), records = P.initialRecords(previous);
  assert.equal(JSON.stringify(previous), original);
  assert.equal(records.length, 5);
  assert.deepEqual(records.filter(x => x.date === "2026-11-12").map(x => x.templateId), ["bench-b"]);
  const imported = records.find(x => x.date === "2026-11-08");
  assert.equal(imported.legacyWeight, 15); assert.ok(imported.setWeights.every(x => x === null));
});
