# StudySystem cross-device handoff

Last updated: 2026-09-24
Repository: `https://github.com/Walhy2020/StudySystem.git`
Branch: `main`
Baseline before this handoff document: `3a6815d`

## Company-computer quick start

System display version: **v1.0.17** (2026-09-26). Newly placed black bombs and missile-converted
red bombs now wait one second before exploding. Missile conversion restarts that fuse; explosions
and shells still chain-detonate other bombs immediately. Existing in-progress saves retain their
stored fuse progress, using the new one-second threshold on Continue. Bomb script cache: v2.10;
all seven update-notifier queries are v1.0.17. World 3 / following-camera remains pending.

Previous v1.0.16 (2026-09-25). Bomb explosions now have a clearer attack,
and all four gameplay cues are calibrated to similar loudness. The two existing worlds each
have their own original, cheerful loop: music changes on entering the next world and stops
when paused, unfocused, muted, finished, or superseded by another game window. It resumes
only after the player continues. Background music is quieter than gameplay cues. No external
sound asset or new storage key is used. Bomb script cache: v2.9; audio script: v1.1; all seven
update-notifier queries are v1.0.16. World 3 / following-camera remains pending.

Previous v1.0.15 (2026-09-25). Bomb maze plays four distinct
short synthesized sound effects for a successful bomb placement, an explosion, a useful
power-up pickup, and a correct Hanzi/pinyin target choice. Sound starts after the player
begins or resumes play. The header sound button supports keyboard and touch mute; unsupported
audio disables the button without blocking gameplay. Mute is page-local and does not change
the bomb progress schema. Bomb script cache: v2.8; sound script: v1.0. All seven update-notifier
queries are v1.0.15. World 3 / following-camera remains pending.

Previous v1.0.14 (2026-09-24). Bullet Bill takes 0.28125 seconds
per cell: another 20% speed reduction from v1.0.13, or 64% of the original speed.
Straight movement and turns remain constant-speed. Old saves keep their positions and
fractional movement progress. Other actors are unchanged. Bomb script cache: v2.7;
all seven update-notifier queries are v1.0.14. World 3 / following-camera remains pending.

Previous v1.0.13 (2026-09-24). Bullet Bill moves at a constant
0.225 seconds per cell, 20% slower than the previous 0.18 seconds per cell.
Turns remain immediate with no acceleration or slowdown. Restored in-flight missiles
retain position and fractional progress while adopting the new duration. Player and other
enemy speeds are unchanged. Bomb script cache: v2.6. All seven update-notifier queries
are v1.0.13. The World 3 / following-camera request remains pending, not part of this release.

Previous v1.0.12 (2026-09-24). Bullet Bill always moves at
PLAYER_MOVE_TIME (0.18 seconds per cell), including turns: no acceleration and no turn pause.
Old saved missile movement retains its position/progress while adopting the constant duration.
All seven pages now load src/version-update.js?v=1.0.12. It checks package.json without cache
every 60 seconds and on focus/visibility/online, prompts once per newer release, and reloads
the current URL only after confirmation. Cancel keeps the current page. Offline/errors are silent.
The prompt event saves bomb progress and clears held inputs; refresh restores the Continue gate.
For every future release, update all seven version-update script queries to package.json's
version (enforced by a Node test). Existing v1.0.11 tabs need one manual refresh to install it;
Git push alone does not update a different computer's local server. Bomb script cache: v2.5.

Previous v1.0.11 (2026-09-24). Bullet Bill starts at PLAYER_MOVE_TIME
(0.18 seconds per cell). Each subsequent straight cell shortens travel by 0.005 seconds,
down to 0.135 seconds. A preset heading does not accelerate the first step. Turning still
pauses 0.45 seconds and resets to player speed. Removed distance-based self-destruction:
missiles keep chasing until contact with a bomb consumes the missile and recolors that bomb
red. The red bomb retains the original range/shape, uses the ordinary two-second fuse and
explosion logic, and persists in the same snapshot. Further hits do not restart a red fuse.
Pending red bombs block early cleanup/level completion. No player or other-enemy movement
changes. Every newly generated level now hides exactly one missile in its own brick;
the old difficulty threshold and 35% random chance are removed. Existing in-progress
saves are preserved; restart or enter a new level for the new seeding policy. Bomb script cache: v2.4.

Previous v1.0.10 (2026-09-22). Removed the visible-missile test field.
Level 1-1 now starts with its normal mushroom and exactly one missile hidden in a separate
brick; only destroying that brick releases the missile. Enemy-clear cleanup still retains
the missile brick for manual bombing. Existing playing saves are preserved: restart to use
the new opening setup. Bomb script cache: v2.3. Focused check: tests/bullet-bill-browser.mjs.

