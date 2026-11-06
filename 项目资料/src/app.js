/* 本版单独保存，旧版训练与归档只读保留。 */
"use strict";
(() => {
  const P = window.TrainingPlan;
  const KEY = "fitness-cycle-v12";
  const OLD_KEYS = ["fitness-cycle-v11", "fitness-cycle-v10", "fitness-cycle-v9", "bench-rotation-v8", "bench-smolov-v7", "bench-personal-v6", "bench-fenjue-v5", "bench-rebuild-v4", "bench-fen-jue-v3"];
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[x]);
  function read(key) {
    try { const value = localStorage.getItem(key); return value === null ? null : JSON.parse(value); } catch { return null; }
  }
  function fresh() { return { version: 12, config: P.defaults(), records: {}, attempts: [], archives: [], drafts: {}, squatOverrides: {} }; }
  const saved = read(KEY);
  let state = saved && saved.version === 12 && !P.validate(saved.config) && saved.records && Array.isArray(saved.archives)
    ? { ...fresh(), ...saved, attempts: Array.isArray(saved.attempts) ? saved.attempts : [], drafts: saved.drafts || {} } : fresh();
  // 沿用上版的进度、记录及历史处方，只重算未来的目标重量。
  if (!saved) {
    const previous = read("fitness-cycle-v11");
    if (previous?.version === 11 && previous.config && previous.records && Array.isArray(previous.archives)) {
      const oldConfig = previous.config;
      const config = { ...oldConfig, tm: 160, benchWeights: P.seedBench(160, oldConfig.increment, oldConfig.barWeight) };
      if (!P.validate(config)) {
        state = { ...fresh(), ...previous, version: 12, config, attempts: previous.attempts || [], drafts: previous.drafts || {}, squatOverrides: previous.squatOverrides || {} };
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 保存失败时仍保留原数据。 */ }
      }
    }
  }
  let viewedDay = null;
  let viewedRound = 1;
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
      const selector = `<label class="choice-label">三头动作 <select name="triceps" form="logForm" ${record ? "disabled" : ""}>${choices.map((x) => `<option ${x === selected ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
      return `<div class="warmup-box"><div><span class="warmup-kicker">温宁式热身</span><strong>6 个动作 · 2 轮 · 每次 25 下</strong></div><p>侧平板、卷腹、轻夹胸推、胸托后束飞鸟、轻臂屈伸、轻面拉。侧平板两轮分左右；保持轻松，发沉就减少。</p></div>
        <p class="ramp-line"><b>上杠准备</b> ${esc(warmupRamp(d))}</p>
        <div class="exercise-list">${exerciseRow("01", "主项", "卧推", `${d.sets} 组 × ${d.reps} 次 · 工作组间休 3–5 分钟`)}${exerciseRow("02", "一级辅助", ["实力推", "上斜卧推", "自重臂屈伸", "俯卧撑", "器械卧推"][d.micro - 1], "2 组 · 留有余力，重量现场调整")}${exerciseRow("03", "二级辅助", "三头任选一项 + 哑铃弯举", "各 2 组 × 10–15 次", selector)}${exerciseRow("04", "三级辅助", "平板支撑或卷腹", "平板 2 组 × 20–40 秒，或卷腹 2 组 × 10–20 次")}</div>`;
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
    const warning = (upcoming?.day === d.day && lastRecord?.result === "incomplete" ? `<div class="mini-warning">上次训练未完成。系统不会自动降重，请按恢复情况调整设置或多休息。</div>` : "") + (d.type === "chest" && String(p.reps) === "1" ? `<div class="mini-warning">5×1 接近极限，请用安全杆或可靠保护；动作变慢或不稳时降重或结束，不强求五组。</div>` : "");
    $("#sessionCard").innerHTML = `<div class="session-topline"><div><span class="session-number">DAY ${String(d.day).padStart(2, "0")}</span><span class="session-date">${d.beforeStart && !record ? "参考 " : ""}${displayDate(record?.date || d.date)} · 第 ${d.round} 轮</span></div><span class="session-pill">${mode}</span></div>
      <div class="session-hero"><div><p>${d.type === "rest" ? "REST DAY" : d.type === "chest" ? "CHEST DAY" : d.type === "back" ? "BACK DAY" : `LEG DAY · ${d.legVariant}`}</p><h3>${d.label}${d.type === "rest" ? "" : "日训练"}</h3></div><span class="session-icon"><svg class="icon"><use href="#i-${d.type === "rest" ? "calendar" : "barbell"}" /></svg></span></div>
      <div class="main-lift"><div><span>今日主项</span><strong>${value}</strong></div><p>${unit}</p></div>${warning}${exerciseBody({ ...d, ...p, date: d.date }, record, draft)}${recordForm(d, record, draft, upcoming)}`;
  }
  function renderSchedule() {
    const all = days(), upcoming = next();
    viewedRound = Math.max(1, Math.min(viewedRound, state.config.rounds));
    $("#roundTabs").innerHTML = Array.from({ length: state.config.rounds }, (_, i) => `<button type="button" data-round="${i + 1}" class="${viewedRound === i + 1 ? "active" : ""}" aria-pressed="${viewedRound === i + 1}">第 ${i + 1} 轮</button>`).join("");
    $("#roundTitle").textContent = `第 ${viewedRound} 轮 · 20 天`;
    $("#roundMeta").textContent = viewedRound === 1 ? "10 / 8 / 6 / 4 / 2 次" : "9 / 7 / 5 / 3 / 1 次";
    $("#scheduleGrid").innerHTML = Array.from({ length: 5 }, (_, row) => {
      const group = all.filter((d) => d.round === viewedRound && d.micro === row + 1);
      return `<div class="schedule-row"><div class="schedule-row-label"><strong>0${row + 1}</strong><span>第 ${row + 1} 个4天</span></div><div class="schedule-cells">${group.map((d) => {
        const r = state.records[d.day], p = r?.plan || d, selected = d.day === viewedDay;
        const desc = d.type === "chest" ? `${p.sets}×${p.reps} · ${p.weight}kg` : d.type === "legs" ? `5×5 · ${Number.isFinite(p.weight) ? `${p.weight}kg` : "未记录"}` : d.type === "back" ? "引体向上" : "恢复";
        const completedRest = d.type === "rest" && d.date <= state.confirmedPriorThrough;
        return `<button type="button" class="schedule-cell ${d.type} ${selected ? "selected" : ""} ${r || completedRest ? "done" : ""}" data-day="${d.day}" aria-label="第${d.day}天 ${d.label} ${esc(desc)}${r ? (r.result === "done" ? " 已完成" : " 已记录未完成") : completedRest ? " 已休息" : d.beforeStart ? " 此前未记录" : ""}"><span>DAY ${String(d.day).padStart(2, "0")} ${r || completedRest ? "✓" : d.beforeStart ? "· 此前" : upcoming?.day === d.day ? "· 下次" : ""}</span><strong>${d.label}</strong><small>${esc(desc)}</small></button>`;
      }).join("")}</div></div>`;
    }).join("");
    $("#scheduleNote").textContent = `每轮五次卧推；日期随实际训练顺延。重量仅为起始估算。`;
    $("#printSchedule").innerHTML = Array.from({ length: state.config.rounds }, (_, i) => `<h3>第 ${i + 1} 轮</h3><table><thead><tr><th>天数 / 日期</th><th>训练</th><th>主项 / 组次</th><th>重量 / 辅助</th></tr></thead><tbody>${all.filter((d) => d.round === i + 1).map((d) => { const r = state.records[d.day], p = r?.plan || d; return `<tr><td>${d.day} / ${esc(r?.date || d.date)}${d.beforeStart && !r ? "（参考）" : ""}</td><td>${d.label}</td><td>${esc(p.name)} ${d.type === "rest" ? "" : `${p.sets} × ${esc(p.reps)}`}</td><td>${d.type === "legs" ? `${Number.isFinite(p.weight) ? `${p.weight} kg` : "此前未记录"} · 腿${d.legVariant}` : d.type === "chest" ? `${p.weight} kg` : "—"}</td></tr>`; }).join("")}</tbody></table>`).join("");
  }
  function renderProgress() {
    const upcoming = next(), total = days().filter((d) => d.type !== "rest").length;
    $("#progressCount").textContent = count();
    $("#progressDenominator").textContent = `/ ${total} 次训练`;
    $("#progressBar").style.width = `${Math.min(100, count() / total * 100)}%`;
    $("#progressText").textContent = upcoming ? `第 ${upcoming.round} 轮 · 第 ${upcoming.micro} 次卧推` : "周期训练已完成";
    $("#summaryTm").innerHTML = `${esc(state.config.tm)} <small>kg</small>`;
  }
  function renderSettings() {
    const c = state.config;
    ["tm", "startDate", "increment", "barWeight", "benchIncrease", "rounds", "entryDay", "squatStart", "squatIncrease"].forEach((key) => { $(`#${key}`).value = c[key]; });

    $("#squatOverride").value = "";
    const upcomingLeg = days().find((d) => !d.beforeStart && d.type === "legs" && !state.records[d.day]);
    $("#squatOverride").disabled = !upcomingLeg;
    $("#squatOverride").placeholder = upcomingLeg ? `下次计划 ${upcomingLeg.weight} kg；留空则保持` : "本周期没有待完成的腿日";
    $("#startDate").disabled = count() > 0 || state.attempts.length > 0;
    $("#entryDay").disabled = $("#startDate").disabled;
    $("#suggestedIncrease").textContent = `每完成十次卧推，恢复后可加 ${c.benchIncrease} kg；当前周期累计加重 ${c.cycleOffset || 0} kg`;
  }
  function historyRow(r) {
    const result = r.result === "done" ? "完成" : r.result === "paused" ? "暂停" : "未完成";
    return `<div class="history-row"><span class="history-day">${displayDate(r.date)}<small>DAY ${String(r.day).padStart(2, "0")}</small></span><div><strong>${esc(r.plan.name)} · ${esc(`${r.plan.sets} × ${r.plan.reps}`)}${r.plan.weight !== null ? ` · ${esc(r.plan.weight)} kg` : ""}</strong><p>${esc(result)}${r.backfilled ? " · 补记，日期按计划推算" : ""}${r.actual ? ` · ${esc(r.actual)}` : ""}${r.notes ? ` · ${esc(r.notes)}` : ""}</p></div><span class="history-result ${r.result === "done" ? "" : "caution"}">${result}</span></div>`;
  }
  function renderHistory() {
    const entries = [...Object.values(state.records), ...state.attempts].sort((a, b) => b.day - a.day || b.date.localeCompare(a.date));
    const archived = state.archives.map((a, i) => `<details class="archive-item"><summary>已归档周期 ${i + 1} · 1RM ${esc(a.config.tm)} kg · ${Object.keys(a.records).length} 次训练</summary><div>${[...Object.values(a.records), ...(Array.isArray(a.attempts) ? a.attempts : [])].sort((x, y) => y.day - x.day || y.date.localeCompare(x.date)).map(historyRow).join("") || "暂无记录"}</div></details>`).join("");
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
      $("#finishDescription").textContent = `十次卧推已记录。确认恢复后开启下一周期，预设加重 ${state.config.benchIncrease} kg；需要时先在设置中调整。`;
      if (!$("#nextStart").value) {
        $("#newTm").value = state.config.tm;
        $("#nextStart").value = P.addDays(lastDay, 1);
        const lastLeg = [...days()].reverse().find((x) => x.type === "legs");
        $("#newSquat").value = Number(((state.records[lastLeg.day]?.plan?.weight ?? lastLeg.weight) + state.config.squatIncrease).toFixed(3));
      }
    }
  }
  function renderAll() { renderProgress(); renderSession(); renderSchedule(); renderSettings(); renderHistory(); }
  $("#roundTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-round]"); if (!b) return; viewedRound = Number(b.dataset.round); renderSchedule(); });
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
    const upcoming = next(); viewedDay = upcoming?.day || d.day; viewedRound = upcoming?.round || state.config.rounds;
    renderAll();
    const destination = $("#recordStatus") || $("#sessionCard");
    const message = result === "paused" ? "已保存暂停记录，本次训练仍可稍后继续。" : result === "incomplete" ? "已记录未完成。请按恢复情况调整后续重量。" : "训练已保存，已为你准备下一次。";
    if (destination.id === "recordStatus") destination.textContent = ok ? message : "浏览器存储不可用，请导出记录。";
    else destination.insertAdjacentHTML("beforeend", `<p class="form-message">${ok ? message : "浏览器存储不可用，请导出记录。"}</p>`);
  });
  $("#settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const c = { tm: Number($("#tm").value), increment: Number($("#increment").value), barWeight: Number($("#barWeight").value), benchWeights: P.seedBench(Number($("#tm").value), Number($("#increment").value), Number($("#barWeight").value)), cycleOffset: state.config.cycleOffset || 0, benchIncrease: Number($("#benchIncrease").value), squatStart: Number($("#squatStart").value), squatIncrease: Number($("#squatIncrease").value), rounds: Number($("#rounds").value), entryDay: $("#entryDay").disabled ? state.config.entryDay : Number($("#entryDay").value), startDate: $("#startDate").disabled ? state.config.startDate : $("#startDate").value };
    let error = P.validate(c);
    const highest = Math.max(0, ...Object.keys(state.records).map(Number), ...state.attempts.map((r) => r.day));
    if (!error && highest > c.rounds * 20) error = "已有后续轮次的记录，不能缩短到该轮之前。";
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
    if (!P.validDate(nextStart) || nextStart <= lastDay) { status.textContent = "新周期开始日期须晚于上周期最后一天。"; return; }
    const tm = Number($("#newTm").value);
    const c = { ...state.config, tm, benchWeights: P.seedBench(tm, state.config.increment, state.config.barWeight), cycleOffset: (state.config.cycleOffset || 0) + state.config.benchIncrease, squatStart: Number($("#newSquat").value), startDate: nextStart, entryDay: 1 };
    const error = P.validate(c); if (error) { status.textContent = error; return; }
    state.archives.push({ config: state.config, records: state.records, attempts: state.attempts, squatOverrides: state.squatOverrides });
    state.config = c; state.records = {}; state.attempts = []; state.drafts = {}; state.squatOverrides = {}; viewedDay = 1; viewedRound = 1;
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
    const rows = [["天数", "20天轮次", "日期", "类型", "主项", "组次", "计划重量kg", "腿日类型", "状态", "实际表现", "备注"]];
    days().forEach((d) => { const r = state.records[d.day], p = r?.plan || d; rows.push([d.day, d.round, `${r?.date || d.date}${d.beforeStart && !r ? "（倒推参考）" : ""}`, d.label, p.name, d.type === "rest" ? "" : `${p.sets}×${p.reps}`, p.weight ?? "", d.legVariant || "", r ? (r.result === "done" ? "完成" : "未完成") : d.beforeStart ? "此前未记录" : "", r?.actual || "", r?.notes || ""]); });
    download("\ufeff" + rows.map((row) => row.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8", "力量训练-周期计划.csv");
  });
  $("#printButton").addEventListener("click", () => window.print());
  viewedDay = next()?.day || 1; viewedRound = next()?.round || 1; renderAll();
})();
