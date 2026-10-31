// Tint once, then decode an immutable PNG image. Using the filtered canvas
// itself as a repeatedly scaled drawImage source is much slower in Edge.
export async function createPoisonSprites(originals) {
  return Object.fromEntries(await Promise.all(Object.entries(originals).map(async ([name, source]) => {
    const sprite = document.createElement("canvas");
    sprite.width = source.naturalWidth || source.width;
    sprite.height = source.naturalHeight || source.height;
    const context = sprite.getContext("2d");
    context.filter = "hue-rotate(65deg) saturate(1.35)";
    context.drawImage(source, 0, 0);
    const image = new Image();
    image.dataset.snakePoisonSprite = name;
    image.src = sprite.toDataURL("image/png");
    await image.decode();
    return [name, image];
  })));
}
