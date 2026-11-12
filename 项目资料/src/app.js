/* 固定模板 + 按实际日期保存的训练日志。 */
"use strict";
(() => {
  const P = window.TrainingPlan, KEY = "fitness-templates-v17";
  const OLD_KEYS = ["fitness-templates-v16", "fitness-cycle-v15", "fitness-cycle-v14", "fitness-cycle-v13", "fitness-cycle-v12", "fitness-cycle-v11", "fitness-cycle-v10", "fitness-cycle-v9", "bench-rotation-v8", "bench-smolov-v7", "bench-personal-v6", "bench-fenjue-v5", "bench-rebuild-v4", "bench-fen-jue-v3"];
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, x => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[x]);
  const clone = value => JSON.parse(JSON.stringify(value));
  function read(key) { try { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); } catch { return null; } }
  const previous = read("fitness-templates-v16") || read("fitness-cycle-v15"), saved = read(KEY);
  let state = saved?.version === 17 && Array.isArray(saved.records) ? saved : { version: 17, records: P.initialRecords(previous), draft: previous?.version === 16 && P.template(previous.draft?.templateId) ? clone(previous.draft) : null };
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
  if (state !== saved) persist();
  const choices = ["自重臂屈伸", "直杆臂屈伸", "绳索臂屈伸", "过顶臂屈伸"];
  let draft = null, noticeTimer;
  let selectedDate = state.records.map(r => r.date).sort().at(-1) || P.today(), displayedMonth = selectedDate.slice(0, 7);
  const weightText = record => record.setWeights?.some(x => x !== null) ? `${record.setWeights.map(x => x === null ? "—" : x).join(" / ")} kg` : Number.isFinite(record.legacyWeight) ? `旧记录 ${record.legacyWeight} kg` : "";
  const dateText = date => P.validDate(date) ? date.replaceAll("-", ".") : "日期未记";
  function announce(message) { clearTimeout(noticeTimer); $("#saveStatus").textContent = message; noticeTimer = setTimeout(() => { $("#saveStatus").textContent = ""; }, 3500); }
  function renderCard(t) {
    const count = state.records.filter(r => r.templateId === t.id && r.result === "done").length;
    const category = t.type === "chest" ? "卧推" : t.type === "back" ? "背部" : "腿部";
    return `<button type="button" class="calendar-cell ${t.type} ${count ? "completed" : ""}" data-template="${t.id}" aria-haspopup="dialog" aria-label="记录${esc(t.title)}，${esc(t.kind)}">
      <span class="cell-top"><span class="cell-category"><svg class="icon"><use href="#i-barbell" /></svg>${category}</span><span class="cell-kind">${t.kind}</span></span>
      <strong class="cell-main">${t.title}</strong><span class="cell-exercise">${t.main.name}</span>
      <span class="cell-dose"><span>${P.dose(t.main)}</span>${Number.isFinite(t.main.referenceWeight) ? `<em>参考 ${t.main.referenceWeight} kg</em>` : t.main.note ? `<em>${t.main.note}</em>` : ""}</span>
      ${t.accessories.length ? `<span class="cell-aux">${t.accessories.map(a => `<span class="cell-aux-row"><span>${a.name}${Number.isFinite(a.referenceWeight) ? `<small>参考 ${a.referenceWeight} kg</small>` : ""}</span><span>${P.dose(a)}</span></span>`).join("")}</span>` : ""}
      ${count ? `<span class="cell-foot"><span class="cell-status"><svg class="icon"><use href="#i-check" /></svg>已练 ${count} 次</span></span>` : ""}
    </button>`;
  }
  function renderBoard() {
    const all = P.templates();
    $("#planCalendar").innerHTML = `<div class="bench-templates">${all.filter(t => t.type === "chest").map(renderCard).join("")}</div><div class="other-templates">${all.filter(t => t.type !== "chest").map(renderCard).join("")}</div>`;
    $("#progressText").textContent = `${state.records.length} 次训练`;
    $("#historyCount").textContent = state.records.length;
  }
  function historyRow(record) {
    const t = record.snapshot || P.template(record.templateId), weight = weightText(record);
    const result = record.result === "paused" ? "暂停" : record.result === "incomplete" ? "未完成" : "";
    return `<div class="history-row"><div><strong>${esc(t?.title || "训练")}${t?.main ? `<span class="history-dose">${P.dose(t.main)}</span>` : ""}</strong>${weight ? `<p class="history-weights">逐组：${esc(weight)}</p>` : ""}${result || record.notes ? `<p>${esc([result, record.notes].filter(Boolean).join(" · "))}</p>` : ""}</div><button type="button" class="edit-record" data-record="${esc(record.id)}" aria-label="编辑${dateText(record.date)}${esc(t?.title)}">编辑</button></div>`;
  }
  function renderLegacy() {
    const groups = OLD_KEYS.map(key => ({ key, data: read(key) })).filter(x => x.data && x.data.version !== 16);
    const rows = value => Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
    function oldRows(data) {
      return [...rows(data.records), ...rows(data.attempts)].filter(r => r.templateId !== "rest" && r.plan?.type !== "rest" && r.label !== "休息").map(r => `<div class="legacy-record"><strong>${esc(r.date || "日期未记")} · ${esc(r.plan?.style || r.plan?.name || r.label || "训练")}</strong><span>${esc([Number.isFinite(r.actualWeight) ? `${r.actualWeight} kg` : "", typeof r.actual === "string" ? r.actual : r.actual ? JSON.stringify(r.actual) : "", r.notes].filter(Boolean).join(" · "))}</span></div>`).join("");
    }
    $("#legacyNote").innerHTML = groups.length ? `<details><summary>旧版记录</summary>${groups.map(({ data }) => `${oldRows(data)}${rows(data.archives).map(a => `<details class="archive-item"><summary>旧周期</summary>${oldRows(a)}</details>`).join("")}`).join("")}</details>` : "";
  }
  function renderHistory() {
    const monthText = `${displayedMonth.slice(0, 4)}年${Number(displayedMonth.slice(5))}月`;
    $("#historyCalendar").innerHTML = `<div class="month-toolbar"><button type="button" class="icon-button" data-month-step="-1" aria-label="上一月"><svg class="icon"><use href="#i-chevron" /></svg></button><strong>${monthText}</strong><button type="button" class="icon-button next-month" data-month-step="1" aria-label="下一月"><svg class="icon"><use href="#i-chevron" /></svg></button></div><div class="record-weekdays">${["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(x => `<span>${x}</span>`).join("")}</div><div class="record-calendar-grid">${P.monthSlots(displayedMonth).map(date => {
      if (!date) return '<span class="calendar-blank" aria-hidden="true"></span>';
      const records = state.records.filter(r => r.date === date), names = records.map(r => (r.snapshot || P.template(r.templateId)).title);
      return `<button type="button" class="record-day ${records.length ? "has-records" : ""} ${date === selectedDate ? "selected" : ""}" data-log-date="${date}" aria-pressed="${date === selectedDate}" aria-label="${dateText(date)}${names.length ? `，${esc(names.join("、"))}` : ""}"><span class="record-day-number">${Number(date.slice(8))}</span>${records.length ? `<span class="day-templates">${names.map(name => `<span>${esc(name)}</span>`).join("")}</span><span class="day-indicator" aria-hidden="true">${records.length > 1 ? records.length : ""}</span>` : ""}</button>`;
    }).join("")}</div>`;
    $("#historyDate").textContent = dateText(selectedDate);
    $("#historyList").innerHTML = state.records.filter(r => r.date === selectedDate).map(historyRow).join("");
    renderLegacy();
  }
  function freshDraft(templateId = "") { return { recordId: null, templateId, date: P.today(), setWeights: Array(P.template(templateId)?.main?.sets || 0).fill(null), result: "done", notes: "", triceps: "" }; }
  function fromRecord(r) { return { ...clone(r), recordId: r.id }; }
  function renderSession() {
    const t = P.template(draft.templateId), main = t?.main;
    $("#workout-title").textContent = draft.recordId ? "编辑记录" : "记录训练";
    $("#sessionCard").innerHTML = `<form id="logForm">
      <div class="record-fields"><label>日期<input name="date" type="date" value="${esc(draft.date)}" max="${P.today()}" required /></label><label>模板<select name="templateId" required><option value="" disabled ${!t ? "selected" : ""}>选择模板</option>${P.templates().map(x => `<option value="${x.id}" ${x.id === t?.id ? "selected" : ""}>${x.title}</option>`).join("")}</select></label></div>
      ${main ? `<div class="record-main"><div><strong>${main.name}</strong><span>${P.dose(main)}</span></div>${Number.isFinite(main.referenceWeight) ? `<small>参考 ${main.referenceWeight} kg</small>` : main.note ? `<small>${main.note}</small>` : ""}</div><fieldset class="set-log"><legend>逐组实重 <span>kg · 选填</span></legend><button type="button" class="copy-weight" id="copyWeight">同首组</button><div class="weight-grid">${Array.from({ length: main.sets }, (_, i) => `<label>第${i + 1}组<input name="weight-${i}" type="number" min="0" max="500" step="any" inputmode="decimal" placeholder="—" value="${esc(draft.setWeights?.[i] ?? "")}" /></label>`).join("")}</div></fieldset>` : ""}
      ${t && t.type !== "rest" ? `<details class="record-extra"><summary>补充记录</summary><div class="record-fields"><label>完成情况<select name="result">${[["done", "完成"], ["incomplete", "未完成"], ["paused", "暂停"]].map(([value, label]) => `<option value="${value}" ${draft.result === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>${t.accessories.some(a => a.id === "triceps") ? `<label>三头动作<select name="triceps"><option value="">任选</option>${choices.map(x => `<option ${x === draft.triceps ? "selected" : ""}>${x}</option>`).join("")}</select></label>` : ""}<label class="full-field">备注<input name="notes" type="text" maxlength="300" placeholder="动作感受、辅助重量等" value="${esc(draft.notes)}" /></label></div></details>` : ""}
      <div class="record-actions"><button type="submit" class="primary-button">保存记录</button></div><p class="form-message" id="recordStatus" role="status"></p>
    </form>`;
  }
  function openWorkout(templateId = "", recordId = null, date = null) {
    const record = recordId ? state.records.find(r => r.id === recordId) : null;
    draft = record ? fromRecord(record) : date ? { ...freshDraft(templateId), date } : state.draft && (!templateId || state.draft.templateId === templateId) && !state.draft.recordId ? clone(state.draft) : freshDraft(templateId);
    if (templateId && !record) draft.templateId = templateId;
    renderSession();
    if (!$("#workout").open) $("#workout").showModal();
    $("#workout").scrollTop = 0;
  }
  function collectDraft() {
    const form = new FormData($("#logForm")), t = P.template(form.get("templateId"));
    return { ...draft, templateId: String(form.get("templateId") || ""), date: String(form.get("date") || ""), result: String(form.get("result") || "done"), notes: String(form.get("notes") ?? draft.notes ?? "").trim(), triceps: String(form.get("triceps") || ""), setWeights: Array.from({ length: t?.main?.sets || 0 }, (_, i) => { const raw = String(form.get(`weight-${i}`) ?? "").trim(); return raw === "" ? null : Number(raw); }) };
  }
  $("#planCalendar").addEventListener("click", e => { const card = e.target.closest("[data-template]"); if (card) openWorkout(card.dataset.template); });
  $("#openWorkout").addEventListener("click", () => openWorkout());
  $("#recordSelectedDay").addEventListener("click", () => openWorkout("", null, selectedDate));
  $("#historyCalendar").addEventListener("click", e => {
    const dateButton = e.target.closest("[data-log-date]"), stepButton = e.target.closest("[data-month-step]");
    if (dateButton) selectedDate = dateButton.dataset.logDate;
    else if (stepButton) { displayedMonth = P.shiftMonth(displayedMonth, Number(stepButton.dataset.monthStep)); selectedDate = state.records.filter(r => r.date.startsWith(displayedMonth)).map(r => r.date).sort().at(-1) || `${displayedMonth}-01`; }
    else return;
    renderHistory();
    const target = dateButton ? `[data-log-date="${selectedDate}"]` : `[data-month-step="${stepButton.dataset.monthStep}"]`;
    $("#historyCalendar").querySelector(target)?.focus({ preventScroll: true });
  });
  $("#historyList").addEventListener("click", e => { const button = e.target.closest("[data-record]"); if (button) openWorkout("", button.dataset.record); });
  $("#closeWorkout").addEventListener("click", () => $("#workout").close());
  $("#workout").addEventListener("click", e => { const box = e.currentTarget.getBoundingClientRect(); if (e.target === e.currentTarget && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) e.currentTarget.close(); });
  $("#workout").addEventListener("close", () => { document.querySelector(`[data-template="${draft?.templateId}"]`)?.focus({ preventScroll: true }); });
  $("#sessionCard").addEventListener("input", e => { if (!e.target.name) return; draft = collectDraft(); state.draft = clone(draft); persist(); });
  $("#sessionCard").addEventListener("change", e => {
    if (!["templateId", "date"].includes(e.target.name)) return;
    draft = collectDraft();
    if (e.target.name === "templateId") { draft.setWeights = Array(P.template(draft.templateId)?.main?.sets || 0).fill(null); delete draft.legacyWeight; }
    const existing = state.records.find(r => r.date === draft.date && r.templateId === draft.templateId);
    if (existing) draft = fromRecord(existing);
    state.draft = clone(draft); persist(); renderSession();
  });
  $("#sessionCard").addEventListener("click", e => {
    if (e.target.id !== "copyWeight") return;
    const first = $("#logForm [name='weight-0']");
    if (!first?.value) { $("#recordStatus").textContent = "先填写第1组重量。"; return; }
    draft = collectDraft(); draft.setWeights.fill(Number(first.value)); state.draft = clone(draft); persist(); renderSession();
  });
  $("#sessionCard").addEventListener("submit", e => {
    if (e.target.id !== "logForm") return;
    e.preventDefault(); draft = collectDraft();
    const record = { id: draft.recordId || crypto.randomUUID(), date: draft.date, templateId: draft.templateId, result: draft.result, setWeights: draft.setWeights, notes: draft.notes.slice(0, 300), triceps: draft.triceps, snapshot: clone(P.template(draft.templateId)) };
    if (Number.isFinite(draft.legacyWeight)) record.legacyWeight = draft.legacyWeight;
    const error = P.validateRecord(record);
    if (error) { $("#recordStatus").textContent = error; return; }
    const nextState = { ...state, records: P.upsertRecord(state.records, record), draft: null }, previousState = state;
    state = nextState;
    if (!persist()) { state = previousState; $("#recordStatus").textContent = "保存失败，请备份后重试。"; return; }
    selectedDate = record.date; displayedMonth = record.date.slice(0, 7);
    renderBoard(); renderHistory(); $("#workout").close(); $("#history").open = true; announce("记录已保存");
  });
  function download(content, mime, name) { const url = URL.createObjectURL(new Blob([content], { type: mime })), a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  $("#exportJson").addEventListener("click", () => { const legacy = {}; OLD_KEYS.forEach(key => { try { const raw = localStorage.getItem(key); if (raw !== null) { try { legacy[key] = JSON.parse(raw); } catch { legacy[key] = { raw }; } } } catch {} }); download(JSON.stringify({ exportedAt: new Date().toISOString(), current: state, templates: P.templates(), legacy }, null, 2), "application/json", "健身计划-全部记录.json"); });
  $("#exportCsv").addEventListener("click", () => {
    const cell = value => { let text = String(value ?? ""); if (/^\s*[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const rows = [["日期", "模板", "主项", "参考组次", "参考重量kg", "第1组kg", "第2组kg", "第3组kg", "第4组kg", "第5组kg", "旧版实重kg", "完成情况", "三头动作", "备注"]];
    [...state.records].sort((a, b) => a.date.localeCompare(b.date)).forEach(r => { const t = r.snapshot || P.template(r.templateId); rows.push([r.date, t?.title, t?.main?.name, P.dose(t?.main), t?.main?.referenceWeight ?? "", ...Array.from({ length: 5 }, (_, i) => r.setWeights?.[i] ?? ""), r.legacyWeight ?? "", r.result === "done" ? "完成" : r.result === "paused" ? "暂停" : "未完成", r.triceps || "", r.notes || ""]); });
    download("\ufeff" + rows.map(row => row.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8", "健身计划-训练记录.csv");
  });
  $("#printButton").addEventListener("click", () => window.print());
  renderBoard(); renderHistory();
})();
