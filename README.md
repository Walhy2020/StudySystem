# 马里奥学习系统

跨电脑继续开发时，请先阅读：

- `AGENTS.md`：长期开发规则、模块边界和验收要求
- `PROJECT_HANDOFF.md`：当前交付状态、公司电脑初始化及接手步骤
- `CODEX_COLLABORATION.md`：主会话、各模块子会话及跨电脑协作方式

当前重构阶段包含：

- 汉字学习与复习模块
- 独立的炸弹迷宫学习游戏（2 个世界，每世界 5 关）

双击 启动马里奥学习系统.bat，或运行：

    python server.py --bind 127.0.0.1 --port 5177

访问 http://127.0.0.1:5177/，可从主页面进入炸弹迷宫。

检查与测试：

    npm run check
    npm test
    npm run test:browser