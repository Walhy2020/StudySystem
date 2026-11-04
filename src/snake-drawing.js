// Rendering only: keep every body segment for movement, collision and saved length.
export function createStarBatch(ctx, { camera, width, height, zoom }) {
  const halfWidth = width / zoom / 2, halfHeight = height / zoom / 2;
  const buckets = new Map();
  const cell = 4 / zoom;
  // Bounds are relative to the camera, so the same work applies anywhere on the map.
  const columns = Math.ceil(width / 4) + 100;
  return (sprite, x, y, size, layer) => {
    const radius = size / 2;
    if (Math.abs(x - camera.x) > halfWidth + radius || Math.abs(y - camera.y) > halfHeight + radius) return false;
    if (layer) {
      let seen = buckets.get(layer);
      if (!seen) buckets.set(layer, seen = new Set());
      const col = Math.floor((x - camera.x + halfWidth) / cell) + 50;
      const row = Math.floor((y - camera.y + halfHeight) / cell) + 50;
      const key = row * columns + col;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    ctx.drawImage(sprite, x - radius, y - radius, size, size);
    return true;
  };
}
