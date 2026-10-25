import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const directory = "docs/harness/";
const knowledgePath = directory + "knowledge.json";
const manifestPath = directory + "source-manifest.json";
const supportPaths = ["README.md", "project-guide.md", "analyst-instructions.md", "request.schema.json", "analysis-cases.json", "acceptance.md"].map(name => directory + name);

// Normalize Git's platform-specific line endings; preserve all other text.
export function fingerprint(text) {
  return createHash("sha256").update(text.replaceAll("\r\n", "\n")).digest("hex");
}

export function evidencePaths(knowledge) {
  const paths = [...new Set([
    ...Object.values(knowledge.sources), ...supportPaths,
    ...knowledge.modules.flatMap(module => [module.entry, ...module.tests, ...module.browserTests]),
  ])].sort();
  for (const path of paths) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.startsWith("/") || path.split("/").some(part => !part || part === ".." || part.startsWith("."))) {
      throw new Error(`Invalid repository evidence path: ${path}`);
    }
  }
  return paths;
}

async function readInputs(root) {
  const knowledgeText = await readFile(resolve(root, knowledgePath), "utf8");
  const knowledge = JSON.parse(knowledgeText);
  const sourceTexts = Object.fromEntries(await Promise.all(evidencePaths(knowledge).map(async path =>
    [path, await readFile(resolve(root, path), "utf8")])));
  return { knowledge, knowledgeText, sourceTexts,
    version: JSON.parse(sourceTexts["package.json"]).version,
    cases: JSON.parse(sourceTexts[directory + "analysis-cases.json"]),
    schema: JSON.parse(sourceTexts[directory + "request.schema.json"]) };
}

export function verifyKnowledge(bundle) {
  const { knowledge, knowledgeText, sourceTexts, version, manifest, cases, schema } = bundle;
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(knowledge.schemaVersion === 1 && manifest.schemaVersion === 1, "Unsupported knowledge/manifest schema");
  check(manifest.releaseVersion === version, "Package version changed; re-audit knowledge");
  check(manifest.knowledgeSha256 === fingerprint(knowledgeText), "Knowledge index changed; re-audit knowledge");
  const paths = evidencePaths(knowledge);
  check(JSON.stringify(Object.keys(manifest.files).sort()) === JSON.stringify(paths), "Evidence manifest paths changed");
  for (const path of paths) check(typeof sourceTexts[path] === "string" && manifest.files[path] === fingerprint(sourceTexts[path]), `Stale evidence: ${path}`);

  const moduleIds = new Set(knowledge.modules.map(module => module.id));
  const ruleIds = new Set(knowledge.rules.map(rule => rule.id));
  check(moduleIds.size === knowledge.modules.length, "Duplicate module IDs");
  check(ruleIds.size === knowledge.rules.length, "Duplicate rule IDs");
  for (const module of knowledge.modules) {
    check(schema.properties.modules.items.enum.includes(module.id), `Unknown schema module: ${module.id}`);
    for (const id of module.sourceIds) check(Boolean(knowledge.sources[id]), `Unknown module source: ${id}`);
  }
  for (const rule of knowledge.rules) {
    check(rule.evidence.length > 0, `Missing evidence: ${rule.id}`);
    for (const scope of rule.scope) check(scope === "global" || moduleIds.has(scope), `Unknown scope: ${scope}`);
    for (const evidence of rule.evidence) {
      const path = knowledge.sources[evidence.sourceId];
      check(Boolean(path && evidence.anchor && sourceTexts[path]?.includes(evidence.anchor)), `Missing evidence anchor: ${rule.id}/${evidence.sourceId}`);
    }
  }
  check(cases.modelEvaluationStatus === "not_run", "Do not conflate corpus checks with model evaluation");
  check(cases.cases.length === 20 && new Set(cases.cases.map(item => item.id)).size === 20, "Expected 20 unique analysis cases");
  for (const item of cases.cases) {
    for (const expected of [item.expected, item.followUp?.expected].filter(Boolean)) {
      check(schema.properties.decision.enum.includes(expected.decision), `Unknown decision: ${item.id}`);
      for (const id of expected.modules) check(moduleIds.has(id), `Unknown case module: ${item.id}/${id}`);
      for (const id of expected.ruleIds) check(ruleIds.has(id), `Unknown case rule: ${item.id}/${id}`);
      check(expected.mustExplain.length > 0, `Missing review criteria: ${item.id}`);
    }
  }
  return errors;
}

