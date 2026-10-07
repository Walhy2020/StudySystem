# StudySystem cross-device handoff

Last updated: 2026-10-07
Repository: `https://github.com/Walhy2020/StudySystem.git`
Branch: `main`
Baseline before this handoff document: `3a6815d`

## Company-computer quick start

System display version: **v1.0.55** (2026-10-07). R2 directly requests native
fullscreen across all eight pages, without auto-opening bomb settings or a
learning-page authorization popup when denied. Successful bomb toggles close
settings and return focus to the canvas; concurrent requests are guarded.
Browser denial remains a real denial, reported only in the console, with no fake
fullscreen or security bypass. Browser-owned Escape/fullscreen notices cannot
be suppressed by website code. Fullscreen-shell navigation and cursor reparenting
remain unchanged. Bomb JS v2.37, shared cursor v1.9; eight notifier queries and
display-version imports v1.0.55 (Hanzi/Pinyin/IPA entry caches v1.33/v1.7/v1.32).
Focused browser check: tests/gamepad-fullscreen-browser.mjs, R2 only at 1440/390
on the eight pages; standard input is simulated, not physical-controller
certification. Existing tracked PNG changes remain excluded. Syntax, 196 Node
tests, the focused Edge check and git diff --check passed; no unrelated browser
learning/gameplay suite ran.

Previous **v1.0.54** (2026-10-07). Small mushroom throws now
deal one damage to ordinary and black hidden-missile crates: a full-health brick
needs three hits. Each shot ends at the first brick and cannot damage twice;
the first two hits keep contents hidden, and the third reveals contents/scores
once. Partial HP survives refresh/Continue in the existing save. Bombs and Bowser
fireballs still destroy a crate in one hit; enemy damage remains one. No new keys,
HP migration, movement or other-module learning changes.
Bomb JS v2.36; all eight notifier queries and display-version imports v1.0.54
(Hanzi/Pinyin/IPA entry caches v1.32/v1.6/v1.31). Focused browser check:
tests/bomb-mushroom-brick-browser.mjs (real Edge, 1440/390). Existing tracked PNG
edits remain preserved and excluded; no unrelated browser suite. Syntax,
193 Node tests, the focused Edge check and git diff --check passed.

Previous **v1.0.53** (2026-10-07). Bowser fireballs and all
ice/normal/red/missile bombs deal 3 damage to crates, destroying a full-health
or previously damaged crate in one hit. Each stops at the first crate; overlapping
blasts retain the destroyed-brick barrier. Rewards/hidden questions/missiles reveal
once. Shells still deal one crate damage; mushrooms cannot damage crates. Player
damage, enemy HP, fireball speed/cooldown and save schema remain unchanged.
Bomb JS v2.35; all eight notifier queries and display-version imports v1.0.53
(Hanzi/Pinyin/IPA entry caches v1.31/v1.5/v1.30). Focused browser check:
tests/bomb-single-hit-brick-browser.mjs (real Edge, 1440/390). No unrelated browser
suite; pre-existing tracked PNG edits remain excluded. Syntax, 192 Node tests,
the focused Edge check and git diff --check passed.

Previous **v1.0.52** (2026-10-06). Bomb HUD now shows one
moon icon multiplied by the completed count, still centered and requiring five
answers per level. In-game transient banners (pickup, enemy hits/deaths, start,
fullscreen, etc.) and restored legacy banners are suppressed visually and for
live announcements. Shared pointer help stays hidden; learning-page fullscreen
activation fallback keeps its buttons without explanatory text. Native browser
Escape/fullscreen notices are outside page control; start/Continue, settings,
binding feedback and version-update confirmation remain available.

All destructible crates, including black hidden-missile crates, have 3 HP.
Each ice/normal/missile bomb, Bowser fireball or shell impact deals one damage;
loot and score occur only on the third hit. Surviving crates stop the attack;
overlapping distinct blasts each count once without penetrating a crate barrier.
Mushrooms still cannot damage crates. Enemy-clear automatic opening and learning
space allocation retain their prior rules. Damaged 1/2-HP crates save in the
existing bomb key as crateHp entries; old saves default to 3, invalid/non-crate
entries are ignored, and each new level resets crate damage.

Bomb JS/CSS v2.34/v1.9, cursor JS v1.8; eight notifier queries v1.0.52.
Display-version imports use constants v1.0.52 (Hanzi/Pinyin/IPA entry caches
v1.30/v1.4/v1.29). Only tests/bomb-brick-hp-browser.mjs ran in real Edge at
1440/390: ordinary/black crates, three hits, no early reward/missile, partial
HP refresh/Continue, actual pickup, numeric moon restore/center geometry, hidden
pointer help, real fullscreen and resource/no-error checks. Controller menu
input was simulated; physical PS5 operation is not certified. Ignored tmp
screenshots inspected; existing tracked PNG edits preserved/excluded. Syntax,
191 Node tests and git diff --check passed. No unrelated browser suite ran.

Previous **v1.0.51** (2026-10-06). The shared gamepad pointer
keeps its screen coordinates across module navigation, fullscreen-frame switches,
fullscreen exit and refresh. Only the first visit without valid coordinates
starts centered. Viewport resize clamps to visible boundaries instead of recentering.
The per-tab UI key `mario-gamepad-cursor-position-v1:<app directory>` uses
sessionStorage and stores x/y only, never buttons, learning progress or game saves.
Separate tabs are independent. Disabled/malformed storage fails safely; dormant
fullscreen owners never overwrite the active child's coordinates on pagehide.

Cursor JS v1.7, CSS v1.1; shell/game rules unchanged. All eight notifier queries
v1.0.51; display-version entries reference constants v1.0.51 (Hanzi app v1.29,
Pinyin app v1.3, IPA app v1.28).

Only tests/gamepad-cursor-position-browser.mjs ran in real Microsoft Edge at
1440/390: navigation-only coverage across eight pages, actual pointer link click,
fullscreen transitions, R2 exit without stale-owner overwrite, refresh, viewport
clamp, tab isolation, geometry and HTTP/no page errors. Standard controller input
was simulated; physical PS5 operation is not certified. Ignored tmp screenshots
inspected; pre-existing tracked PNG edits preserved and excluded. Syntax,
186 Node tests and git diff --check passed. No unrelated browser workflows ran.

