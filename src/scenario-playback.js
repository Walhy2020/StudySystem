// Speech completion, not a guessed reading duration, controls the next scene.
export function createDialoguePlayback({ count, show, speak, cancelSpeech, status, arrivalMs = 650, gapMs = 350 }) {
  let token = 0, index = 0, running = false, timer = null;
  let continuous = true;
  const wait = (ms, run, action) => { timer = setTimeout(() => { timer = null; if (running && run === token) action(); }, ms); };
  function stop() {
    running = false; token += 1; clearTimeout(timer); timer = null; cancelSpeech();
  }
  function pause() { stop(); status("paused"); }
  function step(run) {
    if (!running || token !== run) return;
    show(index, "arriving");
    wait(index < 2 ? arrivalMs : 120, run, () => {
      show(index, "speaking");
      let settled = false;
      const finish = (ok) => {
        if (settled || token !== run || !running) return;
        settled = true;
        if (!ok) { stop(); status("unavailable"); return; }
        show(index, "finished");
        if (!continuous) { stop(); status("line-complete"); return; }
        if (index + 1 >= count()) { stop(); status("complete"); return; }
        wait(gapMs, run, () => { index += 1; step(run); });
      };
      try {
        if (!speak(index, () => finish(true), () => finish(false))) finish(false);
      } catch { finish(false); }
    });
  }
  function play(from = index, options = {}) {
    continuous = options.continuous ?? true;
    stop(); index = Math.max(0, Math.min(from, count() - 1)); running = true;
    status("playing"); step(token);
  }
  return { play, pause, stop, get running() { return running; }, get index() { return index; } };
}
