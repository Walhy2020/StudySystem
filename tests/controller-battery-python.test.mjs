import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("本机Xbox电量：四槽只读、真实档位及本机同源接口限制", () => {
  const result = spawnSync("python", ["tests/controller-battery.py"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