Previous **v1.0.50** (2026-10-06). Fullscreen module navigation
now keeps one persistent fullscreen owner with one same-origin internal iframe.
Switching between all eight pages stays fullscreen; native and gamepad links
share validated routing, browser back/forward reuses the frame, and R2/browser
exit opens the currently visible module normally rather than the dormant source.
Windowed navigation is unchanged. Outgoing speech/timers stop; dormant bomb
gameplay/music/controller polling/save writes pause, and returning to a saved
game still requires Continue. No new storage keys or synchronization service.

Shell JS/CSS v1.0, cursor v1.6/CSS v1.1, bomb JS v2.33, book themes v1.3,
theme JS v2.18, scenario JS v2.7, phonetics TTS v1.3; all eight notifier queries
v1.0.50. Hanzi/Pinyin/IPA display-version entry imports use current constants
queries; Hanzi app v1.28, Pinyin app v1.2, IPA app v1.27.

Only tests/fullscreen-shell-browser.mjs ran for browser acceptance: real Microsoft
Edge 1440/390, all-module transitions, mouse/keyboard/touch links, right-stick
pointer routing, no fullscreen exit/nested frames, history, source progress,
bomb pause/save/Continue, R2 and browser-initiated fullscreen exit, windowed
navigation, geometry and resources/no page errors. Standard controller input
was simulated; physical-controller operation is not certified. Ignored tmp
screenshots inspected; existing user-owned tracked PNG changes remain excluded.
Syntax, 184 Node tests and git diff --check passed; no unrelated browser suite.

Previous **v1.0.49** (2026-10-06). R2 toggles fullscreen on
all eight pages. The seven learning pages use the shared cursor handler and
fullscreen the document root; bomb maze keeps its existing app-container handler
without a duplicate R2 request. Held/reconnect/focus and capture safeguards remain.
An in-flight guard prevents overlapping learning-page requests. Browser activation
denials show a real-click enter/exit button with cancel/unsupported feedback rather
than pretending fullscreen succeeded. Browser activation may be needed again on
later entries. Pointer/help remain mounted inside the fullscreen top layer.

Shared cursor v1.5 and CSS v1.1; eight notifier queries v1.0.49. Bomb JS/CSS/reader
remain v2.32/v1.8/v1.4. Only tests/gamepad-fullscreen-browser.mjs ran for browser
acceptance: real Microsoft Edge, 1440/390, eight pages, R2 single edge/held-on-connect,
no double bomb handler, denied API and real-click fallback, actual trusted-activation
R2 entry/exit, visible fullscreen pointer/help, capture/focus suppression, geometry
and resources. Standard controller input was simulated; no physical-controller
certification or unrelated learning/gameplay flows. Syntax, 180 Node tests and
git diff --check passed. Ignored tmp screenshots inspected; tracked PNG changes
remain preserved and excluded.

Previous **v1.0.48** (2026-10-06). The shared in-page gamepad
cursor now scrolls vertically when held outward at the viewport top/bottom.
Right-stick movement keeps the cursor inside the page; downward push at the
bottom reveals lower content, upward push at the top returns toward the header.
Release/deadzone/reverse motion stops edge scrolling immediately. Scroll speed
scales with stick deflection, capped at 500px/s. Vertical containers under the
cursor scroll first, exhausted containers fall back to the page, and horizontal
lists are not converted into sideways motion. Shoulder scrolling retains its
existing horizontal snap behavior and takes priority to avoid doubled scrolling.
Focus/disconnect/neutral and shortcut-capture protections remain; no storage or
game movement rules changed. Eight pages use cursor v1.4 and notifier v1.0.48;
bomb JS/CSS/reader stay v2.32/v1.8/v1.4.

Focused tests/gamepad-edge-scroll-browser.mjs passed in real Microsoft Edge at
1440/390: actual tall phonetics page, both edges, continuous/release/reverse,
top/bottom limits, nested panel/fallback, no horizontal conversion, capture,
disconnect/reconnect/blur safeguards, click-once, resources and no overflow.
Standard controller was simulated; no physical-controller certification.
Ignored tmp screenshots inspected. Syntax, 180 Node tests and whitespace passed;
no unrelated browser suite ran; existing tracked PNG changes preserved.

Previous **v1.0.47** (2026-10-06). Attack shortcuts now use
press-to-capture buttons instead of selects. Each attack retains one keyboard
and one standard-gamepad binding. Duplicate or reserved movement/system inputs
are rejected with feedback, never silently swapped. Escape, menu close and
focus loss cancel capture. Held entry buttons require release; capture pauses
both combat/system actions and the shared cursor's independent polling, so
binding R1/R2 cannot refresh/fullscreen and captured presses cannot click/attack.
Bindings restore in the existing bomb save without map/HP/progress changes.
Defaults remain Space/B and Cross/Circle; free L3 can be assigned explicitly.
The enlarged attack arrow stays bright cyan while stopped or moving.

Bomb JS v2.32, CSS v1.8, bindings helper v1.0, gamepad reader v1.4 and shared
cursor v1.3; all eight notifier references v1.0.47. Focused real Microsoft Edge
tests/bomb-bindings-browser.mjs passed at 1440/390 (including 390x500 settings):
keyboard/touch capture, controller remapping, held/multiple/reserved inputs,
conflicts/cancel, reload/Continue persistence, unchanged map/HP, actual attacks,
fixed rendered-arrow color, geometry and HTTP resources/no page errors.
Standard gamepad input was simulated; no physical controller test is claimed.
Syntax checks, 179 Node tests and git diff --check passed. No unrelated browser
suite ran. Ignored tmp screenshots inspected; tracked PNG changes preserved.

Previous **v1.0.46** (2026-10-06). Attack direction now follows
every successful player move automatically. While stopped, the left stick can
adjust aim; resuming movement/turning overrides stationary aim again. Actual
in-progress steps take priority over buffered turn requests. L3 has no action.
The fixed/follow toggle and its saved flag are removed; legacy true/false flags
are ignored without changing map, HP or progress. The enlarged arrow remains,
yellow during motion and cyan when stationary. D-pad movement is unchanged.

