// Tint each original once. Applying a Canvas filter to every body segment on
// every frame forces expensive offscreen filtering, especially on long snakes.
export function createPoisonSprites(originals) {
  return Object.fromEntries(Object.entries(originals).map(([name, source]) => {
    const sprite = document.createElement("canvas");
    sprite.width = source.naturalWidth || source.width;
    sprite.height = source.naturalHeight || source.height;
    sprite.dataset.snakePoisonSprite = name;
    const context = sprite.getContext("2d");
    context.filter = "hue-rotate(65deg) saturate(1.35)";
    context.drawImage(source, 0, 0);
    return [name, sprite];
  }));
}
