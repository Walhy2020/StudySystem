const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isNewerVersion(candidate, current) {
  if (!VERSION_PATTERN.test(candidate) || !VERSION_PATTERN.test(current)) return false;
  const next = candidate.split(".").map(Number);
  const loaded = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (next[i] !== loaded[i]) return next[i] > loaded[i];
  }
  return false;
}

// No progress storage is read or written. Remember dismissals only for this page lifetime.
export function createVersionChecker({ currentVersion, fetchVersion, confirmUpdate, reload,
  beforePrompt = () => {}, isVisible = () => true }) {
  const prompted = new Set();
  let checking = false;
  let reloading = false;
  return async function checkVersion() {
    if (checking || reloading || !isVisible()) return;
    checking = true;
    try {
      const latest = await fetchVersion();
      if (!isVisible() || !isNewerVersion(latest, currentVersion) || prompted.has(latest)) return;
      prompted.add(latest);
      beforePrompt();
      if (confirmUpdate(`系统已更新至 v${latest}。点击“确定”刷新页面使用新版本；点击“取消”继续当前版本。`)) {
        reloading = true;
        reload();
      }
    } catch {
      // Offline, temporary server errors and partial deployments must not interrupt learning.
    } finally {
      checking = false;
    }
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  // The HTML pins this query to its own release, so an old open tab keeps its loaded version.
  const currentVersion = new URL(import.meta.url).searchParams.get("v");
  const checkVersion = createVersionChecker({
    currentVersion,
    isVisible: () => document.visibilityState === "visible",
    fetchVersion: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const url = new URL("../package.json", import.meta.url);
        url.searchParams.set("version-check", String(Date.now()));
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Version check unavailable");
        const metadata = await response.json();
        return metadata.version;
      } finally {
        clearTimeout(timeout);
      }
    },
    beforePrompt: () => window.dispatchEvent(new Event("studysystem:update-prompt")),
    confirmUpdate: message => window.confirm(message),
    reload: () => window.location.reload(),
  });
  setTimeout(checkVersion, 3000);
  setInterval(checkVersion, 60000);
  window.addEventListener("focus", checkVersion);
  window.addEventListener("online", checkVersion);
  document.addEventListener("visibilitychange", checkVersion);
}
