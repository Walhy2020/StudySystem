# Snake integration provenance

Imported from https://github.com/Walhy2020/Snake at commit
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

src/snake-trail.js preserves the upstream trail implementation; snake-game.js,
snake-game.css and snake-game.html adapt the original game, layout and controls.
src/snake-learning.js independently mirrors the current bomb-game.js learning
policy without changing bomb rules or storage. Only the three runtime images
and metadata are imported; source layers, generated drafts and nested Git
metadata are excluded.
