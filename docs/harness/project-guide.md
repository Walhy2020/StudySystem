# 项目地图与业务说明

## 当前结构

项目是由 `server.py` 提供的免构建本地网站，前端使用原生 JavaScript、HTML 和 CSS。
以当前 package.json、源代码和本目录指纹为准，旧交接记录用于解释演变，不用旧数字覆盖新代码。

学习页导航顺序：拼音 → 汉字 → 单词 → Book1 → 主题 → 情景 → 总复习 → 音标。
炸弹迷宫、贪吃蛇是独立游戏入口，共十个页面使用版本更新脚本。

| 模块 ID | 页面与核心实现 | 业务边界 | 对应验证 |
| --- | --- | --- | --- |
| pinyin | pinyin.html；src/pinyin-engine.js、src/pinyin-storage.js | 63 项；继承音标学习策略；每次复习全部未 mastered 项 | tests/pinyin.test.mjs；tests/pinyin-browser-acceptance.mjs |
| hanzi | index.html；src/engine.js、src/storage.js | 1600 字；每日新学最多 3 项，每项认识 3 次；普通复习固定当日批次，最多 20 项 | tests/engine.test.mjs；tests/browser-acceptance.mjs |
| words | word-learning.html；word-learning.js、src/word-learning-model.js | 自动汇总三个来源的全部词汇定义；直接复用汉字引擎；独立进度 | tests/word-learning.test.mjs；tests/word-learning-browser.mjs |
| book1 | book-learning.html；data/book1.js、src/book1-storage.js | A–Z 26 组，每字母 4 词；104 词，含字母卡共 130 项；仅迁移旧 opw1 | tests/book1.test.mjs；tests/book1-browser-acceptance.mjs |
| theme | theme-learning.html；theme-learning.js、src/theme-overview.js | 主题内容、学习与练习；显式学习证据参与已学词聚合 | tests/theme-learning.test.mjs；tests/theme-browser-acceptance.mjs |
| scenario | scenario-learning.html；scenario-learning.js、data/scenarios.js | 每个情景单独续学；对话完成和单词学会是不同记录 | tests/scenario-learning.test.mjs；tests/learning-reveal-browser.mjs |
| review | review-learning.html；review-learning.js、src/total-word-library.js、src/review-progress.js | 仅复习三个源模块实际学过的词；保存本轮及记忆标记 | tests/total-word-library.test.mjs；tests/review-progress.test.mjs；tests/review-progress-browser.mjs |
| phonetics | phonetics.html；src/phonetics-engine.js、src/phonetics-storage.js | 48 IPA；每次复习全部未 mastered 项；新学每项认识一次后手动完成 | tests/phonetics-engine.test.mjs；tests/phonetics-browser-acceptance.mjs |
| bomb | bomb-game.html；bomb-game.js、src/bomb-gamepad.js | 独立游戏进度；每关五个不同目标字；保留控件原生键盘行为 | tests/bomb-game.test.mjs；tests/bomb-browser-acceptance.mjs |
| snake | snake-game.html；snake-game.js、src/snake-learning.js、src/snake-ecosystem.js、src/snake-actions.js、src/snake-config.js、src/snake-tuning.js、src/snake-bindings.js | 小飞星汉字长龙；100字池、每批五字自动接续、双向题与同音排除；六边形选项、全屏仅目标；找错掉尾、吸取、同向加速及定时中毒/星星解毒，参数与快捷键可配置；演示不写正式进度 | tests/snake-learning.test.mjs；tests/snake-actions.test.mjs；tests/snake-browser.mjs；tests/snake-tuning-browser.mjs |
| platform | server.py；src/fullscreen-shell.js、src/gamepad-cursor.js、src/version-update.js | 本地服务、常驻页面宿主、手柄与版本提示 | tests/fullscreen-shell.test.mjs；tests/version-update.test.mjs |

## 两种词库必须分清

`buildTotalWordCatalog()` 合并 Book1、主题、情景的**定义**，规范化英文拼写去重。
单词模块使用这份全量目录，ID 为 `word:<规范化拼写>`。新增源内容后刷新即可加入，
不以源模块是否学过为条件。

