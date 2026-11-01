// Green variants are checked-in PNG files; gameplay only swaps image sources.
export async function loadPoisonSprites(loadImage) {
  return Object.fromEntries(await Promise.all([
    ["head", "./assets/snake/flystar-head-poison-green-v1.png?v=1.0"],
    ["segment", "./assets/snake/hanzi-star-poison-green-v1.png?v=1.0"],
  ].map(async ([name, path]) => {
    const image = await loadImage(path);
    image.dataset.snakePoisonSprite = name;
    return [name, image];
  })));
}
