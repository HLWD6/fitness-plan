/* 个人训练日志：显示近似卧推参考重量，实际负重由训练者选择并记录。 */
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
  const count = () => Object.values(state.records).filter((r) => r.result === "done").length;
  const displayDate = (date) => date ? `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日` : "";
  const actualWeightText = (r) => Number.isFinite(r?.actualWeight) ? `${r.actualWeight} kg` : "";
  const referenceWeightText = (d) => Number.isFinite(d?.referenceWeight) ? `参考约 ${d.referenceWeight} kg` : "";
  function planParts(d) {
    if (d.type === "chest") return {
      focus: `胸 · ${d.benchDayName}`, main: d.style, dose: `${d.sets}×${d.reps}`, note: "",
      auxiliary: d.micro === 4 ? [] : [
        [["实力推", "自重臂屈伸", "俯卧撑"][d.micro - 1], "2组"],
        ["三头任选", "2×10–15"], ["哑铃弯举", "2×10–15"], ["平板支撑 / 卷腹", "2组"],
      ],
    };
    if (d.type === "back") return { focus: "背", main: "引体向上", dose: "3×5–8", note: "", auxiliary: [["高位下拉", "2×8–12"], ["器械划船", "2×8–12"]] };
    if (d.type === "legs" && d.legVariant === "A") return { focus: "腿 · 深蹲", main: "杠铃深蹲", dose: "5×5", note: "", auxiliary: [["哈克深蹲", "2×8–12"], ["腿屈伸", "2×10–15"], ["腿弯举", "2×10–15"]] };
    if (d.type === "legs") return { focus: "腿 · 单腿", main: "保加利亚分腿蹲", dose: "3×8–10 / 腿", note: "自重 / 哑铃", auxiliary: [] };
    return { focus: "休息", main: "休息", dose: "", note: "", auxiliary: [] };
  }
  function exerciseRow(number, label, name, detail = "", extra = "") {
    return `<div class="exercise-row"><span class="exercise-index">${number}</span><div class="exercise-main"><span class="exercise-label">${label}</span><strong>${esc(name)}</strong>${detail ? `<small>${esc(detail)}</small>` : ""}${extra}</div></div>`;
  }
  const choices = ["自重臂屈伸", "直杆臂屈伸", "绳索臂屈伸", "过顶臂屈伸"];
  function exerciseBody(d, record, draft) {
    if (d.type === "rest") return "";
    const parts = planParts(d), selected = record?.triceps || draft?.triceps || choices[0];
    const main = exerciseRow("01", "主项", parts.main, `${parts.dose}${parts.note ? ` · ${parts.note}` : ""}`);
    const auxiliary = parts.auxiliary.map(([name, dose], i) => {
      const selector = name === "三头任选" ? `<label class="choice-label">动作<select name="triceps" form="logForm" ${record ? "disabled" : ""}>${choices.map((x) => `<option ${x === selected ? "selected" : ""}>${x}</option>`).join("")}</select></label>` : "";
      return exerciseRow(String(i + 2).padStart(2, "0"), "辅助", name, dose, selector);
    }).join("");
    return `<div class="exercise-list">${main}${auxiliary}</div>`;
  }
  function recordForm(d, record, draft, upcoming) {
    if (d.type === "rest") return "";
    if (record) {
      const weight = actualWeightText(record);
      return `<div class="completed-note"><svg class="icon"><use href="#i-check" /></svg><div><strong>${record.backfilled ? "已补记" : "已记录"} · ${esc(record.date)}</strong><p>${record.result === "incomplete" ? "未完成" : "已完成"}${weight ? ` · 主项 ${esc(weight)}` : ""}${record.actual ? ` · ${esc(record.actual)}` : ""}${record.notes ? ` · ${esc(record.notes)}` : ""}</p></div></div>`;
    }
    if (d.beforeStart) return `<div class="preview-note">此前未记录。</div>`;
    if (!upcoming || upcoming.day !== d.day) return `<div class="preview-note">请先记录前面的训练。</div>`;
    const tooEarly = d.date > P.today();
    const weightLabel = d.type === "chest" ? "卧推实重" : d.legVariant === "A" ? "深蹲实重" : "哑铃重量（每只）";
    const weightValue = draft?.actualWeight ?? "";
    const weightField = d.type === "chest" || d.type === "legs"
      ? `<label>${weightLabel} <span>kg · 选填</span><input name="actualWeight" type="number" min="0" max="500" step="any" inputmode="decimal" placeholder="训练后填写" value="${esc(weightValue)}" /></label>`
      : "";
    return `<form class="record-form" id="logForm"><div class="record-title"><div><h4>本次记录</h4></div></div><div class="record-fields">
      <label>训练日期<input name="date" type="date" value="${esc(draft?.date || P.today())}" max="${P.today()}" min="${d.date}" required /></label>
      <label>完成情况<select name="result"><option value="done" ${draft?.result === "done" ? "selected" : ""}>完成</option><option value="incomplete" ${draft?.result === "incomplete" ? "selected" : ""}>未完成</option><option value="paused" ${draft?.result === "paused" ? "selected" : ""}>暂停</option></select></label>
      ${weightField}
      <label class="full-field">表现 <span>选填</span><input name="actual" type="text" maxlength="120" placeholder="组次、动作感受等" value="${esc(draft?.actual || "")}" /></label>
      <label class="full-field">备注 <span>选填</span><input name="notes" type="text" maxlength="240" placeholder="补充训练情况" value="${esc(draft?.notes || "")}" /></label>
      </div><div class="record-actions"><button type="submit" class="primary-button" ${tooEarly ? "disabled" : ""}>保存记录</button><span>${tooEarly ? `最早 ${displayDate(d.date)} 记录` : ""}</span></div><p class="form-message" id="recordStatus" role="status"></p></form>`;
  }
  function renderSession() {
    const all = days(), upcoming = next(), d = all.find((x) => x.day === viewedDay) || upcoming || all.at(-1);
    viewedDay = d.day;
    const record = state.records[d.day], draft = state.drafts[d.day] || {}, parts = planParts(d);
    const mode = record ? (record.result === "done" ? "已完成" : "未完成") : d.beforeStart ? "未记录" : upcoming?.day === d.day ? "下一次" : d.type === "rest" ? "" : "预览";
    const load = [referenceWeightText(d), actualWeightText(record) ? `实重 ${actualWeightText(record)}` : ""].filter(Boolean).join(" · ");
    $("#sessionCard").innerHTML = `<div class="session-topline"><span>第 ${String(d.day).padStart(2, "0")} 天 · ${displayDate(record?.date || d.date)}</span><span class="session-pill">${mode}</span></div><h3 class="session-title">${esc(parts.focus)}</h3>${load ? `<p class="session-reference">${esc(load)}</p>` : ""}${exerciseBody(d, record, draft)}${recordForm(d, record, draft, upcoming)}`;
  }
  function renderSchedule() {
    const upcoming = next();
    $("#planCalendar").innerHTML = days().filter((d) => d.type !== "rest").map((d) => {
      const r = state.records[d.day], parts = planParts(d), weight = actualWeightText(r), date = r?.date || d.date;
      const complete = r?.result === "done", incomplete = r?.result === "incomplete", paused = !r && state.attempts.some((a) => a.day === d.day), isUpcoming = upcoming?.day === d.day;
      const classes = [d.type, complete ? "completed" : "", isUpcoming ? "upcoming" : "", incomplete ? "incomplete" : ""].filter(Boolean).join(" ");
      const status = complete ? "已完成" : incomplete ? "未完成" : paused ? "已暂停" : isUpcoming ? "下一次" : "";
      const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(`${date}T12:00:00`).getDay()];
      return `<button type="button" class="calendar-cell ${classes}" data-day="${d.day}" aria-haspopup="dialog" aria-label="第${d.day}天，${esc(parts.focus)}，${esc(parts.main)} ${parts.dose}${status ? `，${status}` : ""}">
        <span class="cell-date"><span class="cell-number">${String(d.day).padStart(2, "0")}</span><time datetime="${date}">${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} ${weekday}</time></span>
        ${d.type !== "rest" ? `<span class="cell-kind">${esc(parts.focus)}</span>` : ""}
        <strong class="cell-main">${esc(parts.main)}</strong>
        ${parts.dose ? `<span class="cell-dose"><span>${parts.dose}</span>${Number.isFinite(d.referenceWeight) ? `<em>参考 ${d.referenceWeight} kg</em>` : parts.note ? `<em>${esc(parts.note)}</em>` : ""}</span>` : ""}
        ${parts.auxiliary.length ? `<span class="cell-aux">${parts.auxiliary.map(([name, dose]) => `<span class="cell-aux-row"><span>${esc(name)}</span><span>${dose}</span></span>`).join("")}</span>` : ""}
        <span class="cell-foot"><span class="cell-status">${complete ? '<svg class="icon"><use href="#i-check" /></svg>' : ""}${status}</span>${weight ? `<span class="cell-actual">实重 ${esc(weight)}</span>` : ""}</span>
      </button>`;
    }).join("");
  }
  function renderProgress() {
    const all = days(), total = all.filter((d) => d.type !== "rest").length;
    $("#progressText").textContent = `已完成 ${count()} / ${total}`;
    $("#calendarRange").textContent = `${displayDate(all[0].date)} — ${displayDate(all.at(-1).date)}`;
  }
  function historyRow(r) {
    const result = r.result === "done" ? "完成" : r.result === "paused" ? "暂停" : "未完成";
    const plan = r.plan || {}, title = plan.style || plan.name || "训练", sets = plan.sets ? ` · ${plan.sets} × ${plan.reps}` : "";
    return `<div class="history-row"><span class="history-day">${displayDate(r.date)}<small>第 ${r.day} 天</small></span><div><strong>${esc(title)}${esc(sets)}${actualWeightText(r) ? ` · 实重 ${esc(actualWeightText(r))}` : ""}</strong><p>${esc(result)}${r.backfilled ? " · 补记，日期按计划推算" : ""}${r.actual ? ` · ${esc(r.actual)}` : ""}${r.notes ? ` · ${esc(r.notes)}` : ""}</p></div><span class="history-result ${r.result === "done" ? "" : "caution"}">${result}</span></div>`;
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
    $("#legacyNote").innerHTML = legacy.length ? `<details><summary>旧版记录${v8 ? ` · 当前 ${oldRecords} 条 / 归档 ${oldArchives} 个` : ""}</summary><p>旧版历史只读保留，也会包含在完整 JSON 备份中。</p>${oldSections}</details>` : "";
    const upcoming = next();
    $("#cycleFinish").hidden = !!upcoming;
    if (!upcoming) {
      $("#history").open = true;
      const lastDay = days().at(-1).date;
      $("#finishDescription").textContent = "休息至少5天后，开启下一轮。";
      if (!$("#nextStart").value) $("#nextStart").value = P.addDays(lastDay, 6);
    }
  }
  function renderAll() { renderProgress(); renderSession(); renderSchedule(); renderHistory(); }
  function openWorkout(day) {
    viewedDay = day; renderSession();
    const dialog = $("#workout");
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  $("#planCalendar").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-day]");
    if (cell) openWorkout(Number(cell.dataset.day));
  });
  $("#openWorkout").addEventListener("click", () => openWorkout(next()?.day || viewedDay || 1));
  $("#closeWorkout").addEventListener("click", () => $("#workout").close());
  $("#workout").addEventListener("click", (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (e.target === e.currentTarget && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) e.currentTarget.close();
  });
  $("#workout").addEventListener("close", () => document.querySelector(`[data-day="${viewedDay}"]`)?.focus({ preventScroll: true }));
  let noticeTimer;
  function announce(message) {
    clearTimeout(noticeTimer); $("#saveStatus").textContent = message;
    noticeTimer = setTimeout(() => { $("#saveStatus").textContent = ""; }, 3500);
  }
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
    $("#workout").close();
    announce(ok ? (result === "paused" ? "已暂停" : "记录已保存") : "存储不可用，请备份记录");
  });
  $("#nextCycleForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const status = $("#cycleStatus"), nextStart = $("#nextStart").value;
    if (next()) { status.textContent = "请先完成当前周期。"; return; }
    const lastDay = days().at(-1).date, earliest = P.addDays(lastDay, 6);
    if (!P.validDate(nextStart) || nextStart < earliest) { status.textContent = `新循环需在 ${earliest} 或之后开始，确保至少休息5个完整日。`; return; }
    state.archives.push({ config: state.config, records: state.records, attempts: state.attempts, squatOverrides: {} });
    state.config = P.defaults(nextStart); state.records = {}; state.attempts = []; state.drafts = {}; state.confirmedPriorThrough = 0; viewedDay = 1;
    e.target.reset(); const ok = persist(); renderAll(); $("#history").open = false; $("#schedule").scrollIntoView({ behavior: "smooth" });
    announce(ok ? "新一轮已开启" : "存储不可用，请备份记录");
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
    const rows = [["天数", "训练", "卧推类型", "腿日类型", "日期", "主项", "组次", "参考重量kg", "实际重量kg", "状态", "表现记录", "备注"]];
    days().forEach((d) => { const r = state.records[d.day], p = r?.plan || d; rows.push([d.day, d.label, d.type === "chest" ? p.benchDayName : "", d.legVariant || "", `${r?.date || d.date}${d.beforeStart && !r ? "（倒推参考）" : ""}`, p.style || p.name, d.type === "rest" ? "" : `${p.sets}×${p.reps}`, d.type === "chest" ? d.referenceWeight : "", r?.actualWeight ?? "", r ? (r.result === "done" ? "完成" : "未完成") : d.beforeStart ? "此前未记录" : "", r?.actual || "", r?.notes || ""]); });
    download("\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8", "健身计划-训练记录.csv");
  });
  $("#printButton").addEventListener("click", () => window.print());
  viewedDay = next()?.day || 1;
  renderAll();
})();
