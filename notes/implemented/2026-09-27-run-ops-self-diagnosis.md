# run 操作面自诊断（谓词化状态判定 + 盯场件转正）——已交付

> 状态：implemented

2026-09-27 用户定调立项并当日交付：**提高代理的自我调试诊断能力——端到端的机器测试能力是
基本要求，别拽着人**。立案证据 = 同日真人档收尾（第 12 场代理模拟 run）操作实录的三次真故障，
全部由代理自诊断闭环、零拽人。

## 决定

1. **`scripts/lib/run-state.mjs`——盘侧状态谓词模块**（操作面状态判定的唯一实现家）：
   - `readSessionEvents`：zstd 多帧日志读取器（.jsonl 直读分支供夹具/测试，测试路径零子进程）；
   - `hitlPendingOf`：谓词语义**直接 import pack `hitl-fold.ts` 正本**（末位回合事件 = 未答
     ask_user_question；session/* 元数据跳过）——不写第二份（role-list-sync 同款教训）；
   - `toolCallCount`：形状化工具调用计数（只认 `tool/call` 事件的 `data.name`——request/header
     里的 schema 字符串天然不计入，即 grep 假阳性的反义）；
   - `turnOpenOf` / `bundleStateOf` / `runStateOf`：回合开合、bundle 位置=状态（工作区根
     drt_* = 在飞）、组合快照；
   - **两粒度完成判定**：`finalWritten`（final.md 在场）≠ `runSettled`（回合已终 + final 在场）
     ——第 12 场实录：final 落盘后回合仍在跑、present 未声明、HITL2 未发，旧 watcher 误报
     "已交付"；present 缺席由 `presentCalls` 单独显性暴露，不并入 settled（偏差不静默放行）；
2. **`scripts/watch-run.mjs`——盯场件转正**（dev/smoke-workspace 原型 → scripts/）：谓词化轮询，
   `STATE: HITL-PENDING` / `STATE: RUN-SETTLED`（present 缺席时附 ⚠）退出自报，超时 exit 1；
3. **hitl-answer 加固**：开浏览器前的盘侧前置谓词（research-workspace 组新者先扫最新 15 个
   会话，无真挂起即 exit 3 自拒——grep 误报的形态在无浏览器处拦截）；`--session` 空串/纯空白
   = 未指定（空串曾使 `text.includes('')` 恒真点开无关会话）；运行形态改为
   `node --import tsx/esm`（import pack .ts 谓词源）；
4. **三态夹具** `tests/fixtures/run-state/{no-card,pending,answered}.jsonl`：第 12 场真实会话
   日志的三个时点投影（bulky 载荷换占位、system-reminder 挥发性身份洗掉、request/header
   **grep 陷阱本体逐字保留**）；
5. pin-agreement 录制夹具豁免扩 `tests/fixtures/run-state/`（snapshot- 先例同由：录制会话数据
   里的版本字样是实录不是钉声明——本次 pre-commit 咬住 lead 的 grep 研究参数即红证）。

## 输掉的方案

- **grep 字符串判定**：形状盲 + 假阳性实录，弃；
- **拽人调试**：违背研发宪章（自主优先，REVIEW 最后手段），用户指令明示，弃；
- **谓词内联进各操作脚本**：第二份实现必然漂移，集中 scripts/lib 一个家；
- **present 缺席并入 settled 拦截**：lead 偏差不该让盯场件假死——显性报告（presentCalls=0
  + ⚠）比阻塞更有用。

## 实际跑过的验证（2026-09-27）

- `tests/run/run-state.test.mjs` 9/9 绿（三态谓词 + grep 陷阱对偶断言：三个夹具文本均含
  'ask_user_question'（schema）而 no-card 判 pending=false/askCalls=0——陷阱在场、谓词不误报，
  红绿内嵌；finalWritten=true+turnOpen=true → runSettled=false 的第 12 场实录形态断言）；
- **live 实证**：谓词模块对在飞 run 12 判出正确细粒度状态（hitlPending=false / askCalls=1 /
  finalWritten=true / turnOpen=true / runSettled=false——旧 watcher 此时已误报 DELIVERED）；
  hitl-answer 前置谓词在无真挂起态 exit 3 自拒（零浏览器、诊断信息三件齐）——正是当日
  grep 假阳性事故的反面证明；
- L0：`pnpm verify` 全绿 · `pnpm test` 75/75（+9）；命令正本同步（60/61 hitl-answer tsx 形态
  + watch-run 新行）；
- 立案实录的三故障全部被本交付覆盖：grep 假阳性 → 谓词 + 前置自拒；--session 空串 → 缺省
  语义；watcher 路径错 → 转正件带用法自检（exit 2 fail-loud）。

## 环境状态

- watch-run 与 hitl-answer 均需 `node --import tsx/esm`（import pack .ts 谓词源）；
- 谓词测试走 .jsonl 直读分支（layering：测试路径零子进程）；zstd 分支由操作侧实战覆盖；
- 夹具源自 run 12 会话日志投影（重录新一代 = 重新投影三时点 + 谓词断言不变）。
