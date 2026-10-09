(function () {
  // DualSense common report status[0], per Linux hid-playstation.c.
  // WebHID excludes the report ID from data. Never use navigator.getBattery():
  // that reports the computer's battery, not the controller's.
  const SONY = 0x054c;
  const PRODUCTS = [0x0ce6, 0x0df2]; // DualSense / DualSense Edge
  const supportedDevice = device => device?.vendorId === SONY && PRODUCTS.includes(device.productId);

  function parseDualSenseBattery(reportId, data) {
    if (!(data instanceof DataView)) return null;
    let offset;
    if (reportId === 0x01 && data.byteLength === 63) offset = 52;
    else if (reportId === 0x31 && data.byteLength === 77) {
      // Reject corrupt Bluetooth packets instead of displaying a false charge.
      let crc = 0xffffffff;
      const feed = byte => {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      };
      feed(0xa1); feed(reportId);
      for (let i = 0; i < data.byteLength - 4; i++) feed(data.getUint8(i));
      if (((crc ^ 0xffffffff) >>> 0) !== data.getUint32(data.byteLength - 4, true)) return null;
      offset = 53;
    } else return null; // Compact Bluetooth reports do not contain battery data.
    const value = data.getUint8(offset), level = value & 0x0f, charging = value >>> 4;
    if (charging === 2) return { range: [100, 100], status: "full", low: false };
    if ([10, 11, 15].includes(charging)) return { range: null, status: "error", low: false };
    if (charging > 1 || level > 10) return null;
    return { range: [level * 10, Math.min(level * 10 + 9, 100)],
      status: charging ? "charging" : "discharging", low: level < 2 };
  }

  function createBombBatteryReader({ hid = globalThis.navigator?.hid, onChange = () => {},
    now = () => Date.now(), secure = globalThis.isSecureContext !== false } = {}) {
    let device = null, openedHere = false, generation = 0, busy = false, disposed = false;
    let lastReport = null;
    let state = { kind: hid && secure ? "unknown" : "unsupported", battery: null, busy: false };
    const publish = (kind, battery = null) => {
      state = { kind, battery, busy }; onChange({ ...state });
    };
    function receive(event) {
      if (disposed || event.device !== device) return;
      const battery = parseDualSenseBattery(event.reportId, event.data);
      if (!battery) return;
      lastReport = now(); publish("ready", battery);
    }
    async function detach() {
      const old = device, close = openedHere;
      device = null; openedHere = false; lastReport = null;
      old?.removeEventListener("inputreport", receive);
      if (close && old?.opened) { try { await old.close(); } catch { /* already disconnected */ } }
    }
    async function attach(next) {
      const turn = ++generation;
      await detach();
      if (disposed || turn !== generation) return;
      device = next; openedHere = !next.opened;
      next.addEventListener("inputreport", receive);
      try { if (!next.opened) await next.open(); }
      catch (error) { await detach(); throw error; }
      if (disposed || turn !== generation) { await detach(); return; }
      if (state.kind !== "ready") publish("waiting");
    }
    async function authorize() {
      if (disposed || busy || !hid || !secure) return;
      busy = true; publish("authorizing");
      try {
        // Explicit click only. No output/feature reports or controller mode changes.
        const devices = await hid.requestDevice({ filters: PRODUCTS.map(productId => ({ vendorId: SONY, productId })) });
        if (disposed) return;
        const next = devices.find(supportedDevice);
        if (next) await attach(next);
        else publish("cancelled");
      } catch (error) {
        if (!disposed) { ++generation; await detach(); publish(error?.name === "NotFoundError" ? "cancelled" : "error"); }
      } finally { busy = false; if (!disposed) publish(state.kind, state.battery); }
    }
    async function restore() {
      if (disposed || busy || !hid || !secure) return;
      busy = true; publish("checking");
      try {
        const devices = (await hid.getDevices()).filter(supportedDevice);
        if (!disposed) { if (devices.length === 1) await attach(devices[0]); else publish("unknown"); }
      } catch { if (!disposed) publish("error"); }
      finally { busy = false; if (!disposed) publish(state.kind, state.battery); }
    }
    function disconnect(event) {
      if (event.device !== device) return;
      ++generation; void detach(); if (!disposed) publish("disconnected");
    }
    function checkStale() {
      if (!disposed && state.kind === "ready" && lastReport !== null && now() - lastReport >= 10000) publish("stale");
    }
    async function dispose() {
      disposed = true; ++generation;
      hid?.removeEventListener("disconnect", disconnect); await detach();
    }
    hid?.addEventListener("disconnect", disconnect);
    onChange({ ...state });
    return { authorize, restore, checkStale, dispose, getState: () => ({ ...state }) };
  }
  globalThis.parseDualSenseBattery = parseDualSenseBattery;
  globalThis.createBombBatteryReader = createBombBatteryReader;

  function formatXInputBattery(result) {
    if (result?.supported !== true || !Array.isArray(result.controllers)) return null;
    const labels = { empty: "没电", low: "低", medium: "中", full: "满", wired: "有线连接 · 电量未知", unknown: "未知" };
    const controllers = result.controllers.filter(item => Number.isInteger(item?.slot) && item.slot >= 1 && item.slot <= 4 && Object.hasOwn(labels, item.level));
    if (!controllers.length) return null;
    return "手柄电量：" + controllers.map(item =>
      `${controllers.length > 1 ? `手柄 ${item.slot} · ` : ""}${labels[item.level]}`).join("；");
  }
  globalThis.formatXInputBattery = formatXInputBattery;

  if (!globalThis.document) return;
  const status = document.getElementById("bombGamepadBattery"), button = document.getElementById("readGamepadBattery");
  if (!status || !button) return;
  const labels = {
    unknown: "手柄电量：未知",
    unsupported: "手柄电量：未知",
    checking: "手柄电量：读取中",
    authorizing: "手柄电量：授权中",
    waiting: "手柄电量：等待数据",
    cancelled: "手柄电量：未知",
    error: "手柄电量：读取失败",
    disconnected: "手柄电量：已断开",
    stale: "手柄电量：未知",
  };
  let lastLabel = "", nativeLabel = null, nativeBusy = false;
  function renderState(state) {
    if (nativeLabel !== null) return;
    let label = labels[state.kind];
    if (state.kind === "ready") {
      const battery = state.battery;
      if (battery.status === "error") label = "手柄电量：未知 · 充电异常";
      else {
        const [min, max] = battery.range;
        label = `手柄电量：${min === max ? min : `${min}–${max}`}%`;
        if (battery.status === "full") label += " · 已充满";
        else if (battery.status === "charging") label += " · 充电中";
        if (battery.low) label += " · 低电量";
      }
    }
    if (lastLabel !== label) { lastLabel = label; status.textContent = label; }
    status.classList.toggle("battery-low", Boolean(state.battery?.low));
    button.disabled = state.busy || nativeBusy;
  }
  const reader = createBombBatteryReader({ onChange: renderState });
  function sonyConnected() {
    try { return Array.from(navigator.getGamepads?.() || []).some(pad => pad?.connected && /dualsense|054c|sony|wireless controller/i.test(pad.id) && !/xbox|xinput/i.test(pad.id)); }
    catch { return false; }
  }
  async function readNativeBattery() {
    if (nativeBusy) return false;
    if (sonyConnected()) { nativeLabel = null; renderState(reader.getState()); return false; }
    nativeBusy = true; button.disabled = true;
    try {
      const response = await fetch("./api/controller-battery", { cache: "no-store", signal: AbortSignal.timeout(2500) });
      nativeLabel = response.ok ? formatXInputBattery(await response.json()) : null;
    } catch { nativeLabel = null; }
    finally {
      nativeBusy = false; button.disabled = reader.getState().busy;
      if (nativeLabel !== null) {
        lastLabel = nativeLabel; status.textContent = nativeLabel;
        status.classList.toggle("battery-low", /：没电|：低|· 没电|· 低/.test(nativeLabel));
      } else { lastLabel = ""; renderState(reader.getState()); }
    }
    return nativeLabel !== null;
  }
  button.addEventListener("click", async () => {
    if (sonyConnected()) nativeLabel = null;
    if (!await readNativeBattery()) {
      let xbox = false;
      try { xbox = Array.from(navigator.getGamepads?.() || []).some(pad => pad?.connected && /xbox|xinput/i.test(pad.id)); } catch {}
      if (!xbox) await reader.authorize();
    }
  });
  const menu = document.getElementById("bombSettingsMenu");
  function fitMenu() {
    if (menu && !menu.hidden) menu.style.maxHeight = `${Math.max(80, innerHeight - menu.getBoundingClientRect().top - 12)}px`;
  }
  document.getElementById("bombSettingsToggle")?.addEventListener("click", () => {
    requestAnimationFrame(fitMenu);
    if (menu && !menu.hidden) void readNativeBattery();
  });
  window.addEventListener("resize", fitMenu);
  void reader.restore();
  const timer = setInterval(reader.checkStale, 1000);
  const nativeTimer = setInterval(() => { if (menu && !menu.hidden && !document.hidden) void readNativeBattery(); }, 5000);
  // pagehide can be followed by pageshow from the back-forward cache.
  window.addEventListener("pagehide", event => { if (!event.persisted) { clearInterval(timer); clearInterval(nativeTimer); void reader.dispose(); } });
}());
