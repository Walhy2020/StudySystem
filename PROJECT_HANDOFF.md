# StudySystem cross-device handoff

Last updated: 2026-09-09
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

### Book1

- Entry: `book-learning.html`; authoritative data is isolated in `data/book1.js`.
- Only legacy `opw1` was migrated: A-Z has 26 groups, 104 unique words, and 130 learning items including letter cards.
- The module includes original word pictures, British IPA, Chinese meanings, manual speech, group navigation, learn/review actions, wrong items, and mastered stars.
- Progress writes only `mario-book1-v1`. It may read `mario-literacy-english-v1` once to import `books.opw1`; Book2 data and state are ignored.

### Theme learning

- Entry: `theme-learning.html`.
- Eleven delivered themes with 83 theme records: Body, Colors, Numbers 1-10, Numbers 11-19, Tens 10-100, Ordinals 1-10, Twinkle Twinkle Little Star, and Classic Items I-IV.
- Theme word cards support IPA display and phoneme segmentation, manual sound playback, previous/next navigation, keyboard/touch interaction, learning, and practice.
- The outer picker groups themes into four horizontal preview series: Basic Recognition, Counting World, Nursery Rhymes, and Classic Items. Individual reviewed themes keep their green checks, and a series turns green when all themes inside it are reviewed.
- The Nursery Rhymes series currently contains Twinkle, Twinkle, Little Star: six lyric lines each place complete British IPA directly below the English line, eight core words remain clickable, and full-verse speech is manual rather than automatic.
- Counting artwork is code-native and exact: 1-19 use the matching number of coin dots; 10-100 uses one to ten ten-frames, each containing exactly ten dots.
- Project assets live under `assets/themes/` and have been checked against their mapped words/hotspots.

### Scenario learning

- Entry: `scenario-learning.html`; authoritative lesson data is isolated in `data/scenarios.js`.
- Scenario 01 is First Meeting: six dialogue lines with complete British IPA and Chinese translations.
- The module has line-by-line learning, Previous/Next navigation, manual-only speech, and three response-choice practice questions with wrong-answer retry.
- Completing all three questions adds a green check to the scenario card. Progress writes only `mario-scenario-learning-v1` and is not included in the theme learned-word library.

### Overall review

- Entry: `review-learning.html`.
- This is an independent top-level module, not a child page inside Theme Learning.
- The learned-word library includes only words recorded as learned by theme sessions. It contains 81 unique English words after shared words such as `ten` and `star` are deduplicated across themes.
- Each review round covers all learned words, with four image choices per question, wrong-answer retry, restart, refresh persistence, desktop and 390px layouts.

### Bomb maze

- Entry: `bomb-game.html`.
- Each level has five target instances. When the eligible Hanzi pool contains fewer than five distinct words, a word may repeat as separate target instances so the level still requires 5/5 completions.
- Save/resume, restart, next-level flow, keyboard controls, mobile layout, and isolated bomb progress are implemented.

## Navigation and storage

Top-level navigation order is:

1. Hanzi
2. Book1
3. Theme Learning
4. Scenario Learning
5. Overall Review
6. Phonetics

Persistent browser keys:

- `mario-hanzi-refactor-v1`
- `mario-phonetics-v1`
- `mario-book1-v1`
- `mario-scenario-learning-v1`
- `mario-bomb-game-progress-v1`
- `mario-theme-learned-v1`
- legacy migration source: `mario-literacy-desktop-mvp-v1`

Git synchronizes source code and assets only. Browser `localStorage` progress, API keys, environment variables, Codex plugins, browser-extension connections, and local tool installations must be configured separately on the company computer.

## Latest verification snapshot

Verified on 2026-08-25 after the Nursery Rhymes theme update:

- `pnpm run check`: passed.
- `pnpm test`: 61/61 passed.
- Microsoft Edge Hanzi acceptance: passed; fixed review batch 20; desktop and 390px had no horizontal overflow.
- Microsoft Edge Phonetics acceptance: passed; 48-item layout coverage, all-non-mastered review, storage isolation, TTS, desktop and 390px passed.
- Theme Microsoft Edge acceptance passed across desktop and 390px: 4 horizontal series, 11 themes, 83 exact learning targets, all completion checks, Twinkle lyric/IPA geometry, manual full-verse speech, and no horizontal overflow.
- Overall-review Microsoft Edge acceptance passed with 83 stored theme records deduplicated to 81 unique library/review words, 81/81 questions, eight song-word artworks, exact counting artwork, and no desktop or 390px overflow.
- New Hanzi and Phonetics backgrounds returned HTTP 200 and passed screenshot inspection.
- Book1 migration verified on 2026-09-08: static checks passed, Node 70/70 passed, and Microsoft Edge passed at desktop and 390px with 104/104 images returning HTTP 200 and `opw1`-only legacy migration.
- Scenario Learning verified on 2026-09-09: Node 75/75 passed; Microsoft Edge passed at desktop and 390px with six dialogue lines, three response questions, manual-only speech, refresh restore, completion persistence, isolated storage, and no horizontal overflow.
- No known unresolved product defect was recorded at handoff time.

## Cross-computer cautions

- The acceptance scripts currently import Playwright from a local Codex runtime path. On another Windows account, confirm or deliberately make that dependency portable before relying on `pnpm run test:browser`.
- Do not copy `.env`, API keys, browser profiles, cookies, or storage-state files through Git.
- If learning progress must move between computers, use a separately reviewed export/import workflow; do not commit progress data to this repository.
- If port 5177 is occupied, choose another isolated port. Do not stop a server that was not started by the current task.

## Starting a new Codex main chat

Use this opening request:

> Read `AGENTS.md` and `PROJECT_HANDOFF.md`, inspect `git status`, and continue from the current `main` branch. Preserve all module storage boundaries and existing review rules. Before changing code, report which module and tests are in scope.
