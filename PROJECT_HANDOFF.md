# StudySystem cross-device handoff

Last updated: 2026-09-14
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
- Word records actually touched or mastered in Book1 are read by the shared total-word-library aggregator; Book1 still writes only its own storage key.

### Theme learning

- Entry: `theme-learning.html`.
- Twelve delivered themes with 91 theme records: Body, Colors, Numbers 1-10, Numbers 11-19, Tens 10-100, Ordinals 1-10, Twinkle Twinkle Little Star, Classic Items I-IV, and Classroom Things.
- Theme word cards support IPA display and phoneme segmentation, manual sound playback, previous/next navigation, keyboard/touch interaction, learning, and practice.
- The outer picker groups themes into five horizontal preview series: Basic Recognition, Counting World, Nursery Rhymes, Classic Items, and Classroom Things. Individual reviewed themes keep their green checks, and a series turns green when all themes inside it are reviewed.
- The Nursery Rhymes series currently contains Twinkle, Twinkle, Little Star: six lyric lines each place complete British IPA directly below the English line, eight core words remain clickable, and full-verse speech is manual rather than automatic.
- Counting artwork is code-native and exact: 1-19 use the matching number of coin dots; 10-100 uses one to ten ten-frames, each containing exactly ten dots.
- Project assets live under `assets/themes/` and have been checked against their mapped words/hotspots.
- Classroom Things teaches pencil, pen, eraser, ruler, book, schoolbag, table, and chair using `assets/themes/classroom/classroom-things-scene-v1.png`. The 4×2 scene has eight independent non-overlapping hotspots and supplies per-word cropped artwork to the shared word library.
- Theme learned records remain in `mario-theme-learned-v1` and are one of the three sources of the shared total word library.

### Scenario learning

- Entry: `scenario-learning.html`; authoritative lesson data is isolated in `data/scenarios.js`.
- Scenario 01 is First Meeting: six dialogue lines with complete British IPA and Chinese translations.
- Scenario 02 is What Is It?: fourteen continuous classroom dialogue lines adapted from the textbook's printed pages 6-7, covering a pen, yellow pencils, a red marker, green erasers, and the final red-eraser correction, with word-aligned British IPA, Chinese translations, and five response-choice questions.
- The two delivered scenarios contain 20 dialogue lines and eight practice questions in total. The module has line-by-line learning, Previous/Next navigation, manual-only speech, and wrong-answer retry.
- Completing every question in one scenario adds a green check only to that scenario card. Schema 3 stores each scenario's line, three-stage tab, and question independently under `scenarioProgress`, while preserving the top-level compatibility aliases and migrating the previous single-scenario state. Progress writes only `mario-scenario-learning-v1` and is not included in the theme learned-word library.
- Scenario artwork and new lessons are now authored in conversation using the imagegen skill, not through a browser generator. See `SCENARIO_WORKSHOP.md` for the current workflow.
- New-word matching uses the same shared total word library as overall review. Explicit word learning is stored as `learnedWords` under the existing scenario progress key; dialogue completion alone never marks vocabulary learned.
- First Meeting keeps `assets/scenarios/first-meeting-v1.png` (1254×1254 RGB PNG) as its cover. The study view uses separate imagegen characters, locally cut out with user-approved rembg: `mia-sprite-v1.png` (560×1080 RGBA) and `leo-sprite-v1.png` (521×1080 RGBA).
- What Is It? uses `assets/scenarios/what-is-it-classroom-v1.png` (1254×1254 RGB PNG) as both its card artwork and classroom stage. It shows exactly one blue pen, three yellow pencils, one red marker, and three green erasers; Mia and Leo remain separate side overlays so the central stationery stays visible.
- Each What Is It? line also drives a separate transparent stationery asset on a white circular focus card over the blackboard. When a stationery line starts speaking, its card performs three 1-second scale-breathing cycles and then returns to its normal size. The blue pen, three yellow pencils, red marker, three green erasers, and three red erasers are independently emphasized without covering the actors.
- English and British IPA are rendered from the same per-word token data, so every displayed word has its own transcription directly underneath it in dialogue and practice choices.
- New Words is the third tab beside Dialogue and Practice. It follows the active scenario instead of opening a combined library: Scenario 01 exposes 16 words and Scenario 02 exposes 19. Learning writes only `learnedWords` inside the scenario storage key.
- Dialogue playback is user-started. “从头重播” reads only the first line and waits for manual Next; “从头连播” restarts at line one and advances on speech-end events. Mia enters first and Leo on line two. A saturated orange-gold contour halo with a tighter blur marks the speaking actor, breathing for three 1-second cycles, then staying steady until speech ends (steady with reduced motion); the right pane shows only the current sentence with British IPA beneath. Pause/navigation/mode switching invalidate stale callbacks; playback completion does not mark words learned. Mobile stacks stage and conversation. `src/scenario-playback.js` controls both modes.
- The browser generation form and API backend were removed at the user's request. The page makes no generation API calls and needs no API Key; the active-scenario New Words tab and all browser learning progress are retained. Any private `.local-scenarios/` data remains untouched and ignored.

