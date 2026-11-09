/* 本版单独保存，旧版训练与归档只读保留。 */
"use strict";
(() => {
  const P = window.TrainingPlan;
  const KEY = "fitness-cycle-v14";
  const OLD_KEYS = ["fitness-cycle-v13", "fitness-cycle-v12", "fitness-cycle-v11", "fitness-cycle-v10", "fitness-cycle-v9", "bench-rotation-v8", "bench-smolov-v7", "bench-personal-v6", "bench-fenjue-v5", "bench-rebuild-v4", "bench-fen-jue-v3"];
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[x]);
  function read(key) {
    try { const value = localStorage.getItem(key); return value === null ? null : JSON.parse(value); } catch { return null; }
  }
  function fresh() { return { version: 14, config: P.defaults(), records: {}, attempts: [], archives: [], drafts: {}, squatOverrides: {} }; }
  const saved = read(KEY);
  let state = saved && saved.version === 14 && !P.validate(saved.config) && saved.records && Array.isArray(saved.archives)
    ? { ...fresh(), ...saved, attempts: Array.isArray(saved.attempts) ? saved.attempts : [], drafts: saved.drafts || {} } : fresh();
  // 新的卧推技术循环不沿用旧天数映射；旧训练完整归档，新循环从第1天开始。
  if (!saved) {
    const previous = read("fitness-cycle-v13") || read("fitness-cycle-v12") || read("fitness-cycle-v11");
    if ([13, 12, 11].includes(previous?.version) && previous.config && previous.records && Array.isArray(previous.archives)) {
      const oldConfig = previous.config;
      const increment = oldConfig.increment || 2.5, barWeight = oldConfig.barWeight ?? 20;
      const minimumIncrease = Math.ceil(2.5 / increment) * increment;
      const nextIncrease = minimumIncrease;
      const config = { ...P.defaults(), tm: oldConfig.tm || 160, increment, barWeight, benchIncrease: nextIncrease, squatStart: oldConfig.squatStart ?? 120, squatIncrease: oldConfig.squatIncrease ?? 0, startDate: P.today(), entryDay: 1, benchWeights: P.seedBench(oldConfig.tm || 160, increment, barWeight) };
      const oldCycle = Object.keys(previous.records).length || (previous.attempts || []).length
        ? [{ config: oldConfig, records: previous.records, attempts: previous.attempts || [], squatOverrides: previous.squatOverrides || {} }]
        : [];
      if (!P.validate(config)) {
        state = { ...fresh(), version: 14, config, records: {}, attempts: [], drafts: {}, squatOverrides: {}, archives: [...previous.archives, ...oldCycle] };
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 保存失败时仍保留原数据。 */ }
      }
    }
  }
  let viewedDay = null;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  const days = () => P.plan(state.config, state.records, state.squatOverrides, state.attempts);
  const next = () => P.nextWorkout(days(), state.records);
  const count = () => Object.keys(state.records).length;
  const displayDate = (date) => date ? `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日` : "";
  const plannedText = (d) => d.type === "rest" ? "休息" : d.type === "back" ? "引体向上 · 3 × 5–8" : `${d.name} · ${d.sets} × ${d.reps} · ${P.weightText(d.weight)}`;
  function warmupRamp(d) {
    if (!Number.isFinite(d.weight)) return "此前重量未记录";
    const items = [];
    [[state.config.barWeight, 8], [d.weight * .5, 5], [d.weight * .7, 3], [d.weight * .85, 1]].forEach(([raw, reps]) => {
      const w = Math.max(state.config.barWeight, P.roundDown(raw, state.config.increment, state.config.barWeight));
      if (w < d.weight && !items.some((x) => x.weight === w)) items.push({ weight: w, reps });
    });
    return items.length ? items.map((x) => `${x.weight} × ${x.reps}`).join(" → ") : "逐步加重，避免疲劳";
  }
  function exerciseRow(number, label, name, detail = "", extra = "") {
    return `<div class="exercise-row"><span class="exercise-index">${number}</span><div class="exercise-main"><span class="exercise-label">${label}</span><strong>${name}</strong>${detail ? `<small>${detail}</small>` : ""}${extra}</div></div>`;
  }
  const choices = ["自重臂屈伸", "直杆臂屈伸", "绳索臂屈伸", "过顶臂屈伸"];
  function exerciseBody(d, record, draft) {
    const selected = record?.triceps || draft?.triceps || choices[0];
    if (d.type === "chest") {
      const rpeText = d.targetRpe >= 7 ? "目标 RPE 7–8" : "约 RPE 6";
      const main = exerciseRow("01", `卧推 · ${d.benchDayName}`, d.style, `${d.sets} 组 × ${d.reps} 次 · ${rpeText} · 组间休 3–5 分钟`, `<small>${esc(d.cue)}</small>`);
      if (d.micro === 4) return `<div class="warmup-box"><div><span class="warmup-kicker">减载要点</span><strong>无腿驱动 · 动作轻松</strong></div><p>双脚放松，不蹬腿；这一天不做大重量辅助动作。</p></div><p class="ramp-line"><b>上杠准备</b> ${esc(warmupRamp(d))}</p><div class="exercise-list">${main}</div>`;
      const selector = `<label class="choice-label">三头动作 <select name="triceps" form="logForm" ${record ? "disabled" : ""}>${choices.map((x) => `<option ${x === selected ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
      const warmup = `<div class="warmup-box"><div><span class="warmup-kicker">温宁式热身</span><strong>6 个动作 · 2 轮 · 每次 25 下</strong></div><p>侧平板、卷腹、轻夹胸推、胸托后束飞鸟、轻臂屈伸、轻面拉。侧平板两轮分左右；保持轻松，发沉就减少。</p></div>`;
      return `${warmup}
        <p class="ramp-line"><b>上杠准备</b> ${esc(warmupRamp(d))}</p>
        <div class="exercise-list">${main}${exerciseRow("02", "辅助", ["实力推", "上斜卧推", "自重臂屈伸"][d.micro - 1], "2 组 · 留有余力，重量现场调整")}${exerciseRow("03", "手臂", "三头任选一项 + 哑铃弯举", "各 2 组 × 10–15 次", selector)}${exerciseRow("04", "核心", "平板支撑或卷腹", "各选一项，做 2 组")}</div>`;
    }
    if (d.type === "back") return `<p class="ramp-line"><b>准备</b> 活动肩背，轻松做 1–2 组辅助引体。</p><div class="exercise-list">${exerciseRow("01", "主项", "引体向上", "3 组 × 5–8 次 · 可使用辅助")}${exerciseRow("02", "一级辅助", "高位下拉 + 器械划船", "各 2 组 × 8–12 次 · 留有余力")}</div>`;
    if (d.type === "legs") {
      const assist = d.legVariant === "A"
        ? exerciseRow("02", "一级辅助", "哈克深蹲", "2 组 × 8–12 次 · 留有余力") + exerciseRow("03", "二级辅助", "腿屈伸 + 腿弯举", "各 2 组 × 10–15 次")
        : exerciseRow("02", "一级辅助", "硬拉", "2 组 × 5 次 · 留有余力，不做二级辅助");
      return `<p class="ramp-line"><b>上杠准备</b> ${esc(warmupRamp(d))}</p><div class="exercise-list">${exerciseRow("01", "主项", "深蹲", "5 组 × 5 次 · 工作组间休 3–5 分钟")}${assist}</div>`;
    }
    return `<div class="rest-message"><span>✳</span><div><strong>今天安排休息</strong><p>散步或轻活动即可，下一次按计划继续。</p></div></div>`;
  }
  function recordForm(d, record, draft, upcoming) {
    if (d.type === "rest") return "";
    if (record) return `<div class="completed-note"><svg class="icon"><use href="#i-check" /></svg><div><strong>${record.backfilled ? "已补记 · 日期为计划日期" : "已记录"} · ${esc(record.date)}</strong><p>${record.result === "incomplete" ? "未完成 · 请按恢复情况调整" : "已完成"}${record.actual ? ` · ${esc(record.actual)}` : ""}${record.notes ? ` · ${esc(record.notes)}` : ""}</p></div></div>`;
    if (d.beforeStart) return `<div class="preview-note">这次安排在开始记录之前，未自动记为完成；日期为倒推参考。</div>`;
    if (!upcoming || upcoming.day !== d.day) return `<div class="preview-note">这是后续训练预览。请先完成前面的训练记录。</div>`;
    const tooEarly = d.date > P.today();
    return `<form class="record-form" id="logForm"><div class="record-title"><div><span class="card-kicker">TRAINING LOG</span><h4>记录本次训练</h4></div><span>可选填实际表现</span></div><div class="record-fields">
      <label>训练日期<input name="date" type="date" value="${esc(draft?.date || P.today())}" max="${P.today()}" min="${d.date}" required /></label>
      <label>完成情况<select name="result"><option value="done" ${draft?.result === "done" ? "selected" : ""}>完成</option><option value="incomplete" ${draft?.result === "incomplete" ? "selected" : ""}>未完成</option><option value="paused" ${draft?.result === "paused" ? "selected" : ""}>暂停，稍后再练</option></select></label>
      <label class="full-field">实际表现 <span>选填</span><input name="actual" type="text" maxlength="120" placeholder="例如：115 kg，9 / 9 / 9 / 9" value="${esc(draft?.actual || "")}" /></label>
      <label class="full-field">备注 <span>选填</span><input name="notes" type="text" maxlength="240" placeholder="例如：末组偏重、辅助动作重量" value="${esc(draft?.notes || "")}" /></label>
      </div><div class="record-actions"><button type="submit" class="primary-button" ${tooEarly ? "disabled" : ""}>保存训练记录 <svg class="icon"><use href="#i-arrow" /></svg></button><span>${tooEarly ? `最早 ${displayDate(d.date)} 记录` : "记录保存在当前浏览器"}</span></div><p class="form-message" id="recordStatus" role="status"></p></form>`;
  }
  function renderSession() {
    const all = days(), upcoming = next();
    let d = all.find((x) => x.day === viewedDay) || upcoming || all[all.length - 1];
    viewedDay = d.day;
    const record = state.records[d.day], draft = state.drafts[d.day] || {};
    const p = record?.plan || d;
    const completedRest = d.type === "rest" && d.date <= state.confirmedPriorThrough;
    const mode = record ? "已记录" : completedRest ? "已休息" : d.beforeStart ? "此前未记录" : upcoming?.day === d.day ? "下一次训练" : d.type === "rest" ? "恢复日" : "计划预览";
    const value = d.type === "rest" ? "休息" : d.type === "back" ? "引体向上" : `${esc(p.sets)} <span>×</span> ${esc(p.reps)}`;
    const unit = d.type === "rest" ? "让身体恢复" : d.type === "back" ? "3 组 · 5–8 次" : `${Number.isFinite(p.weight) ? esc(P.weightText(p.weight)) : "重量未记录"} · ${esc(p.name)}`;
    const lastRecord = Object.values(state.records).sort((a, b) => b.day - a.day)[0];
    const warning = (upcoming?.day === d.day && lastRecord?.result === "incomplete" ? `<div class="mini-warning">上次训练未完成。系统不会自动降重，请按恢复情况调整设置或多休息。</div>` : "");
    const phase = d.type === "chest" ? d.benchDayName : d.type === "rest" ? "恢复日" : `第 ${d.micro} 个四日组`;
    $("#sessionCard").innerHTML = `<div class="session-topline"><div><span class="session-number">DAY ${String(d.day).padStart(2, "0")}</span><span class="session-date">${d.beforeStart && !record ? "参考 " : ""}${displayDate(record?.date || d.date)} · ${phase}</span></div><span class="session-pill">${mode}</span></div>
      <div class="session-hero"><div><p>${d.type === "rest" ? "REST DAY" : d.type === "chest" ? "CHEST DAY" : d.type === "back" ? "BACK DAY" : `LEG DAY · ${d.legVariant}`}</p><h3>${d.label}${d.type === "rest" ? "" : "日训练"}</h3></div><span class="session-icon"><svg class="icon"><use href="#i-${d.type === "rest" ? "calendar" : "barbell"}" /></svg></span></div>
      <div class="main-lift"><div><span>今日主项</span><strong>${value}</strong></div><p>${unit}</p></div>${warning}${exerciseBody({ ...d, ...p, date: d.date }, record, draft)}${recordForm(d, record, draft, upcoming)}`;
  }
  function renderSchedule() {
    const all = days(), upcoming = next();
    $("#roundTitle").textContent = "16 天 · 四种卧推循环";
    $("#roundMeta").textContent = "容量 → 控制 → 赛推 → 减载";
    $("#scheduleGrid").innerHTML = Array.from({ length: 4 }, (_, row) => {
      const group = all.filter((d) => d.micro === row + 1);
      return `<div class="schedule-row"><div class="schedule-row-label"><strong>0${row + 1}</strong><span>${["容量日", "控制稳定", "赛推专项", "减载日"][row]}</span></div><div class="schedule-cells">${group.map((d) => {
        const r = state.records[d.day], p = r?.plan || d, selected = d.day === viewedDay;
        const desc = d.type === "chest" ? `${p.style} · ${p.sets}×${p.reps} · ${p.weight}kg` : d.type === "legs" ? `5×5 · ${Number.isFinite(p.weight) ? `${p.weight}kg` : "未记录"}` : d.type === "back" ? "引体向上" : "恢复";
        const completedRest = d.type === "rest" && d.date <= state.confirmedPriorThrough;
        return `<button type="button" class="schedule-cell ${d.type} ${selected ? "selected" : ""} ${r || completedRest ? "done" : ""}" data-day="${d.day}" aria-label="第${d.day}天 ${d.label} ${esc(desc)}${r ? (r.result === "done" ? " 已完成" : " 已记录未完成") : completedRest ? " 已休息" : d.beforeStart ? " 此前未记录" : ""}"><span>DAY ${String(d.day).padStart(2, "0")} ${r || completedRest ? "✓" : d.beforeStart ? "· 此前" : upcoming?.day === d.day ? "· 下次" : ""}</span><strong>${d.label}</strong><small>${esc(desc)}</small></button>`;
      }).join("")}</div></div>`;
    }).join("");
    $("#scheduleNote").textContent = `每四天安排一次卧推；容量、控制、赛推、减载依次轮换。日期随实际训练顺延。`;
    $("#printSchedule").innerHTML = `<h3>16 天循环</h3><table><thead><tr><th>天数 / 日期</th><th>训练</th><th>主项 / 组次</th><th>重量 / 技术</th></tr></thead><tbody>${all.map((d) => { const r = state.records[d.day], p = r?.plan || d; return `<tr><td>${d.day} / ${esc(r?.date || d.date)}${d.beforeStart && !r ? "（参考）" : ""}</td><td>${d.label}</td><td>${esc(p.style || p.name)} ${d.type === "rest" ? "" : `${p.sets} × ${esc(p.reps)}`}</td><td>${d.type === "legs" ? `${Number.isFinite(p.weight) ? `${p.weight} kg` : "此前未记录"} · 腿${d.legVariant}` : d.type === "chest" ? `${p.weight} kg · ${esc(p.cue)}` : "—"}</td></tr>`; }).join("")}</tbody></table>`;
  }
  function renderProgress() {
    const upcoming = next(), total = days().filter((d) => d.type !== "rest").length;
    $("#progressCount").textContent = count();
    $("#progressDenominator").textContent = `/ ${total} 次训练`;
    $("#progressBar").style.width = `${Math.min(100, count() / total * 100)}%`;
    $("#progressText").textContent = upcoming ? `下一项：DAY ${String(upcoming.day).padStart(2, "0")} · ${upcoming.type === "chest" ? upcoming.benchDayName : upcoming.label}` : "循环训练已完成";
    $("#summaryTm").innerHTML = `${esc(state.config.tm)} <small>kg</small>`;
  }
  function renderSettings() {
    const c = state.config;
    ["tm", "startDate", "increment", "barWeight", "benchIncrease", "entryDay", "squatStart", "squatIncrease"].forEach((key) => { $(`#${key}`).value = c[key]; });

    $("#squatOverride").value = "";
    const upcomingLeg = days().find((d) => !d.beforeStart && d.type === "legs" && !state.records[d.day]);
    $("#squatOverride").disabled = !upcomingLeg;
    $("#squatOverride").placeholder = upcomingLeg ? `下次计划 ${upcomingLeg.weight} kg；留空则保持` : "本周期没有待完成的腿日";
    $("#startDate").disabled = count() > 0 || state.attempts.length > 0;
    $("#entryDay").disabled = $("#startDate").disabled;
    $("#suggestedIncrease").textContent = `完成一轮后，下一轮参考极限默认加 ${c.benchIncrease} kg`;
  }
  function historyRow(r) {
    const result = r.result === "done" ? "完成" : r.result === "paused" ? "暂停" : "未完成";
    return `<div class="history-row"><span class="history-day">${displayDate(r.date)}<small>DAY ${String(r.day).padStart(2, "0")}</small></span><div><strong>${esc(r.plan.name)} · ${esc(`${r.plan.sets} × ${r.plan.reps}`)}${r.plan.weight !== null ? ` · ${esc(r.plan.weight)} kg` : ""}</strong><p>${esc(result)}${r.backfilled ? " · 补记，日期按计划推算" : ""}${r.actual ? ` · ${esc(r.actual)}` : ""}${r.notes ? ` · ${esc(r.notes)}` : ""}</p></div><span class="history-result ${r.result === "done" ? "" : "caution"}">${result}</span></div>`;
  }
  function renderHistory() {
    const entries = [...Object.values(state.records), ...state.attempts].sort((a, b) => b.day - a.day || b.date.localeCompare(a.date));
    const archived = state.archives.map((a, i) => `<details class="archive-item"><summary>已归档周期 ${i + 1} · 卧推参考 ${esc(a.config.tm ?? "—")} kg · ${Object.keys(a.records).length} 次训练</summary><div>${[...Object.values(a.records), ...(Array.isArray(a.attempts) ? a.attempts : [])].sort((x, y) => y.day - x.day || y.date.localeCompare(x.date)).map(historyRow).join("") || "暂无记录"}</div></details>`).join("");
    $("#historyList").innerHTML = entries.length ? entries.slice(0, 5).map(historyRow).join("") + (entries.length > 5 ? `<details class="archive-item"><summary>查看其余 ${entries.length - 5} 条记录</summary>${entries.slice(5).map(historyRow).join("")}</details>` : "") + archived : `<div class="empty-history"><span>✳</span><strong>还没有训练记录</strong><p>完成一次训练后，记录会出现在这里。</p></div>${archived}`;
    const legacy = OLD_KEYS.filter((key) => read(key) !== null);
    const v8 = read("bench-rotation-v8");
    const oldRecords = Array.isArray(v8?.records) ? v8.records.length : 0;
    const oldArchives = Array.isArray(v8?.archives) ? v8.archives.length : 0;
    function legacyEntry(r) {
      if (typeof r.actual === "string") return `<div class="legacy-record"><strong>${esc(r.date || "日期未记录")} · ${esc(r.plan?.name || "训练")}</strong><span>计划 ${esc(r.plan?.weight ?? "—")} kg · ${esc(r.plan?.sets ?? "—")} × ${esc(r.plan?.reps ?? "—")}；${esc(r.actual || "未填实际表现")}${r.notes ? `；${esc(r.notes)}` : ""}</span></div>`;
      const weights = Array.isArray(r.actual?.weights) ? r.actual.weights.join(" / ") : (r.actual?.weight ?? "");
      const reps = Array.isArray(r.actual?.reps) ? r.actual.reps.join(" / ") : (r.actual?.reps ?? "");
      const rpes = Array.isArray(r.actual?.rpes) ? r.actual.rpes.map((x) => x ?? "—").join(" / ") : "";
      return `<div class="legacy-record"><strong>${esc(r.date || "日期未记录")} · ${esc(r.label || r.plan?.key || "训练")}</strong><span>计划 ${esc(r.plan?.weight ?? "—")} kg · ${esc(r.plan?.sets ?? "—")} × ${esc(r.plan?.reps ?? "—")}；实际 ${esc(weights || "—")} kg，次数 ${esc(reps || "—")}${rpes ? `，RPE ${esc(rpes)}` : ""}${r.result?.text ? `；${esc(r.result.text)}` : ""}</span></div>`;
    }
    const recordRows = (v) => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
    const oldSections = legacy.map((key) => {
      const data = read(key), rows = [...recordRows(data?.records), ...(Array.isArray(data?.attempts) ? data.attempts : [])], archived = Array.isArray(data?.archives) ? data.archives : [];
      return `<div class="legacy-group"><strong>${esc(key)} · 当前 ${rows.length} 条 / 归档 ${archived.length} 个</strong>${rows.map(legacyEntry).join("")}${archived.map((a, i) => { const r = [...recordRows(a.records), ...(Array.isArray(a.attempts) ? a.attempts : [])]; return `<details><summary>旧版归档 ${i + 1} · ${r.length} 条</summary>${r.map(legacyEntry).join("")}</details>`; }).join("")}</div>`;
    }).join("");
    $("#legacyNote").innerHTML = legacy.length ? `<details><summary>旧版记录${v8 ? ` · 当前 ${oldRecords} 条 / 归档 ${oldArchives} 个` : ""}</summary><p>历史记录只读保留，也会包含在完整 JSON 备份中。</p>${oldSections}</details>` : "旧版记录保留在原浏览器；不同设备和网址之间不会自动同步。";
    const upcoming = next();
    $("#cycleFinish").hidden = !!upcoming;
    if (!upcoming) {
      const lastDay = days().at(-1).date;
      $("#finishDescription").textContent = `四种卧推训练已完成。按计划休息至少5天后开启下一循环；参考重量默认增加 ${state.config.benchIncrease} kg，可按复测和实际RPE调整。`;
      if (!$("#nextStart").value) {
        $("#newTm").value = state.config.tm + state.config.benchIncrease;
        $("#nextStart").value = P.addDays(lastDay, 6);
        const lastLeg = [...days()].reverse().find((x) => x.type === "legs");
        $("#newSquat").value = Number(((state.records[lastLeg.day]?.plan?.weight ?? lastLeg.weight) + state.config.squatIncrease).toFixed(3));
      }
    }
  }
  function renderAll() { renderProgress(); renderSession(); renderSchedule(); renderSettings(); renderHistory(); }
  $("#scheduleGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]"); if (!b) return;
    viewedDay = Number(b.dataset.day); renderSession(); renderSchedule(); $("#workout").scrollIntoView({ behavior: "smooth" });
  });
  $("#sessionCard").addEventListener("input", saveDraft);
  $("#sessionCard").addEventListener("change", saveDraft);
  function saveDraft(e) {
    const input = e.target;
    if (!input.name || !["date", "result", "actual", "notes", "triceps"].includes(input.name) || state.records[viewedDay]) return;
    state.drafts[viewedDay] ||= {};
    state.drafts[viewedDay][input.name] = input.value;
    persist();
  }
  $("#sessionCard").addEventListener("submit", (e) => {
    if (e.target.id !== "logForm") return;
    e.preventDefault();
    const d = next(), status = $("#recordStatus");
    if (!d || d.day !== viewedDay) { status.textContent = "请先完成前面的训练。"; return; }
    const form = new FormData(e.target), date = form.get("date"), result = form.get("result");
    if (!P.validDate(date) || date < d.date || date > P.today()) { status.textContent = `训练日期需在 ${d.date} 至今天之间。`; return; }
    const rec = { day: d.day, date, plan: { ...d }, result, actual: String(form.get("actual") || "").trim().slice(0, 120), notes: String(form.get("notes") || "").trim().slice(0, 240), triceps: String(form.get("triceps") || "") };
    if (result === "paused") state.attempts.push(rec); else state.records[d.day] = rec;
    delete state.drafts[d.day];
    const ok = persist();
    const upcoming = next(); viewedDay = upcoming?.day || d.day;
    renderAll();
    const destination = $("#recordStatus") || $("#sessionCard");
    const message = result === "paused" ? "已保存暂停记录，本次训练仍可稍后继续。" : result === "incomplete" ? "已记录未完成。请按恢复情况调整后续重量。" : "训练已保存，已为你准备下一次。";
    if (destination.id === "recordStatus") destination.textContent = ok ? message : "浏览器存储不可用，请导出记录。";
    else destination.insertAdjacentHTML("beforeend", `<p class="form-message">${ok ? message : "浏览器存储不可用，请导出记录。"}</p>`);
  });
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const tm = Number($("#tm").value), increment = Number($("#increment").value), barWeight = Number($("#barWeight").value);
    const c = { tm, increment, barWeight, benchWeights: P.seedBench(tm, increment, barWeight), benchIncrease: Number($("#benchIncrease").value), squatStart: Number($("#squatStart").value), squatIncrease: Number($("#squatIncrease").value), rounds: 1, entryDay: $("#entryDay").disabled ? state.config.entryDay : Number($("#entryDay").value), startDate: $("#startDate").disabled ? state.config.startDate : $("#startDate").value };
    let error = P.validate(c);
    const highest = Math.max(0, ...Object.keys(state.records).map(Number), ...state.attempts.map((r) => r.day));
    if (!error && highest > P.CYCLE_DAYS) error = "已有本循环之外的训练记录，不能缩短计划周期。";
    const overrides = { ...state.squatOverrides };
    const overrideValue = $("#squatOverride").value;
    if (!error && overrideValue !== "") {
      const target = P.plan(c, state.records, overrides, state.attempts).find((d) => !d.beforeStart && d.type === "legs" && !state.records[d.day]);
      const weight = Number(overrideValue);
      if (!target) error = "当前周期没有待完成的腿日，请在开启下一周期时设置深蹲起点。";
      else if (!P.aligned(weight, c.increment, c.barWeight) || weight > 400) error = "下次深蹲重量须能按杆重和最小加重配出，且不超过 400 kg。";
      else overrides[target.day] = weight;
    }
    if (!error && P.plan(c, state.records, overrides, state.attempts).some((d) => !d.beforeStart && d.type === "legs" && !state.records[d.day] && !P.aligned(d.weight, c.increment, c.barWeight))) error = "之前调整的深蹲重量与新档距不匹配，请填写可配出的下次深蹲重量。";
    if (error) { $("#settingsStatus").textContent = error; return; }
    state.config = c; state.squatOverrides = overrides; const ok = persist(); renderAll(); $("#settingsStatus").textContent = ok ? "设置已保存，未来训练已更新。" : "浏览器存储不可用，请导出记录。";
  });
  $("#nextCycleForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $("#cycleStatus"), nextStart = $("#nextStart").value;
    if (next()) { status.textContent = "请先完成当前周期。"; return; }
    const lastDay = days().at(-1).date;
    if (!P.validDate(nextStart) || nextStart < P.addDays(lastDay, 6)) { status.textContent = `新循环需在 ${P.addDays(lastDay, 6)} 或之后开始，确保至少休息5个完整日。`; return; }
    const tm = Number($("#newTm").value);
    const c = { ...state.config, tm, benchWeights: P.seedBench(tm, state.config.increment, state.config.barWeight), squatStart: Number($("#newSquat").value), startDate: nextStart, entryDay: 1 };
    const error = P.validate(c); if (error) { status.textContent = error; return; }
    state.archives.push({ config: state.config, records: state.records, attempts: state.attempts, squatOverrides: state.squatOverrides });
    state.config = c; state.records = {}; state.attempts = []; state.drafts = {}; state.squatOverrides = {}; viewedDay = 1;
    e.target.reset(); const ok = persist(); renderAll(); $("#settingsStatus").textContent = ok ? "新周期已建立，旧周期已归档。" : "浏览器存储不可用，请导出记录。";
    $("#workout").scrollIntoView({ behavior: "smooth" });
  });
  function download(content, mime, name) {
    const url = URL.createObjectURL(new Blob([content], { type: mime })), a = document.createElement("a");
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("#exportJson").addEventListener("click", () => {
    const legacy = {};
    OLD_KEYS.forEach((key) => { try { const raw = localStorage.getItem(key); if (raw !== null) { try { legacy[key] = JSON.parse(raw); } catch { legacy[key] = { raw }; } } } catch {} });
    download(JSON.stringify({ exportedAt: new Date().toISOString(), current: state, legacy }, null, 2), "application/json", "力量训练-全部记录.json");
  });
  $("#exportCsv").addEventListener("click", () => {
    const cell = (v) => { let text = String(v ?? ""); if (/^\s*[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const rows = [["天数", "卧推类型", "日期", "训练", "主项", "组次", "计划重量kg", "腿日类型", "状态", "实际表现", "备注"]];
    days().forEach((d) => { const r = state.records[d.day], p = r?.plan || d; rows.push([d.day, d.type === "chest" ? p.benchDayName : "", `${r?.date || d.date}${d.beforeStart && !r ? "（倒推参考）" : ""}`, d.label, d.type === "chest" ? p.style : p.name, d.type === "rest" ? "" : `${p.sets}×${p.reps}`, p.weight ?? "", d.legVariant || "", r ? (r.result === "done" ? "完成" : "未完成") : d.beforeStart ? "此前未记录" : "", r?.actual || "", r?.notes || ""]); });
    download("\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8", "力量训练-周期计划.csv");
  });
  $("#printButton").addEventListener("click", () => window.print());
  viewedDay = next()?.day || 1; renderAll();
})();
