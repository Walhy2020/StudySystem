# Family clothing colors

2026-10-17 · v1.0.72 · imagegen skill, user-authorized fallback CLI / Image API.
Requested model: `gpt-image-1.5`; actual backend not independently verified.
Four separate edit calls, quality high, background transparent, size1024×1536.
Only the previously approved generated sprites were uploaded, not family photos.
No input_fidelity parameter due the documented service incompatibility.

User request: give Mom, Dad, Brother and Sister clearly different clothing colors.
Keep the existing Mia/Leo-compatible cartoon art style and family resemblance.

## Saved assets

All paths below are relative to `assets/scenarios/`; RGBA PNG, alpha0–255.

| Role | File | Dimensions | Clothing |
|---|---|---|---|
| Mom | home-mom-sprite-v5.png | 913×1683 | coral red shirt, navy trousers |
| Dad | home-dad-sprite-v4.png | 885×1750 | royal blue vest, charcoal undershirt |
| Brother | home-brother-sprite-v3.png | 934×1683 | sunny yellow shirt, blue trousers |
| Sister | home-sister-sprite-v3.png | 957×1636 | mint green/cream stripes, mint trousers |

Grandma remains `home-grandma-sprite-v3.png` (brown), byte-for-byte unchanged.
Preview: `family-characters-preview-v3.png`. Previous versions are retained.
Mom and Brother are used by the five home dialogues. Dad and Sister are future
assets; this update does not add them to those dialogues.

## Final prompt set

Shared beginning:

```text
Use case: precise-object-edit
Asset type: transparent full-body cartoon character sprite for the existing scenario learning app.
```

Role-specific edit direction (one separate call each):

```text
Mom: Input image 1 is the EDIT TARGET, the approved Mom character. Change ONLY the color of her short-sleeve T-shirt from gray to vivid warm coral red (#EF655D). Keep her navy trousers and slippers unchanged.
Dad: Input image 1 is the EDIT TARGET, the approved Dad character. Change ONLY his gray V-neck sweater vest to saturated royal blue (#245FC7). Keep the charcoal short-sleeve T-shirt under it, dark trousers and slippers unchanged. The blue vest must be clearly colorful and not gray or nearly black.
Brother: Input image 1 is the EDIT TARGET, the approved Brother character. Change ONLY his taupe short-sleeve T-shirt to bright sunny golden yellow (#F6C62E). Keep the tiny playful face motif, blue trousers and shoes unchanged. The yellow must be clear and saturated, not beige or brown.
Sister: Input image 1 is the EDIT TARGET, the approved toddler Sister character. Change ONLY her clothing colors: make her striped short-sleeve shirt vivid mint green (#42C698) with pale cream stripes, and her trousers a matching slightly darker mint green. Keep the cute slippers unchanged. Green must be clearly distinct from red, blue and yellow, not gray or desaturated.
```

Shared invariants, substituting the role name; Dad also explicitly preserves
glasses and Sister explicitly preserves toddler age:

```text
Preserve the exact character identity, face, hair, eyes, smile, pose, hands, body proportions, clothing shape and folds, original soft dimensional cartoon rendering and lighting. Do not redesign or restyle the character. One full-body [role] only, including all hair, fingers and shoes; generous transparent margin. Real transparent alpha, no floor shadow, no haze, no glow, no text, no watermark, no scenery or extra objects.
```

Edit targets were Momv4, Dadv3, Brotherv2 and Sisterv2. Bundled
`image_gen.py edit --model gpt-image-1.5` used once per target, outputs under ignored
`output/imagegen/daily-life/`. `scripts/build-daily-life-assets.py --family-only`
publishes versioned assets, preserves colors and alpha within3px of opaque support
(alpha≥224), removes exterior haze, crops transparent padding with16px margin.
No background/Grandma rewrite, no new character design or photo uploads.
