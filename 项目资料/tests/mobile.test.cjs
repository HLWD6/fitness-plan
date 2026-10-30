"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/tmp/fitness-plan-tools/node_modules/playwright");
const root = path.resolve(__dirname, "../..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const examples = path.join(root, "项目资料/示例");

(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  for (const width of [320, 360, 390, 430, 680, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width <= 680, hasTouch: width <= 680 });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    const audit = await page.evaluate(() => {
      const visible = (e) => { const s = getComputedStyle(e); return e.getClientRects().length && s.display !== "none" && s.visibility !== "hidden"; };
      const small = [...document.querySelectorAll("body *")].filter((e) => visible(e) && !e.closest("svg") && ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(e.tagName)) && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => `${e.tagName}.${e.className}`);
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return { width: innerWidth, scroll: document.documentElement.scrollWidth, small, duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i) };
    });
    assert.equal(audit.scroll, width, `屏宽 ${width} 发生横向溢出`);
    assert.deepEqual(audit.small, [], `屏宽 ${width} 字号小于16px`);
    assert.deepEqual(audit.duplicateIds, []);
    await page.locator('[data-round="2"]').click();
    await page.locator('[data-day="19"]').click();
    assert.match(await page.locator("#sessionCard").innerText(), /130 kg/);
    assert.match(await page.locator("#sessionCard").innerText(), /哈克深蹲/);
    await page.locator('[data-day="23"]').click();
    assert.match(await page.locator("#sessionCard").innerText(), /硬拉/);
    assert.doesNotMatch(await page.locator("#sessionCard").innerText(), /腿屈伸/);
    await page.locator('[data-round="1"]').click();
    await page.locator('[data-day="9"]').click();
    await page.locator('#logForm [name="actual"]').fill("临时输入 137.5 kg");
    await page.locator('[data-day="11"]').click();
    await page.locator('[data-day="9"]').click();
    assert.equal(await page.locator('#logForm [name="actual"]').inputValue(), "临时输入 137.5 kg");
    await page.reload();
    assert.equal(await page.locator('#logForm [name="actual"]').inputValue(), "临时输入 137.5 kg");
    if (width <= 680) {
      assert.equal(await page.locator(".mobile-nav").isVisible(), true);
      await page.locator('.mobile-nav a[href="#schedule"]').click();
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => location.hash), "#schedule");
      assert.equal(await page.locator('.mobile-nav a[href="#schedule"]').getAttribute("aria-current"), "location");
    } else assert.equal(await page.locator(".mobile-nav").isVisible(), false);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const preview = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await preview.newPage();
  await page.goto(url);
  await page.screenshot({ path: path.join(examples, "手机首页.png") });
  await page.locator("#workout").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(examples, "手机训练.png") });
  const direct = await preview.newPage();
  await direct.goto(`${url}#schedule`);
  await direct.waitForTimeout(100);
  const top = await direct.locator("#schedule").evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(top >= 65 && top <= 100, `直接打开计划锚点时位置异常：${top}`);
  await preview.close();
  await browser.close();
  console.log("手机：320–680px及桌面断点、计划切换、腿日A/B、草稿保留、锚点导航、字号和无横向溢出通过。");
})().catch((error) => { console.error(error); process.exit(1); });
