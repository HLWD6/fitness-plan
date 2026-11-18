"use strict";
const assert = require("node:assert/strict"), path = require("node:path"), { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/tmp/fitness-plan-tools/node_modules/playwright");
const root = path.resolve(__dirname, "../.."), url = pathToFileURL(path.join(root, "index.html")).href, examples = path.join(root, "项目资料/示例");
(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
  for (const width of [320, 360, 390, 430, 600, 680, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width <= 680, hasTouch: width <= 680 });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(url);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.equal(await page.locator(".calendar-cell").count(), 8);
    const cardSizes = await page.locator(".calendar-cell").evaluateAll(cells => cells.map(cell => {
      const style = getComputedStyle(cell);
      return { width: cell.getBoundingClientRect().width, padding: style.padding, radius: style.borderRadius };
    }));
    for (const card of cardSizes) {
      assert.ok(Math.abs(card.width - cardSizes[0].width) < 1, `所有模板卡片宽度一致：${width}px`);
      assert.equal(card.padding, cardSizes[0].padding);
      assert.equal(card.radius, cardSizes[0].radius);
    }
    const overflow = await page.locator(".calendar-cell").evaluateAll(cells => cells.filter(cell => cell.scrollHeight > cell.clientHeight + 1 || cell.scrollWidth > cell.clientWidth + 1).map(cell => cell.dataset.template));
    assert.deepEqual(overflow, [], `模板内容溢出：${width}px`);
    if (width <= 960) {
      const clippedRows = await page.locator('.bench-templates,.other-templates').evaluateAll(rows => rows.filter(row => row.scrollWidth > row.clientWidth + 1).length);
      assert.equal(clippedRows, 0, `模板无需横向滚动：${width}px`);
    }
    await page.locator('[data-template="bench-d"]').click();
    assert.match(await page.locator(".record-main").innerText(), /无腿卧推/);
    if (width <= 600) {
      const inputs = await page.locator('.weight-grid input').first().boundingBox();
      assert.ok(inputs.width >= 44);
      const tops = await page.locator('.weight-grid input').evaluateAll(inputs => inputs.map(input => input.getBoundingClientRect().top));
      assert.ok(tops.every(top => Math.abs(top - tops[0]) < 1), '五组重量在同一行');
      await page.locator('[name="date"]').fill('2026-11-06');
      await page.locator('[name="weight-0"]').fill('102.5');
      await page.locator('#copyWeight').click();
      await page.locator('#logForm button[type=submit]').click();
      assert.equal(await page.locator('#workout').isVisible(), false);
      const actual = await page.evaluate(() => JSON.parse(localStorage.getItem('fitness-templates-v17')).records.find(r => r.date === '2026-11-06'));
      assert.deepEqual(actual.setWeights, Array(5).fill(102.5));
    }
    await page.keyboard.press("Escape");
    await page.locator("#historyLink").click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    if (width <= 600) {
      const month = await page.locator('.month-content').evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
      assert.ok(month.content <= month.width + 1, `整周月历无需横向滚动：${width}px`);
      assert.equal(await page.locator('[data-log-date="2026-11-12"] .day-record-load').innerText(), '120–130');
      assert.equal(await page.locator('[data-log-date="2026-11-15"] .day-record-load').innerText(), '150');
    } else assert.equal(await page.locator('[data-log-date="2026-11-12"] .day-record-weights').isVisible(), true);
    assert.match(await page.locator('[data-log-date="2026-11-12"] .day-record-weights').innerText(), /120 \/ 125 \/ 125 \/ 130 \/ 130kg/);
    await page.locator('[data-log-date="2026-11-11"]').click();
    assert.match(await page.locator("#historyList").innerText(), /120 \/ 120 \/ 120 \/ 120 \/ 120/);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let page = await mobile.newPage();
  await page.goto(url);
  await page.screenshot({ path: path.join(examples, "手机首页.png") });
  await page.locator("#schedule").screenshot({ path: path.join(examples, "手机计划表.png") });
  await page.locator("#historyLink").click();
  await page.locator('[data-log-date="2026-11-11"]').click();
  await page.locator("#history").screenshot({ path: path.join(examples, "手机记录.png") });
  await page.locator('[data-log-date="2026-11-12"]').click();
  await page.locator('[data-record="confirmed-2026-11-12-bench-b"]').click();
  await page.screenshot({ path: path.join(examples, "手机训练.png") });
  await mobile.close();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  page = await desktop.newPage();
  await page.goto(url);
  await page.screenshot({ path: path.join(examples, "界面预览.png") });
  await page.locator("#schedule").screenshot({ path: path.join(examples, "完整计划表.png") });
  await page.locator("#historyLink").click();
  await page.locator('[data-log-date="2026-11-11"]').click();
  await page.locator("#history").screenshot({ path: path.join(examples, "训练日历.png") });
  const download = page.waitForEvent("download");
  await page.locator("#exportCsv").click();
  await (await download).saveAs(path.join(examples, "训练记录.csv"));
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: path.join(examples, "训练模板.pdf"), format: "A4", landscape: true, printBackground: true });
  await browser.close();
  console.log("八种屏幕宽度无溢出；手机模板、整周月历与逐组保存正常，预览已更新。");
})().catch(error => { console.error(error); process.exit(1); });
