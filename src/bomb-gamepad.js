(function () {
  const DEADZONE = 0.35;

  function createBombGamepadReader(getGamepads = () => navigator.getGamepads?.() || []) {
    let identity = "", armed = false, previous = {};
    const pressed = (pad, index) => Boolean(pad.buttons?.[index]?.pressed || pad.buttons?.[index]?.value > 0.5);
    function reset() { armed = false; previous = {}; }
    function poll(enabled = true) {
      let pads;
      try { pads = Array.from(getGamepads() || []).filter(pad => pad?.connected !== false && pad); }
      catch { pads = []; }
      const pad = pads.find(pad => `${pad.index}:${pad.id}` === identity && pad.mapping === "standard")
        || pads.find(pad => pad.mapping === "standard") || pads[0];
      const nextIdentity = pad ? `${pad.index}:${pad.id}` : "";
      if (nextIdentity !== identity) { identity = nextIdentity; reset(); }
      const result = { connected: Boolean(pad), standard: pad?.mapping === "standard",
        direction: "", mushroom: false, ice: false, confirm: false };
      if (!pad || !result.standard) { reset(); return result; }
      const x = Number.isFinite(pad.axes?.[0]) ? pad.axes[0] : 0;
      const y = Number.isFinite(pad.axes?.[1]) ? pad.axes[1] : 0;
      const directions = [pressed(pad, 12) && "up", pressed(pad, 13) && "down",
        pressed(pad, 14) && "left", pressed(pad, 15) && "right"].filter(Boolean);
      let direction = directions.length === 1 ? directions[0] : "";
      if (!directions.length && Math.max(Math.abs(x), Math.abs(y)) >= DEADZONE) {
        direction = Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : (y > 0 ? "down" : "up");
      }
      const buttons = { mushroom: pressed(pad, 0), ice: pressed(pad, 1), confirm: pressed(pad, 9) };
      const neutral = !direction && !directions.length && !Object.values(buttons).some(Boolean);
      if (!enabled) { reset(); return result; }
      if (!armed) {
        if (neutral) armed = true;
        previous = buttons;
        return result;
      }
      result.direction = direction;
      for (const key of Object.keys(buttons)) result[key] = buttons[key] && !previous[key];
      previous = buttons;
      return result;
    }
    return { poll, reset };
  }
  globalThis.createBombGamepadReader = createBombGamepadReader;
}());
