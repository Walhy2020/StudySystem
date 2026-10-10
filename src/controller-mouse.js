(function () {
  // The native worker reads physical Xbox View. HTTP only carries a presence lease,
  // never pointer coordinates, clicks, commands, or an arbitrary desktop action.
  const client = crypto.randomUUID();
  let mode = "web", pendingUntil = 0, capture = false, inFlight = false, available = false;
  let supported = false, noticeUntil = 0, retryAfter = 0;
  const badge = document.createElement("div");
  badge.id = "study-controller-mouse-mode";
  badge.hidden = true;
  badge.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;pointer-events:none;background:#16324f;color:white;padding:6px 10px;border-radius:12px;font:14px sans-serif";
  document.body.append(badge);
  function blocked() { return mode === "system" || performance.now() < pendingUntil; }
  function notify() {
    window.dispatchEvent(new CustomEvent("studysystem:controller-mouse", { detail: { active: blocked(), mode } }));
  }
  function mount() { (document.fullscreenElement || document.body).append(badge); }
  async function poll() {
    if (inFlight || performance.now() < retryAfter) return;
    inFlight = true;
    try {
      const active = !document.hidden && document.hasFocus() && !capture && !window.STUDY_FULLSCREEN_SHELL?.isHosting();
      const response = await fetch("./api/controller-mouse", { method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client, active }), signal: AbortSignal.timeout(1200) });
      if (!response.ok) throw Error("Local mouse service unavailable");
      const data = await response.json();
      available = true; supported = data.supported === true;
      const next = supported && data.mode === "system" ? "system" : "web";
      if (next !== mode) { mode = next; pendingUntil = 0; notify(); }
      if (mode === "system") badge.textContent = "系统鼠标";
      else if (supported && performance.now() < noticeUntil) badge.textContent = "网页鼠标";
      badge.hidden = mode !== "system" && performance.now() > noticeUntil;
      mount();
    } catch {
      available = false; supported = false; retryAfter = performance.now() + 4000;
      // No acknowledgement: do not enable gameplay until the native lease expires.
      if (mode === "system" || performance.now() < pendingUntil) {
        pendingUntil = performance.now() + 5500; mode = "web"; notify();
      }
    } finally { inFlight = false; }
  }
  function viewPressed() {
    if (capture) return;
    pendingUntil = performance.now() + 2500;
    notify();
    if (!available || !supported) {
      badge.textContent = available ? "系统鼠标暂不可用（需 Xbox / Windows）" : "系统鼠标需要重启本地服务";
      badge.hidden = false; mount();
      setTimeout(() => { if (mode !== "system") badge.hidden = true; }, 3000);
    }
    noticeUntil = performance.now() + 3000;
    retryAfter = 0;
    void poll();
  }
  window.STUDY_CONTROLLER_MOUSE = Object.freeze({ isActive: blocked, viewPressed,
    setCapture: value => { capture = Boolean(value); void poll(); }, refresh: poll });
  document.addEventListener("fullscreenchange", mount);
  window.addEventListener("focus", poll);
  document.addEventListener("visibilitychange", poll);
  setInterval(() => { void poll(); }, 400);
  void poll();
}());