`buildTotalWordLibrary()` 结合浏览器中三个源模块的**学习记录**，筛出实际学过的词，
供总复习和情景新词匹配使用。单词模块进度当前不是它的第四个来源。
Book1 的 learnedIds/masteredIds 或有答题记录的单词、主题 learned/learnedThemes/reviewedThemes、
情景 learnedWords 分别构成学习证据；以 `totalLearnedWordSources()` 当前实现为准。
词表总数会随着内容变化，不把历史发布记录里的候选数当成某个孩子的已学数量。

## 状态与界面语义

- 汉字/单词的 ordinary review 上限是 20；拼音/音标全非 mastered 复习分别为 0–63、0–48。
- 单词页当前中文在左侧图片下始终可见；英文与 IPA 经 Show/Space/Y 揭示；换词/刷新重新隐藏英文与 IPA。
- 情景练习先隐藏英文和 IPA，第一次点击显示 IPA，第二次显示英文与 IPA。
  同句朗读保留揭示状态；换句、重播、切换阶段、刷新重置；对话播放由用户发起。
- 总复习刷新续接同一轮；只有再来一轮重排；下一轮优先 forgotten，再 unmarked，再 remembered。
  记忆标记只属于总复习，不等于删除源模块已学词。
- 主题里的课堂 desk 为保留存档继续使用内部 ID table；改显示文案时不能据此随意更换稳定 ID。

## 存储所有权

| 所有者 | 唯一业务写入 key | 允许的跨模块读取 |
| --- | --- | --- |
| hanzi | mario-hanzi-refactor-v1 | 旧 mario-literacy-desktop-mvp-v1 仅作迁移输入 |
| pinyin | mario-pinyin-v1 | 不迁移或重置汉字、音标记录 |
| words | mario-word-learning-v1 | 读取源内容定义，不导入源学习状态 |
| book1 | mario-book1-v1 | 旧 mario-literacy-english-v1 中 opw1 的限定迁移 |
| theme | mario-theme-learned-v1 | 总词库按只读方式聚合源记录 |
| scenario | mario-scenario-learning-v1 | 只读统一已学词库，learnedWords 仍写本 key |
| review | mario-total-review-v1 | 只读 Book1、主题、情景三个来源 |
| phonetics | mario-phonetics-v1 | 独立状态 |
| bomb | mario-bomb-game-progress-v1 | 读取汉字学习池所需证据 |
| snake | mario-snake-game-progress-v1 | 只读汉字证据，主key无证据时只读旧汉字；不读取或写入炸弹进度 |

浏览器配置文件和站点 origin 共同影响 localStorage。Git 同步代码，不同步这些进度。
现有 server.py 只提供静态文件和手柄相关 API，没有学习进度上报、用户账号或布置作业 API。
静态文件可访问不意味着已经具备业务 API。查询真实进度必须有明确数据来源、学习者、
设备/origin、采集时间；当前不能从仓库推断。

## 需求定位与交付

先区分查询、故障修复、内容新增、功能开发、长期规则变更和学习管理。
“复习”“单词库”“没显示”“这个按钮”都可能指向多个模块，应补问具体页面和预期。
明确违反旧规则的需求需说明现有规则及影响；若用户已经明确授权规则变更，记录授权并修订约定，
不用重复索取同一授权。代码与文档冲突时保留两边证据，先解决冲突。

代码交付运行 `pnpm run check`、`pnpm test`、`git diff --check`；界面变更只跑相关真实 Edge
脚本，检查桌面/390px、资源 HTTP200、几何边界、键盘/触摸。模拟语音/手柄不能声称物理硬件认证。
每次交付递增显示/包版本，十页更新脚本与版本进口缓存联动。保护已有工作；按仓库长期授权提交推送。
图片在对话中用 imagegen 工作流制作，中间稿 output/，批准资源 assets/；私有旧草稿保留并忽略。

## 首批候选技能（尚未注册）

项目规则查询、按模块修复界面、新增情景内容、内容/资源一致性检查、运行验证并汇总交付。
实施前还需要工具入口、参数结构、权限、失败处理、可恢复任务和独立验证，不能仅凭本说明执行。
