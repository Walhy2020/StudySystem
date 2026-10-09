(function () {
  const DEADZONE = 0.35;

  function createBombGamepadReader(getGamepads = () => navigator.getGamepads?.() || []) {
    let identity = "", armed = false, previous = {}, systemArmed = false, systemPrevious = {};
    let attackButtons = { mushroom: 0, ice: 1 };
    const pressed = (pad, index) => Boolean(pad.buttons?.[index]?.pressed || pad.buttons?.[index]?.value > 0.5);
    function reset() { armed = false; previous = {}; }
    function poll(enabled = true, systemEnabled = enabled) {
      let pads;
      try { pads = Array.from(getGamepads() || []).filter(pad => pad?.connected !== false && pad); }
      catch { pads = []; }
      const pad = pads.find(pad => `${pad.index}:${pad.id}` === identity && pad.mapping === "standard")
        || pads.find(pad => pad.mapping === "standard") || pads[0];
      const nextIdentity = pad ? `${pad.index}:${pad.id}` : "";
      if (nextIdentity !== identity) { identity = nextIdentity; reset(); systemArmed = false; systemPrevious = {}; }
      const result = { connected: Boolean(pad), standard: pad?.mapping === "standard",
        direction: "", aim: "", mushroom: false, ice: false, confirm: false, refresh: false, fullscreen: false, pressedButtons: [] };
      if (!pad || !result.standard) { reset(); return result; }
      result.pressedButtons = Array.from(pad.buttons || [], (_, index) => index).filter(index => pressed(pad, index));
      const x = Number.isFinite(pad.axes?.[0]) ? pad.axes[0] : 0;
      const y = Number.isFinite(pad.axes?.[1]) ? pad.axes[1] : 0;
      const directions = [pressed(pad, 12) && "up", pressed(pad, 13) && "down",
        pressed(pad, 14) && "left", pressed(pad, 15) && "right"].filter(Boolean);
      const direction = directions.length === 1 ? directions[0] : "";
      const aim = Math.max(Math.abs(x), Math.abs(y)) >= DEADZONE
        ? (Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : (y > 0 ? "down" : "up")) : "";
      // R2 return is owned by the shared cursor, including while menus are open.
      const systemButtons = { refresh: pressed(pad, 5) };
      if (!systemEnabled) systemArmed = false;
      else if (!systemArmed) { if (!Object.values(systemButtons).some(Boolean)) systemArmed = true; }
      else for (const key of Object.keys(systemButtons)) result[key] = systemButtons[key] && !systemPrevious[key];
      systemPrevious = systemButtons;
      const buttons = { mushroom: pressed(pad, attackButtons.mushroom), ice: pressed(pad, attackButtons.ice), confirm: pressed(pad, 9) };
      const neutral = !aim && !directions.length && !Object.values(buttons).some(Boolean) && !Object.values(systemButtons).some(Boolean) && !pressed(pad, 7);
      if (!enabled) { reset(); return result; }
      if (!armed) {
        if (neutral) armed = true;
        previous = buttons;
        return result;
      }
      result.direction = direction;
      result.aim = aim;
      for (const key of Object.keys(buttons)) result[key] = buttons[key] && !previous[key];
      previous = buttons;
      return result;
    }
    function setBindings(mushroom, ice) {
      if (attackButtons.mushroom === mushroom && attackButtons.ice === ice) return;
      attackButtons = { mushroom, ice }; reset();
    }
    return { poll, reset, setBindings };
  }
  globalThis.createBombGamepadReader = createBombGamepadReader;
}());
