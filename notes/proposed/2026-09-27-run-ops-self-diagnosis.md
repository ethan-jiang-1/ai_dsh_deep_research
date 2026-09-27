# RFC：run 操作面自诊断（谓词化状态判定 + 盯场件转正）

> 状态：proposed

归宿：roadmap §队列（卫生，**可自主**）。来源：2026-09-27 真人档收尾（第 12 场代理模拟 run）的
操作实录 + 用户定调——**提高代理的自我调试诊断能力，端到端的机器测试能力是基本要求，别拽着人**。

## 问题

run 通道的操作面（状态判定、代答定位、等待轮询）目前是 ad-hoc bash + grep + 肉眼读日志。
第 12 场实录两类真故障：

1. **grep 假阳性**：轮询"HITL 卡是否挂起"用 `grep -c ask_user_question`——命中的是
   request/header 里的**工具 schema**（每个会话必有，请求头必带工具目录），prompt 送出 10s 即
   误报"卡已挂起"，代答脚本在错误前提下去找一张当时还不存在的卡。状态判定用字符串包含 =
   形状盲；且正确谓词**就在仓里**（pack `hitl-fold.ts`：从事件尾部向前跳过 session/* 元数据，
   首个回合事件是未答的 ask_user_question tool/call 即挂起——`tool/result` 不带 callId，
   位置逻辑是唯一正确形状），操作侧却没有用它；
2. **代答定位空串陷阱**：`hitl-answer --session ""` 的空串使 `text.includes('')` 恒真 →
   点开侧栏第一个可见行（无关会话）——flag 解析把"空串"当"已指定"，缺省语义被吞。

根因：**状态谓词没有单一实现家**——判定逻辑散在 hitl-fold（client 面）、run-dashboard（投影面）、
操作侧临时脚本（grep）三处，各写各的必然漂移；操作工具（kickoff / hitl-answer / watcher）
没有共享的状态判定入口，代理只好每次现场发明诊断手法。

## 方案

1. **盘侧状态谓词模块**（`scripts/lib/run-state.mjs`）：zstd 多帧日志读取器 + 状态折算
   （`hitlPending` / `turnOpen` / `bundleDelivered`）——谓词语义直接 import pack 源
   （`hitl-fold.ts` 正本，role-list-sync 同款"事实源唯一"教训），操作侧不写第二份；
2. **操作工具接线**：hitl-answer 增加前置谓词检查（目标会话无真挂起时 fail-loud 自拒，
   不再开浏览器空转）+ `--session` 空串 = 缺省语义（防御）；watcher 原型
   （`dev/smoke-workspace/watch-run.mjs`，第 12 场实录）转正进 `scripts/` 作为标准盯场件；
3. **三态夹具回归**：真实日志形态（卡未发 / 挂起 / 已答——可直接取自第 12 场会话的三个时点
   投影）进 `tests/fixtures/`，keyless 断言谓词三态。

## 输掉的方案

- **grep 字符串判定**：形状盲 + 假阳性实录（见问题 1），弃；
- **拽人调试**：违背研发宪章（自主优先，REVIEW 是最后手段）——操作面故障必须由代理自诊断
  闭环，用户指令明示，弃；
- **谓词内联进各操作脚本**：第二份实现必然漂移，集中一个家（scripts/lib）。

## 验收

- 谓词三态夹具断言绿（未发 / 挂起 / 已答——真实日志形态，非构造样本）；
- hitl-answer 前置谓词：无真挂起时自拒（不再开浏览器空转找卡）；
- `--session ""` 行为 = 缺省（负例：不再点开无关行）；
- 红证：向夹具注入"schema 含 ask_user_question 字样但无真实调用"的形态 → grep 式判定假绿
  被揭露、谓词判绿。