Bomb JS v2.31, gamepad reader v1.3; shared cursor v1.2 and CSS v1.7 unchanged;
all eight notifier references v1.0.46. Only the changed aim checks ran in real
Edge at 1440/390: tests/bomb-aim-fullscreen-browser.mjs --aim-only. Verified
stationary aim/attacks, automatic follow/turns while the left stick is held,
inert L3, legacy-save restoration and no page/resource errors. Fullscreen and
unrelated module browser flows were explicitly skipped. Syntax and 175 Node
tests passed; git diff --check passed. Ignored tmp screenshots inspected;
physical controller not tested; existing tracked PNG changes preserved.

Previous **v1.0.45** (2026-10-06). L3 (press left stick) toggles
attack-direction follow while walking; press again restores independent stick aim.
The follow flag persists in the existing bomb save, defaults off for older saves,
tracks actual successful movement/turns and ignores stick aim while locked.
Menu/Continue/held-button and reconnect protections remain intact. The arrow's
triangle width/height are doubled; follow is yellow and free aim cyan.

Fullscreen cursor fix: pointer, help and controller-select popup are mounted in
document.fullscreenElement while fullscreen is active and restored to body on
exit. The right-stick virtual menu cursor remains visible and clickable in the
browser fullscreen top layer, without OS mouse control. Shared cursor/reader
caches v1.2, bomb JS v2.30, CSS unchanged v1.7; eight notifier queries v1.0.45.

Focused verification: tests/bomb-aim-fullscreen-browser.mjs used real Microsoft
Edge at 1440/390 with a standard PS5 input fixture. It covered L3 while walking,
held single-toggle, turns/attacks, reload/Continue lock persistence, unlock and
menu protection, enlarged-arrow rendering, actual trusted-click fullscreen,
visible right-stick cursor/help/select popup, exit reparenting and resource errors.
Only this changed-feature browser script ran; no unrelated module flows.
Syntax and 175 Node tests passed; physical-controller operation is not claimed.
Ignored tmp screenshots inspected; existing tracked PNG changes preserved.

Previous **v1.0.44** (2026-10-06). Ordinary monsters now have
6 HP and missiles 3 HP. Independent enemyHpRulesVersion migrates living saves
once, preserving damage/dead enemies/Bowser 40 HP and ice upgrades. Missiles take
one mushroom damage per hit and drop the existing range-10 bomb only on death.

PS5 standard mapping: D-pad moves, left stick independently aims (cyan indicator),
right stick retains menu cursor, cross/circle attacks, Options confirms. R1 saves
and reloads the page; R2 toggles fullscreen, with a visible real-click fallback
when browser activation policy blocks it. System buttons work in settings while
combat remains paused. R1 no longer scrolls the bomb page's virtual menu;
L1/L2 scroll the game settings up/down (other pages retain LB/RB).

Compact top HUD has five screen-centered DOM moons and one Settings entry for
avatar/attack/audio/fullscreen. Settings pause gameplay/music and clear held
inputs. The camera viewport expands from 1182x626 to full 1280x720, reclaiming
the previous canvas HUD margin; tiles remain 48 and the camera follows the player.
Bomb CSS v1.7, JS v2.29, gamepad reader/cursor v1.1; eight notifier queries v1.0.44.

Codex logical main/child relationships and last observed actual model settings
are versioned in docs/codex/: main gpt-6.1-sol/high, seven module/material chats
gpt-6-astra/medium. Inactive child model records date to 2026-09-08. Templates
are not auto-activated and do not import chat histories/IDs, accounts, credentials,
skills, controller permissions or browser progress.

Targeted real Edge checks at 1440/390 use a standard Gamepad fixture for independent
aim/D-pad, attacks, refresh/Continue, fullscreen API routing/fallback, menu pause,
centered moons, expanded viewport and resources. Physical controller and actual
Gamepad-triggered fullscreen authorization remain device/browser checks; no
unrelated learning module browser flows were run. Existing tracked PNG changes
are user-owned and excluded from this release.

Release gates: pnpm run check, pnpm test (174/174), the one targeted bomb-gamepad
Edge script and git diff --check passed. Ignored tmp desktop/390 screenshots
were inspected; no physical-controller certification is claimed.

Previous **v1.0.43** (2026-10-05). Bomb attack settings add an
explicit WebHID battery authorization button for Sony DualSense / DualSense Edge.
Only full USB/BT input reports are parsed; BT CRC is validated. Charge uses the
device's ten-percent bucket (60-69%, not a fabricated precise percentage), with
charging/full/low/error states. No output or feature reports, host-battery API,
new storage or gameplay changes. Unknown is shown for unsupported browsers,
cancelled/denied permission, compact/no reports, disconnection and 10-second stale
data. One previously authorized supported HID device restores automatically;
multiple devices require an explicit choice. Attack menu fits/scrolls within the
viewport. Battery helper cache v1.0; bomb CSS v1.6; bomb JS remains v2.28;
all eight notifier queries v1.0.43. Physical controller battery accuracy and OS
HID accessibility still require the user's actual device authorization.

Release checks: syntax, 170 Node tests and whitespace passed. Only targeted
Microsoft Edge battery UI and existing bomb gamepad input checks ran at
1440/390; a 390x500 menu also stayed scrollable and in view. Mock HID covered
USB/full-BT reports, charge/low/full, chooser cancel/denial, disconnect, stale
data, keyboard/touch authorization and unsupported fallback. The previous
standard gamepad fixture still passed movement, attacks and confirmation.
Ignored tmp/bomb-battery-*.png screenshots were inspected; pre-existing tracked
screenshots preserved. No physical-controller test or unrelated browser suite
is claimed. In actual Edge, open Attack Settings -> read battery and grant the
device explicitly; unavailable reports remain unknown.

Previous v1.0.42 (2026-10-05). All eight pages load the shared
src/gamepad-cursor.js?v=1.0 and its gamepad-cursor.css?v=1.0. The virtual pointer
stays in the viewport and never controls the OS cursor. Study pages use either
stick, A/cross or R3 click and LB/RB scrolling (one full step for horizontal
scroll-snap lists). Same-origin navigation is restricted to the eight system pages;
external links, downloads, file pickers and new tabs are not activated. SVG hotspots,
checkboxes, range sliders and a custom in-page select chooser are supported.

