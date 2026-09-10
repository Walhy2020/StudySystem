# 情景生成与新单词

## 使用

1. 打开「情景模式 → 创建情景」。
2. 输入同一情景的 2–12 句对话，每句一行。可以包含说话人名字，支持中文或英文；英文尽量保留原文，中文整理成简单英语。
3. 点击「生成配图与单词」。对话将发送至 OpenAI，产生 API 费用。请勿输入隐私、账号或密钥。
4. 等待整理英文、整句英式音标、中文和逐词释义，再生成一张 1536×1024 双幅情景插图。两个画面描述同一情景的前后时刻，不是每个单词各生成一图。
5. 检查生成预览（AI 的翻译、音标、图片仍需人工判断），点击「保存情景并收录新单词」。保存之前不会自动加入词库。
6. 「新单词」中可以手动朗读、查看来源句、点击「学会了」，或显示已学单词并重新学习。没有自动发音。

未学过的判定：按英文词形、小写去重；对比当前浏览器的主题学习、Book1 和情景新单词记录。常见缩写如 I'm 拆成 i/am；角色专名排除，功能词保留。暂不把复数、过去式自动合并成词根，避免误判已经学习。

## 本机配置

本地服务需要 Python 3（仅标准库，不新增 Python 包）。在本机环境变量配置有效的 `OPENAI_API_KEY`，然后从新终端启动：

```powershell
python server.py --bind 127.0.0.1 --port 5177
```

使用 `http://127.0.0.1:5177/scenario-learning.html`，不能直接双击 HTML。已运行的旧服务需要由使用者重启以加载新增接口；不要终止其他任务继承的服务。

默认文本模型 `gpt-4.1-mini`，可通过服务端 `SCENARIO_TEXT_MODEL` 环境变量设为兼容 Responses 结构化输出的模型。图片模型沿用已授权的 `gpt-image-1.5`，medium 质量。页面从不接收或显示 API Key，密钥不写入文件、Git、浏览器存储或错误日志。页面显示「就绪」仅表示环境变量存在，不代表账户认证成功。

## 持久化及安全

- 单词学习进度：`mario-scenario-learning-v1.learnedWords`，同一个浏览器/来源有效；保留旧情景完成和当前位置。
- 只读来源：`mario-theme-learned-v1`、`mario-book1-v1`。不修改它们，不把情景单词写入主题总复习。
- 输入后生成的预览、图片及保存的情景：项目 `.local-scenarios/`，已忽略 Git。不同浏览器可看同一本机服务的已保存情景，但学习记录各自独立。
- Git 同步代码，不同步网页中新建的私人对话、图片或学习进度。若要发布某个情景到其他电脑，应另行审核并制作成项目正式资源。
- 生成任务编号写在 URL 的 `#generation=...`，刷新可继续查询；完整生成的预览重启服务后仍可恢复。进程被停止时尚未完成的请求不能保证恢复，重新生成可能再次计费。
- 同时只运行一个生成任务；重复编号不会重复调用模型；失败不自动重试。等待过久请先刷新查询原任务。
- API 限本机同源访问，写入需页面获取的随机 token；拒绝跨源、伪造 Host、超长请求和路径穿越。隐藏文件和目录列表不由静态服务公开。
- 不自动上传或提交任何自建情景、输入对话、API 密钥。

## 验证与已知阻塞（2026-09-10）

```powershell
pnpm run check
pnpm test
pnpm run test:scenario-api
# 新版本服务启动后：
node tests/scenario-browser-acceptance.mjs
node tests/scenario-workshop-browser.mjs
```

后端测试使用可注入的 API fixture；Edge 新增验收模拟 API 响应和已有图片传输，检查桌面/390px、完整显示图片、手动朗读、预览/保存/刷新、已学词排除、错误提示及存储隔离。模拟配图不代表真实 AI 生成质量验收。

本轮真实 OpenAI 调用返回 HTTP 401，当前进程中的 Key 无效或已失效；未获得真实生成配图。需在本机换成有效 Key 并重启服务，再完成真实配图/内容验收。不把 fixture 当成正式情景或生成成果。

官方接口依据：

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-1.5
