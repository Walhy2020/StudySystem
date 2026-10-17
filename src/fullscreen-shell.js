(function () {
  const pages = ["index.html", "pinyin.html", "book-learning.html", "theme-learning.html",
    "scenario-learning.html", "review-learning.html", "phonetics.html", "bomb-game.html"];
  function moduleUrl(href, base, current = base) {
    try {
      const root = new URL(base), url = new URL(href, current);
      return url.origin === root.origin && (url.pathname === root.pathname || pages.some(page => url.pathname === root.pathname + page)) ? url : null;
    } catch { return null; }
  }
  globalThis.StudyFullscreenShellTools = Object.freeze({ moduleUrl });
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const source = document.currentScript?.src;
  if (!source) return;
  const base = new URL("../", source);
  if (!moduleUrl(location.href, base)) return;
  const style = document.createElement("link"); style.rel = "stylesheet";
  style.href = new URL("../fullscreen-shell.css?v=1.1", source).href; document.head.append(style);
  let frame = null, currentUrl = null, exiting = false, cursorCarry = null;
  function clearCursorCarry() { if (cursorCarry) cursorCarry.hidden = true; }
  function cursorSnapshot() {
    try {
      const sourceDocument = frame ? frame.contentDocument : document;
      const cursor = sourceDocument?.getElementById("study-gamepad-cursor");
      if (!cursor || cursor.hidden || !cursor.getClientRects().length) return null;
      return { x: parseFloat(cursor.style.left), y: parseFloat(cursor.style.top),
        clickable: cursor.classList.contains("is-clickable") };
    } catch { return null; }
  }
  function carryCursor(snapshot, owner) {
    if (!owner || !snapshot || !Number.isFinite(snapshot.x) || !Number.isFinite(snapshot.y)) {
      clearCursorCarry(); return;
    }
    if (!cursorCarry) {
      cursorCarry = document.createElement("div"); cursorCarry.id = "study-navigation-cursor";
      cursorCarry.setAttribute("aria-hidden", "true");
    }
    cursorCarry.style.left = Math.max(12, Math.min(innerWidth - 12, snapshot.x)) + "px";
    cursorCarry.style.top = Math.max(12, Math.min(innerHeight - 12, snapshot.y)) + "px";
    cursorCarry.classList.toggle("is-clickable", snapshot.clickable);
    owner.append(cursorCarry); cursorCarry.hidden = false;
  }
  function parentShell() {
    try {
      const shell = window.parent !== window && window.parent.STUDY_FULLSCREEN_SHELL;
      return shell?.ownsFrame(window) ? shell : null;
    } catch { return null; }
  }
  function leaveShell() {
    if (!frame || exiting) return;
    exiting = true;
    // Return directly to the currently displayed module, never to the dormant source.
    location.replace(currentUrl.href);
  }
  function navigate(href, push = true) {
    const url = moduleUrl(href, base, location.href);
    if (!url) return false;
    const parent = parentShell();
    if (parent) return parent.navigateFrame(window, url.href);
    const owner = document.fullscreenElement;
    if (!frame && !owner) return false;
    const snapshot = cursorSnapshot();
    if (frame) {
      // Stop the outgoing module too, not only the original fullscreen owner.
      frame.contentWindow.dispatchEvent(new Event("studysystem:fullscreen-navigation"));
      frame.contentWindow.speechSynthesis?.cancel?.();
    }
    if (!frame) {
      window.dispatchEvent(new Event("studysystem:fullscreen-navigation"));
      window.speechSynthesis?.cancel?.();
      frame = document.createElement("iframe"); frame.id = "study-module-frame";
      frame.title = "马里奥学习系统当前模块"; frame.allow = "fullscreen; gamepad";
      owner.classList.add("study-fullscreen-host");
      for (const node of owner.children) node.inert = true;
      owner.append(frame);
      frame.addEventListener("load", () => {
        try {
          const loaded = moduleUrl(frame.contentWindow.location.href, base);
          if (!loaded) return;
          currentUrl = loaded; document.title = frame.contentDocument.title;
          history.replaceState({ studyFullscreen: true }, "", loaded.href);
          frame.focus();
        } catch { /* Only same-origin system modules are accepted. */ }
      });
    }
    currentUrl = url;
    if (push && location.href !== url.href) history.pushState({ studyFullscreen: true }, "", url.href);
    frame.src = url.href;
    carryCursor(snapshot, owner);
    // Focus need not wait for images or other late resources to finish loading.
    frame.focus();
    return true;
  }
  async function toggleFullscreen() {
    const parent = parentShell();
    if (parent) return parent.toggleFrameFullscreen(window);
    if (frame) return document.exitFullscreen();
    if (document.fullscreenElement) return document.exitFullscreen();
    return document.documentElement.requestFullscreen();
  }
  window.STUDY_FULLSCREEN_SHELL = Object.freeze({
    navigate, toggleFullscreen,
    isHosting: () => Boolean(frame),
    isEmbedded: () => Boolean(parentShell()),
    isFullscreen: () => Boolean(document.fullscreenElement || parentShell()?.isFullscreen()),
    ownsFrame: child => Boolean(frame && frame.contentWindow === child),
    cursorReady: () => parentShell()?.cursorReadyFor(window),
    cursorReadyFor: child => { if (frame?.contentWindow === child) clearCursorCarry(); },
    navigateFrame: (child, href) => frame?.contentWindow === child ? navigate(href) : false,
    toggleFrameFullscreen: child => frame?.contentWindow === child ? toggleFullscreen() : Promise.reject(new Error("Not the active module")),
  });
  // Native mouse/keyboard links and the gamepad pointer share the same routing.
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = moduleUrl(link.getAttribute("href"), base, location.href);
    if (!url || (url.pathname === location.pathname && url.search === location.search)) return;
    if (navigate(url.href)) event.preventDefault();
  });
  document.addEventListener("fullscreenchange", () => { if (frame && !document.fullscreenElement) leaveShell(); });
  window.addEventListener("popstate", () => { if (frame) navigate(location.href, false); });
  window.addEventListener("blur", () => { if (!document.hasFocus()) clearCursorCarry(); });
  window.addEventListener("studysystem:controller-mouse", () => {
    if (window.STUDY_CONTROLLER_MOUSE?.isActive()) clearCursorCarry();
  });
  window.addEventListener("gamepaddisconnected", clearCursorCarry);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearCursorCarry(); });
}());