Previous v1.0.9 (2026-09-22). Level 1-1 starts with one centered
Bullet Bill. Enemy-clear cleanup leaves any intact hidden Bullet Bill brick for the player
to bomb; all other bricks and learning targets still open. Hidden missiles also block level
completion until revealed and defeated. Existing running saves retain their enemy state.
Bomb script cache: v2.2. Focused check: tests/bullet-bill-browser.mjs (desktop and 390px).

Previous v1.0.8 (2026-09-22). Hide both 今日新音标 and 复习音标
entry buttons while an IPA learning/review item is active, including after refresh.
Restore entry choices on idle/completed screens. Keep the single-pass completion button
and full-review progress restoration unchanged. Phonetics app cache: v1.13.
Focused check: tests/phonetics-completion-browser.mjs (desktop and 390px).

Previous v1.0.7 (2026-09-21). Level 1-1 is now an explicit Bullet Bill
test field: five visible missiles start in a horizontal formation across the map center, replacing
the ordinary first-level enemies and the earlier hidden test missile. Their travel interpolation
is linear inside each cell so straight runs remain visually continuous instead of easing to a stop
at every grid boundary; the intentional 0.45-second pause still occurs only on a real turn.
Advanced-level hidden-brick spawning remains unchanged. Bomb script cache: v2.1. Focused check:
`node tests/bullet-bill-browser.mjs` at desktop and 390px.

Previous v1.0.6 (2026-09-21). Bomb maze now includes a tracking Bullet Bill
enemy using sprite frame `(560, 48, 16, 16)` from the existing `assets/sprites/enemies-bosses.png`.
Destroying its hidden brick spawns it. It continuously pathfinds toward the fly-star, immediately
detonates player bombs on contact without being destroyed, accelerates while moving straight,
pauses for 0.45 seconds when it turns, restarts that direction at base speed, and self-destructs
after exactly 10 travelled cells. It is immune to bomb flames, shells and ordinary enemy damage.
For user testing, level 1-1 always hides one Bullet Bill; difficulty index 5 and above otherwise
uses a 35% per-level spawn chance. Bomb script cache: v2.0. Dedicated Edge check:
`node tests/bullet-bill-browser.mjs` at desktop and 390px.

Previous v1.0.5 (2026-09-21). Bomb enemy/shell contact now retreats
two cells along the player's actual travelled route, including corners and a partial step,
instead of returning to spawn. Short/blocked routes stop at the reachable cell; legacy saves
without a trail do not invent a route. The route is saved inside the existing player snapshot.
Contact damage grants exactly one second of blinking/invulnerability; held input is cleared.
At zero HP game-over remains unchanged. Flame respawn and wrong-answer penalties are unchanged.
Bomb script cache: v1.9. Focused checks: bomb-session-browser and bomb-browser-acceptance.

Previous v1.0.4 (2026-09-21). Phonetics new learning is a single pass:
screening never repeats already checked items in the same batch; each selected new IPA needs
one correct answer, then waits for the explicit 学习完毕 button (no automatic mixed review).
Partial batches and all-known/all-mastered batches also finish. Screening/confirmation state
survives refresh; old looping saves with prior correct answers can finish immediately.
The v1.0.4 always-visible entry buttons were superseded by the v1.0.8 active-screen hiding rule.
Full IPA review is restored before completion is recomputed, fixing premature completion after
the first 20 items. Cross-day normalization no longer revives yesterday's review queue.
Hanzi rules are unchanged. Focused Edge checks: phonetics-completion-browser and phonetics-browser-acceptance.

Previous v1.0.3 (2026-09-20). Bomb saves now open paused with a Continue
button: actors, bomb fuses, explosions and damage wait for explicit button activation.
Directions/Space on the canvas cannot bypass the gate; the button retains native Enter/Space
and touch activation. Question reveal state and partial moves are retained. Mushroom movement
is now 90% of its previous speed, including restored moves; other enemies are unchanged.
Bomb script cache: v1.8. Focused Edge checks: bomb-session-browser and bomb-browser-acceptance.

