import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
const start = source.indexOf("  function isActiveMushroomShot(");
const validatorSource = source.slice(start, source.indexOf("\n  }", start) + 4);
const active = new Function(`
  const DIRS = { up: {}, down: {}, left: {}, right: {} };
  const MIN_THROW_DISTANCE = 1, MAX_THROW_DISTANCE = 8, MUSHROOM_THROW_STEP_TIME = 0.09;
  const isInside = (gx, gy) => gx >= 0 && gy >= 0 && gx < 27 && gy < 15;
  ${validatorSource}
  return isActiveMushroomShot;
`)();
const shot = { gx: 2, gy: 3, direction: "right", progress: 0, steps: 0, range: 3 };

test("蘑菇弹道恢复仅保留仍在正常飞行的实例", () => {
  assert.equal(active(shot), true);
  assert.equal(active({ ...shot, progress: 0.089, steps: 7, range: 8 }), true);
  for (const invalid of [null, { ...shot, done: true }, { ...shot, progress: -1000 },
    { ...shot, progress: 0.09 }, { ...shot, progress: NaN }, { ...shot, steps: -1 },
    { ...shot, steps: 3 }, { ...shot, steps: 0.5 }, { ...shot, range: 0 },
    { ...shot, range: 9 }, { ...shot, direction: "bad" }, { ...shot, gx: -1 }]) {
    assert.equal(active(invalid), false);
  }
  assert.ok(source.includes("plainArray(saved.mushroomShots).filter(isActiveMushroomShot)"));
});

test("蘑菇不再因场上已有三发而丢弃新的投掷", () => {
  const start = source.indexOf("  function throwMushroom(");
  const throwSource = source.slice(start, source.indexOf("\n  }", start) + 4);
  const state = { status: "playing", mushroomShots: Array.from({ length: 3 }, () => ({ ...shot })),
    player: { gx: 2, gy: 3 }, throwDistance: 3 };
  const throwMushroom = new Function("state", "isActiveMushroomShot", `
    const DIRS = { right: {} }, attackDirection = "right";
    const sounds = { play() {} }, saveBombProgress = () => {};
    ${throwSource}
    return throwMushroom;
  `)(state, active);
  throwMushroom();
  assert.equal(state.mushroomShots.length, 4);
  state.mushroomShots.push({ ...shot, progress: -1000 });
  throwMushroom();
  assert.equal(state.mushroomShots.length, 5);
  state.status = "ready";
  throwMushroom();
  assert.equal(state.mushroomShots.length, 5, "paused games cannot attack");
});