Bomb left-stick/D-pad movement and A/B combat remain intact. Right-stick movement
or Y/triangle enters pointer menu mode, pauses gameplay/music and clears old inputs;
A clicks menus without also throwing mushrooms. Y/triangle or clicking the canvas
returns to gameplay and closes settings menus, requiring neutral before fresh input.
Clicks on Start/Continue/restart also return to gameplay. Focus/visibility loss,
disconnect and page navigation clear pointer input. No new progress keys or OS
input APIs are used. This is not a kiosk/parental lock: physical mouse/keyboard and
browser chrome remain available. Bomb JS cache v2.28; all eight notifier queries v1.0.42.

Focused validation: tests/gamepad-cursor.test.mjs and
HANZI_BASE_URL=http://127.0.0.1:53177/ node tests/gamepad-cursor-browser.mjs.
Real Microsoft Edge with an injected standard controller at 1440/390 covered the
shared pointer on eight pages, internal navigation and blocked external/download
links, viewport bounds, held-button single clicks, disconnect/neutral rearming,
horizontal shoulder scrolling, a real theme SVG hotspot, game menu pause, avatar,
select/range settings, non-duplicated start click and unchanged game controls after
return. Ignored tmp cursor screenshots inspected; pre-existing tracked screenshots
preserved. This is browser input simulation, not a physical-controller certification.
No unrelated learning/gameplay browser suites were run.

Release checks: syntax, 164 Node tests and whitespace checks passed. The previous
bomb-gamepad-browser.mjs input suite also passed at 1440/390; only pointer/menu
and controller coexistence were exercised, not unrelated module workflows.

Previous v1.0.41 (2026-10-05). Bomb maze supports the browser
standard Gamepad mapping: left stick/D-pad movement, bottom A/cross mushroom,
right B/circle ice bomb; A/cross or Start/Options confirms start, saved Continue
and next-level ready screens without also attacking. Attacks are edge-triggered;
stick deadzone is 0.35, dominant axis only. Neutral/release is required after
connection, damage/input reset, focus loss, menus and reconnect, preventing drift
and held-button attacks. Keyboard and gamepad directions have separate ownership;
release of one device does not cancel a held direction from the other. Non-standard
mapping reports XInput guidance instead of guessing. No controller IDs/state are
persisted; gameplay, progress and storage boundaries are unchanged.

New helper: src/bomb-gamepad.js?v=1.0. Bomb JS v2.27, CSS v1.5;
all eight notifier references: v1.0.41. Help/status appears on the start card and
attack settings. Browser recognition can require pressing a controller button;
audio autoplay may still require an initial mouse click on Start.

Focused validation: tests/bomb-gamepad.test.mjs and
HANZI_BASE_URL=http://127.0.0.1:53177/ node tests/bomb-gamepad-browser.mjs
(also available as pnpm run test:gamepad). Real Edge at 1440/390 with an injected
standard Gamepad fixture covered movement/turning/deadzone, both attacks and
held-button suppression, start/Continue/next confirmation, disconnect/reconnect,
damage-neutral safety, menus, keyboard coexistence and no resource errors/overflow.
This validates the browser implementation, not the user's physical controller or
its model-specific driver mapping. Ignored tmp start/help screenshots were viewed;
pre-existing tracked screenshots were preserved. No unrelated browser suites run.

Release checks: pnpm run check, 161 Node tests and git diff --check passed.

Previous v1.0.40 (2026-10-03). Small mushrooms stop at crates
without opening them; enemy damage remains one. Bowser fires every two seconds.
Fireballs render at twice their previous radius (20 outer/12 core), without age or
distance expiry. Swept collisions with walls, first crates, bombs, player and map
boundaries remain unchanged. Old saved shots retain their position/velocity and
discard legacy life; restored Bowser cooldown is capped at two seconds. No HP,
learning progress, ice upgrades, missile or other module rules were changed.
Bomb JS cache: v2.26; all eight update-notifier queries: v1.0.40.

Focused checks: tests/bomb-projectile-rules.test.mjs and
HANZI_BASE_URL=http://127.0.0.1:53177/ node tests/bomb-projectile-rules-browser.mjs.
Real Microsoft Edge at 1440/390 verified blocked mushroom shots/no through-brick
damage, one-damage enemy hits, unchanged ice-bomb brick opening, two-second shots,
double rendered radii, old-save flight beyond five seconds, refresh/Continue,
first-brick stopping, resources and no page errors/overflow. Ignored tmp screenshots
were inspected; pre-existing tracked screenshot changes were preserved. No unrelated
module browser suites were run.

Release checks: pnpm run check, pnpm test (157 passed, zero failures) and
git diff --check passed.

Previous v1.0.39 (2026-10-02). Pinyin new-learning now follows
catalog order: initials, finals, whole syllables. Fresh rounds start screening from
the catalog beginning (still skip mastered); pending daily items are chosen by
catalog position rather than RNG or saved dailyNewIds array order. Old active
new-learning snapshots resume the first unfinished item without resetting marks.
Review and explicit inline selection remain unchanged. Pinyin engine/app caches:
v1.1; all eight notifier queries: v1.0.39. Focused checks:
tests/pinyin.test.mjs and tests/pinyin-order-browser.mjs.

Verified: syntax, 154 Node tests and whitespace checks passed. Focused real Edge
checks at 1440/390 forced RNG=0.999, verified screening and new learning b/p/m,
reordered an old m-first/shuffled snapshot, retained completed b on refresh,
explicit completion and mastered skips. No other module browser suites were run;
existing screenshots and progress remain untouched.

Previous v1.0.38 (2026-10-02). Added independent Pinyin before
Hanzi in the shared navigation. The 63 targets are 23 initials, 24 finals and 16
whole syllables. Each card displays one standalone spelling, with no Hanzi,
spelling examples or word associations. The existing IPA engine/storage policy is
reused with independent Pinyin catalog/state and mario-pinyin-v1 only: screening,
one-pass learning plus explicit completion, full non-mastered review, wrong-item
repair, inline review, refresh restoration and own-only reset. No IPA/Hanzi engine
implementation was changed. No inaccurate Hanzi/English TTS proxy was added.
New Pinyin/data/app/CSS resources use v1.0; all eight notifier queries use v1.0.38.
module-navigation.css?v=1.0 keeps seven labels on a horizontal scroll row at narrow
widths. Focused checks: tests/pinyin.test.mjs and tests/pinyin-browser-acceptance.mjs.