### Overall review

- Entry: `review-learning.html`.
- This is an independent top-level module, not a child page inside Theme Learning.
- The total word library aggregates words actually learned in Book1, Theme Learning, and Scenario Learning. It reads all three existing progress keys without writing across module boundaries and deduplicates by normalized English spelling.
- The combined published catalog currently contains 215 unique candidate words. The library and each review round include only the subset actually learned in the current browser profile.
- Theme artwork remains preferred for duplicates, Book1 uses its original word pictures, and scenario words use focused object art when available or a Chinese-meaning choice card when no literal image exists. Reviews keep four unique choices, wrong-answer retry, restart, refresh persistence, desktop and 390px layouts.

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

`src/total-word-library.js` is a read-only aggregate view over the Book1, Theme Learning, and Scenario Learning keys; it does not introduce another browser storage key.

Git synchronizes source code and assets only. Browser `localStorage` progress, API keys, environment variables, Codex plugins, browser-extension connections, and local tool installations must be configured separately on the company computer.

## Latest verification snapshot

Verified on 2026-08-25 after the Nursery Rhymes theme update:

- `pnpm run check`: passed.
- `pnpm test`: 61/61 passed.
- Microsoft Edge Hanzi acceptance: passed; fixed review batch 20; desktop and 390px had no horizontal overflow.
- Microsoft Edge Phonetics acceptance: passed; 48-item layout coverage, all-non-mastered review, storage isolation, TTS, desktop and 390px passed.
- Theme Microsoft Edge acceptance passed across desktop and 390px: 4 horizontal series, 11 themes, 83 exact learning targets, all completion checks, Twinkle lyric/IPA geometry, manual full-verse speech, and no horizontal overflow.
- Overall-review Microsoft Edge acceptance passed after unified-library delivery: the 208-word combined catalog reads Book1, Theme Learning, and Scenario Learning progress, deduplicates cross-module words, preserves the existing 81-theme-word full review, renders Book1 images and scenario meaning cards, writes no foreign progress, and has no desktop or 390px overflow.
- New Hanzi and Phonetics backgrounds returned HTTP 200 and passed screenshot inspection.
- Book1 migration verified on 2026-09-08: static checks passed, Node 70/70 passed, and Microsoft Edge passed at desktop and 390px with 104/104 images returning HTTP 200 and `opw1`-only legacy migration.
- Scenario Learning verified on 2026-09-12 after the printed-page-7 continuation and unified-library update: Node 89/89 passed; Microsoft Edge passed at desktop and 390px with two independent scenarios, 20 dialogue lines, eight response questions, active-scenario-only word tabs (16 and 19 candidates), total-library new-word matching, manual-only speech, schema-1 migration, per-scenario refresh restore, independent completion, isolated storage, word-aligned IPA, five focused stationery assets, classroom artwork HTTP 200, and no horizontal overflow.
- Classroom Things verified on 2026-09-14: Node 91/91 passed; Microsoft Edge theme acceptance passed at desktop and 390px with 5 series, 12 themes, 91 exact learning targets, 8 non-overlapping classroom hotspots, manual speech, completion persistence, and no horizontal overflow. Overall-review Edge acceptance passed with 91 theme records, 89 unique theme words, 215 combined candidate words, 43 unique image crops, classroom crop isolation, storage boundaries, and desktop/390px layouts.
- No known unresolved product defect was recorded at handoff time.

## Cross-computer cautions

- The three Scenario acceptance scripts resolve Playwright from the current Windows profile. Other acceptance scripts may still import it from a local Codex runtime path; on another Windows account, confirm or deliberately make that dependency portable before relying on `pnpm run test:browser`.
- Do not copy `.env`, API keys, browser profiles, cookies, or storage-state files through Git.
- If learning progress must move between computers, use a separately reviewed export/import workflow; do not commit progress data to this repository.
- If port 5177 is occupied, choose another isolated port. Do not stop a server that was not started by the current task.

## Starting a new Codex main chat

Use this opening request:

> Read `AGENTS.md` and `PROJECT_HANDOFF.md`, inspect `git status`, and continue from the current `main` branch. Preserve all module storage boundaries and existing review rules. Before changing code, report which module and tests are in scope.
