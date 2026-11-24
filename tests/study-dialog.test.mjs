import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("four reset flows await two in-page confirmations before touching their own storage", () => {
  for (const path of ["src/app.js", "src/pinyin-app.js", "src/phonetics-app.js", "word-learning.js"]) {
    const code = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /\bconfirm\(/, path);
    const reset = code.slice(code.indexOf('.addEventListener("click", async () => {', code.indexOf("dom.reset")));
    const beforeReset = reset.slice(0, reset.indexOf("storage.reset()"));
    assert.equal((beforeReset.match(/await confirmStudyDialog\(/g) || []).length, 2, path);
  }
});

test("in-page confirmation never uses browser prompts and cleans up on return/navigation", () => {
  const code = readFileSync(new URL("../src/study-dialog.js", import.meta.url), "utf8");
  assert.doesNotMatch(code, /window\.confirm|window\.alert|showModal\(|localStorage|sessionStorage/);
  assert.match(code, /setAttribute\("role", "dialog"\)/);
  assert.match(code, /setAttribute\("aria-modal", "true"\)/);
  assert.match(code, /cancel\.focus/);
  assert.match(code, /event\.preventDefault\(\); event\.stopImmediatePropagation\(\); finish\(false\)/);
  for (const name of ["keydown", "click", "fullscreenchange", "studysystem:gamepad-back", "studysystem:fullscreen-navigation", "pagehide"]) {
    assert.ok(code.includes(`addEventListener("${name}"`));
    assert.ok(code.includes(`removeEventListener("${name}"`));
  }
});
