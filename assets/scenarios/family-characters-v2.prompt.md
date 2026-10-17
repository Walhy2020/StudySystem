# Family characters: stronger cartoon style, matching Mia and Leo

2026-10-17 · v1.0.71 · imagegen skill, user-authorized fallback CLI / Image API.
Requested model: `gpt-image-1.5`; actual backend model not independently verified.
Input fidelity omitted due the service incompatibility documented in v1 record.
Quality high; transparent PNG requested at1024×1536. No original family photos
were uploaded again: this revision uses the previously generated family sprites.

User requirements: make the characters more cartoon-like; keep exactly the
existing scenario Mia/Leo art style so they don't look out of place; a loose
resemblance to family members is sufficient.

## Final files (measured after local alpha cleanup)

| Role | PNG | Dimensions | Alpha range |
|---|---|---|---|
| Mom | home-mom-sprite-v4.png | 838×1541 | 0–255 |
| Dad | home-dad-sprite-v3.png | 782×1533 | 0–254 |
| Grandma | home-grandma-sprite-v3.png | 743×1527 | 0–254 |
| Brother | home-brother-sprite-v2.png | 845×1522 | 0–254 |
| Sister | home-sister-sprite-v2.png | 884×1510 | 0–254 |

All files are RGBA with real transparent pixels. `family-characters-preview-v2.png`
shows the five new characters. The previous images are retained non-destructively.
Only Mom and Brother are current page actors; the other three are future assets.

## Prompt set

Shared exact direction: Use case style-transfer; revised full-body family sprite
for the existing scenario-learning app. Image1 is the current family sprite,
EDIT TARGET and loose family-resemblance reference only. Image2(Mia) and
Image3(Leo) are the authoritative ART STYLE references. Match those characters,
not the target's realism. Redesign to belong in Mia and Leo's SAME cartoon world:
noticeably larger round head, big expressive simplified eyes, small simple nose,
rounded cheeks and short simplified limbs. Charming clearly CARTOON character,
not a realistic person with a slightly enlarged head. No need for exact portrait
likeness. No photographic facial geometry, pores, fine wrinkles or individual
realistic hair strands. Match their soft dimensional 3D cartoon rendering, color
saturation, eye design, hair clumps, fabric simplicity and gentle lighting. Do not
switch to flat anime, vector illustration or a different style. Exactly one person,
entire body including hair/hands/both shoes, centered with generous margin, correct
anatomy, true transparent alpha. No scenery, floor shadow, other people, text,
logos, glow or watermark.

Role-specific directions:

- Mom: adult adapted from Mia/Leo, about3–3.5 heads tall. Preserve long straight
  dark side-parted hair, gentle smile and loose resemblance. Gray short-sleeved
  T-shirt, navy trousers, slippers, conversational gesture. Clearly adult mother,
  not a little girl; both hands visible.
- Dad: adult adapted from Leo, about3–3.5 heads tall. Preserve short upright dark
  hair, round black glasses, friendly smile. Remove skin texture and fine stubble.
  Gray V-neck sweater vest over charcoal T-shirt, dark trousers/slippers, greeting.
- Grandma: clearly elderly cartoon grandmother, about3–3.5 heads tall. Not a
  realistic old face on a cartoon body. Short dark side-parted hair with a few gray
  clumps, warm smile, mature face indicated by just a few cartoon expression lines;
  no pores/detailed wrinkles. Brown top/olive collar, dark trousers/slippers, wave.
- Brother: especially match Leo's face/body proportions, about2.5–3 heads tall.
  Keep short upright black hair, cheerful toothy smile and school-age identity,
  older than toddler sister. Taupe shirt/playful face motif, blue trousers/shoes,
  friendly wave. Both hands visible, no lifelike anatomy.
- Sister: younger toddler in same cartoon world, about2.5 heads tall. Keep short
  straight black hair/neat bangs, round cheeks and happy smile. Pale green/gray
  striped shirt, mint trousers, cute slippers, open hands, no pacifier.

## Local finishing

`scripts/build-daily-life-assets.py --family-only` retains colors and original
alpha within3px of the opaque silhouette(alpha≥224), removes low-alpha exterior
haze, and crops transparent padding with16px margin where image bounds permit.
No character painting, warping, SVG substitutes or background replacement.
Visual QA compares the five outputs directly beside unchanged Mia/Leo sprites.
