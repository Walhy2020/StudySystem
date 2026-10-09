# 课堂指令配图 v1

日期：2026-10-09。用户明确授权使用 imagegen CLI/API；内置 image_gen 当前不可用。

使用技能提供的 `image_gen.py generate-batch`，模型 `gpt-image-2`，`quality=medium`，`size=1024x1024`，PNG，concurrency=2，no-augment。本机环境已有 API Key，未写入仓库；未上传参考图片，也未修改技能脚本。

API 实际返回四张 1254×1254 PNG。保留原始工作结果于忽略目录 `output/imagegen/classroom-commands-v1/`。`scripts/build-classroom-command-assets.py` 将来源图合成到白底、导出 RGB PNG 至 `assets/scenarios/`；举手原图包含 alpha，网页正式素材同样统一为白底。没有裁剪人物或改变动作。

正式背景用于情景卡片与学习舞台；三个完整动作图用于对应指令的重点卡片与练习图。stand、sit、raise 在总词库中采用对应动作图；hands 使用“手（复数）”释义卡，避免与 raise 产生相同图片选项。请、谢谢、不客气等功能词也使用中文释义卡，不把整句直接标记为学会。

## classroom-commands-v1.png

```text
Use case: illustration-story
Asset type: square classroom background and cover for a children's English lesson teaching stand up, sit down and raise your hands.
Scene/backdrop: a cheerful bright primary-school classroom with a large blank green chalkboard in the upper center, two simple child-sized wooden chairs and small desks near the lower corners, a clean empty central floor area. No people; separate website character overlays will be used.
Style/medium: polished colorful children's picture-book illustration, softly shaded rounded shapes, warm welcoming daylight, readable simple forms.
Composition/framing: square, eye-level, generous empty central area and full chairs visible. Minimal tidy classroom.
Constraints: no writing, no letters, no numbers, no captions, no logos, no watermark, no characters or faces, no stationery still life.
```

## command-stand-up-v1.png

```text
Use case: scientific-educational
Asset type: single action picture for the English instruction Please stand up.
Subject: one friendly elementary-school boy with short brown hair, blue short-sleeved T-shirt, navy shorts and simple sneakers, STANDING UPRIGHT next to one small wooden classroom chair. Both feet on the ground, straight legs, arms relaxed down beside the body. Clear full body from hair to shoes; entire chair visible.
Style/medium: polished colorful children's picture-book illustration, softly shaded rounded shapes, matching a friendly primary-school learning website.
Composition/framing: square plain white background, centered large figure and chair, generous white margin on all sides, light grounding shadow. Only one child and one chair.
Constraints: this is standing, not sitting, not jumping, not waving and not raising hands. Exactly two arms, two hands, two legs. No desk, no other person, no extra props, no writing, no letters, no arrows, no captions, no logos, no watermark.
```

## command-sit-down-v1.png

```text
Use case: scientific-educational
Asset type: single action picture for the English instruction Please sit down.
Subject: one friendly elementary-school boy with short brown hair, blue short-sleeved T-shirt, navy shorts and simple sneakers, SITTING naturally on one small wooden classroom chair. Hips resting on the seat, knees bent, both feet resting on the floor, hands resting gently on thighs. Three-quarter side view makes the seated posture unmistakable. Entire child and entire chair visible.
Style/medium: polished colorful children's picture-book illustration, softly shaded rounded shapes, matching a friendly primary-school learning website.
Composition/framing: square plain white background, centered large child and chair, generous white margin on all sides, light grounding shadow. Only one child and one chair.
Constraints: clearly seated, not standing or hovering, not raising hands. Exactly two arms, two hands, two legs. No desk, no other person, no extra props, no writing, no letters, no arrows, no captions, no logos, no watermark.
```

## command-raise-hands-v1.png

```text
Use case: scientific-educational
Asset type: single action picture for the English instruction Please raise your hands.
Subject: one friendly elementary-school boy with short brown hair, blue short-sleeved T-shirt, navy shorts and simple sneakers, standing still with BOTH ARMS RAISED clearly above his head. Both open hands fully visible, open palms, distinct natural five fingers on each hand, both feet on the floor. Happy attentive expression.
Style/medium: polished colorful children's picture-book illustration, softly shaded rounded shapes, matching a friendly primary-school learning website.
Composition/framing: square plain white background, frontal full-body view from raised fingertips to shoes with generous white margin above and on all sides, light grounding shadow. Only one child.
Constraints: two raised hands, not just one hand, not a jumping pose. Exactly two arms, two hands, two legs. No chair, no desk, no other person, no extra props, no writing, no letters, no arrows, no captions, no logos, no watermark.
```