Verified: pnpm check, 152 Node tests and whitespace checks passed. Real Microsoft
Edge at 1440/390 covered all 63 target geometries, single-item/no-example cards,
mouse/touch/native Enter controls, screening/new-learning completion without a
second lap, active/completed refresh restoration, full 63-item review, immediate
mastered exclusion and zero-item completion, own-only reset/storage, HTTP resources
and no page errors/overflow. Only navigation was checked on the six existing
learning pages; their learning/gameplay browser suites were not run. Ignored tmp/
screenshots (yuan, ü and completion) were inspected; tracked screenshots preserved.

Previous v1.0.37 (2026-10-01). Removed the three-in-flight
mushroom limit that silently swallowed fresh attack presses. Restored and live
projectile queues now reject completed/expired or invalid shots (including negative
progress/steps). No key reset, ammunition/HP rebalance or automatic held-key firing;
level, learning progress and ice upgrades remain intact. Bomb JS cache: v2.25;
all seven update-notifier queries: v1.0.37. Focused checks:
tests/bomb-mushroom-input.test.mjs and tests/bomb-mushroom-input-browser.mjs.

Real Edge checks at 1440/390 cover all three avatars, five consecutive throws,
independent ice-bomb use, paused refresh/Continue, shot cleanup, remapped keys,
native focused-control protection, one-damage hits and brick opening. Existing
tracked screenshots remain untouched. The user's exact browser snapshot could
not be inspected; the cap defect was reproduced, and malformed restored shots
were covered with an isolated synthetic fixture rather than claimed as user data.

Previous v1.0.36 (2026-09-30). Small mushrooms deal one damage
without adding stun, snapping the enemy to a cell or cancelling its movement; ice
freezing and special-bomb stun remain unchanged. Bowser starts with 40 HP and his
cooldown ring (background, progress and ready state) is green. Old 50/15-HP saves
rebalance once with bowserRulesVersion=2, preserving damage already dealt (living
Bowsers retain at least one HP); dead Bowsers stay dead. Ice upgrades, level and
learning progress are unchanged. Bomb JS cache: v2.24; update-notifier queries on
all seven pages: v1.0.36. Focused checks: tests/bomb-damage.test.mjs and
`node tests/bomb-bowser-browser.mjs` (1440/390, ignored tmp screenshots).

Verified: one-damage mushroom hits preserve movement, freeze and firing cooldown;
green-ring rendering, 40-HP new games, 15/50-HP save migration without repeat healing,
and the existing autonomous firing/brick-opening behavior passed at both widths.
No unrelated module browser checks were run; existing tracked screenshots remain untouched.

Previous v1.0.35 (2026-09-30). Bowser has 50 HP and fires along
his current facing every three seconds without a player-visibility requirement.
Fireballs open the first crate hit, revealing its original contents, and stop there;
hard walls/bombs still block them. Bowser keeps roaming and can leave an enclosure
after his fireball opens a path. Freeze and Continue still pause him. Existing live
15-HP Bowsers are upgraded once by adding 35 HP, preserving damage already dealt;
dead Bowsers remain dead and player ice upgrades/learning progress are unchanged.
Snapshot bowserRulesVersion=1 prevents repeat healing. Bomb JS cache: v2.23;
all seven update-notifier queries: v1.0.35. Focused Edge check:
`node tests/bomb-bowser-browser.mjs` (1440/390, ignored tmp screenshots).
Verified: autonomous/repeated firing with player out of sight, first-brick blocking
and contents reveal, roaming into the opened path, freeze/Continue pauses, hard-wall
blocking, HP upgrade without repeated healing or resurrection, and no page/resource
errors at both widths. Only this focused browser check was run for the release.

Previous v1.0.34 (2026-09-30). Bomb maze supports both attacks
at once: configurable Space for small mushrooms (damage 1), B for player ice bombs.
Initial ice-bomb capacity/range are 1/2. Ice bursts open crates and freeze enemies for
three seconds without damaging the player or enemy HP; frozen enemies cannot move,
shoot or inflict contact damage. Each level hides exactly one Ice Flower (range +1,
recolored original artwork) and one Ice Bomb pickup (capacity +1). Ordinary enemy HP
is 3, Bowser HP is 15. Visible players trigger Bowser fireballs at a three-second
cooldown; an overhead ring shows cooldown, and walls/crates block sight/projectiles.
Settings, cooldown, fireballs and freeze timers survive the existing Continue gate.
Old saves migrate once with combatRulesVersion=2, retaining level/learning progress;
player ice stats restart at 1/2 and old flowers become one Ice Flower. Existing missile
special red/black bombs remain unchanged. Bomb CSS/JS caches: v1.4/v2.22; all seven
update-notifier queries: v1.0.34. Focused Edge check:
`node tests/bomb-ice-combat-browser.mjs` (1440/390, isolated storage and ignored tmp screenshots).
Verified: syntax check, repository Node baseline, focused real Edge dual-input/damage,
freeze/Continue, both pickups, old-save migration, Bowser first/repeated shots and
occluded sight, plus desktop/mobile overflow and whitespace checks. No unrelated
module browser suites were run; existing tracked screenshots were preserved.

Previous v1.0.33 (2026-09-30). Bomb maze now starts at 3-1;
worlds 1 and 2 are retired for new play. Worlds 3–6 contain five levels each
(20 playable levels). World 3 keeps its existing 27–35 by 15-cell maps and
6–10 enemies; worlds 4–6 expand to 29–37, 31–39 and 33–41 columns, with
8–12, 10–14 and 12–16 enemies, and one additional hidden missile per world.
Tiles remain 48px and the camera follows the player. Each new world has its own
background melody. Old world-1/2 saves enter a paused 3-1 start with score,
health, bomb capacity, blast range and selected controls retained; world-3
saves keep their current board. The existing map-wide random placement of
Hanzi and pinyin answer choices is unchanged (the proposed nearby-placement
rule was withdrawn). Bomb JS/audio caches: v2.21/v1.4; all seven update-notifier
queries are v1.0.33. Focused Edge check: `node tests/bomb-third-world-browser.mjs`.

Previous v1.0.32 (2026-09-30). Bomb maze now draws missile-bearing
bricks black. A revealed Bullet Bill patrols black until it sees the player within
eight cells along a clear line; it turns red and pursues, then returns to black
after one second without sight. A mushroom attack that destroys it leaves a
regular black bomb with range 10; missile contact with an existing player bomb
still converts that bomb to red without increasing its range. The dropped bomb
and blast finish before enemy-clear brick cleanup or level completion. Existing
game saves remain compatible. Bomb JS cache: v2.20; all seven update-notifier
queries are v1.0.32. Focused Edge check: `node tests/bullet-bill-browser.mjs`.

