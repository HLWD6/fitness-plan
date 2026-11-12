/* 固定训练模板。参考重量不参与实际训练记录的计算。 */
(function (root) {
  "use strict";
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) { Object.values(value).forEach(x => { if (x && typeof x === "object") freeze(x); }); return Object.freeze(value); }
  const arms = () => [
    { id: "triceps", name: "三头任选", sets: 5, reps: "10–15" },
    { id: "curl", name: "哑铃弯举", sets: 1, reps: "12", referenceWeight: 22.5 },
    { id: "core", name: "平板支撑 / 卷腹", sets: 2, reps: "" },
  ];
  const TEMPLATES = freeze([
    { id: "bench-a", title: "卧推 A", kind: "容量日", type: "chest", main: { name: "快速卧推", sets: 5, reps: "8", referenceWeight: 120 }, accessories: [{ id: "press", name: "实力推", sets: 2, reps: "" }, ...arms()] },
    { id: "bench-b", title: "卧推 B", kind: "控制日", type: "chest", main: { name: "停顿卧推", sets: 5, reps: "5", referenceWeight: 135 }, accessories: [{ id: "dips", name: "自重臂屈伸", sets: 4, reps: "" }, ...arms()] },
    { id: "bench-c", title: "卧推 C", kind: "赛推日", type: "chest", main: { name: "赛推", sets: 5, reps: "3", referenceWeight: 150 }, accessories: [{ id: "pushups", name: "俯卧撑", sets: 2, reps: "" }, ...arms()] },
    { id: "bench-d", title: "卧推 D", kind: "减载日", type: "chest", main: { name: "无腿卧推", sets: 5, reps: "8", referenceWeight: 100 }, accessories: [] },
    { id: "back", title: "背部", kind: "引体日", type: "back", main: { name: "引体向上", sets: 3, reps: "5–8" }, accessories: [{ id: "pulldown", name: "高位下拉", sets: 2, reps: "8–12" }, { id: "row", name: "器械划船", sets: 2, reps: "8–12" }] },
    { id: "squat-a", title: "深蹲 A", kind: "深蹲日", type: "legs", main: { name: "杠铃深蹲", sets: 5, reps: "5" }, accessories: [{ id: "hack", name: "哈克深蹲", sets: 2, reps: "8–12" }, { id: "extension", name: "腿屈伸", sets: 2, reps: "10–15" }, { id: "leg-curl", name: "腿弯举", sets: 2, reps: "10–15" }] },
    { id: "squat-b", title: "深蹲 B", kind: "单腿日", type: "legs", main: { name: "保加利亚分腿蹲", sets: 3, reps: "8–10 / 腿", note: "自重 / 哑铃" }, accessories: [] },
  ]);
  function templates() { return [...TEMPLATES]; }
  function template(id) { return TEMPLATES.find(x => x.id === id) || null; }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const d = new Date(`${value}T12:00:00`);
    return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === value;
  }
  function dose(exercise) { return exercise?.sets ? exercise.reps ? `${exercise.sets}×${exercise.reps}` : `${exercise.sets}组` : ""; }
  function seedRecords() {
    return [["2026-11-09", "bench-a", [120, 120, 120, 120, 120]], ["2026-11-11", "squat-a", [120, 120, 120, 120, 120]], ["2026-11-12", "bench-b", [120, 125, 125, 130, 130]]].map(([date, templateId, weights]) => ({
      id: `confirmed-${date}-${templateId}`, date, templateId, result: "done", setWeights: weights || Array(template(templateId).main?.sets || 0).fill(null), notes: "", triceps: "", snapshot: clone(template(templateId)),
    }));
  }
  function validateRecord(record, latestDate = today()) {
    const t = template(record?.templateId);
    if (!t) return "请选择训练模板。";
    if (!validDate(record.date) || record.date > latestDate) return "请选择今天或之前的有效日期。";
    if (!Array.isArray(record.setWeights) || record.setWeights.length !== (t.main?.sets || 0)) return "请检查各组重量。";
    if (record.setWeights.some(x => x !== null && (typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 500))) return "每组重量需在0–500 kg之间。";
    if (!["done", "incomplete", "paused"].includes(record.result)) return "请选择完成情况。";
    return "";
  }
  function upsertRecord(records, record) {
    const existing = records.find(x => x.id === record.id) || records.find(x => x.date === record.date && x.templateId === record.templateId);
    const id = existing?.id || record.id;
    return [...records.filter(x => x.id !== id && !(x.date === record.date && x.templateId === record.templateId)), { ...clone(record), id }];
  }
  function fromLegacy(record) {
    const p = record?.plan;
    if (!validDate(record?.date) || !p?.type) return null;
    const templateId = p.type === "chest" ? ["bench-a", "bench-b", "bench-c", "bench-d"][Number(p.micro) - 1] : p.type === "back" ? "back" : p.type === "legs" ? p.legVariant === "B" ? "squat-b" : "squat-a" : "rest";
    const t = template(templateId); if (!t) return null;
    return { id: `legacy-v15-${record.date}-${record.day}`, date: record.date, templateId, result: ["done", "incomplete", "paused"].includes(record.result) ? record.result : "done", setWeights: Array(t.main?.sets || 0).fill(null), legacyWeight: Number.isFinite(record.actualWeight) ? record.actualWeight : null, notes: [record.actual, record.notes].filter(Boolean).join(" · "), triceps: record.triceps || "", snapshot: clone(t) };
  }
  function initialRecords(previous) {
    if (previous?.version === 16 && Array.isArray(previous.records)) return clone(previous.records).filter(r => template(r.templateId) && validDate(r.date)).map(r => r.date === "2026-11-11" && r.templateId === "squat-a" ? { ...r, setWeights: [120, 120, 120, 120, 120] } : r);
    const rows = previous?.version === 15 ? [...Object.values(previous.records || {}), ...(previous.attempts || [])].map(fromLegacy).filter(Boolean).filter(x => x.date < "2026-11-09" || x.date > "2026-11-12") : [];
    return [...rows, ...seedRecords()];
  }
  function monthSlots(month) {
    if (!/^\d{4}-\d{2}$/.test(month) || !validDate(`${month}-01`)) return [];
    const first = new Date(`${month}-01T12:00:00`), offset = (first.getDay() + 6) % 7;
    const end = new Date(first); end.setMonth(end.getMonth() + 1, 0);
    const length = Math.ceil((offset + end.getDate()) / 7) * 7;
    return Array.from({ length }, (_, i) => { const day = i - offset + 1; return day > 0 && day <= end.getDate() ? `${month}-${String(day).padStart(2, "0")}` : null; });
  }
  function shiftMonth(month, delta) {
    const d = new Date(`${month}-01T12:00:00`); d.setMonth(d.getMonth() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const api = { templates, template, dose, today, validDate, seedRecords, validateRecord, upsertRecord, initialRecords, monthSlots, shiftMonth };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TrainingPlan = api;
})(typeof window !== "undefined" ? window : globalThis);
