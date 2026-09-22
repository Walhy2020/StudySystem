import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function loadChromium() {
  const profile = process.env.USERPROFILE || "";
  const candidates = [
    process.env.CODEX_PLAYWRIGHT_PATH,
    profile && path.join(
      profile,
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
      "playwright",
      "index.mjs"
    ),
  ].filter(Boolean);
  const modulePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!modulePath) {
    throw new Error("Playwright runtime not found; set CODEX_PLAYWRIGHT_PATH to playwright/index.mjs");
  }
  const { chromium } = await import(pathToFileURL(modulePath).href);
  return chromium;
}
