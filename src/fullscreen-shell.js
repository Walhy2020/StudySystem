(function () {
  const pages = ["index.html", "pinyin.html", "word-learning.html", "book-learning.html", "theme-learning.html",
    "scenario-learning.html", "review-learning.html", "phonetics.html", "bomb-game.html", "snake-game.html"];
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
  style.href = new URL("../fullscreen-shell.css?v=1.2", source).href; document.head.append(style);
  let frame = null, currentUrl = new URL(location.href), navigating = false, host = null;
  function parentShell() {
    try {
      const shell = window.parent !== window && window.parent.STUDY_FULLSCREEN_SHELL;
      return shell?.ownsFrame(window) ? shell : null;
    } catch { return null; }
  }
  function activeWindow() {
    if (!frame) return window;
    return navigating ? null : frame.contentWindow;
  }
  function mountFrame() {
    if (!frame || host) return;
    const owner = document.fullscreenElement || document.body;
    host = owner;
    host.classList.add("study-fullscreen-host");
    for (const node of host.children) {
      if (node === frame || node.hasAttribute("data-study-shell-overlay")) continue;
      node.inert = true;
    }
    host.append(frame);
  }
  function moduleReady(child) {
    if (!frame || frame.contentWindow !== child) return;
    const loaded = moduleUrl(child.location.href, base);
    if (!loaded || loaded.href !== currentUrl.href) return;
    navigating = false;
    document.title = child.document.title;
    history.replaceState({ studyFullscreen: true }, "", loaded.href);
    window.dispatchEvent(new Event("studysystem:module-ready"));
    child.dispatchEvent(new child.CustomEvent("studysystem:controller-mouse"));
  }
  function navigate(href, push = true) {
    const url = moduleUrl(href, base, location.href);
    if (!url) return false;
    const parent = parentShell();
    if (parent) return parent.navigateFrame(window, url.href);
    // Windowed and fullscreen navigation have the SAME persistent owner. Only
    // the content document changes; cursor identity, coordinates and input edges do not.
    window.dispatchEvent(new Event("studysystem:module-changing"));
    const outgoing = activeWindow();
    outgoing?.dispatchEvent(new outgoing.Event("studysystem:fullscreen-navigation"));
    outgoing?.speechSynthesis?.cancel?.();
    navigating = true;
    currentUrl = url;
    if (!frame) {
      frame = document.createElement("iframe"); frame.id = "study-module-frame";
      frame.title = "马里奥学习系统当前模块"; frame.allow = "fullscreen; gamepad";
      // Replacing subsequent frame documents avoids duplicate browser-history entries.
      frame.src = url.href;
      mountFrame();
    } else frame.contentWindow.location.replace(url.href);
    if (push && location.href !== url.href) history.pushState({ studyFullscreen: true }, "", url.href);
    frame.focus();
    return true;
  }
  async function toggleFullscreen() {
    const parent = parentShell();
    if (parent) return parent.toggleFrameFullscreen(window);
    if (document.fullscreenElement) return document.exitFullscreen();
    return (host || document.documentElement).requestFullscreen();
  }
  window.STUDY_FULLSCREEN_SHELL = Object.freeze({
    navigate, toggleFullscreen,
    isHosting: () => Boolean(frame),
    isEmbedded: () => Boolean(parentShell()),
    isNavigating: () => navigating,
    activeWindow, currentUrl: () => currentUrl.href,
    overlayHost: () => host || document.fullscreenElement || document.body,
    isFullscreen: () => Boolean(document.fullscreenElement || parentShell()?.isFullscreen()),
    ownsFrame: child => Boolean(frame && frame.contentWindow === child),
    cursorOwner: () => parentShell()?.cursorFor(window),
    mouseOwner: () => parentShell()?.mouseFor(window),
    cursorFor: child => frame?.contentWindow === child ? window.STUDY_GAMEPAD_CURSOR : null,
    mouseFor: child => frame?.contentWindow === child ? window.STUDY_CONTROLLER_MOUSE : null,
    moduleReady,
    navigateFrame: (child, href) => frame?.contentWindow === child ? navigate(href) : false,
    toggleFrameFullscreen: child => frame?.contentWindow === child ? toggleFullscreen() : Promise.reject(new Error("Not the active module")),
    reload: () => parentShell() ? parentShell().reloadFrame(window) : location.reload(),
    reloadFrame: child => { if (frame?.contentWindow === child) location.reload(); },
  });
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = moduleUrl(link.getAttribute("href"), base, location.href);
    if (!url || (url.pathname === location.pathname && url.search === location.search)) return;
    if (navigate(url.href)) event.preventDefault();
  });
  // Exiting fullscreen no longer reloads the owner or destroys the real cursor.
  window.addEventListener("popstate", () => { if (frame) navigate(location.href, false); });
  if (parentShell()) document.addEventListener("DOMContentLoaded", () => parentShell()?.moduleReady(window), { once: true });
}());
