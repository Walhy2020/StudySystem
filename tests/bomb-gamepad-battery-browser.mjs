import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      const hid = new EventTarget(), device = new EventTarget();
      window.__battery = { requests: 0, opens: 0, closes: 0, mode: "select", now: Date.now() };
      const realNow = Date.now; Date.now = () => window.__battery.now || realNow();
      Object.assign(device, { vendorId: 0x054c, productId: 0x0ce6, opened: false,
        open: async () => { device.opened = true; window.__battery.opens++; },
        close: async () => { device.opened = false; window.__battery.closes++; } });
      hid.getDevices = async () => [];
      hid.requestDevice = async options => {
        window.__battery.requests++; window.__battery.filters = options.filters;
        if (window.__battery.mode === "deny") throw new DOMException("denied", "NotAllowedError");
        return window.__battery.mode === "cancel" ? [] : [device];
      };
      Object.defineProperty(navigator, "hid", { configurable: true, value: hid });
      Object.defineProperty(navigator, "getGamepads", { value: () => [{ id: "DualSense Wireless Controller", connected: true, mapping: "standard", index: 0, axes: [0, 0, 0, 0], buttons: [] }] });
      Object.defineProperty(navigator, "getBattery", { value: () => { throw Error("host battery must not be queried"); } });
      window.__batteryReport = (value, bluetooth = false, compact = false) => {
        const data = new DataView(new ArrayBuffer(compact ? 9 : bluetooth ? 77 : 63));
        if (!compact) data.setUint8(bluetooth ? 53 : 52, value);
        if (bluetooth && !compact) {
          let crc = 0xffffffff;
          for (const byte of [0xa1, 0x31, ...new Uint8Array(data.buffer).slice(0, 73)]) {
            crc ^= byte;
            for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
          }
          data.setUint32(73, (crc ^ 0xffffffff) >>> 0, true);
        }
        const event = new Event("inputreport");
        Object.assign(event, { device, data, reportId: bluetooth && !compact ? 0x31 : 1 });
        device.dispatchEvent(event);
      };
      window.__batteryDisconnect = () => { const event = new Event("disconnect"); Object.assign(event, { device }); hid.dispatchEvent(event); };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    await page.goto(base + "bomb-game.html?battery-test=1");
    const status = page.locator("#bombGamepadBattery"), button = page.locator("#readGamepadBattery");
    await page.waitForFunction(() => !document.getElementById("readGamepadBattery").disabled);
    assert.equal(await page.evaluate(() => window.__battery.requests), 0, "no unsolicited HID chooser");
    if (await page.locator("#bombSettingsMenu").isHidden()) await page.locator("#bombSettingsToggle").click();
    assert.match(await status.textContent(), /未知/);
    const click = async () => { if (width === 390) await button.tap(); else await button.click(); };
    await click(); await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent === "手柄电量：等待数据");
    assert.deepEqual(await page.evaluate(() => window.__battery.filters), [{ vendorId: 0x054c, productId: 0x0ce6 }, { vendorId: 0x054c, productId: 0x0df2 }]);
    await page.evaluate(() => window.__batteryReport(0x16)); assert.equal(await status.textContent(), "手柄电量：60–69% · 充电中");
    await page.evaluate(() => window.__batteryReport(0x01)); assert.match(await status.textContent(), /10–19%.*低电量/);
    assert.ok(await status.evaluate(node => node.classList.contains("battery-low")));
    await page.evaluate(() => window.__batteryReport(0x20, true)); assert.equal(await status.textContent(), "手柄电量：100% · 已充满");
    await page.evaluate(() => { window.__battery.now += 11000; });
    await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent === "手柄电量：未知");
    assert.doesNotMatch(await status.textContent(), /100%/);
    await page.evaluate(() => window.__batteryReport(0x16, true));
    await page.evaluate(() => window.__batteryDisconnect()); assert.match(await status.textContent(), /已断开/);
    await click(); await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent.includes("等待")); await page.evaluate(() => window.__batteryReport(0x16, false, true)); assert.match(await status.textContent(), /等待/);
    await page.evaluate(() => { window.__battery.mode = "cancel"; }); await click(); await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent.endsWith("未知"));
    await page.evaluate(() => { window.__battery.mode = "deny"; }); await click(); await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent.endsWith("读取失败"));
    await page.evaluate(() => { window.__battery.mode = "select"; });
    await button.focus(); await page.keyboard.press("Enter"); await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent.includes("等待")); await page.evaluate(() => window.__batteryReport(0x16));
    assert.match(await status.textContent(), /60–69%/);
    assert.ok(await page.locator("#bombSettingsMenu").isVisible(), "authorizing never resumes game behind menu");
    const geometry = await page.locator("#bombSettingsMenu").evaluate(menu => {
      const box = menu.getBoundingClientRect(), button = document.getElementById("readGamepadBattery").getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth > innerWidth, left: box.left, right: box.right,
        bottom: box.bottom, height: innerHeight, buttonInside: button.top >= box.top && button.bottom <= box.bottom };
    });
    assert.equal(geometry.overflow, false); assert.ok(geometry.left >= 0 && geometry.right <= width);
    assert.ok(geometry.bottom <= geometry.height && geometry.buttonInside);
    await page.screenshot({ path: `tmp/bomb-battery-${width}.png` });
    if (width === 390) {
      await page.setViewportSize({ width, height: 500 }); await button.scrollIntoViewIfNeeded();
      const short = await page.locator("#bombSettingsMenu").boundingBox(); assert.ok(short.y + short.height <= 500);
      await button.tap(); await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent.includes("等待")); await page.evaluate(() => window.__batteryReport(0x01));
      await page.screenshot({ path: "tmp/bomb-battery-short-390.png" });
    }
    const keys = await page.evaluate(() => Object.keys(localStorage));
    assert.ok(keys.every(key => key === "mario-bomb-game-progress-v1"), "no battery or foreign progress writes");
    assert.deepEqual(errors, []);
    results.push({ width, mockedHID: true, usbBluetooth: true, permissionFallback: true, staleDisconnect: true, fits: true });
    await context.close();
  }
  const context = await browser.newContext();
  await context.route("**/api/controller-battery", route => route.fulfill({ contentType: "application/json", body: '{"supported":false,"controllers":[]}' }));
  await context.addInitScript(() => Object.defineProperty(navigator, "hid", { value: undefined }));
  const page = await context.newPage(); await page.goto(base + "bomb-game.html?battery-unsupported=1");
  if (await page.locator("#bombSettingsMenu").isHidden()) await page.locator("#bombSettingsToggle").click();
  assert.ok(await page.locator("#readGamepadBattery").isEnabled());
  assert.match(await page.locator("#bombGamepadBattery").textContent(), /未知/);
  await page.keyboard.press("Escape"); assert.ok(await page.locator("#bombSettingsMenu").isHidden());
  await page.locator("#overlayStartBombGame").click();
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().status), "playing");
  await context.close();
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", physicalControllerTested: false, results }));
} finally { await browser.close(); }
