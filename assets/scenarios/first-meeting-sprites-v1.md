# First Meeting character layers

Built-in image_gen generated separate full-body Mia and Leo images using the approved first-meeting cover as character reference: retain Mia's flower hair clip, coral heart shirt, jeans, pink shoes and backpack; retain Leo's blue hoodie, tan shorts, blue shoes and backpack. Friendly waving poses facing each other, complete hands and shoes, no text.

The generated backgrounds were not true transparency (Mia had a painted checkerboard; Leo had a dark background). On 2026-09-11 the user explicitly authorized local background removal. rembg 2.0.84 / u2netp was used locally with post-process mask, bounding-box crop plus padding, and proportional resize. No image was uploaded to a cutout service. Tool environment and downloaded model live only in ignored tmp/ and are not runtime dependencies.

- mia-sprite-v1.png: 560×1080 RGBA; 307932 fully transparent pixels, 283498 fully opaque pixels.
- leo-sprite-v1.png: 521×1080 RGBA; 280744 fully transparent pixels, 268597 fully opaque pixels.

Checked on a blue composite and on the live page: hair, face, arms, hands, backpack, legs and shoes are complete. Final PNGs are used directly by scenario-learning.html. Original cover is preserved.