Previous v1.0.31 (2026-09-29). Book1's word card now follows
the Theme Learning interaction: word, clickable phonetic breakdown, meaning,
manual speech and Previous/Next. The per-item ✓/×/★ controls and bottom Book1
progress panel are gone. Practice alone does not add words to the shared library;
the explicit 学习完毕 action still adds the four words in the letter group. Existing
Book1 records remain intact, including legacy imports. Book1 CSS/app caches:
v2.1/v1.2; all seven update-notifier queries are v1.0.31. Focused Edge check:
`node tests/book1-browser-acceptance.mjs` at desktop and 390px.
Verified: syntax check, 143/143 Node tests, focused real Edge interaction,
all 104 original word images HTTP 200, no desktop/mobile horizontal overflow,
legacy opw1 progress retained, and no Book1 progress panel at either viewport.

Previous v1.0.30 (2026-09-29). Book1's selection now follows
the original textbook A–Z order: each of 26 groups contains its letter and the
four words printed with that letter. The three-stage learning/review/practice
flow remains; original IDs, word images, Book1 storage and legacy progress are
unchanged. Book1 app cache: v1.1; all seven update-notifier queries are v1.0.30.
Focused Edge check: `node tests/book1-browser-acceptance.mjs` at desktop and
390px. Verified: syntax, 143 Node tests, 104 image URLs HTTP 200, A/early and
X/legacy groups, three stages, full five-item practice, no horizontal overflow.

Previous v1.0.29 (2026-09-29). Book1 now groups its unchanged
104 words by topic, alongside an A–Z letter topic. Each topic uses three stages:
picture-and-word learning, picture-first hidden-answer review, and word-to-picture
practice with wrong-answer retry. The explicit 学习完毕 action adds the topic's words
to the existing Book1 learned records, so they enter the shared total-word library;
old opw1 progress, stable item IDs, images, and isolated storage key are preserved.
Book1 CSS/app caches: v2.0/v1.0; all seven update-notifier queries are v1.0.29.
Focused Edge check: `node tests/book1-browser-acceptance.mjs` on desktop and 390px.
Verified: syntax check, 143/143 Node tests, all 104 image URLs HTTP 200,
three stages, full practice round, legacy opw1-only import, desktop/mobile no
horizontal overflow, and whitespace check. Unrelated tracked screenshots remain untouched.

Previous v1.0.28 (2026-09-29). New bomb levels place Bowser
on a randomly chosen walkable cell with at least two exits, away from the player
spawn and other enemies. From world 3 onward, each level has two more ordinary
enemies than v1.0.27; 3-1 through 3-5 now start with 6/7/8/9/10 monsters in
total, including the green Koopa. Existing in-progress saves retain their maps
and enemy positions. Bomb effect output gain rose from 0.16 to 0.8, and music
output gain from 0.055 to 0.44; mute behavior and the softer-music balance remain.
Bomb JS/audio caches: v2.19/v1.3; all seven update-notifier queries are v1.0.28.
Focused Edge checks: `tests/bomb-third-world-browser.mjs` and
`tests/bomb-audio-browser.mjs` at desktop and 390px.
Verified: syntax check, 142/142 Node tests, third-world initial counts
6/7/8/9/10, six distinct Bowser starts in each viewport, four balanced sound
effects and three audible world tracks without single-effect clipping, mute and
Continue, and whitespace check passed. No unrelated browser suite was run.

Previous v1.0.27 (2026-09-29). Theme Learning now has a
separate word-review stage between learning and interactive practice. Selecting
a scene picture keeps the right word card concealed until the learner presses
Display; selecting another picture conceals the next answer again. Counting
English labels, ordinal labels and nursery-rhyme words/lyrics are hidden while
reviewing so they do not reveal the answer. Review does not alter the learned-word
store or completion state. Theme CSS/JS caches: v3.5/v2.17; all seven
update-notifier queries are v1.0.27. Focused Edge check:
`node tests/theme-word-review-browser.mjs` (desktop and 390px).
Verified: syntax check, 142/142 Node tests, targeted real Edge review flow
across Body, Numbers 1–10, Ordinals and Twinkle, and whitespace check passed.

Previous v1.0.26 (2026-09-29). Bomb maze pinyin-to-Hanzi
questions no longer use another character with any matching pronunciation as a
wrong choice (for example, bǐ cannot pit 笔 against 比). Hanzi-to-pinyin choices
also exclude overlapping readings of polyphonic characters. New pinyin-mode
levels select five targets with distinct readings; a restored old level replaces
unfinished duplicate-reading targets and removes ambiguous wrong choices while
preserving completed progress. Only bomb-game.js changed (cache v2.18); all
seven update-notifier queries are v1.0.26. Focused Edge check:
`node tests/bomb-homophone-browser.mjs` (desktop and 390px).

Previous v1.0.25 (2026-09-29). Bomb maze now has a third world,
3-1 through 3-5, for 15 levels total. World 3 maps grow from 27x15 to 35x15
cells while keeping the 48px tile size; the canvas clips and follows the player
instead of shrinking the board. It has two extra ordinary enemies per level and
2/3/4/5/6 hidden Bullet Bills across its five levels. Its background melody is
distinct from worlds 1 and 2. Existing worlds retain their previous dimensions,
enemy and missile counts; an old completed 2-5 save opens ready at 3-1, while
in-progress saves stay intact. Bomb JS/audio caches: v2.17/v1.2; all seven
update-notifier queries are v1.0.25. Focused Edge check:
`node tests/bomb-third-world-browser.mjs` (desktop and 390px).

Previous v1.0.24 (2026-09-28). Bomb maze adds a selectable
Mushroom Throw attack alongside the existing bomb attack. Space throws a small red
mushroom in the last movement direction; it travels 1–8 configurable cells (default 3),
stops at the first wall, brick, or enemy, breaks bricks and damages enemies without
creating player-harming flames. Mushroom mode does not seed or show Fire Flowers;
existing bomb-mode Fire Flowers and bomb rules remain unchanged. Attack mode, throw
distance and in-flight mushrooms use the existing bomb progress key, with old saves
defaulting to bomb mode. Bomb CSS/JS caches: v1.3/v2.16; all seven update-notifier
queries are v1.0.24.
Focused Edge check: `node tests/bomb-mushroom-attack-browser.mjs` (desktop and 390px).

