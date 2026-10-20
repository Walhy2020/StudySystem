import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildContext, evidencePaths, fingerprint, loadVerifiedBundle, verifyKnowledge } from "../scripts/harness-knowledge.mjs";

test("knowledge evidence matches the current release and every case has valid references", async () => {
  const bundle = await loadVerifiedBundle();
  assert.deepEqual(verifyKnowledge(bundle), []);
  assert.equal(bundle.cases.cases.length, 20);
  assert.equal(bundle.cases.modelEvaluationStatus, "not_run");
});

test("changed review policy or release refuses context before a model can consume stale facts", async () => {
  const bundle = await loadVerifiedBundle();
  bundle.sourceTexts["src/constants.js"] = bundle.sourceTexts["src/constants.js"].replace("DAILY_REVIEW_LIMIT = 20", "DAILY_REVIEW_LIMIT = 48");
  assert.throws(() => buildContext(bundle, ["hanzi"]), /Stale evidence: src\/constants.js/);
  const fresh = await loadVerifiedBundle();
  fresh.version = "9.9.9";
  assert.throws(() => buildContext(fresh), /Package version changed/);
});

test("context keeps global boundaries and related word-library rules without leaking evaluation answers", async () => {
  const bundle = await loadVerifiedBundle();
  const context = buildContext(bundle, ["words", "review"]);
  assert.deepEqual(context.modules.map(module => module.id), ["words", "review"]);
  for (const id of ["R01", "R04", "R06", "R07", "R14", "R18", "R20"]) assert.ok(context.rules.some(rule => rule.id === id), id);
  assert.equal(context.sources["word-library"].path, "src/total-word-library.js");
  assert.ok(context.rules.every(rule => rule.evidence.every(item => item.excerpt.includes(item.anchor))));
  assert.equal(context.cases, undefined);
  assert.equal(context.sourceTexts, undefined);
  assert.ok(!JSON.stringify(context).includes(bundle.cases.cases[0].request));
});

test("unknown modules are not guessed and omitted scope returns the full map", async () => {
  const bundle = await loadVerifiedBundle();
  assert.throws(() => buildContext(bundle, ["复习"]), /Unknown module/);
  assert.equal(buildContext(bundle).modules.length, 10);
  assert.throws(() => evidencePaths({ sources: { bad: "../auth.json" }, modules: [] }), /Invalid repository evidence path/);
});

test("fingerprints survive Git CRLF conversion but detect content changes", () => {
  assert.equal(fingerprint("hello\r\nworld\r\n"), fingerprint("hello\nworld\n"));
  assert.notEqual(fingerprint("limit=20\n"), fingerprint("limit=48\n"));
});

test("CLI accepts a forwarded package-manager separator and writes parseable context JSON", () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/harness-knowledge.mjs", import.meta.url)), "context", "--", "words", "review"], { encoding: "utf8" });
  const context = JSON.parse(output);
  assert.deepEqual(context.modules.map(module => module.id), ["words", "review"]);
  assert.equal(context.stage, "offline_knowledge_only");
});
