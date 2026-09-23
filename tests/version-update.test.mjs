import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createVersionChecker, isNewerVersion } from "../src/version-update.js";
import { APP_VERSION } from "../src/constants.js";

test("所有页面更新脚本版本与系统显示/包版本一致", () => {
  const metadata = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(APP_VERSION, metadata.version);
  for (const page of ["index", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    assert.equal(html.split(`src/version-update.js?v=${APP_VERSION}`).length - 1, 1, page);
  }
});

test("版本比较使用数字：只对有效更新提示，不对相同/旧/非法版本提示", () => {
  assert.equal(isNewerVersion("1.0.12", "1.0.9"), true);
  assert.equal(isNewerVersion("2.0.0", "1.99.99"), true);
  for (const version of ["1.0.9", "1.0.8", "broken", undefined, null, "1.0.10<script>"]) {
    assert.equal(isNewerVersion(version, "1.0.9"), false);
  }
});

test("取消不刷新且同版本只提示一次，接受更新先通知保存再刷新", async () => {
  let latest = "1.0.13";
  let accept = false;
  const calls = [];
  const check = createVersionChecker({ currentVersion: "1.0.12", fetchVersion: async () => latest,
    beforePrompt: () => calls.push("save"),
    confirmUpdate: message => { calls.push(message); return accept; }, reload: () => calls.push("reload") });
  await check();
  assert.equal(calls[0], "save");
  assert.match(calls[1], /v1.0.13/);
  await check();
  assert.equal(calls.length, 2);
  latest = "1.0.14";
  accept = true;
  await check();
  assert.equal(calls[2], "save");
  assert.match(calls[3], /v1.0.14/);
  assert.equal(calls[4], "reload");
  await check();
  assert.equal(calls.length, 5);
});

test("离线失败静默重试，后台不弹窗，并发检查不重复请求", async () => {
  let visible = false;
  let fetches = 0;
  let release;
  let promptCount = 0;
  const check = createVersionChecker({ currentVersion: "1.0.12", isVisible: () => visible,
    fetchVersion: () => { fetches++; return new Promise(resolve => { release = resolve; }); },
    confirmUpdate: () => { promptCount++; return false; }, reload: () => assert.fail() });
  await check();
  assert.equal(fetches, 0);
  visible = true;
  const pending = check();
  await check();
  assert.equal(fetches, 1);
  visible = false;
  release("1.0.13");
  await pending;
  assert.equal(promptCount, 0);
  visible = true;
  const retry = check();
  release("1.0.13");
  await retry;
  assert.equal(promptCount, 1);
  let attempts = 0;
  const offline = createVersionChecker({ currentVersion: "1.0.12", fetchVersion: async () => { attempts++; throw Error("offline"); },
    confirmUpdate: () => assert.fail(), reload: () => assert.fail() });
  await offline();
  await offline();
  assert.equal(attempts, 2);
});
