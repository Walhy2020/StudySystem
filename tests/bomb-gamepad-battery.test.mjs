import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/bomb-gamepad-battery.js";

function report(value, bluetooth = false) {
  const data = new DataView(new ArrayBuffer(bluetooth ? 77 : 63));
  data.setUint8(bluetooth ? 53 : 52, value);
  if (bluetooth) {
    let crc = 0xffffffff;
    for (const byte of [0xa1, 0x31, ...new Uint8Array(data.buffer).slice(0, 73)]) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    data.setUint32(73, (crc ^ 0xffffffff) >>> 0, true);
  }
  return { reportId: bluetooth ? 0x31 : 1, data };
}
const parse = value => globalThis.parseDualSenseBattery(value.reportId, value.data);
function harness() {
  const hid = new EventTarget(), device = new EventTarget();
  let requests = 0, opens = 0, closes = 0, time = 0, allowed = [], selection = [device], failure;
  Object.assign(device, { vendorId: 0x054c, productId: 0x0ce6, opened: false,
    open: async () => { device.opened = true; opens++; },
    close: async () => { device.opened = false; closes++; } });
  hid.getDevices = async () => allowed;
  hid.requestDevice = async options => {
    requests++; assert.deepEqual(options.filters, [{ vendorId: 0x054c, productId: 0x0ce6 }, { vendorId: 0x054c, productId: 0x0df2 }]);
    if (failure) throw failure;
    return selection;
  };
  const reader = globalThis.createBombBatteryReader({ hid, now: () => time });
  function emit(target, type, fields) { const event = new Event(type); Object.assign(event, fields); target.dispatchEvent(event); }
  return { reader, device, counts: () => ({ requests, opens, closes }),
    authorized: devices => { allowed = devices; }, selection: devices => { selection = devices; },
    fail: error => { failure = error; }, advance: seconds => { time += seconds * 1000; reader.checkStale(); },
    input: value => emit(device, "inputreport", { device, ...value }),
    disconnect: () => emit(hid, "disconnect", { device }) };
}

test("DualSense USB电量仅显示实际档位，并区分低电量、充电、满电及错误", () => {
  assert.deepEqual(parse(report(0x06)), { range: [60, 69], status: "discharging", low: false });
  assert.deepEqual(parse(report(0x10)), { range: [0, 9], status: "charging", low: true });
  assert.deepEqual(parse(report(0x0a)), { range: [100, 100], status: "discharging", low: false });
  assert.deepEqual(parse(report(0x20)), { range: [100, 100], status: "full", low: false });
  for (const value of [0xa0, 0xb0, 0xf0]) assert.equal(parse(report(value)).status, "error");
  for (const value of [0x0b, 0x1f, 0x36]) assert.equal(parse(report(value)), null);
});
test("蓝牙完整报告使用独立偏移和CRC，短报告或损坏数据绝不伪报电量", () => {
  assert.deepEqual(parse(report(0x17, true)), { range: [70, 79], status: "charging", low: false });
  const corrupt = report(0x17, true); corrupt.data.setUint8(53, 0x19); assert.equal(parse(corrupt), null);
  for (const [id, length] of [[1, 9], [1, 64], [0x31, 76], [2, 63]]) {
    assert.equal(parse({ reportId: id, data: new DataView(new ArrayBuffer(length)) }), null);
  }
  assert.equal(globalThis.parseDualSenseBattery(1, null), null);
});
test("未授权不弹选择器，显式读取才请求Sony设备，断线/重连不保留旧百分比", async () => {
  const h = harness(); await h.reader.restore(); assert.equal(h.counts().requests, 0);
  await h.reader.authorize(); assert.equal(h.reader.getState().kind, "waiting");
  h.input(report(0x06)); assert.equal(h.reader.getState().kind, "ready");
  h.disconnect(); assert.equal(h.reader.getState().kind, "disconnected"); assert.equal(h.reader.getState().battery, null);
  await h.reader.authorize(); assert.equal(h.reader.getState().kind, "waiting");
  h.input(report(0x11)); assert.equal(h.reader.getState().battery.low, true);
  await h.reader.dispose(); assert.equal(h.device.opened, false);
});
test("已有单一授权自动恢复，多个设备不擅自挑选，过期后隐藏旧电量", async () => {
  const h = harness(); h.authorized([h.device]); await h.reader.restore();
  assert.equal(h.counts().requests, 0); assert.equal(h.counts().opens, 1);
  h.input(report(0x06)); h.advance(9); assert.equal(h.reader.getState().kind, "ready");
  h.advance(1); assert.equal(h.reader.getState().kind, "stale"); assert.equal(h.reader.getState().battery, null);
  h.input(report(0x07)); assert.equal(h.reader.getState().kind, "ready"); await h.reader.dispose();
  const multiple = harness(); multiple.authorized([multiple.device, { ...multiple.device, vendorId: 0x054c, productId: 0x0df2 }]);
  await multiple.reader.restore(); assert.equal(multiple.counts().opens, 0); await multiple.reader.dispose();
});
test("取消、拒绝授权和打开失败可安全重试，不支持时不调用电脑电量接口", async () => {
  const h = harness(); h.selection([]); await h.reader.authorize(); assert.equal(h.reader.getState().kind, "cancelled");
  h.fail(new DOMException("denied", "NotAllowedError")); await h.reader.authorize(); assert.equal(h.reader.getState().kind, "error");
  h.fail(null); h.selection([h.device]); h.device.open = async () => { throw Error("unavailable"); };
  await h.reader.authorize(); assert.equal(h.reader.getState().kind, "error"); assert.equal(h.reader.getState().busy, false);
  await h.reader.dispose();
  const unsupported = globalThis.createBombBatteryReader({ hid: null }); await unsupported.authorize();
  assert.equal(unsupported.getState().kind, "unsupported"); await unsupported.dispose();
});
test("电量模块只读HID不发送输出/特征报告、不写存储，入口只在攻击设置", () => {
  const source = readFileSync(new URL("../src/bomb-gamepad-battery.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /sendReport|sendFeatureReport|receiveFeatureReport|localStorage|sessionStorage/);
  const html = readFileSync(new URL("../bomb-game.html", import.meta.url), "utf8");
  assert.match(html, /bomb-game\.css\?v=1\.8/);
  assert.match(html, /src\/bomb-gamepad-battery\.js\?v=1\.0/);
  assert.equal(html.split('id="readGamepadBattery"').length - 1, 1);
  assert.ok(html.indexOf('id="readGamepadBattery"') < html.indexOf('<main class="bomb-stage">'));
});
