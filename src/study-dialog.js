let pending = null;

// A DOM overlay keeps Gamepad polling alive and stays below the shared cursor.
// Do not use a native browser prompt or a top-layer dialog that hides the cursor.
export function confirmStudyDialog(message, { title = "确认操作", confirmLabel = "确定", danger = false } = {}) {
  if (pending) return Promise.resolve(false);
  if (!document.querySelector('link[data-study-dialog-style]')) {
    const style = document.createElement("link");
    style.rel = "stylesheet"; style.href = new URL("../study-dialog.css?v=1.0", import.meta.url).href;
    style.dataset.studyDialogStyle = ""; document.head.append(style);
  }
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "study-dialog-overlay";
    overlay.setAttribute("data-study-shell-overlay", "");
    const panel = document.createElement("section");
    panel.className = "study-dialog";
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "study-dialog-title"); panel.setAttribute("aria-describedby", "study-dialog-message");
    const heading = document.createElement("h2"); heading.id = "study-dialog-title"; heading.textContent = title;
    const body = document.createElement("p"); body.id = "study-dialog-message"; body.textContent = message;
    const actions = document.createElement("div"); actions.className = "study-dialog-actions";
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "取消";
    cancel.dataset.studyDialogCancel = "";
    const confirm = document.createElement("button"); confirm.type = "button"; confirm.textContent = confirmLabel;
    confirm.dataset.studyDialogConfirm = ""; confirm.className = danger ? "is-danger" : "is-primary";
    actions.append(cancel, confirm); panel.append(heading, body, actions); overlay.append(panel);
    const root = document.documentElement, previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const inerted = new Map();
    function mount() {
      for (const [node, inert] of inerted) node.inert = inert;
      inerted.clear();
      const host = document.fullscreenElement || document.body;
      host.append(overlay);
      for (const sibling of host.children) {
        if (sibling === overlay || sibling.hasAttribute("data-study-shell-overlay")) continue;
        if (!inerted.has(sibling)) inerted.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    function finish(accepted) {
      if (pending !== finish) return;
      pending = null; overlay.remove();
      for (const [node, inert] of inerted) node.inert = inert;
      root.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown, true);
      document.removeEventListener("click", blockBackground, true);
      document.removeEventListener("fullscreenchange", mount);
      window.removeEventListener("studysystem:gamepad-back", back);
      window.removeEventListener("studysystem:fullscreen-navigation", leave);
      window.removeEventListener("pagehide", leave);
      if (previousFocus?.isConnected && !previousFocus.closest("[inert]")) previousFocus.focus({ preventScroll: true });
      resolve(accepted);
    }
    function keydown(event) {
      // Prevent Space/Y and other page shortcuts from answering the lesson behind the modal.
      event.stopImmediatePropagation();
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
      else if (event.key === "Tab") {
        event.preventDefault(); (document.activeElement === cancel ? confirm : cancel).focus();
      } else if (event.key === "Enter" || event.code === "Space") {
        event.preventDefault(); if (!event.repeat) (document.activeElement === confirm ? confirm : cancel).click();
      }
    }
    function blockBackground(event) {
      if (!overlay.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
    function back(event) { event.preventDefault(); event.stopImmediatePropagation(); finish(false); }
    function leave() { finish(false); }
    cancel.addEventListener("click", () => finish(false));
    confirm.addEventListener("click", () => finish(true));
    pending = finish;
    document.addEventListener("keydown", keydown, true);
    document.addEventListener("click", blockBackground, true);
    document.addEventListener("fullscreenchange", mount);
    window.addEventListener("studysystem:gamepad-back", back);
    window.addEventListener("studysystem:fullscreen-navigation", leave);
    window.addEventListener("pagehide", leave);
    mount(); cancel.focus({ preventScroll: true });
  });
}
