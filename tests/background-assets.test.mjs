import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function pngDimensions(bytes) {
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("汉字和音标模块使用各自独立的横向背景图", async () => {
  const [hanziHtml, phoneticsHtml, hanziImage, phoneticsImage] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../phonetics.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/backgrounds/hanzi-kingdom-v2.png", import.meta.url)),
    readFile(new URL("../assets/backgrounds/phonetics-sound-kingdom-v2.png", import.meta.url)),
  ]);

  assert.match(hanziHtml, /assets\/backgrounds\/hanzi-kingdom-v2\.png\?v=1\.0/);
  assert.match(phoneticsHtml, /assets\/backgrounds\/phonetics-sound-kingdom-v2\.png\?v=1\.0/);
  assert.doesNotMatch(hanziHtml, /adventure-map\.svg/);
  assert.doesNotMatch(phoneticsHtml, /adventure-map\.svg/);
  assert.deepEqual(pngDimensions(hanziImage), { width: 2172, height: 724 });
  assert.deepEqual(pngDimensions(phoneticsImage), { width: 2172, height: 724 });
  assert.notDeepEqual(hanziImage, phoneticsImage);
});