Previous v1.0.2 (2026-09-20). New Festivals → Mid-Autumn Festival theme:
moon, mooncake, lantern, rabbit, tea and family, with British IPA, segmentation, manual
speech, six-question practice, explicit learned-library entry and persisted review check.
Artwork is `assets/themes/mid-autumn/mid-autumn-scene-v1.png` (1536×1024 RGB PNG),
generated through the user-authorized imagegen CLI / gpt-image-1.5. Six separate crops
preserve ears, lantern tassels and full figures. Tea replaces pomelo by user choice.
Dedicated Edge acceptance: `node tests/mid-autumn-browser.mjs`.

Previous v1.0.1 (2026-09-19): Revealed bomb targets now directly
show their target pinyin or Hanzi instead of a question mark/type label (bomb script v1.7). Five concealed
targets, brick reveal timing, enemy-clear reveal and question interactions are unchanged.
Every future delivery increments the displayed system version as well as changed asset caches.

Bomb maze session/input repair (2026-09-18): same-origin windows in one browser profile
share the bomb snapshot. Opening a game window takes ownership but waits for Continue;
older windows mirror saved state without advancing or writing. Their Continue button can take over again.
Blur/pagehide flush the active snapshot; stale writes first read the latest snapshot.
Separate browsers/profiles/ports still have separate localStorage; Git does not sync it.
Question cards stay inside five randomly selected bricks until revealed (both question types);
enemy clear reveals all remaining questions. Never-started saved levels also repair visible
initial cards back into bricks, without re-hiding genuinely revealed playing saves.
Damage clears held directions and movement; OS key-repeat cannot restart movement until
release and a fresh press. Bomb script cache is v1.6. Regression entry points:
`tests/bomb-browser-acceptance.mjs` and `tests/bomb-session-browser.mjs` (real Microsoft Edge).

