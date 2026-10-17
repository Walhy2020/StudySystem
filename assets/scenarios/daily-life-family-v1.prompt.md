# Daily-life scenes and family characters

Date: 2026-10-17. Released with v1.0.70.

Generated using the imagegen skill's user-authorized fallback CLI and OpenAI
Image API. CLI requested `gpt-image-1.5`; the edit service's initial error named
`gpt-image-2-codex` and rejected optional `input_fidelity`. Retried without that
optional parameter, retaining identity/style references and transparent output.
Do not claim an independently verified backend model identity.

The user's final style instruction overrides the earlier 2D direction: match
existing `mia-sprite-v1.png` / First Meeting's rounded, dimensional cartoon art.
Earlier flat-anime drafts are not used or released.

## Final asset set

- `getting-up-v2.png`, `going-to-bed-v2.png`, `having-a-meal-v2.png`,
  `drinking-water-v2.png`, `putting-toys-away-v2.png`: 1254 × 1254 RGB PNG.
- `home-mom-sprite-v3.png`: 1011 × 1536 RGBA.
- `home-dad-sprite-v2.png`: 993 × 1536 RGBA.
- `home-grandma-sprite-v2.png`: 1024 × 1519 RGBA.
- `home-brother-sprite-v1.png`: 1016 × 1533 RGBA.
- `home-sister-sprite-v1.png`: 999 × 1533 RGBA.
- `family-characters-preview-v1.png`: contact sheet, not a page background.

All character alpha channels contain real transparent pixels (minimum0,
maximum254 in supplied outputs). Full bodies visually checked; transparent
outer padding cropped locally without repainting characters. The five scene
backgrounds contain no baked-in people; the player separately reveals Mom and
Brother at their first speaking lines. Dad/Grandma/Sister are future-scene assets,
not extra participants in the approved five dialogues.

Original family photos remain outside Git. Photos are identity references only:
Mom from her single portrait; Dad/Sister from their shared portrait; Grandma
from the older woman in the birthday photo; Brother from his own portrait.
Other photo subjects/backgrounds are excluded from each generated character.

## Final prompt set

Shared character prompt: Use case identity-preserve; full-body sprite for the
existing children's English scenario app. Image1 is the specific family member's
identity reference; Image2 is existing Mia sprite, STYLE ONLY, not identity or
age. Match polished rounded 3D animated-family-film cartoon art, soft dimensional
shading, warm colors, expressive stylized eyes, carefully rendered hair/fabric,
charming friendly finish; not photorealistic, a photo filter or flat anime.
One person only, whole body/head/hands/both shoes visible, centered with ample
margin, correct anatomy, actual transparent alpha. No scenery, ground shadow,
other people, lettering, logos, speech bubbles, watermark or glow.

- Mom: preserve long straight dark brown side-parted hair, softly oval face,
  natural brows, dark eyes, gentle expression. Adult mother in plain light gray
  T-shirt, navy trousers and slippers, facing slightly right, small open-hand
  conversational gesture. Exclude stroller/child/vehicles/trees/signs.
- Dad: reference ONLY the adult with glasses. Preserve short upright dark hair,
  round black-rim glasses, broad gently rounded face, dark eyes, calm smile.
  Charcoal T-shirt, gray V-neck sweater vest, dark trousers and slippers.
- Grandma: reference ONLY the older woman at back center. Preserve short straight
  dark hair with a few grays, wispy side-parted fringe, dark eyes, gentle smile,
  mature face and subtle age lines; don't rejuvenate. Dark brown top with light
  olive collar, dark trousers/slippers. Exclude children/cake/candles.
- Brother: preserve short upright black hair, dark eyes, gently prominent ears,
  slim young face, bright toothy smile. Taupe T-shirt with simple playful face
  motif, dark blue trousers and slippers. School-age boy older than toddler sister.
- Sister: reference ONLY the child in lower-left foreground. Preserve short black
  hair with short neat bangs, round cheeks, dark eyes and small young-child face.
  Pale green/gray striped top, mint trousers/slippers. No pacifier/necklace because
  she is a speaking character. Exclude father's glasses/features.

Shared background prompt: Use case illustration-story; square backdrop for
existing 3D cartoon children's English learning scenes. Polished rounded 3D
animated-family-film storybook art, soft dimensional shading, warm friendly
colors, detailed but uncluttered materials; not flat anime or a photograph.
Main objects in upper two thirds; unobstructed floor in bottom third for separate
animated characters. No people, faces, text, letters, bubbles, watermark or logos.

- Getting Up: cozy child's bedroom, golden morning sunlight, small pink-duvet
  bed, blue-sky/rising-sun window, wardrobe with visible shirt and shorts.
- Going to Bed: cozy bedroom at night, pink-duvet bed/pillow, warm bedside lamp,
  dark-blue window with crescent moon/stars, lavender/amber palette.
- Having a Meal: bright home dining room, wooden table with large clear bowl of
  cooked white rice and spoon, chairs and sunny kitchen window.
- Drinking Water: cozy kitchen nook, table with large clear glass of plain water
  and water pitcher, sunny window, pale blue cabinets, blue/cream palette.
- Putting Toys Away: cheerful playroom, large open toy box, clearly recognizable
  red toy car beside it, colorful blocks and a low toy shelf.

Settings: backgrounds `generate-batch`, medium quality, requested1024×1024;
photo/style characters `edit`, high quality, requested1024×1536, transparent PNG.
Returned image dimensions were measured rather than assumed from request size.
