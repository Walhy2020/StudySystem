(function () {
  const PAGES = ["index.html", "pinyin.html", "word-learning.html", "book-learning.html", "theme-learning.html",
    "scenario-learning.html", "review-learning.html", "phonetics.html", "bomb-game.html", "snake-game.html"];
  const DEADZONE = 0.25;
  const SPEED = 650;
  const SCROLL_SPEED = 500;
  const pressed = (pad, index) => Boolean(pad.buttons?.[index]?.pressed || pad.buttons?.[index]?.value > 0.5);

  function safeDestination(href, base, current = base) {
    try {
      const root = new URL(base), url = new URL(href, current);
      return url.origin === root.origin && (url.pathname === root.pathname || PAGES.some(page => url.pathname === root.pathname + page))
        ? url : null;
    } catch { return null; }
  }

  const axisStrength = value => Number.isFinite(value) && Math.abs(value) > DEADZONE
    ? Math.sign(value) * (Math.min(1, Math.abs(value)) - DEADZONE) / (1 - DEADZONE) : 0;
  function cursorStep(position, axes, dt, width, height) {
    let x = axisStrength(axes[0]), y = axisStrength(axes[1]);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    const limit = (value, size) => {
      const low = Math.min(12, size / 2);
      return Math.max(low, Math.min(Math.max(low, size - 12), value));
    };
    return { x: limit(position.x + x * SPEED * Math.max(0, Math.min(0.05, dt)), width),
      y: limit(position.y + y * SPEED * Math.max(0, Math.min(0.05, dt)), height) };
  }

  function edgeScrollAmount(position, axes, dt, size, axis = "y") {
    const strength = axisStrength(axes[axis === "x" ? 0 : 1]);
    const coordinate = position[axis];
    const outward = (strength < 0 && coordinate <= 12.5) || (strength > 0 && coordinate >= size - 12.5);
    return outward && Number.isFinite(dt) ? strength * SCROLL_SPEED * Math.max(0, Math.min(0.05, dt)) : 0;
  }

  function restoreCursorPosition(value, width, height) {
    const valid = value && Number.isFinite(value.x) && Number.isFinite(value.y);
    return cursorStep(valid ? value : { x: width / 2, y: height / 2 }, [0, 0], 0, width, height);
  }
  function createPositionStore(storage, key) {
    return Object.freeze({
      read(width, height) {
        try { return restoreCursorPosition(JSON.parse(storage?.getItem(key) ?? "null"), width, height); }
        catch { return restoreCursorPosition(null, width, height); }
      },
      save(position) {
        if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) return;
        try { storage?.setItem(key, JSON.stringify({ x: position.x, y: position.y })); }
        catch { /* Disabled session storage must not interrupt controller input. */ }
      },
    });
  }

  globalThis.StudyGamepadCursorTools = Object.freeze({ safeDestination, cursorStep, edgeScrollAmount, restoreCursorPosition, createPositionStore });
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const source = document.currentScript?.src;
  if (!source) return;
  const base = new URL("../", source);
  if (!safeDestination(location.href, base)) return;
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("../gamepad-cursor.css?v=1.1", source).href;
  document.head.append(style);
  const shell = window.STUDY_FULLSCREEN_SHELL;
  if (shell?.isEmbedded()) {
    // Content modules only delegate. They never create a pointer, own coordinates
    // or start an input loop; even bomb's explicit poll calls stay with the owner.
    window.STUDY_GAMEPAD_CURSOR = Object.freeze({
      poll: () => {},
      leaveMenu: () => shell.cursorOwner()?.leaveMenu(),
      isMenuActive: () => shell.cursorOwner()?.isMenuActive() || false,
      resetInput: () => shell.cursorOwner()?.resetInput(),
      setInputCapture: value => shell.cursorOwner()?.setInputCapture(value),
    });
    window.addEventListener("studysystem:update-prompt", () => shell.cursorOwner()?.leaveMenu());
    return;
  }
  const activeWindow = () => shell?.activeWindow() || (shell?.isHosting() ? null : window);
  const activeDocument = () => activeWindow()?.document;
  const pathname = () => new URL(shell?.currentUrl() || location.href).pathname;
  const isGame = () => ["bomb-game.html", "snake-game.html"].some(page => pathname() === base.pathname + page);
  const isLearningSpacePage = () => pathname() === base.pathname ||
    ["index.html", "word-learning.html", "theme-learning.html"].some(page => pathname() === base.pathname + page);
  function moduleEvent(type, options) {
    const target = activeWindow();
    return target ? target.dispatchEvent(new target.CustomEvent(type, options)) : true;
  }

  const pointer = document.createElement("div");
  pointer.id = "study-gamepad-cursor";
  pointer.setAttribute("aria-hidden", "true");
  pointer.setAttribute("data-study-shell-overlay", "");
  pointer.hidden = true;
  const help = document.createElement("div");
  help.id = "study-gamepad-help";
  help.setAttribute("data-study-shell-overlay", "");
  help.hidden = true;
  document.body.append(pointer, help);
  let positionStorage;
  try { positionStorage = window.sessionStorage; } catch { /* Browser storage may be disabled. */ }
  // UI coordinates only, isolated to this tab and application directory.
  const positionStore = createPositionStore(positionStorage, `mario-gamepad-cursor-position-v1:${base.pathname}`);
  let position = positionStore.read(innerWidth, innerHeight);
  function renderPosition() {
    pointer.style.left = position.x + "px"; pointer.style.top = position.y + "px";
  }
  function rememberPosition() {
    positionStore.save(position);
  }
  renderPosition();
  let inputCapture = false;
  let lastFrame = null, identity = "", armed = false, previous = {};
  let menu = false, hovered = null, popup = null;
  let fullscreenPending = false;
  let viewHeld = true;

  function overlayHost() { return shell?.overlayHost() || document.fullscreenElement || document.body; }
  function syncOverlayHost() {
    const host = overlayHost();
    host.append(pointer, help);
    if (popup) host.append(popup);
  }
  document.addEventListener("fullscreenchange", syncOverlayHost);

  async function toggleFullscreen() {
    if (inputCapture || fullscreenPending) return;
    // Bomb owns its save/pause/focus handling; only one fullscreen path may run.
    if (isGame() && activeWindow()) {
      moduleEvent("studysystem:gamepad-fullscreen");
      return;
    }
    fullscreenPending = true;
    try {
      await window.STUDY_FULLSCREEN_SHELL.toggleFullscreen();
    } catch (error) {
      console.warn("浏览器未允许全屏切换", error);
    } finally { fullscreenPending = false; }
  }

  function returnOneLevel() {
    if (inputCapture) return;
    if (popup) { closePopup(); return; }
    // Reuse module-owned exits: these also cancel speech/timers and save progress.
    if (!moduleEvent("studysystem:gamepad-back", { cancelable: true })) return;
    for (const id of ["backToScenarios", "backToThemes", "backToSeries"]) {
      const button = activeDocument()?.getElementById(id);
      if (button && !button.disabled && button.getClientRects().length) {
        button.click(); return;
      }
    }
    if (pathname() === base.pathname || pathname() === base.pathname + "index.html") return;
    const destination = new URL("index.html", base);
    rememberPosition();
    if (!window.STUDY_FULLSCREEN_SHELL?.navigate(destination.href)) location.assign(destination.href);
  }

  function closePopup() { popup?.remove(); popup = null; }
  function setMenu(value) {
    if (menu === value) return;
    menu = value;
    if (isGame()) moduleEvent("studysystem:gamepad-menu", { detail: { active: value } });
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
    const overlay = document.elementFromPoint(position.x, position.y);
    if (popup?.contains(overlay)) return overlay.closest("button");
    return activeDocument()?.elementFromPoint(position.x, position.y)?.closest(
      'button,a,input,select,textarea,summary,[role="button"],[role="checkbox"],[tabindex],#bombCanvas');
  }
  function openSelect(select) {
    closePopup();
    popup = document.createElement("div");
    popup.className = "study-gamepad-options";
    popup.setAttribute("data-study-shell-overlay", "");
    popup.setAttribute("role", "group");
    popup.setAttribute("aria-label", select.getAttribute("aria-label") || "选择选项");
    for (const option of select.options) {
      if (option.disabled || option.hidden || option.parentElement?.disabled) continue;
      const button = document.createElement("button");
      button.type = "button"; button.textContent = option.textContent;
      button.setAttribute("aria-pressed", String(option.selected));
      button.addEventListener("click", () => {
        select.value = option.value;
        const EventType = select.ownerDocument.defaultView.Event;
        select.dispatchEvent(new EventType("input", { bubbles: true }));
        select.dispatchEvent(new EventType("change", { bubbles: true }));
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
    if (shell?.isNavigating()) return;
    const target = targetAtCursor();
    if (!target || target.matches(':disabled,[aria-disabled="true"]') || target.closest("[inert]")) return;
    if (popup?.contains(target)) { target.click(); return; }
    if (popup && !popup.contains(target)) closePopup();
    if (target.matches('input[type="file"]')) return;
    if (target.matches("a")) {
      const destination = safeDestination(target.getAttribute("href"), base, target.ownerDocument.location.href);
      if (!destination || target.hasAttribute("download")) return;
      rememberPosition();
      if (!window.STUDY_FULLSCREEN_SHELL?.navigate(destination.href)) location.assign(destination.href);
      return;
    }
    if (target.matches("select")) { openSelect(target); return; }
    target.focus?.({ preventScroll: true });
    if (target.matches('input[type="range"]')) {
      const rect = target.getBoundingClientRect();
      const min = Number(target.min || 0), max = Number(target.max || 100), step = Number(target.step) || 1;
      target.value = String(min + Math.round((max - min) * Math.max(0, Math.min(1,
        (position.x - rect.left) / rect.width)) / step) * step);
      const EventType = target.ownerDocument.defaultView.Event;
      target.dispatchEvent(new EventType("input", { bubbles: true }));
      target.dispatchEvent(new EventType("change", { bubbles: true }));
      return;
    }
    const coordinates = { bubbles: true, cancelable: true, clientX: position.x, clientY: position.y, button: 0 };
    const targetWindow = target.ownerDocument.defaultView;
    target.dispatchEvent(new targetWindow.PointerEvent("pointerdown", { ...coordinates, pointerId: 99, pointerType: "mouse" }));
    target.dispatchEvent(new targetWindow.PointerEvent("pointerup", { ...coordinates, pointerId: 99, pointerType: "mouse" }));
    if (typeof target.click === "function") target.click();
    else target.dispatchEvent(new targetWindow.MouseEvent("click", coordinates));
    if (isGame() && (target.id === "bombCanvas" || target.id === "startBombGame" ||
      target.id === "overlayStartBombGame" || target.id === "restartBombGame" ||
      ["game", "startButton", "resumeButton", "resetButton", "autoButton"].includes(target.id))) setMenu(false);
  }
  const horizontalSnap = new Map();
  function restoreHorizontalSnap(keep = null) {
    for (const [node, previousStyle] of horizontalSnap) {
      if (node === keep) continue;
      if (previousStyle.value) node.style.setProperty("scroll-snap-type", previousStyle.value, previousStyle.priority);
      else node.style.removeProperty("scroll-snap-type");
      horizontalSnap.delete(node);
    }
  }
  function scrollAtCursor(amount, axis = "y") {
    const overlay = document.elementFromPoint(position.x, position.y);
    const content = popup?.contains(overlay) ? document : activeDocument();
    if (!content) return;
    // Probe slightly inside the content margin: the clamped cursor may sit just
    // outside a navigation strip even though its row extends to the page edge.
    const probeX = axis === "x" ? Math.max(32, Math.min(innerWidth - 32, position.x)) : position.x;
    let node = content.elementFromPoint(probeX, position.y);
    const computed = node => content.defaultView.getComputedStyle(node);
    const offset = axis === "x" ? "scrollLeft" : "scrollTop";
    const extent = axis === "x" ? "scrollWidth" : "scrollHeight";
    const viewport = axis === "x" ? "clientWidth" : "clientHeight";
    const overflow = axis === "x" ? "overflowX" : "overflowY";
    while (node && node !== content.body) {
      const css = computed(node);
      const canScroll = amount > 0 ? node[offset] < node[extent] - node[viewport] - 1 : node[offset] > 0;
      if (/(auto|scroll)/.test(css[overflow]) && node[extent] > node[viewport] + 1 && canScroll) {
        if (axis === "x" && !horizontalSnap.has(node)) {
          horizontalSnap.set(node, { value: node.style.getPropertyValue("scroll-snap-type"), priority: node.style.getPropertyPriority("scroll-snap-type") });
          node.style.setProperty("scroll-snap-type", "none", "important");
        }
        node.scrollTo({ [axis === "x" ? "left" : "top"]: node[offset] + amount, behavior: "instant" });
        return node;
      }
      node = node.parentElement;
    }
    const root = content.scrollingElement;
    if (root && !/(hidden|clip)/.test(computed(root)[overflow])) {
      root.scrollTo({ [axis === "x" ? "left" : "top"]: root[offset] + amount, behavior: "instant" });
    }
    return null;
  }
  function suspend() {
    restoreHorizontalSnap();
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
    if (nextIdentity !== identity) { identity = nextIdentity; viewHeld = true; suspend(); }
    const view = pressed(pad, 8);
    if (view && !viewHeld) window.STUDY_CONTROLLER_MOUSE?.viewPressed();
    viewHeld = view;
    if (window.STUDY_CONTROLLER_MOUSE?.isActive()) { suspend(); return; }
    const axis = index => Number.isFinite(pad.axes?.[index]) ? pad.axes[index] : 0;
    const right = [axis(2), axis(3)];
    const axes = isGame() || Math.max(...right.map(Math.abs)) > DEADZONE ? right : [axis(0), axis(1)];
    const buttons = { click: pressed(pad, 0) || pressed(pad, 11), toggle: pressed(pad, 3),
      mute: pressed(pad, 4), back: pressed(pad, 5), fullscreen: pressed(pad, 7) };
    const neutral = [0, 1, 2, 3].every(index => Math.abs(axis(index)) <= DEADZONE) &&
      ![0, 1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15].some(index => pressed(pad, index));
    if (!armed) {
      if (neutral) armed = true;
      previous = buttons;
      // Visibility is not input permission. Preserve the restored cursor while
      // held navigation buttons/sticks still require release before any action.
      if (!isGame() || shell?.isNavigating()) { setMenu(true); pointer.hidden = false; }
      return;
    }
    if (!isGame() && !shell?.isNavigating() && buttons.back && !previous.back) {
      previous = buttons; returnOneLevel(); return;
    }
    if (buttons.fullscreen && !previous.fullscreen) void toggleFullscreen();
    if (buttons.mute && !previous.mute) window.STUDY_AUDIO?.toggle();
    if (!shell?.isNavigating() && isLearningSpacePage() && buttons.toggle && !previous.toggle) {
      const target = activeDocument()?.activeElement;
      if (!target?.matches("input,select,textarea") && !target?.isContentEditable) {
        // Reuse the same controls as Space; no synthetic key default actions.
        const control = activeDocument()?.getElementById(pathname() === base.pathname + "theme-learning.html"
          ? "phoneticToggle" : pathname() === base.pathname + "word-learning.html" ? "currentWord" : "currentChar");
        if (control && !control.disabled && control.getClientRects().length) control.click();
      }
    }
    if (!shell?.isNavigating() && isGame() && buttons.toggle && !previous.toggle) {
      if (menu) { suspend(); return; }
      setMenu(true);
    }
    if (axes.some(value => Math.abs(value) > DEADZONE)) setMenu(true);
    if (!isGame() || shell?.isNavigating()) setMenu(true);
    pointer.hidden = !menu; help.hidden = true;
    if (menu) {
      position = cursorStep(position, axes, dt, innerWidth, innerHeight);
      renderPosition();
      const edgeScroll = edgeScrollAmount(position, axes, dt, innerHeight);
      if (edgeScroll) scrollAtCursor(edgeScroll);
      const horizontalScroll = edgeScrollAmount(position, axes, dt, innerWidth, "x");
      restoreHorizontalSnap(horizontalScroll ? scrollAtCursor(horizontalScroll, "x") : null);
      setHover(targetAtCursor());
      if (buttons.click && !previous.click) clickAtCursor();
    } else setHover(null);
    previous = buttons;
  }
  window.STUDY_GAMEPAD_CURSOR = Object.freeze({ poll, leaveMenu: suspend, isMenuActive: () => isGame() && menu,
    resetInput: () => { armed = false; previous = {}; },
    setInputCapture: active => { restoreHorizontalSnap(); inputCapture = Boolean(active); viewHeld = true; armed = false; previous = {};
      window.STUDY_CONTROLLER_MOUSE?.setCapture(active); } });
  window.addEventListener("studysystem:controller-mouse", () => { suspend(); });
  // Focusing an owned iframe is not leaving the application.
  window.addEventListener("blur", () => { if (!document.hasFocus()) suspend(); });
  window.addEventListener("pagehide", () => { rememberPosition(); suspend(); });
  window.addEventListener("studysystem:module-changing", () => {
    restoreHorizontalSnap();
    const visible = !pointer.hidden;
    rememberPosition(); setMenu(false); setHover(null); closePopup();
    inputCapture = false; window.STUDY_CONTROLLER_MOUSE?.setCapture(false);
    pointer.hidden = !visible;
  });
  window.addEventListener("studysystem:module-ready", () => {
    if (isGame()) setMenu(false);
  });
  window.addEventListener("gamepaddisconnected", suspend);
  window.addEventListener("studysystem:update-prompt", suspend);
  document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); });
  window.addEventListener("resize", () => {
    position = restoreCursorPosition(position, innerWidth, innerHeight); renderPosition(); closePopup();
  });
  function frame(now) { poll(now); requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
}());
