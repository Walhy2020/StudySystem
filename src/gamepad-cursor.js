(function () {
  const PAGES = ["index.html", "pinyin.html", "book-learning.html", "theme-learning.html",
    "scenario-learning.html", "review-learning.html", "phonetics.html", "bomb-game.html"];
  const DEADZONE = 0.25;
  const SPEED = 650;
  const pressed = (pad, index) => Boolean(pad.buttons?.[index]?.pressed || pad.buttons?.[index]?.value > 0.5);

  function safeDestination(href, base, current = base) {
    try {
      const root = new URL(base), url = new URL(href, current);
      return url.origin === root.origin && (url.pathname === root.pathname || PAGES.some(page => url.pathname === root.pathname + page))
        ? url : null;
    } catch { return null; }
  }

  function cursorStep(position, axes, dt, width, height) {
    const axis = value => Number.isFinite(value) && Math.abs(value) > DEADZONE
      ? Math.sign(value) * (Math.min(1, Math.abs(value)) - DEADZONE) / (1 - DEADZONE) : 0;
    let x = axis(axes[0]), y = axis(axes[1]);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    const limit = (value, size) => {
      const low = Math.min(12, size / 2);
      return Math.max(low, Math.min(Math.max(low, size - 12), value));
    };
    return { x: limit(position.x + x * SPEED * Math.max(0, Math.min(0.05, dt)), width),
      y: limit(position.y + y * SPEED * Math.max(0, Math.min(0.05, dt)), height) };
  }

  globalThis.StudyGamepadCursorTools = Object.freeze({ safeDestination, cursorStep });
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const source = document.currentScript?.src;
  if (!source) return;
  const base = new URL("../", source);
  if (!safeDestination(location.href, base)) return;
  const isGame = location.pathname === base.pathname + "bomb-game.html";
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("../gamepad-cursor.css?v=1.0", source).href;
  document.head.append(style);

  const pointer = document.createElement("div");
  pointer.id = "study-gamepad-cursor";
  pointer.setAttribute("aria-hidden", "true");
  pointer.hidden = true;
  const help = document.createElement("div");
  help.id = "study-gamepad-help";
  help.textContent = isGame ? "菜单已暂停游戏 · 右摇杆移动 · A / × 点选 · L1 / L2 滚动 · Y / △ 回游戏"
    : "手柄光标 · 摇杆移动 · A / × 点选 · LB / RB 滚动";
  help.hidden = true;
  document.body.append(pointer, help);
  let position = { x: innerWidth / 2, y: innerHeight / 2 };
  let inputCapture = false;
  let lastFrame = null, identity = "", armed = false, previous = {};
  let menu = false, hovered = null, popup = null;

  function overlayHost() { return document.fullscreenElement || document.body; }
  function syncOverlayHost() {
    const host = overlayHost();
    host.append(pointer, help);
    if (popup) host.append(popup);
  }
  document.addEventListener("fullscreenchange", syncOverlayHost);

  function closePopup() { popup?.remove(); popup = null; }
  function setMenu(value) {
    if (menu === value) return;
    menu = value;
    if (isGame) window.dispatchEvent(new CustomEvent("studysystem:gamepad-menu", { detail: { active: value } }));
    if (!value) { pointer.hidden = true; help.hidden = true; closePopup(); }
  }
  function setHover(target) {
    if (hovered === target) return;
    hovered?.classList.remove("study-gamepad-hover");
    hovered = target;
    hovered?.classList.add("study-gamepad-hover");
    pointer.classList.toggle("is-clickable", Boolean(target));
  }
  function targetAtCursor() {
    return document.elementFromPoint(position.x, position.y)?.closest(
      'button,a,input,select,textarea,summary,[role="button"],[role="checkbox"],[tabindex],#bombCanvas');
  }
  function openSelect(select) {
    closePopup();
    popup = document.createElement("div");
    popup.className = "study-gamepad-options";
    popup.setAttribute("role", "group");
    popup.setAttribute("aria-label", select.getAttribute("aria-label") || "选择选项");
    for (const option of select.options) {
      if (option.disabled || option.hidden || option.parentElement?.disabled) continue;
      const button = document.createElement("button");
      button.type = "button"; button.textContent = option.textContent;
      button.setAttribute("aria-pressed", String(option.selected));
      button.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closePopup();
      });
      popup.append(button);
    }
    overlayHost().append(popup);
    const rect = select.getBoundingClientRect();
    popup.style.left = Math.max(8, Math.min(innerWidth - popup.offsetWidth - 8, rect.left)) + "px";
    popup.style.top = Math.max(8, Math.min(innerHeight - popup.offsetHeight - 8, rect.bottom + 4)) + "px";
    const selected = popup.querySelector('[aria-pressed="true"]');
    if (selected) popup.scrollTop = Math.max(0, selected.offsetTop - popup.clientHeight / 2);
  }
  function clickAtCursor() {
    const target = targetAtCursor();
    if (!target || target.matches(':disabled,[aria-disabled="true"]') || target.closest("[inert]")) return;
    if (popup?.contains(target)) { target.click(); return; }
    if (popup && !popup.contains(target)) closePopup();
    if (target.matches('input[type="file"]')) return;
    if (target.matches("a")) {
      const destination = safeDestination(target.getAttribute("href"), base, location.href);
      if (!destination || target.hasAttribute("download")) return;
      location.assign(destination.href); // Stay in this tab and within the eight system pages.
      return;
    }
    if (target.matches("select")) { openSelect(target); return; }
    target.focus?.({ preventScroll: true });
    if (target.matches('input[type="range"]')) {
      const rect = target.getBoundingClientRect();
      const min = Number(target.min || 0), max = Number(target.max || 100), step = Number(target.step) || 1;
      target.value = String(min + Math.round((max - min) * Math.max(0, Math.min(1,
        (position.x - rect.left) / rect.width)) / step) * step);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const coordinates = { bubbles: true, cancelable: true, clientX: position.x, clientY: position.y, button: 0 };
    target.dispatchEvent(new PointerEvent("pointerdown", { ...coordinates, pointerId: 99, pointerType: "mouse" }));
    target.dispatchEvent(new PointerEvent("pointerup", { ...coordinates, pointerId: 99, pointerType: "mouse" }));
    if (typeof target.click === "function") target.click();
    else target.dispatchEvent(new MouseEvent("click", coordinates));
    if (isGame && (target.id === "bombCanvas" || target.id === "startBombGame" ||
      target.id === "overlayStartBombGame" || target.id === "restartBombGame")) setMenu(false);
  }
  function scrollAtCursor(amount, freshPress) {
    let node = document.elementFromPoint(position.x, position.y);
    while (node && node !== document.body) {
      const css = getComputedStyle(node);
      if (/(auto|scroll)/.test(css.overflowY) && node.scrollHeight > node.clientHeight + 1) {
        node.scrollTop += amount; return;
      }
      if (/(auto|scroll)/.test(css.overflowX) && node.scrollWidth > node.clientWidth + 1) {
        // A full step avoids mandatory scroll-snap snapping every tiny frame back to the same card.
        if (freshPress) node.scrollLeft += Math.sign(amount) * Math.max(160, node.clientWidth * 0.8);
        return;
      }
      node = node.parentElement;
    }
    document.scrollingElement.scrollTop += amount;
  }
  function suspend() {
    armed = false; previous = {};
    pointer.hidden = true; help.hidden = true;
    setHover(null); setMenu(false); closePopup();
  }
  function poll(now = performance.now()) {
    if (lastFrame === now) return;
    const dt = lastFrame === null ? 0 : (now - lastFrame) / 1000;
    lastFrame = now;
    if (inputCapture) { armed = false; previous = {}; return; }
    if (document.hidden || !document.hasFocus()) { suspend(); return; }
    let pads;
    try { pads = Array.from(navigator.getGamepads?.() || []).filter(pad => pad?.connected && pad.mapping === "standard"); }
    catch { pads = []; }
    const pad = pads.find(pad => `${pad.index}:${pad.id}` === identity) || pads[0];
    if (!pad) { identity = ""; suspend(); return; }
    const nextIdentity = `${pad.index}:${pad.id}`;
    if (nextIdentity !== identity) { identity = nextIdentity; suspend(); }
    const axis = index => Number.isFinite(pad.axes?.[index]) ? pad.axes[index] : 0;
    const right = [axis(2), axis(3)];
    const axes = isGame || Math.max(...right.map(Math.abs)) > DEADZONE ? right : [axis(0), axis(1)];
    const buttons = { click: pressed(pad, 0) || pressed(pad, 11), toggle: pressed(pad, 3),
      scrollUp: pressed(pad, 4), scrollDown: pressed(pad, isGame ? 6 : 5) };
    const neutral = [0, 1, 2, 3].every(index => Math.abs(axis(index)) <= DEADZONE) &&
      ![0, 1, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15].some(index => pressed(pad, index));
    if (!armed) {
      if (neutral) armed = true;
      previous = buttons;
      return;
    }
    if (isGame && buttons.toggle && !previous.toggle) {
      if (menu) { suspend(); return; }
      setMenu(true);
    }
    if (axes.some(value => Math.abs(value) > DEADZONE)) setMenu(true);
    if (!isGame) setMenu(true);
    pointer.hidden = !menu; help.hidden = !menu;
    if (menu) {
      position = cursorStep(position, axes, dt, innerWidth, innerHeight);
      pointer.style.left = position.x + "px"; pointer.style.top = position.y + "px";
      setHover(targetAtCursor());
      const scroll = Number(buttons.scrollDown) - Number(buttons.scrollUp);
      if (scroll) scrollAtCursor(scroll * 500 * Math.max(0, Math.min(0.05, dt)),
        (buttons.scrollDown && !previous.scrollDown) || (buttons.scrollUp && !previous.scrollUp));
      if (buttons.click && !previous.click) clickAtCursor();
    } else setHover(null);
    previous = buttons;
  }
  window.STUDY_GAMEPAD_CURSOR = Object.freeze({ poll, leaveMenu: suspend, isMenuActive: () => isGame && menu,
    resetInput: () => { armed = false; previous = {}; },
    setInputCapture: active => { inputCapture = Boolean(active); armed = false; previous = {}; } });
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("gamepaddisconnected", suspend);
  window.addEventListener("studysystem:update-prompt", suspend);
  document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); });
  window.addEventListener("resize", closePopup);
  function frame(now) { poll(now); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}());
