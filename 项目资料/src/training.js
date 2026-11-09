/* 四天一组、二十天一轮的力量计划；全部重量均为含杆总重量。 */
(function (root) {
  "use strict";
  // 以末组RPE约7.5（约2.5次余力）为起点，再按总组数下调；实际重量向下配片。
  // 高组数和高次数的卧推个体差异较大，这些比例只作起始估算。
  const TARGET_RPE = 7.5;
  const BENCH = [
    {sets:4,reps:10},{sets:5,reps:8},{sets:6,reps:6},{sets:8,reps:4},{sets:10,reps:2},
    {sets:4,reps:9},{sets:5,reps:7},{sets:6,reps:5},{sets:8,reps:3},{sets:15,reps:1},
  ];
  function targetRatio(slot) {
    // Epley近似只提供初始比例；额外按工作组数留出疲劳余量。
    const rir = 10 - TARGET_RPE;
    const base = 30 / (30 + slot.reps + rir);
    const volumeAllowance = 0.003 * (slot.sets - 1);
    return Number((base - volumeAllowance).toFixed(6));
  }
  const TYPES = ["chest", "back", "legs", "rest"];
  const LABELS = { chest: "胸", back: "背", legs: "腿", rest: "休息" };
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const d = new Date(`${value}T12:00:00`);
    return !Number.isNaN(d.getTime()) && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === value;
  }
  function addDays(value, n) {
    const d = new Date(`${value}T12:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function roundDown(value, increment, bar) {
    return Number((bar + Math.floor((value - bar + 1e-8) / increment) * increment).toFixed(3));
  }
  function aligned(value, increment, base = 0) {
    return Number.isFinite(value) && value >= base && Math.abs((value - base) / increment - Math.round((value - base) / increment)) < 1e-7;
  }
  function seedBench(tm, tm2, increment, barWeight) {
    return BENCH.map((slot, index) => {
      const reference = index < 5 ? tm : tm2;
      return Math.max(barWeight, roundDown(reference * targetRatio(slot), increment, barWeight));
    });
  }
  function defaults(startDate = today()) {
    return { tm: 160, tm2: 170, increment: 2.5, barWeight: 20, benchWeights: seedBench(160, 170, 2.5, 20), benchIncrease: 5, cycleOffset: 0, squatStart: 120, squatIncrease: 0, rounds: 2, entryDay: 1, startDate };
  }
  function validate(c) {
    if (!c || !validDate(c.startDate)) return "请选择有效的开始日期。";
    if (!Number.isFinite(c.tm) || c.tm < 20 || c.tm > 400 || !Number.isFinite(c.tm2) || c.tm2 < 20 || c.tm2 > 400) return "两轮卧推估算极限均须填写 20–400 kg。";
    if (!Number.isFinite(c.increment) || c.increment < 0.25 || c.increment > 25) return "最小加重请填写 0.25–25 kg。";
    if (!Number.isFinite(c.barWeight) || c.barWeight < 0 || c.barWeight > 30) return "杠铃杆重请填写 0–30 kg。";
    if (!Array.isArray(c.benchWeights) || c.benchWeights.length !== 10 || c.benchWeights.some((w) => !aligned(w, c.increment, c.barWeight) || w > 400)) return "十个卧推重量须能按杆重和最小加重配出，且不超过 400 kg。";
    if (!aligned(c.benchIncrease, c.increment) || c.benchIncrease > 50) return "卧推每轮加重须为器械最小加重的整数倍，且不超过 50 kg。";
    if (!aligned(c.squatStart, c.increment, c.barWeight) || c.squatStart > 400) return "深蹲起点须能按杆重和最小加重配出，且不超过 400 kg。";
    if (!aligned(c.squatIncrease, c.increment) || c.squatIncrease > 50) return "深蹲每次加重须为器械最小加重的整数倍，且不超过 50 kg。";
    if (c.rounds !== 2) return "每个周期固定两轮。";
    if (!Number.isInteger(c.entryDay) || c.entryDay < 1 || c.entryDay >= c.rounds * 20) return "开始记录的天数需在本周期最后一个训练日或之前。";
    return "";
  }
  function plan(c, records = {}, squatOverrides = {}, attempts = []) {
    // 第1天至开始记录前的日期按当前起点倒推。
    let date = addDays(c.startDate, 1 - c.entryDay);
    const firstLegIndex = Math.max(0, Math.ceil((c.entryDay - 3) / 4));
    let squatAnchor = { index: firstLegIndex, weight: c.squatStart };
    return Array.from({ length: c.rounds * 20 }, (_, i) => {
      const day = i + 1, round = Math.floor(i / 20) + 1, micro = Math.floor((i % 20) / 4), type = TYPES[i % 4];
      const record = records[day];
      const lastAttempt = attempts.filter((a) => a.day === day && validDate(a.date)).map((a) => a.date).sort().at(-1);
      if (lastAttempt && lastAttempt > date) date = lastAttempt;
      if (record?.date && validDate(record.date) && record.date > date) date = record.date;
      const slot = BENCH[(round - 1) * 5 + micro];
      const legIndex = Math.floor(i / 4);
      if (type === "legs" && Number.isFinite(squatOverrides[day])) squatAnchor = { index: legIndex, weight: squatOverrides[day] };
      const p = {
        day, round, micro: micro + 1, type, label: LABELS[type], date, beforeStart: day < c.entryDay,
        name: type === "chest" ? "卧推" : type === "back" ? "引体向上" : type === "legs" ? "深蹲" : "休息",
        sets: type === "chest" ? slot.sets : type === "legs" ? 5 : type === "back" ? 3 : 0,
        reps: type === "chest" ? String(slot.reps) : type === "legs" ? "5" : type === "back" ? "5–8" : "",
        weight: type === "chest" ? Number((c.benchWeights[(round - 1) * 5 + micro] + (c.cycleOffset || 0)).toFixed(3)) : type === "legs" ? (legIndex < firstLegIndex ? c.squatStart : Number((squatAnchor.weight + (legIndex - squatAnchor.index) * c.squatIncrease).toFixed(3))) : null,
        referenceRatio: type === "chest" ? targetRatio(slot) : null,
        targetRpe: type === "chest" ? TARGET_RPE : null,
        legVariant: type === "legs" ? (legIndex % 2 === 0 ? "A" : "B") : null,
      };
      date = addDays(date, 1);
      return p;
    });
  }
  function nextWorkout(days, records) {
    return days.find((d) => !d.beforeStart && d.type !== "rest" && !records[d.day]) || null;
  }
  // 只补用户确认时已经过去且尚无记录的训练，不覆盖已有记录或虚构实际表现。
  function backfillCompleted(c, records, attempts, beforeDate) {
    const result = { ...records };
    for (const d of plan(c, records, {}, attempts)) {
      if (d.type === "rest" || d.date >= beforeDate || result[d.day]) continue;
      result[d.day] = { day: d.day, date: d.date, plan: { ...d }, result: "done", actual: "", notes: "", triceps: "", backfilled: true };
    }
    return result;
  }
  // 周期末正常休息日之后再休息至少5整天，次日才可测1RM。
  function testDate(days) { return addDays(days[days.length - 1].date, 6); }
  function weightText(weight) { return Number.isFinite(weight) ? `${weight} kg` : ""; }
  const api = { BENCH, TARGET_RPE, LABELS, today, validDate, addDays, roundDown, seedBench, targetRatio, aligned, defaults, validate, plan, backfillCompleted, nextWorkout, testDate, weightText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TrainingPlan = api;
})(typeof window !== "undefined" ? window : globalThis);
