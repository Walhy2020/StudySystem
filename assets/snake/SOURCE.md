# Snake integration provenance

Current runtime upgraded from https://github.com/Walhy2020/Snake **v0.2.9** at
`c9b0d607f25530365c9f1b25acac6373e03813cb` (verified 2026-10-25).
The owner's update request includes the current artwork and gameplay.

Unmodified modules under `src/snake-upstream-v029/`: trail, motion, world,
rewards, enclosure, virus-snakes, config, steering, audio, star-burst, random and tuning.
Relevant upstream unit tests use the versioned module paths. StudySystem's
snake-game.js adapts that runtime to its existing learning model, compact layout,
shared controls/audio mute, explicit Continue gate and independent persistence.
`src/snake-ecosystem.js` persists the world and enemies in the existing Snake key.
The active tuning controls use `src/snake-tuning.js`, adapted from upstream tuning,
with `src/snake-config.js` wrapping the unchanged upstream numeric fields. Local
`src/snake-actions.js` adds vacuum, aligned speed and poison/cure. Shortcut capture
uses `src/snake-bindings.js` and also covers held reading slowdown with a
configurable speed cap. Local
`src/snake-world.js` wraps upstream VirusField to replenish small/medium world
spawns after10 playing seconds, persisting countdowns in existing cell records.
Upstream world code and one-time enemy drops remain unchanged. The local pause
menu adds Continue/Restart, retaining settings and learning history.
Their callbacks write only the existing Snake
snapshot. Learning choices use local Canvas hexagons, body stars retain upstream
artwork and poison only changes the head/body color, without particle effects.
Local poison movement defaults to50% of normal speed, configurable in properties,
and returns to full speed after cure. Local choice placement keeps more space
around the head, regenerating only positions from older snapshots.
Poison tint is pre-rendered
once by `src/snake-render-assets.js` and cached for head/body draws instead of
filtering the main canvas on every segment/frame. Upstream browser controls,
update service and separate config/audio storage APIs are not used.

Current artwork copied without modification: flystar-head-v1.png, sprites.json,
hanzi-star-v2.png, arena-floor-v2.jpg, virus-purple-v1.png, virus-small-v4.png,
virus-medium-v4.png, virus-super-v2.png and twelve
virus-{small,medium,large,super}-{coral,mint,sky}-v1.png palette variants.
Upstream attributes the new body to an existing gold star layer, the tiled floor
to generated bitmap artwork, and the viruses to existing AI artwork plus local
crop/resize/recolor processing. No generation API, credentials, source-layer
folders, working drafts or nested repository are imported. The older segment and
meadow below remain as historical files; the current page uses the v0.2.9 assets.

Original v0.1.0 integration imported from https://github.com/Walhy2020/Snake at commit
`94d36a64a8fdfbaecbe1301b737347765bb6b029` (2026-10-24), at the repository
owner's explicit request to integrate that game into StudySystem.

The inspected upstream tree contains no LICENSE file or package license field.
No new open-source license is claimed for this imported work. Preserve this
source attribution and check rights separately before redistribution outside
the owner's projects.

Unmodified runtime artwork: flystar-head-v1.png (532×326 RGBA),
hanzi-segment-v1.png (512×512 RGBA), meadow-v1.jpg (1536×1024 RGB), and
sprites.json. Upstream README attributes the head to existing Flying Star
raster layers (without feet), the meadow to a previously generated scene,
and the blank segment to offline imagegen/gpt-image-2 generation. The game
draws Chinese text at runtime. No generation API or key is needed or imported.

src/snake-trail.js preserves the earlier upstream trail implementation for history;
the active trail implementation is now in src/snake-upstream-v029/trail.js.
snake-game.css and snake-game.html adapt the layout and controls.
src/snake-learning.js independently mirrors the current bomb-game.js learning
policy without changing bomb rules or storage. Only the three runtime images
and metadata are imported; source layers, generated drafts and nested Git
metadata are excluded.
