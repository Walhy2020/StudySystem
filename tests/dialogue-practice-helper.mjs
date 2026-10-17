import assert from "node:assert/strict";

// Shared presentation regression: practice uses the learning scene, not a quiz.
export async function checkConcealedDialogue(page) {
  assert.equal(await page.locator("#dialoguePanel").isVisible(), true);
  assert.equal(await page.locator("#practicePanel").isHidden(), true);
  assert.equal(await page.locator("#dialogueAligned strong:visible").count(), 0);
  assert.equal(await page.locator("#dialogueAligned small:visible").count(), 0);
  assert.equal(await page.locator("#dialogueChinese").isVisible(), true);
  assert.equal(await page.locator("#revealDialogue").isVisible(), true);
  assert.equal(await page.locator("#dialogueAligned").getAttribute("aria-label"), "当前句已隐藏");
}

export async function checkPhoneticOnly(page) {
  assert.equal(await page.locator("#dialogueAligned strong:visible").count(), 0);
  assert.ok(await page.locator("#dialogueAligned small:visible").count() > 0);
  assert.equal(await page.locator("#dialogueAligned").getAttribute("aria-label"), "当前句音标");
  assert.equal(await page.locator("#revealDialogue").textContent(), "显示句子");
}

export async function completeDialoguePractice(page, scene, act = selector => page.locator(selector).click(), { resumeAt = -1, enter } = {}) {
  for (const [index, line] of scene.lines.entries()) {
    await page.waitForFunction(expected => document.getElementById("dialogueProgress").textContent === expected,
      `${index + 1}/${scene.lines.length}`);
    // Wait until an entering character/bubble finishes its original animation.
    await page.waitForFunction(() => !document.getElementById("currentBubble").classList.contains("is-arriving"));
    await checkConcealedDialogue(page);
    if (index === resumeAt) {
      await act("#revealDialogue");
      await page.reload(); await enter();
      assert.equal(await page.locator("#dialogueProgress").textContent(), `${index + 1}/${scene.lines.length}`);
      await checkConcealedDialogue(page);
    }
    await act("#revealDialogue");
    await checkPhoneticOnly(page);
    if (index === scene.lines.length - 1) assert.equal(await page.locator("#completeDialoguePractice").isDisabled(), true);
    await act("#revealDialogue");
    assert.deepEqual(await page.locator("#dialogueAligned strong:visible").allTextContents(), line.tokens.map(token => token.text));
    if (index < scene.lines.length - 1) await act("#nextLine");
  }
  await act("#completeDialoguePractice");
  assert.equal(await page.locator("#practiceResult").isVisible(), true);
  assert.equal(await page.locator("#practiceResultScore").textContent(), `共 ${scene.lines.length} 句对话`);
}