Previous v1.0.23 (2026-09-28). Bomb maze's selectable Bomber now
uses the unchanged 739×741 RGBA `11R-C.png` atlas from the legacy system, checked in as
`assets/sprites/bomber-original-v1.png`. The game assembles its separate body and feet
at runtime; the temporary hand-drawn character is removed. Brief turn taps now stay
buffered for up to 0.55 seconds when the first junction is blocked, so the next open
junction turns without another press. Player speed, collision, other avatars, and save
schema are unchanged. Bomb JS cache: v2.15; all seven update-notifier queries are v1.0.23.

Previous v1.0.22 (2026-09-28). Player movement still takes 0.18 seconds
per cell but now interpolates linearly, spends leftover frame time on the next cell, buffers
a briefly tapped turn until the current cell ends, and falls back to another held direction
when a requested turn is blocked. Pressing Space mid-step places a bomb at the next cell
center, so removing the between-cell pause does not make bomb placement unreliable.
Enemy speeds, map collision, keyboard focus protection and progress storage are unchanged.
An in-progress player step from an older eased save keeps its on-screen position on Continue.
Bomb JS cache: v2.14; all seven update-notifier queries are v1.0.22.

Previous v1.0.21 (2026-09-27). The Super Mushroom's on-map avatar
is 20% smaller than v1.0.20, including its image-loading fallback. The source artwork,
other characters, collision and movement are unchanged. Bomb JS cache: v2.13;
all seven update-notifier queries are v1.0.21.

Previous v1.0.20 (2026-09-27). Bomb maze now offers a top-right
character selector for the original Bomber, current Fly-Star, and Super Mushroom cropped
from the Classic Items II theme artwork. Changing characters affects the on-map avatar
immediately, pauses play while the selector is open, and preserves the choice in the
existing bomb progress snapshot across Continue, levels, and restart. Older saves default
to Fly-Star. Bomb CSS/JS caches: v1.2/v2.12; all seven update-notifier queries are v1.0.20.
World 3 / following-camera remains pending.

Previous v1.0.19 (2026-09-27). Scenario 04, Fruit Tasting,
uses a red apple, yellow lemon, green pear, orange, banana, and strawberry to teach
fruit names, colors, sweet/sour tastes and crisp texture. It has 36 word-aligned
British-IPA lines, 18 response questions, 25 vocabulary candidates, and seven
checked in-use imagegen PNGs. Completion
and explicit learned-word marking stay isolated in the scenario progress key;
the deduplicated total-word catalog now has 239 candidates. Scenario CSS/JS caches:
v2.6; scenario data cache: v1.6; all seven update-notifier queries are v1.0.19.
World 3 / following-camera remains pending.

Previous v1.0.18 (2026-09-26). Bombs again use their original two-second fuse.
A Bullet Bill revealed from its brick stays visible but inactive for one second, then begins
chasing at its unchanged constant speed. During that wait it cannot cause contact damage;
the remaining wait survives save/Continue, while missiles already moving in older saves do
not pause again. Bomb script cache: v2.11; all seven update-notifier queries are v1.0.18.
World 3 / following-camera remains pending.

Previous v1.0.17 (2026-09-26). Newly placed black bombs and missile-converted
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

Latest addition: Scenario 04, `fruit-tasting` (水果尝一尝 / Fruit Tasting),
uses an imagegen six-fruit table scene and six matching fruit focus pictures.
Mia asks what fruit it is, what color it is, and how it tastes; Leo answers for
a red sweet-and-crisp apple, yellow sour lemon, green sweet pear, orange, banana,
and strawberry. The 36 lines have word-aligned British IPA and 18 illustrated
response questions. Twenty-five word
candidates are shown in the active-scenario New Words tab; none enter overall
review until explicitly marked learned. Focused Edge check:
`node tests/scenario-fruit-browser.mjs` at desktop and 390px.

