"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), P = require("../src/training.js");
test("七种模板不绑定日期，参考重量不限制实重", () => {
  const all = P.templates(), bench = all.filter(x => x.type === "chest");
  assert.equal(all.length, 7); assert.equal(all.some(x => x.type === "rest" || "date" in x), false);
  assert.equal(P.template("rest"), null);
  assert.deepEqual(bench.map(x => P.dose(x.main)), ["5×8", "5×5", "5×3", "5×8"]);
  assert.deepEqual(bench.map(x => x.main.referenceWeight), [120, 135, 150, 100]);
});
test("辅助组次和弯举参考准确", () => {
  assert.equal(P.template("bench-b").accessories[0].sets, 4);
  for (const t of P.templates().slice(0, 3)) {
    assert.equal(t.accessories.find(x => x.id === "triceps").sets, 5);
    const curl = t.accessories.find(x => x.id === "curl");
    assert.equal(P.dose(curl), "1×12"); assert.equal(curl.referenceWeight, 22.5);
  }
});
test("仅保留训练记录，11月11日深蹲五组120kg", () => {
  const records = P.seedRecords();
  assert.deepEqual(records.map(x => [x.date, x.templateId]), [["2026-11-09", "bench-a"], ["2026-11-11", "squat-a"], ["2026-11-12", "bench-b"]]);
  assert.deepEqual(records.find(x => x.templateId === "squat-a").setWeights, [120, 120, 120, 120, 120]);
  assert.deepEqual(records.find(x => x.templateId === "bench-b").setWeights, [120, 125, 125, 130, 130]);
});
test("同模板跨日期可重复，空重量不套用参考值", () => {
  const record = { id: "test", date: "2026-11-06", templateId: "bench-b", result: "done", setWeights: [120, 125, 125, 130, 130] };
  assert.equal(P.validateRecord(record, "2026-11-12"), "");
  let records = P.upsertRecord([], record);
  records = P.upsertRecord(records, { ...record, id: "repeat", date: "2026-11-07", setWeights: [null, null, null, null, null] });
  assert.equal(records.length, 2); assert.ok(records[1].setWeights.every(x => x === null));
  records = P.upsertRecord(records, { ...record, id: "new-click", setWeights: [121, 126, 126, 131, 131] });
  assert.equal(records.length, 2); assert.equal(records.find(x => x.date === "2026-11-06").id, "test");
  assert.equal(P.template("bench-b").main.referenceWeight, 135);
  assert.match(P.validateRecord({ ...record, setWeights: [120, -1, 125, 130, 130] }, "2026-11-12"), /重量/);
});
test("v16迁移去掉休息，补记深蹲120，其他实重保持原值", () => {
  const previous = { version: 16, records: [...P.seedRecords().map(r => r.templateId === "squat-a" ? { ...r, setWeights: Array(5).fill(null) } : r), { id: "rest", date: "2026-11-10", templateId: "rest", setWeights: [] }] };
  previous.records.find(r => r.templateId === "bench-b").setWeights[3] = 132.5;
  const original = JSON.stringify(previous), records = P.initialRecords(previous);
  assert.equal(JSON.stringify(previous), original); assert.equal(records.length, 3);
  assert.ok(records.every(r => r.templateId !== "rest"));
  assert.deepEqual(records.find(r => r.templateId === "squat-a").setWeights, [120, 120, 120, 120, 120]);
  assert.equal(records.find(r => r.templateId === "bench-b").setWeights[3], 132.5);
});
test("旧版记录迁移保留独立实重，不推断逐组值", () => {
  const previous = { version: 15, records: { 2: { day: 2, date: "2026-11-08", plan: { type: "back" }, actualWeight: 15, result: "done" } }, attempts: [], archives: [] };
  const records = P.initialRecords(previous); assert.equal(records.length, 4);
  const imported = records.find(x => x.date === "2026-11-08");
  assert.equal(imported.legacyWeight, 15); assert.ok(imported.setWeights.every(x => x === null));
});
test("月历按周一对齐，兼容跨年、闰年和空白格", () => {
  const november = P.monthSlots("2026-11");
  assert.equal(november.length, 42); assert.ok(november.slice(0, 6).every(x => x === null));
  assert.equal(november[6], "2026-11-01"); assert.equal(november[14], "2026-11-09");
  assert.equal(november.filter(Boolean).length, 30);
  assert.equal(P.monthSlots("2028-02").filter(Boolean).at(-1), "2028-02-29");
  assert.equal(P.shiftMonth("2026-12", 1), "2027-01"); assert.equal(P.shiftMonth("2026-01", -1), "2025-12");
});
