/* 16天一轮：胸、背、腿、休息重复；重量由训练者自行选择并记录。 */
(function (root) {
  "use strict";
  const CYCLE_DAYS = 16;
  const BENCH = [
    { name: "容量日", sets: 5, reps: 8, referenceWeight: 120, style: "快速卧推", cue: "下放稳定，向上快速推起；不弹胸。" },
    { name: "控制日", sets: 5, reps: 5, referenceWeight: 135, style: "停顿卧推", cue: "触胸停稳约1秒，不反弹，练启动力。" },
    { name: "赛推日", sets: 5, reps: 3, referenceWeight: 150, style: "赛推", cue: "按比赛停顿，练腿驱动、陷胸承接和固定推起路线。" },
    { name: "减载日", sets: 5, reps: 8, referenceWeight: 100, style: "无腿卧推", cue: "双脚放松，不蹬腿；全程控制，轻松完成。" },
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
  function defaults(startDate = today()) { return { startDate, entryDay: 1 }; }
  function validate(c) {
    if (!c || !validDate(c.startDate)) return "请选择有效的开始日期。";
    if (!Number.isInteger(c.entryDay) || c.entryDay < 1 || c.entryDay >= CYCLE_DAYS) return "开始记录的天数需在本周期最后一个训练日或之前。";
    return "";
  }
  function plan(c, records = {}, _unusedOverrides = {}, attempts = []) {
    let date = addDays(c.startDate, 1 - c.entryDay);
    return Array.from({ length: CYCLE_DAYS }, (_, i) => {
      const day = i + 1, micro = Math.floor(i / 4), type = TYPES[i % 4];
      const record = records[day];
      const lastAttempt = attempts.filter((a) => a.day === day && validDate(a.date)).map((a) => a.date).sort().at(-1);
      if (lastAttempt && lastAttempt > date) date = lastAttempt;
      if (record?.date && validDate(record.date) && record.date > date) date = record.date;
      const slot = BENCH[micro], legIndex = Math.floor(i / 4), legVariant = legIndex % 2 === 0 ? "A" : "B";
      const isBench = type === "chest", isLeg = type === "legs";
      const p = {
        day, round: 1, micro: micro + 1, type, label: LABELS[type], date, beforeStart: day < c.entryDay,
        name: isBench ? "卧推" : type === "back" ? "引体向上" : isLeg ? (legVariant === "A" ? "杠铃深蹲" : "保加利亚分腿蹲") : "休息",
        style: isBench ? slot.style : null,
        cue: isBench ? slot.cue : null,
        benchDayName: isBench ? slot.name : null,
        referenceWeight: isBench ? slot.referenceWeight : null,
        sets: isBench ? slot.sets : isLeg ? (legVariant === "A" ? 5 : 3) : type === "back" ? 3 : 0,
        reps: isBench ? String(slot.reps) : isLeg ? (legVariant === "A" ? "5" : "8–10/腿") : type === "back" ? "5–8" : "",
        weight: null,
        legVariant: isLeg ? legVariant : null,
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
      result[d.day] = { day: d.day, date: d.date, plan: { ...d }, result: "done", actual: "", actualWeight: null, notes: "", triceps: "", backfilled: true };
    }
    return result;
  }
  function testDate(days) { return addDays(days[days.length - 1].date, 6); }
  function weightText(weight) { return Number.isFinite(weight) ? `${weight} kg` : ""; }
  const api = { CYCLE_DAYS, BENCH, LABELS, today, validDate, addDays, defaults, validate, plan, backfillCompleted, nextWorkout, testDate, weightText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TrainingPlan = api;
})(typeof window !== "undefined" ? window : globalThis);