Scenario 03, `counting-pens` (数一数 / Let's Count!), follows
`What number is it?` → `It is eight.` → `How many pens do you have?` → `I have eight pens.`
It now has six counting groups: eight pens, three pencils, two keys, four mushrooms, five coins and six stars.
Each group follows the same four-line pattern, for 24 word-aligned British-IPA lines, 12 illustrated response questions and 22 vocabulary candidates.
The original pens image is retained; five new 1254×1254 cards reuse approved theme artwork with exact copy counts, built by `scripts/build-counting-cards.py` from `assets/scenarios/counting-objects-v1.json`.
Playback, per-scenario refresh restoration and explicit learned-word marking use the existing scenario module.
The deduplicated combined catalog now contains 239 candidate words; only explicitly learned words enter overall review.
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
- The four delivered scenarios contain 80 dialogue lines and 38 practice questions in total. The module has line-by-line learning, Previous/Next navigation, manual-only speech, and wrong-answer retry.
- Scenario 03 is Let's Count!: 24 lines and 12 illustrated questions across six object groups.
- Scenario 04 is Fruit Tasting: 36 lines and 18 illustrated questions about six fruits, their colors, and sweet, sour or crisp descriptions. The active `assets/scenarios/fruit-table-v2.png` and six fruit-focus PNGs were visually inspected; the original and expansion prompt sets are saved in `assets/scenarios/fruit-tasting-v1.prompt.md` and `assets/scenarios/fruit-expansion-v2.prompt.md`.
- Completing every question in one scenario adds a green check only to that scenario card. Schema 3 stores each scenario's line, three-stage tab, and question independently under `scenarioProgress`, while preserving the top-level compatibility aliases and migrating the previous single-scenario state. Progress writes only `mario-scenario-learning-v1` and is not included in the theme learned-word library.
- Scenario artwork and new lessons are now authored in conversation using the imagegen skill, not through a browser generator. See `SCENARIO_WORKSHOP.md` for the current workflow.
- New-word matching uses the same shared total word library as overall review. Explicit word learning is stored as `learnedWords` under the existing scenario progress key; dialogue completion alone never marks vocabulary learned.
- First Meeting keeps `assets/scenarios/first-meeting-v1.png` (1254×1254 RGB PNG) as its cover. The study view uses separate imagegen characters, locally cut out with user-approved rembg: `mia-sprite-v1.png` (560×1080 RGBA) and `leo-sprite-v1.png` (521×1080 RGBA).
- What Is It? uses `assets/scenarios/what-is-it-classroom-v1.png` (1254×1254 RGB PNG) as both its card artwork and classroom stage. It shows exactly one blue pen, three yellow pencils, one red marker, and three green erasers; Mia and Leo remain separate side overlays so the central stationery stays visible.
- Each What Is It? line also drives a separate transparent stationery asset on a white circular focus card over the blackboard. When a stationery line starts speaking, its card performs three 1-second scale-breathing cycles and then returns to its normal size. The blue pen, three yellow pencils, red marker, three green erasers, and three red erasers are independently emphasized without covering the actors.
- English and British IPA are rendered from the same per-word token data, so every displayed word has its own transcription directly underneath it in dialogue and practice choices.
- New Words is the third tab beside Dialogue and Practice. It follows the active scenario instead of opening a combined library: Scenarios 01–04 expose 16, 19, 22, and 25 candidates respectively. Learning writes only `learnedWords` inside the scenario storage key.
- Dialogue playback is user-started. “从头重播” reads only the first line and waits for manual Next; “从头连播” restarts at line one and advances on speech-end events. Mia enters first and Leo on line two. A saturated orange-gold contour halo with a tighter blur marks the speaking actor, breathing for three 1-second cycles, then staying steady until speech ends (steady with reduced motion); the right pane shows only the current sentence with British IPA beneath. Pause/navigation/mode switching invalidate stale callbacks; playback completion does not mark words learned. Mobile stacks stage and conversation. `src/scenario-playback.js` controls both modes.
- The browser generation form and API backend were removed at the user's request. The page makes no generation API calls and needs no API Key; the active-scenario New Words tab and all browser learning progress are retained. Any private `.local-scenarios/` data remains untouched and ignored.

### Overall review

- Entry: `review-learning.html`.
- Overall review independently saves its question order, position, options and remembered/forgotten marks in `mario-total-review-v1`. Refresh and re-entry resume, including completed rounds; only “再来一轮” resets round position. ✓/× explicitly save a word's memory state and advance; new rounds prioritize ×, then unmarked, then ✓. All learned words remain included. Picture answers still work but do not infer a manual memory mark.
- Space toggles the current review word's IPA breakdown, using the same click behavior. Entering a round focuses its IPA button; repeated keydown does not retrigger, and sound/answer/navigation controls keep native keyboard behavior. New questions begin collapsed.
- This is an independent top-level module, not a child page inside Theme Learning.
- The total word library aggregates words actually learned in Book1, Theme Learning, and Scenario Learning. It reads all three existing progress keys without writing across module boundaries and deduplicates by normalized English spelling.
- The combined published catalog currently contains 239 unique candidate words. The library and each review round include only the subset actually learned in the current browser profile.
- Theme artwork remains preferred for duplicates, Book1 uses its original word pictures, and scenario words use focused object art when available or a Chinese-meaning choice card when no literal image exists. Reviews keep four unique choices, wrong-answer retry, restart, refresh persistence, desktop and 390px layouts.

### Bomb maze

- Entry: `bomb-game.html`.
- Each level has five distinct Hanzi targets: prioritize learning evidence, then fill from non-mastered words without repeating the same character. Odd/even sublevels alternate pinyin-to-Hanzi and Hanzi-to-pinyin questions.
- All five questions start hidden inside separate bricks. Destroying a target brick reveals its question card; eliminating the last enemy opens remaining bricks except intact hidden Bullet Bill bricks, and reveals all pending questions. The player must bomb the retained missile brick; hidden/live missiles block completion even after five correct answers.
- Playable levels run from 3-1 through 6-5. Every level starts with hidden Bullet Bills in non-question bricks; the count rises by sublevel and by world (2–6 in world 3, up to 5–9 in world 6). No visible missile spawns at entry and there is no random spawn chance. After its brick breaks, the visible missile waits one second before moving or causing contact damage. It then moves at a constant 0.28125s/cell; sight of the player turns it red and starts pursuit, while one second out of sight returns it to black patrol. Bomb contact consumes the missile and recolors the existing bomb red without increasing range; a mushroom attack destroys it and drops a range-10 black bomb. Pending missile bombs and blasts prevent early cleanup/completion. World-3 saves retain their board; retired world-1/2 saves start safely at 3-1 with earned run stats retained.
- Bomb saves remain version 1, with targetRevealPolicy=1 distinguishing the restored hidden-question rule. New saves preserve hidden/revealed/active/completed state; old automatically visible unanswered prompts are re-hidden where intact bricks remain, without discarding active answers or completed progress. Only actual reveals increment appearance counts.
- Save/resume, restart, next-level flow, keyboard controls, mobile layout, and isolated bomb progress are implemented.

## Navigation and storage

Top-level navigation order is:

1. Pinyin
2. Hanzi
3. Book1
4. Theme Learning
5. Scenario Learning
6. Overall Review
7. Phonetics

Persistent browser keys:

- `mario-hanzi-refactor-v1`
- `mario-pinyin-v1`
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

Verified on 2026-09-27 for v1.0.19:

- `pnpm run check`, all 136 Node tests, and `git diff --check` passed.
- Focused real Microsoft Edge Fruit Tasting acceptance passed at 1440px and 390px:
  36 aligned-IPA lines, 18 response questions, seven active fruit images returning HTTP 200,
  explicit learned-word entry, refresh restoration, no horizontal overflow, and screenshots
  inspected for apple, orange, strawberry and the completed practice state.
- Existing First Meeting / What Is It? and Counting Pens Edge regressions passed at desktop
  and 390px; existing tracked screenshots were protected by writing those outputs to ignored `tmp/`.
- No unrelated full browser suite was run.

Verified on 2026-09-26 for v1.0.18:

- Syntax checks, 133 Node tests, and whitespace checks passed.
- Focused real Microsoft Edge bomb, missile, and session acceptance passed at desktop
  and 390px. A brick-revealed missile waits before moving; red/black bombs again use
  the original two-second fuse. Continue freezes active countdowns until clicked.
- No unrelated module browser suite was run.

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