export async function loadVerifiedBundle(root = repositoryRoot) {
  const inputs = await readInputs(root);
  const manifest = JSON.parse(await readFile(resolve(root, manifestPath), "utf8"));
  const bundle = { ...inputs, manifest };
  const errors = verifyKnowledge(bundle);
  if (errors.length) throw new Error(errors.join("\n"));
  return bundle;
}

export function buildContext(bundle, requestedModules = []) {
  const errors = verifyKnowledge(bundle);
  if (errors.length) throw new Error(errors.join("\n"));
  const { knowledge, manifest, sourceTexts } = bundle;
  const ids = new Set(requestedModules);
  for (const id of ids) if (!knowledge.modules.some(module => module.id === id)) throw new Error(`Unknown module: ${id}; omit modules for the full map`);
  const modules = knowledge.modules.filter(module => ids.size === 0 || ids.has(module.id));
  const rules = knowledge.rules.filter(rule => ids.size === 0 || rule.scope.some(scope => scope === "global" || ids.has(scope)));
  const sourceIds = new Set([...modules.flatMap(module => module.sourceIds), ...rules.flatMap(rule => rule.evidence.map(item => item.sourceId))]);
  return {
    projectId: knowledge.projectId, stage: knowledge.stage,
    sourceVersion: manifest.releaseVersion, auditedBaseCommit: manifest.auditedBaseCommit,
    modules, capabilities: knowledge.capabilities,
    sources: Object.fromEntries([...sourceIds].map(id => [id, { path: knowledge.sources[id], sha256: manifest.files[knowledge.sources[id]] }])),
    rules: rules.map(rule => ({ ...rule, evidence: rule.evidence.map(item => {
      const path = knowledge.sources[item.sourceId];
      const text = sourceTexts[path];
      const index = text.indexOf(item.anchor);
      return { ...item, path, excerpt: text.slice(Math.max(0, index - 100), index + item.anchor.length + 180) };
    }) })),
    limitation: "Analysis context only; no model called, no skill executed, no learner progress read. Fetch additional module context when scope expands.",
  };
}

async function main() {
  const [command = "check", ...args] = process.argv.slice(2);
  // Package-manager shims differ in whether they forward the separator.
  const modules = args[0] === "--" ? args.slice(1) : args;
  if (command === "refresh") {
    if (modules.length) throw new Error("refresh accepts no module arguments");
    const inputs = await readInputs(repositoryRoot);
    const manifest = {
      schemaVersion: 1, releaseVersion: inputs.version,
      auditedBaseCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim(),
      knowledgeSha256: fingerprint(inputs.knowledgeText),
      files: Object.fromEntries(Object.entries(inputs.sourceTexts).map(([path, text]) => [path, fingerprint(text)])),
    };
    const errors = verifyKnowledge({ ...inputs, manifest });
    if (errors.length) throw new Error(errors.join("\n"));
    await writeFile(resolve(repositoryRoot, manifestPath), JSON.stringify(manifest, null, 2) + "\n");
    console.log("Evidence fingerprints refreshed. This does not validate factual accuracy or model understanding.");
  } else if (command === "check" || command === "context") {
    if (command === "check" && modules.length) throw new Error("check accepts no module arguments");
    const bundle = await loadVerifiedBundle();
    console.log(command === "context" ? JSON.stringify(buildContext(bundle, modules), null, 2)
      : `Knowledge verified: v${bundle.version}; ${bundle.knowledge.modules.length} modules; ${bundle.knowledge.rules.length} rules; 20 cases. Model evaluation: NOT RUN.`);
  } else throw new Error("Usage: node scripts/harness-knowledge.mjs check|refresh|context [module IDs]");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
