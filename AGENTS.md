# StudySystem repository instructions

## Start here

- This repository is the durable source of truth shared between computers.
- Read `PROJECT_HANDOFF.md` before starting implementation work.
- Read `CODEX_COLLABORATION.md` before coordinating or delegating multi-chat work.
- Check `git status --short --branch` before pulling or editing. Preserve user changes and never discard unrelated work.
- Use the repository root as the Codex local project's primary folder so this file is discovered automatically.
- Keep separate chats focused on separate outcomes; place durable decisions here or in checked-in documentation instead of relying on chat history.

## Project shape

The application is a build-free local learning website served by `server.py`.

- `index.html`, `styles.css`, `src/`, `data/`: Hanzi learning and review.
- `phonetics.html`, `phonetics.css`, `src/phonetics-*`, `data/phonetics*`: 48-IPA module.
- `theme-learning.html`, `theme-learning.css`, `theme-learning.js`: themed English learning.
- `scenario-learning.html`, `scenario-learning.css`, `scenario-learning.js`, `data/scenarios.js`: short-dialogue scenario learning.
- `review-learning.html`, `review-learning.js`, `src/theme-overview.js`: independent overall review and learned-word library.
- `bomb-game.html`, `bomb-game.css`, `bomb-game.js`: independent bomb-maze game.
- `assets/`: project-consumed images and sprites. Image-generation working outputs belong in ignored `output/`, not in page references.
- `tests/`: Node tests, Microsoft Edge acceptance scripts, and approved screenshots.

## Setup and commands

Preferred package manager: `pnpm`.

```powershell
pnpm install
pnpm run check
pnpm test
python server.py --bind 127.0.0.1 --port 5177
```

Open `http://127.0.0.1:5177/` after starting the server.

Run the complete browser suite only when Microsoft Edge and the required Playwright runtime are available:

```powershell
pnpm run test:browser
```

The current browser scripts reference a Codex-bundled Playwright path under the local Windows user profile. On a different computer, verify that dependency path before running the suite. Treat any portability change as an intentional repository change rather than silently editing paths only for one machine.

## Product invariants

- Hanzi normal review stays fixed at most 20 items per day. Do not apply the phonetics full-review rule to Hanzi.
- Phonetics review includes every currently non-mastered IPA item on each entry, from 0 to 48. `mastered` is the only exclusion condition.
- The overall review is a top-level module parallel to Hanzi, Theme Learning, and Phonetics. Do not move it back inside the theme page.
- The total word library aggregates words actually learned in Book1, Theme Learning, and Scenario Learning, deduplicated by normalized English spelling. Overall review covers all of those learned words.
- Scenario learning is an independent top-level module. Its dialogue completion is not added to the theme learned-word library.
- Keep the bomb game independent. Preserve native Enter/Space behavior when a link, button, form control, ARIA control, or other focusable element has focus.
- Preserve the existing module navigation order: Hanzi, Book1, Theme Learning, Scenario Learning, Overall Review, Phonetics.

## Storage boundaries

Browser progress is local to each browser profile and is not synchronized by Git.

- Hanzi writes `mario-hanzi-refactor-v1`; legacy `mario-literacy-desktop-mvp-v1` is migration input.
- Phonetics writes `mario-phonetics-v1` only.
- Bomb maze writes `mario-bomb-game-progress-v1` and only reads Hanzi sources needed for its learning pool.
- Theme learning writes learned-word progress through `mario-theme-learned-v1`; overall review reads it together with Book1 and Scenario Learning progress through the shared read-only total-word-library aggregator.
- Overall review saves only its own round and per-word remembered/forgotten marks in `mario-total-review-v1`. It never changes the three source modules' learned records. Refresh resumes the same round; new rounds prioritize forgotten words.
- Scenario learning writes `mario-scenario-learning-v1` only.
- Scenario new-word matching reads the same total word library used by overall review, but writes its `learnedWords` only to the scenario key. New scenarios are authored in conversation using imagegen; do not add a web generation form or API unless explicitly requested. Final approved artwork lives in `assets/scenarios/`. Preserve and never commit any private legacy `.local-scenarios/` directory.
- Do not let one module reset, migrate, or overwrite another module's key.
- Never commit browser storage exports, API keys, `.env` files, credentials, or authenticated browser state.

## Implementation and verification

- Use `rg`/`rg --files` for discovery and `apply_patch` for text edits.
- Preserve user-owned dirty-worktree changes. Do not use destructive Git commands.
- When a referenced CSS or JavaScript asset changes, update its cache query and the matching tests.
- Put final generated web assets under `assets/` with semantic versioned names. Verify dimensions, file signatures, HTTP 200, and visible page use.
- For visual changes, verify both desktop and a 390px viewport. Check horizontal overflow, clipping, actual element geometry, keyboard/touch behavior, and resource failures.
- Prefer real Microsoft Edge acceptance through the repository scripts. Report the actual validation surface; do not label another browser as Edge.
- Do not stop an inherited local server. If a separate server is needed, use an isolated port and stop only the process started for that check.
- Minimum completion gate for code changes: `pnpm run check`, `pnpm test`, targeted browser acceptance when the UI changes, and `git diff --check`.

## Git workflow

- Primary branch and remote: `main` at `https://github.com/Walhy2020/StudySystem.git`.
- Pull before new work when the worktree is clean. If it is not clean, inspect and preserve those changes first.
- The user has granted standing authorization to commit and push completed, verified project changes to origin/main. Do so after required checks pass unless the user explicitly pauses or limits uploads. Exclude unrelated local files and credentials.
- Before committing, exclude ignored/generated working files and inspect the staged diff.
- After pushing, verify `git status --short --branch` shows local `main` synchronized with `origin/main`.
