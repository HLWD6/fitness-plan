/* 四天一组、四种卧推16天一轮的力量计划；重量均为含杆总重量。 */
(function (root) {
  "use strict";
  const CYCLE_DAYS = 16;
  const BENCH = [
    { name: "容量日", sets: 5, reps: 8, ratio: .70, style: "快速卧推", cue: "下放稳定，向上快速推起；不弹胸。", targetRpe: 7.5 },
    { name: "控制稳定日", sets: 5, reps: 5, ratio: .75, style: "胸前停顿卧推", cue: "触胸停稳约1秒，不反弹，练启动力。", targetRpe: 7.5 },
    { name: "赛推专项日", sets: 5, reps: 3, ratio: .825, style: "比赛式卧推", cue: "按比赛停顿，练腿驱动、陷胸承接和固定推起路线。", targetRpe: 7.5 },
    { name: "减载日", sets: 5, reps: 8, ratio: .55, style: "无腿驱动卧推", cue: "双脚放松，不蹬腿；全程控制，轻松完成。", targetRpe: 6 },
  ];
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
  function seedBench(tm, increment, barWeight) {
    return BENCH.map((slot) => Math.max(barWeight, roundDown(tm * slot.ratio, increment, barWeight)));
  }
  function defaults(startDate = today()) {
    return { tm: 160, increment: 2.5, barWeight: 20, benchWeights: seedBench(160, 2.5, 20), benchIncrease: 2.5, squatStart: 120, squatIncrease: 0, rounds: 1, entryDay: 1, startDate };
  }
  function validate(c) {
    if (!c || !validDate(c.startDate)) return "请选择有效的开始日期。";
    if (!Number.isFinite(c.tm) || c.tm < 20 || c.tm > 400) return "卧推估算极限请填写 20–400 kg。";
    if (!Number.isFinite(c.increment) || c.increment < 0.25 || c.increment > 25) return "最小加重请填写 0.25–25 kg。";
    if (!Number.isFinite(c.barWeight) || c.barWeight < 0 || c.barWeight > 30) return "杠铃杆重请填写 0–30 kg。";
    if (!Array.isArray(c.benchWeights) || c.benchWeights.length !== BENCH.length || c.benchWeights.some((w) => !aligned(w, c.increment, c.barWeight) || w > 400)) return "四种卧推重量须能按杆重和最小加重配出，且不超过 400 kg。";
    if (!aligned(c.benchIncrease, c.increment) || c.benchIncrease > 50) return "新周期加重须为器械最小加重的整数倍，且不超过 50 kg。";
    if (!aligned(c.squatStart, c.increment, c.barWeight) || c.squatStart > 400) return "深蹲起点须能按杆重和最小加重配出，且不超过 400 kg。";
    if (!aligned(c.squatIncrease, c.increment) || c.squatIncrease > 50) return "深蹲每次加重须为器械最小加重的整数倍，且不超过 50 kg。";
    if (!Number.isInteger(c.entryDay) || c.entryDay < 1 || c.entryDay >= CYCLE_DAYS) return "开始记录的天数需在本周期最后一个训练日或之前。";
    return "";
  }
  function plan(c, records = {}, squatOverrides = {}, attempts = []) {
    let date = addDays(c.startDate, 1 - c.entryDay);
    const firstLegIndex = Math.max(0, Math.ceil((c.entryDay - 3) / 4));
    let squatAnchor = { index: firstLegIndex, weight: c.squatStart };
    return Array.from({ length: CYCLE_DAYS }, (_, i) => {
      const day = i + 1, micro = Math.floor(i / 4), type = TYPES[i % 4];
      const record = records[day];
      const lastAttempt = attempts.filter((a) => a.day === day && validDate(a.date)).map((a) => a.date).sort().at(-1);
      if (lastAttempt && lastAttempt > date) date = lastAttempt;
      if (record?.date && validDate(record.date) && record.date > date) date = record.date;
      const slot = BENCH[micro];
      const legIndex = Math.floor(i / 4);
      if (type === "legs" && Number.isFinite(squatOverrides[day])) squatAnchor = { index: legIndex, weight: squatOverrides[day] };
      const p = {
        day, round: 1, micro: micro + 1, type, label: LABELS[type], date, beforeStart: day < c.entryDay,
        name: type === "chest" ? "卧推" : type === "back" ? "引体向上" : type === "legs" ? "深蹲" : "休息",
        style: type === "chest" ? slot.style : null,
        cue: type === "chest" ? slot.cue : null,
        benchDayName: type === "chest" ? slot.name : null,
        sets: type === "chest" ? slot.sets : type === "legs" ? 5 : type === "back" ? 3 : 0,
        reps: type === "chest" ? String(slot.reps) : type === "legs" ? "5" : type === "back" ? "5–8" : "",
        weight: type === "chest" ? c.benchWeights[micro] : type === "legs" ? (legIndex < firstLegIndex ? c.squatStart : Number((squatAnchor.weight + (legIndex - squatAnchor.index) * c.squatIncrease).toFixed(3))) : null,
        referenceRatio: type === "chest" ? slot.ratio : null,
        targetRpe: type === "chest" ? slot.targetRpe : null,
        legVariant: type === "legs" ? (legIndex % 2 === 0 ? "A" : "B") : null,
      };
      date = addDays(date, 1);
      return p;
    });
  }
  function nextWorkout(days, records) {
    return days.find((d) => !d.beforeStart && d.type !== "rest" && !records[d.day]) || null;
  }
  function backfillCompleted(c, records, attempts, beforeDate) {
    const result = { ...records };
    for (const d of plan(c, records, {}, attempts)) {
      if (d.type === "rest" || d.date >= beforeDate || result[d.day]) continue;
      result[d.day] = { day: d.day, date: d.date, plan: { ...d }, result: "done", actual: "", notes: "", triceps: "", backfilled: true };
    }
    return result;
  }
  function testDate(days) { return addDays(days[days.length - 1].date, 6); }
  function weightText(weight) { return Number.isFinite(weight) ? `${weight} kg` : ""; }
  const api = { CYCLE_DAYS, BENCH, LABELS, today, validDate, addDays, roundDown, seedBench, aligned, defaults, validate, plan, backfillCompleted, nextWorkout, testDate, weightText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TrainingPlan = api;
})(typeof window !== "undefined" ? window : globalThis);
