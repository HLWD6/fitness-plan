/* 个人训练日志：只安排动作与组次，负重由训练者选择并记录。 */
"use strict";
(() => {
  const P = window.TrainingPlan;
  const KEY = "fitness-cycle-v15";
  const OLD_KEYS = ["fitness-cycle-v14", "fitness-cycle-v13", "fitness-cycle-v12", "fitness-cycle-v11", "fitness-cycle-v10", "fitness-cycle-v9", "bench-rotation-v8", "bench-smolov-v7", "bench-personal-v6", "bench-fenjue-v5", "bench-rebuild-v4", "bench-fen-jue-v3"];
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[x]);
  function read(key) {
    try { const value = localStorage.getItem(key); return value === null ? null : JSON.parse(value); } catch { return null; }
  }
  function firstSession(c) {
    const d = P.plan(c)[0];
    return { day: 1, date: c.startDate, plan: { ...d }, result: "done", actualWeight: 120, actual: "5×8", notes: "快速节奏卧推", triceps: "" };
  }
  function fresh() {
    const config = P.defaults();
    return { version: 15, config, records: { 1: firstSession(config) }, attempts: [], archives: [], drafts: {}, confirmedPriorThrough: 0 };
  }
  const saved = read(KEY);
  const validSaved = saved?.version === 15 && !P.validate(saved.config) && saved.records && typeof saved.records === "object" && Array.isArray(saved.archives);
  let state = validSaved ? { ...fresh(), ...saved, attempts: Array.isArray(saved.attempts) ? saved.attempts : [], drafts: saved.drafts || {} } : fresh();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  if (!validSaved) {
    const previous = OLD_KEYS.map(read).find((x) => x && x.config && x.records && Array.isArray(x.archives));
    if (previous) {
      const oldCycle = Object.keys(previous.records).length || (previous.attempts || []).length
        ? [{ config: previous.config, records: previous.records, attempts: previous.attempts || [], squatOverrides: previous.squatOverrides || {} }]
        : [];
      state.archives = [...previous.archives, ...oldCycle];
    }
    persist();
  }
  let viewedDay = null;
  const days = () => P.plan(state.config, state.records, {}, state.attempts);
  const next = () => P.nextWorkout(days(), state.records);
  const count = () => Object.keys(state.records).length;
  const displayDate = (date) => date ? `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日` : "";
  const actualWeightText = (r) => Number.isFinite(r?.actualWeight) ? `${r.actualWeight} kg` : "";
  function warmupText(d) {
    return d.type === "legs" && d.legVariant === "B" ? "徒手热身，逐步熟悉动作" : "空杆或轻重量起步，逐步加到当天合适重量";
  }
  function exerciseRow(number, label, name, detail = "", extra = "") {
    return `<div class="exercise-row"><span class="exercise-index">${number}</span><div class="exercise-main"><span class="exercise-label">${label}</span><strong>${name}</strong>${detail ? `<small>${detail}</small>` : ""}${extra}</div></div>`;
  }
  const choices = ["自重臂屈伸", "直杆臂屈伸", "绳索臂屈伸", "过顶臂屈伸"];
  function exerciseBody(d, record, draft) {
    const selected = record?.triceps || draft?.triceps || choices[0];
    if (d.type === "chest") {
      const main = exerciseRow("01", `卧推 · ${d.benchDayName}`, d.style, `${d.sets} 组 × ${d.reps} 次 · 负重自定，训练后记录`, `<small>${esc(d.cue)}</small>`);
      if (d.micro === 4) return `<div class="warmup-box"><div><span class="warmup-kicker">减载要点</span><strong>无腿驱动 · 动作轻松</strong></div><p>双脚放松，不蹬腿；这一天不做大重量辅助动作。</p></div><p class="ramp-line"><b>上杠准备</b> ${warmupText(d)}</p><div class="exercise-list">${main}</div>`;
      const selector = `<label class="choice-label">三头动作 <select name="triceps" form="logForm" ${record ? "disabled" : ""}>${choices.map((x) => `<option ${x === selected ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
      const accessory = ["实力推", "上斜卧推", "自重臂屈伸"][d.micro - 1];
      const warmup = `<div class="warmup-box"><div><span class="warmup-kicker">卧推前准备</span><strong>轻松活动肩背与胸部</strong></div><p>做几组不疲劳的肩胛、胸椎和手臂热身；保持轻松，发沉就减少。</p></div>`;
      return `${warmup}<p class="ramp-line"><b>上杠准备</b> ${warmupText(d)}</p>
        <div class="exercise-list">${main}${exerciseRow("02", "辅助", accessory, "2 组 · 留有余力，重量现场调整")}${exerciseRow("03", "手臂", "三头任选一项 + 哑铃弯举", "各 2 组 × 10–15 次", selector)}${exerciseRow("04", "核心", "平板支撑或卷腹", "各选一项，做 2 组")}</div>`;
    }
    if (d.type === "back") return `<p class="ramp-line"><b>准备</b> 活动肩背，轻松做 1–2 组辅助引体。</p><div class="exercise-list">${exerciseRow("01", "主项", "引体向上", "3 组 × 5–8 次 · 可使用辅助")}${exerciseRow("02", "辅助", "高位下拉 + 器械划船", "各 2 组 × 8–12 次 · 留有余力")}</div>`;
    if (d.type === "legs") {
      const main = d.legVariant === "A"
        ? exerciseRow("01", "主项 · 深蹲日", "杠铃深蹲", "5 组 × 5 次 · 负重自定，训练后记录")
        : exerciseRow("01", "主项 · 单腿日", "保加利亚分腿蹲", "3 组 × 8–10 次 / 每腿 · 自重或哑铃负重");
      const assist = d.legVariant === "A"
        ? exerciseRow("02", "辅助", "哈克深蹲", "2 组 × 8–12 次 · 留有余力") + exerciseRow("03", "补充", "腿屈伸 + 腿弯举", "各 2 组 × 10–15 次")
        : "";
      return `<p class="ramp-line"><b>准备</b> ${warmupText(d)}</p><div class="exercise-list">${main}${assist}</div>`;
    }
    return `<div class="rest-message"><span>✳</span><div><strong>今天安排休息</strong><p>散步或轻活动即可，下一次按计划继续。</p></div></div>`;
  }
  function recordForm(d, record, draft, upcoming) {
    if (d.type === "rest") return "";
    if (record) {
      const weight = actualWeightText(record);
      return `<div class="completed-note"><svg class="icon"><use href="#i-check" /></svg><div><strong>${record.backfilled ? "已补记 · 日期为计划日期" : "已记录"} · ${esc(record.date)}</strong><p>${record.result === "incomplete" ? "未完成 · 请按恢复情况调整" : "已完成"}${weight ? ` · 主项 ${esc(weight)}` : ""}${record.actual ? ` · ${esc(record.actual)}` : ""}${record.notes ? ` · ${esc(record.notes)}` : ""}</p></div></div>`;
    }
    if (d.beforeStart) return `<div class="preview-note">这次安排在开始记录之前，未自动记为完成；日期为倒推参考。</div>`;
    if (!upcoming || upcoming.day !== d.day) return `<div class="preview-note">这是后续训练预览。请先完成前面的训练记录。</div>`;
    const tooEarly = d.date > P.today();
    const weightLabel = d.type === "chest" ? "卧推实重" : d.legVariant === "A" ? "深蹲实重" : "哑铃重量（每只）";
    const weightValue = draft?.actualWeight ?? "";
    const weightField = d.type === "chest" || d.type === "legs"
      ? `<label>${weightLabel} <span>kg · 选填</span><input name="actualWeight" type="number" min="0" max="500" step="any" inputmode="decimal" placeholder="训练后填写" value="${esc(weightValue)}" /></label>`
      : "";
    return `<form class="record-form" id="logForm"><div class="record-title"><div><span class="card-kicker">TRAINING LOG</span><h4>记录本次训练</h4></div><span>重量按实际情况填写</span></div><div class="record-fields">
      <label>训练日期<input name="date" type="date" value="${esc(draft?.date || P.today())}" max="${P.today()}" min="${d.date}" required /></label>
      <label>完成情况<select name="result"><option value="done" ${draft?.result === "done" ? "selected" : ""}>完成</option><option value="incomplete" ${draft?.result === "incomplete" ? "selected" : ""}>未完成</option><option value="paused" ${draft?.result === "paused" ? "selected" : ""}>暂停，稍后再练</option></select></label>
      ${weightField}
      <label class="full-field">表现记录 <span>选填</span><input name="actual" type="text" maxlength="120" placeholder="例如：组次完成情况、动作感受或引体辅助重量" value="${esc(draft?.actual || "")}" /></label>
      <label class="full-field">备注 <span>选填</span><input name="notes" type="text" maxlength="240" placeholder="补充训练情况" value="${esc(draft?.notes || "")}" /></label>
      </div><div class="record-actions"><button type="submit" class="primary-button" ${tooEarly ? "disabled" : ""}>保存训练记录 <svg class="icon"><use href="#i-arrow" /></svg></button><span>${tooEarly ? `最早 ${displayDate(d.date)} 记录` : "记录保存在当前浏览器"}</span></div><p class="form-message" id="recordStatus" role="status"></p></form>`;
  }
  function renderSession() {
    const all = days(), upcoming = next();
    let d = all.find((x) => x.day === viewedDay) || upcoming || all[all.length - 1];
    viewedDay = d.day;
    const record = state.records[d.day], draft = state.drafts[d.day] || {}, p = record?.plan || d;
    const mode = record ? "已记录" : d.beforeStart ? "此前未记录" : upcoming?.day === d.day ? "下一次训练" : d.type === "rest" ? "恢复日" : "计划预览";
    const value = d.type === "rest" ? "休息" : d.type === "back" ? "引体向上" : `${esc(p.sets)} <span>×</span> ${esc(p.reps)}`;
    const weight = actualWeightText(record);
    const unit = d.type === "rest" ? "让身体恢复" : d.type === "back" ? "3 组 · 5–8 次" : d.type === "chest" ? `${weight || "重量训练后记录"} · ${esc(p.style)}` : `${weight || (d.legVariant === "A" ? "重量训练后记录" : "哑铃负重自选")} · ${esc(p.name)}`;
    const lastRecord = Object.values(state.records).sort((a, b) => b.day - a.day)[0];
    const warning = upcoming?.day === d.day && lastRecord?.result === "incomplete" ? `<div class="mini-warning">上次训练未完成。按恢复情况调整训练或多休息。</div>` : "";
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
        const r = state.records[d.day], selected = d.day === viewedDay;
        const detail = r && actualWeightText(r) ? ` · ${actualWeightText(r)}` : "";
        const desc = d.type === "chest" ? `${d.style} · ${d.sets}×${d.reps}${detail}` : d.type === "legs" ? (d.legVariant === "A" ? `杠铃深蹲 · 5×5${detail}` : "保加利亚分腿蹲 · 3×8–10/腿") : d.type === "back" ? "引体向上" : "休息";
        return `<button type="button" class="schedule-cell ${d.type} ${selected ? "selected" : ""} ${r ? "done" : ""}" data-day="${d.day}" aria-label="第${d.day}天 ${d.label} ${esc(desc)}${r ? " 已记录" : d.beforeStart ? " 此前未记录" : upcoming?.day === d.day ? " 下一次训练" : ""}"><span>DAY ${String(d.day).padStart(2, "0")} ${r ? "✓" : d.beforeStart ? "· 此前" : upcoming?.day === d.day ? "· 下次" : ""}</span><strong>${d.label}</strong><small>${esc(desc)}</small></button>`;
      }).join("")}</div></div>`;
    }).join("");
    $("#scheduleNote").textContent = "胸、背、腿、休息四天一组；腿日的杠铃深蹲与保加利亚分腿蹲交替。重量不自动推算，训练后记录实重。";
    $("#printSchedule").innerHTML = `<h3>16 天循环</h3><table><thead><tr><th>天数 / 日期</th><th>训练</th><th>主项 / 组次</th><th>记录</th></tr></thead><tbody>${all.map((d) => { const r = state.records[d.day], p = r?.plan || d; const title = d.type === "chest" ? p.style : d.name; const sets = d.type === "rest" ? "" : `${p.sets} × ${p.reps}`; const load = actualWeightText(r); const note = d.type === "chest" || d.legVariant === "A" ? (load || "实重自记") : d.legVariant === "B" ? "负重自选" : "—"; return `<tr><td>${d.day} / ${esc(r?.date || d.date)}${d.beforeStart && !r ? "（参考）" : ""}</td><td>${d.label}</td><td>${esc(title)} ${sets}</td><td>${esc(note)}</td></tr>`; }).join("")}</tbody></table>`;
  }
  function renderProgress() {
    const upcoming = next(), total = days().filter((d) => d.type !== "rest").length;
    $("#progressCount").textContent = count();
    $("#progressDenominator").textContent = `/ ${total} 次训练`;
    $("#progressBar").style.width = `${Math.min(100, count() / total * 100)}%`;
    $("#progressText").textContent = upcoming ? `下一项：DAY ${String(upcoming.day).padStart(2, "0")} · ${upcoming.type === "chest" ? upcoming.benchDayName : upcoming.label}` : "循环训练已完成";
    const latestBench = Object.values(state.records).filter((r) => r.plan?.type === "chest" && Number.isFinite(r.actualWeight)).sort((a, b) => b.day - a.day)[0];
    $("#summaryTm").innerHTML = latestBench ? `${esc(latestBench.actualWeight)} <small>kg</small>` : "待记录";
  }
  function historyRow(r) {
    const result = r.result === "done" ? "完成" : r.result === "paused" ? "暂停" : "未完成";
    const plan = r.plan || {}, title = plan.style || plan.name || "训练", sets = plan.sets ? ` · ${plan.sets} × ${plan.reps}` : "";
    return `<div class="history-row"><span class="history-day">${displayDate(r.date)}<small>DAY ${String(r.day).padStart(2, "0")}</small></span><div><strong>${esc(title)}${esc(sets)}${actualWeightText(r) ? ` · 实重 ${esc(actualWeightText(r))}` : ""}</strong><p>${esc(result)}${r.backfilled ? " · 补记，日期按计划推算" : ""}${r.actual ? ` · ${esc(r.actual)}` : ""}${r.notes ? ` · ${esc(r.notes)}` : ""}</p></div><span class="history-result ${r.result === "done" ? "" : "caution"}">${result}</span></div>`;
  }
  function renderHistory() {
    const entries = [...Object.values(state.records), ...state.attempts].sort((a, b) => b.day - a.day || b.date.localeCompare(a.date));
    const archived = state.archives.map((a, i) => `<details class="archive-item"><summary>已归档周期 ${i + 1} · ${Object.keys(a.records || {}).length} 次训练</summary><div>${[...Object.values(a.records || {}), ...(Array.isArray(a.attempts) ? a.attempts : [])].sort((x, y) => y.day - x.day || y.date.localeCompare(x.date)).map(historyRow).join("") || "暂无记录"}</div></details>`).join("");
    $("#historyList").innerHTML = entries.length ? entries.slice(0, 5).map(historyRow).join("") + (entries.length > 5 ? `<details class="archive-item"><summary>查看其余 ${entries.length - 5} 条记录</summary>${entries.slice(5).map(historyRow).join("")}</details>` : "") + archived : `<div class="empty-history"><span>✳</span><strong>还没有训练记录</strong><p>完成一次训练后，记录会出现在这里。</p></div>${archived}`;
    const legacy = OLD_KEYS.filter((key) => read(key) !== null);
    const v8 = read("bench-rotation-v8"), oldRecords = Array.isArray(v8?.records) ? v8.records.length : 0, oldArchives = Array.isArray(v8?.archives) ? v8.archives.length : 0;
    function legacyEntry(r) {
      if (typeof r.actual === "string") return `<div class="legacy-record"><strong>${esc(r.date || "日期未记录")} · ${esc(r.plan?.name || "训练")}</strong><span>旧计划 ${esc(r.plan?.weight ?? "—")} kg · ${esc(r.plan?.sets ?? "—")} × ${esc(r.plan?.reps ?? "—")}；${esc(r.actual || "未填实际表现")}${r.notes ? `；${esc(r.notes)}` : ""}</span></div>`;
      const weights = Array.isArray(r.actual?.weights) ? r.actual.weights.join(" / ") : (r.actual?.weight ?? "");
      const reps = Array.isArray(r.actual?.reps) ? r.actual.reps.join(" / ") : (r.actual?.reps ?? "");
      const rpes = Array.isArray(r.actual?.rpes) ? r.actual.rpes.map((x) => x ?? "—").join(" / ") : "";
      return `<div class="legacy-record"><strong>${esc(r.date || "日期未记录")} · ${esc(r.label || r.plan?.key || "训练")}</strong><span>旧计划 ${esc(r.plan?.weight ?? "—")} kg · ${esc(r.plan?.sets ?? "—")} × ${esc(r.plan?.reps ?? "—")}；实际 ${esc(weights || "—")} kg，次数 ${esc(reps || "—")}${rpes ? `，RPE ${esc(rpes)}` : ""}${r.result?.text ? `；${esc(r.result.text)}` : ""}</span></div>`;
    }
    const recordRows = (v) => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
    const oldSections = legacy.map((key) => {
      const data = read(key), rows = [...recordRows(data?.records), ...(Array.isArray(data?.attempts) ? data.attempts : [])], old = Array.isArray(data?.archives) ? data.archives : [];
      return `<div class="legacy-group"><strong>${esc(key)} · 当前 ${rows.length} 条 / 归档 ${old.length} 个</strong>${rows.map(legacyEntry).join("")}${old.map((a, i) => { const r = [...recordRows(a.records), ...(Array.isArray(a.attempts) ? a.attempts : [])]; return `<details><summary>旧版归档 ${i + 1} · ${r.length} 条</summary>${r.map(legacyEntry).join("")}</details>`; }).join("")}</div>`;
    }).join("");
    $("#legacyNote").innerHTML = legacy.length ? `<details><summary>旧版记录${v8 ? ` · 当前 ${oldRecords} 条 / 归档 ${oldArchives} 个` : ""}</summary><p>旧版历史只读保留，也会包含在完整 JSON 备份中。</p>${oldSections}</details>` : "旧版记录保留在原浏览器；不同设备和网址之间不会自动同步。";
    const upcoming = next();
    $("#cycleFinish").hidden = !!upcoming;
    if (!upcoming) {
      const lastDay = days().at(-1).date;
      $("#finishDescription").textContent = "本轮训练已完成。休息至少5个完整日后，可开启下一轮并继续记录。";
      if (!$("#nextStart").value) $("#nextStart").value = P.addDays(lastDay, 6);
    }
  }
  function renderAll() { renderProgress(); renderSession(); renderSchedule(); renderHistory(); }
  $("#scheduleGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]"); if (!b) return;
    viewedDay = Number(b.dataset.day); renderSession(); renderSchedule(); $("#workout").scrollIntoView({ behavior: "smooth" });
  });
  $("#sessionCard").addEventListener("input", saveDraft);
  $("#sessionCard").addEventListener("change", saveDraft);
  function saveDraft(e) {
    const input = e.target;
    if (!input.name || !["date", "result", "actual", "actualWeight", "notes", "triceps"].includes(input.name) || state.records[viewedDay]) return;
    state.drafts[viewedDay] ||= {};
    state.drafts[viewedDay][input.name] = input.value;
    persist();
  }
  $("#sessionCard").addEventListener("submit", (e) => {
    if (e.target.id !== "logForm") return;
    e.preventDefault();
    const d = next(), status = $("#recordStatus");
    if (!d || d.day !== viewedDay) { status.textContent = "请先完成前面的训练。"; return; }
    const form = new FormData(e.target), date = form.get("date"), result = form.get("result"), rawWeight = String(form.get("actualWeight") || "").trim();
    if (!P.validDate(date) || date < d.date || date > P.today()) { status.textContent = `训练日期需在 ${d.date} 至今天之间。`; return; }
    if (rawWeight && (!Number.isFinite(Number(rawWeight)) || Number(rawWeight) < 0 || Number(rawWeight) > 500)) { status.textContent = "实重请填写 0–500 kg。"; return; }
    const rec = { day: d.day, date, plan: { ...d }, result, actualWeight: rawWeight ? Number(rawWeight) : null, actual: String(form.get("actual") || "").trim().slice(0, 120), notes: String(form.get("notes") || "").trim().slice(0, 240), triceps: String(form.get("triceps") || "") };
    if (result === "paused") state.attempts.push(rec); else state.records[d.day] = rec;
    delete state.drafts[d.day];
    const ok = persist(), upcoming = next(); viewedDay = upcoming?.day || d.day;
    renderAll();
    const destination = $("#recordStatus") || $("#sessionCard");
    const message = result === "paused" ? "已保存暂停记录，本次训练仍可稍后继续。" : result === "incomplete" ? "已记录未完成。后续训练按实际状态安排。" : "训练已保存，已为你准备下一次。";
    if (destination.id === "recordStatus") destination.textContent = ok ? message : "浏览器存储不可用，请导出记录。";
    else destination.insertAdjacentHTML("beforeend", `<p class="form-message">${ok ? message : "浏览器存储不可用，请导出记录。"}</p>`);
  });
  $("#nextCycleForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $("#cycleStatus"), nextStart = $("#nextStart").value;
    if (next()) { status.textContent = "请先完成当前周期。"; return; }
    const lastDay = days().at(-1).date, earliest = P.addDays(lastDay, 6);
    if (!P.validDate(nextStart) || nextStart < earliest) { status.textContent = `新循环需在 ${earliest} 或之后开始，确保至少休息5个完整日。`; return; }
    state.archives.push({ config: state.config, records: state.records, attempts: state.attempts, squatOverrides: {} });
    state.config = P.defaults(nextStart); state.records = {}; state.attempts = []; state.drafts = {}; state.confirmedPriorThrough = 0; viewedDay = 1;
    e.target.reset(); const ok = persist(); renderAll(); $("#workout").scrollIntoView({ behavior: "smooth" });
    const destination = $("#cycleStatus");
    if (destination) destination.textContent = ok ? "新周期已建立，旧周期已归档。" : "浏览器存储不可用，请导出记录。";
  });
  function download(content, mime, name) {
    const url = URL.createObjectURL(new Blob([content], { type: mime })), a = document.createElement("a");
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("#exportJson").addEventListener("click", () => {
    const legacy = {};
    OLD_KEYS.forEach((key) => { try { const raw = localStorage.getItem(key); if (raw !== null) { try { legacy[key] = JSON.parse(raw); } catch { legacy[key] = { raw }; } } } catch {} });
    download(JSON.stringify({ exportedAt: new Date().toISOString(), current: state, legacy }, null, 2), "application/json", "健身计划-全部记录.json");
  });
  $("#exportCsv").addEventListener("click", () => {
    const cell = (v) => { let text = String(v ?? ""); if (/^\s*[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const rows = [["天数", "训练", "卧推类型", "腿日类型", "日期", "主项", "组次", "实际重量kg", "状态", "表现记录", "备注"]];
    days().forEach((d) => { const r = state.records[d.day], p = r?.plan || d; rows.push([d.day, d.label, d.type === "chest" ? p.benchDayName : "", d.legVariant || "", `${r?.date || d.date}${d.beforeStart && !r ? "（倒推参考）" : ""}`, p.style || p.name, d.type === "rest" ? "" : `${p.sets}×${p.reps}`, r?.actualWeight ?? "", r ? (r.result === "done" ? "完成" : "未完成") : d.beforeStart ? "此前未记录" : "", r?.actual || "", r?.notes || ""]); });
    download("\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8", "健身计划-训练记录.csv");
  });
  $("#printButton").addEventListener("click", () => window.print());
  viewedDay = next()?.day || 1;
  renderAll();
})();