Latest addition: Scenario 03, `counting-pens` (数一数 / Let's Count!), follows
`What number is it?` → `It is eight.` → `How many pens do you have?` → `I have eight pens.`
It now has six counting groups: eight pens, three pencils, two keys, four mushrooms, five coins and six stars.
Each group follows the same four-line pattern, for 24 word-aligned British-IPA lines, 12 illustrated response questions and 22 vocabulary candidates.
The original pens image is retained; five new 1254×1254 cards reuse approved theme artwork with exact copy counts, built by `scripts/build-counting-cards.py` from `assets/scenarios/counting-objects-v1.json`.
Playback, per-scenario refresh restoration and explicit learned-word marking use the existing scenario module.
The deduplicated combined catalog now contains 227 candidate words after the Mid-Autumn addition; only explicitly learned words enter overall review.
The dedicated Edge check is `node tests/scenario-counting-browser.mjs`; normal suite includes it.

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
- New learning stops after one correct answer per selected IPA and waits for 学习完毕; no forced mixed lap.
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
- Thirteen delivered themes with 97 theme records (94 unique words): Body, Colors, Numbers 1-10, Numbers 11-19, Tens 10-100, Ordinals 1-10, Twinkle Twinkle Little Star, Classic Items I-IV, Classroom Things, and Mid-Autumn Festival.
- Theme word cards support IPA display and phoneme segmentation, manual sound playback, previous/next navigation, keyboard/touch interaction, learning, and practice.
- The outer picker groups themes into six horizontal preview series: Festivals, Basic Recognition, Counting World, Nursery Rhymes, Classic Items, and Classroom Things. Individual reviewed themes keep their green checks, and a series turns green when all themes inside it are reviewed.
- The Nursery Rhymes series currently contains Twinkle, Twinkle, Little Star: six lyric lines each place complete British IPA directly below the English line, eight core words remain clickable, and full-verse speech is manual rather than automatic.
- Counting artwork is code-native and exact: 1-19 use the matching number of coin dots; 10-100 uses one to ten ten-frames, each containing exactly ten dots.
- Project assets live under `assets/themes/` and have been checked against their mapped words/hotspots.
- Classroom Things teaches pencil, pen, eraser, ruler, book, schoolbag, desk, and chair using `assets/themes/classroom/classroom-things-scene-v1.png`. The 4×2 scene has eight independent non-overlapping hotspots and supplies per-word cropped artwork to the shared word library.
- Theme learned records remain in `mario-theme-learned-v1` and are one of the three sources of the shared total word library.
- Classroom's student desk is taught as desk /desk/ (课桌), with “This is a desk.” / “Touch the desk.” The internal ID `table` and saved key `classroom:table` intentionally remain stable to preserve earlier progress. The shared library merges it with Book1 desk, reducing the combined candidate count to 214 without removing learned progress. Focused regression: `node tests/classroom-desk-browser.mjs`.

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
- Overall review independently saves its question order, position, options and remembered/forgotten marks in `mario-total-review-v1`. Refresh and re-entry resume, including completed rounds; only “再来一轮” resets round position. ✓/× explicitly save a word's memory state and advance; new rounds prioritize ×, then unmarked, then ✓. All learned words remain included. Picture answers still work but do not infer a manual memory mark.
- Space toggles the current review word's IPA breakdown, using the same click behavior. Entering a round focuses its IPA button; repeated keydown does not retrigger, and sound/answer/navigation controls keep native keyboard behavior. New questions begin collapsed.
- This is an independent top-level module, not a child page inside Theme Learning.
- The total word library aggregates words actually learned in Book1, Theme Learning, and Scenario Learning. It reads all three existing progress keys without writing across module boundaries and deduplicates by normalized English spelling.
- The combined published catalog currently contains 227 unique candidate words. The library and each review round include only the subset actually learned in the current browser profile.
- Theme artwork remains preferred for duplicates, Book1 uses its original word pictures, and scenario words use focused object art when available or a Chinese-meaning choice card when no literal image exists. Reviews keep four unique choices, wrong-answer retry, restart, refresh persistence, desktop and 390px layouts.

### Bomb maze

- Entry: `bomb-game.html`.
- Each level has five distinct Hanzi targets: prioritize learning evidence, then fill from non-mastered words without repeating the same character. Odd/even sublevels alternate pinyin-to-Hanzi and Hanzi-to-pinyin questions.
- All five questions start hidden inside separate bricks. Destroying a target brick reveals its question card; eliminating the last enemy opens remaining bricks except intact hidden Bullet Bill bricks, and reveals all pending questions. The player must bomb the retained missile brick; hidden/live missiles block completion even after five correct answers.
- All ten levels start with their normal enemies and exactly one hidden Bullet Bill in a non-question brick; no visible missile spawns at entry and there is no random spawn chance. It continuously chases the player with no distance limit at a constant 0.28125s/cell (another 20% slower since v1.0.14), including turns, with no acceleration or pause. Bomb contact consumes the missile and recolors the existing bomb red, retaining its range and ordinary one-second fuse/blast. Red color and timer persist in the existing save; pending red bombs prevent early cleanup/completion. Ongoing saves are not reset by releases.
- Bomb saves remain version 1, with targetRevealPolicy=1 distinguishing the restored hidden-question rule. New saves preserve hidden/revealed/active/completed state; old automatically visible unanswered prompts are re-hidden where intact bricks remain, without discarding active answers or completed progress. Only actual reveals increment appearance counts.
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
- `mario-total-review-v1` (round progress and explicit memory marks only)
- legacy migration source: `mario-literacy-desktop-mvp-v1`

`src/total-word-library.js` is a read-only aggregate view over the Book1, Theme Learning, and Scenario Learning keys; it does not introduce another browser storage key.

Git synchronizes source code and assets only. Browser `localStorage` progress, API keys, environment variables, Codex plugins, browser-extension connections, and local tool installations must be configured separately on the company computer.

## Latest verification snapshot

Verified on 2026-09-26 for v1.0.17:

- Syntax checks, 132 Node tests, and whitespace checks passed.
- Focused real Microsoft Edge bomb acceptance passed for game entry, placement,
  1440/390px layout, paused save/Continue, and missile-to-red-bomb conversion.
  Ordinary/red bombs share the one-second fuse; direct chain detonations remain immediate.
- No unrelated module browser suite was run.

Verified on 2026-09-25 for v1.0.16:

- Syntax checks, Node tests, and whitespace checks passed.
- Real Microsoft Edge offline rendering put all four cue peak 50ms RMS levels near 0.018
  (within 4% in the acceptance run), while both world themes had whole-second RMS near 0.0016.
- Targeted Edge gameplay checks covered both world themes, refresh/Continue, four cues,
  mute, desktop and 390px, with no resource errors. No unrelated module browser suite was run.

Verified on 2026-09-25 for v1.0.15:

- Syntax checks, Node tests, and whitespace checks passed.
- Targeted real Microsoft Edge sound acceptance passed at desktop and 390px: four distinct
  gameplay triggers, mute via keyboard/touch, no overflow or resource errors.
- No unrelated module browser suites were run.

Verified on 2026-09-24 for v1.0.14:

- Syntax checks, Node tests (131/131), and whitespace checks passed.
- Targeted real Microsoft Edge Bullet Bill acceptance passed at 0.28125s/cell,
  including constant-speed turns, hidden-brick release, red conversion, persistence,
  desktop and 390px. No unrelated module browser suites were run.

Verified on 2026-09-24 for v1.0.13:

- Syntax checks, Node tests (131/131), and whitespace checks passed.
- Targeted real Microsoft Edge Bullet Bill acceptance passed: 0.225s/cell movement,
  immediate constant-speed turns, brick release, red conversion and save continuation,
  desktop/390px. No unrelated module browser suites were run.

Verified on 2026-09-24 for v1.0.12:

- Syntax and Node checks passed (131/131), including release-query consistency across all
  seven pages, numeric version comparisons, cancellation, errors and concurrent checks.
- Real Microsoft Edge targeted Bullet Bill checks passed: constant 0.18s/cell, no turning
  pause (including legacy saved pauses), ten-level hidden missiles, red conversion and saves.
- Real Microsoft Edge update-notification integration passed on all seven pages plus 390px
  bomb page: current version stays quiet, newer version prompts, cancel does not reload,
  later releases prompt again, confirm reloads the same URL and bomb resume remains gated.
- No unrelated module learning/gameplay browser suites were run.

Verified on 2026-09-24 for v1.0.11:

- Syntax and Node checks passed (126/126); diff whitespace check passed.
- Targeted real Microsoft Edge Bullet Bill acceptance: 0.18s first cell, gradual 0.005s
  acceleration, survival beyond ten cells, contact conversion to one red bomb, same blast
  cells/brick blocking as a black bomb, red persistence and ordinary fuse passed.
- Actual next-level generation across 1-1 through 2-5 passed: all ten levels have exactly
  one hidden missile in a separate brick and five hidden question targets.
- Desktop/390px red-black comparison screenshots inspected. Retained missile brick,
  reload and manual reveal remain covered. No unrelated browser suite run.

Verified on 2026-09-22 for v1.0.10:

- Syntax checks and Node tests passed (124/124).
- Targeted real Microsoft Edge at 1440px/390px: zero visible missiles at first-level entry,
  one hidden missile, normal enemies restored, no startup auto-clear, player-triggered reveal,
  enemy-clear retained brick and reload/manual bombing passed. Screenshots refreshed.

Verified on 2026-09-22 for v1.0.9:

- Syntax checks and Node tests passed (123/123); diff whitespace checks passed.
- Targeted real Microsoft Edge Bullet Bill acceptance passed at 1440px and 390px:
  one centered first-level missile; final-enemy death reveals all five questions but retains
  the hidden missile brick; reload preserves it; a player-placed bomb releases exactly one missile.
  Existing bomb-contact survival, linear movement and ten-cell self-destruction checks passed.
  No unrelated module browser suites were run for this release.

Verified on 2026-09-21 after the centered test-field and smooth-travel update:

- `pnpm run check`, `pnpm test`, and `git diff --check`: passed.
- Real Microsoft Edge Bullet Bill acceptance passed at desktop and 390px: five visible centered missiles on 1-1, no hidden test missile, linear between-cell travel, advanced brick-triggered spawning, bomb-contact survival, 10-cell self-destruction, sprite HTTP 200, and no horizontal overflow.

Verified on 2026-09-21 after the Bullet Bill test release:

- `pnpm run check`, `pnpm test`, and `git diff --check`: passed.
- Real Microsoft Edge Bullet Bill acceptance passed at desktop and 390px: fixed 1-1 hidden spawn, brick-triggered appearance, sprite crop and HTTP 200, bomb-contact early detonation with survival, exactly 10-cell self-destruction, and no horizontal overflow.
- Full `pnpm run test:browser` passed against the inherited 5177 service after replacing stale hard-coded Windows usernames with current-profile Playwright resolution; existing bomb save/session and every learning module remained green.

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

- Browser acceptance resolves Playwright from the current Windows profile's bundled Codex runtime. The shared bomb/browser helper also accepts `CODEX_PLAYWRIGHT_PATH` when the runtime lives elsewhere; verify that dependency before relying on `pnpm run test:browser` on a machine without the standard bundle.
- Do not copy `.env`, API keys, browser profiles, cookies, or storage-state files through Git.
- If learning progress must move between computers, use a separately reviewed export/import workflow; do not commit progress data to this repository.
- If port 5177 is occupied, choose another isolated port. Do not stop a server that was not started by the current task.

## Starting a new Codex main chat

Use this opening request:

> Read `AGENTS.md` and `PROJECT_HANDOFF.md`, inspect `git status`, and continue from the current `main` branch. Preserve all module storage boundaries and existing review rules. Before changing code, report which module and tests are in scope.
