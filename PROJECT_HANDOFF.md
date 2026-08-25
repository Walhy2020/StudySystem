# StudySystem cross-device handoff

Last updated: 2026-08-25
Repository: `https://github.com/Walhy2020/StudySystem.git`
Branch: `main`
Baseline before this handoff document: `3a6815d`

## Company-computer quick start

Clone once:

```powershell
git clone https://github.com/Walhy2020/StudySystem.git
cd StudySystem
pnpm install
pnpm run check
pnpm test
python server.py --bind 127.0.0.1 --port 5177
```

For an existing checkout:

```powershell
git status --short --branch
git pull origin main
pnpm install
pnpm run check
pnpm test
```

In the ChatGPT/Codex desktop app, add the cloned repository as a local project and make this repository its primary folder. Start one main coordination chat, ask it to read `AGENTS.md` and this file, then use separate chats for distinct outcomes. The original home-computer child-chat tree does not need to be recreated.

## Current delivered modules

### Hanzi

- Entry: `index.html`; logic under `src/`; source data under `data/`.
- Word bank is 1600 stable items.
- Normal review remains fixed at 20 per day.
- Daily-new, wrong-answer repair, mastered state, inline temporary review, TTS, stars, and reset are implemented.
- Current background: `assets/backgrounds/hanzi-kingdom-v2.png`.

### Phonetics

- Entry: `phonetics.html`; 48 DJ/IPA items.
- Review regenerates all non-mastered items on every entry, so the batch is 0-48.
- Mastering an item removes it immediately from normal and temporary review.
- Example words, full-word transcriptions, phoneme display, TTS, refresh restore, and isolated storage are implemented.
- Current background: `assets/backgrounds/phonetics-sound-kingdom-v2.png`.

### Theme learning

- Entry: `theme-learning.html`.
- Seven delivered themes, 46 words total: Body, Colors, Ordinals 1-10, and Classic Items I-IV.
- Theme word cards support IPA display and phoneme segmentation, manual sound playback, previous/next navigation, keyboard/touch interaction, learning, and practice.
- Project assets live under `assets/themes/` and have been checked against their mapped words/hotspots.

### Overall review

- Entry: `review-learning.html`.
- This is an independent top-level module, not a child page inside Theme Learning.
- The learned-word library includes only words recorded as learned by theme sessions.
- Each review round covers all learned words, with four image choices per question, wrong-answer retry, restart, refresh persistence, desktop and 390px layouts.

### Bomb maze

- Entry: `bomb-game.html`.
- Each level has five target instances. When the eligible Hanzi pool contains fewer than five distinct words, a word may repeat as separate target instances so the level still requires 5/5 completions.
- Save/resume, restart, next-level flow, keyboard controls, mobile layout, and isolated bomb progress are implemented.

## Navigation and storage

Top-level navigation order is:

1. Hanzi
2. Theme Learning
3. Overall Review
4. Phonetics

Persistent browser keys:

- `mario-hanzi-refactor-v1`
- `mario-phonetics-v1`
- `mario-bomb-game-progress-v1`
- `mario-theme-learned-v1`
- legacy migration source: `mario-literacy-desktop-mvp-v1`

Git synchronizes source code and assets only. Browser `localStorage` progress, API keys, environment variables, Codex plugins, browser-extension connections, and local tool installations must be configured separately on the company computer.

## Latest verification snapshot

Verified on 2026-08-25 before this documentation-only update:

- `pnpm run check`: passed.
- `pnpm test`: 57/57 passed.
- Microsoft Edge Hanzi acceptance: passed; fixed review batch 20; desktop and 390px had no horizontal overflow.
- Microsoft Edge Phonetics acceptance: passed; 48-item layout coverage, all-non-mastered review, storage isolation, TTS, desktop and 390px passed.
- Theme and overall-review Edge suites previously passed across desktop and 390px, including 46 mapped words and image choices.
- New Hanzi and Phonetics backgrounds returned HTTP 200 and passed screenshot inspection.
- No known unresolved product defect was recorded at handoff time.

## Cross-computer cautions

- The acceptance scripts currently import Playwright from a local Codex runtime path. On another Windows account, confirm or deliberately make that dependency portable before relying on `pnpm run test:browser`.
- Do not copy `.env`, API keys, browser profiles, cookies, or storage-state files through Git.
- If learning progress must move between computers, use a separately reviewed export/import workflow; do not commit progress data to this repository.
- If port 5177 is occupied, choose another isolated port. Do not stop a server that was not started by the current task.

## Starting a new Codex main chat

Use this opening request:

> Read `AGENTS.md` and `PROJECT_HANDOFF.md`, inspect `git status`, and continue from the current `main` branch. Preserve all module storage boundaries and existing review rules. Before changing code, report which module and tests are in scope.
