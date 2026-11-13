# 事故复盘：五轮探索 79 张 BUG 与缺失的类级守卫

> 状态：implemented
> 归档：2026-11-13

## 现象

2026-11-11 起，五轮探索（`252c2fd7` / `d966fa31` / `275b8c03` / `bb0323ac` / `4d6308c9`）以 **0 次
模型调用**为主，修出 BUG-081..159 共 **79 张**卡；全量失败史 **159 张**。共同形态不是产品崩溃，
而是**证据链静默放行**：

- readiness 行内仲裁：074 → 141 → 150；HITL2 词表/行语义：075 → 096 → 140 → 144 → 149 → 156；
- 方法库 heading/名称语法：081 → 085 → 093 → 123 → 124 → 127 → 128 → 138；
- 锁/端口：073 → 104 → 113 → 114 → 126 → 130；present/版本：101 → 103 → 116；
- 同一批卡里还有：`turnCompleted` 认历史任一 completed、空 `protocol/v1.json` 也 PASS、manifest
  不含新工件、claims evidence 指向不存在文件、0 题 HITL 也 PASS、点击计数当已答。

**当时回归是绿的。** `pnpm test` 全绿、`pnpm verify` 全绿；这些缺陷是**新输入上的静默放行**，
不是旧行为被改坏。

## 为什么没早发现

1. **测试由实现者按 happy path 写**：覆盖了模板写法，没覆盖邻接语法（全角/半角、空白、注释、后缀）。
2. **实例修，不是类修**：每张卡只补报出的那个字符串；下一变体再开一张卡。方法库 heading 一族
   修了 8 次就是证据。
3. **双份事实**：模板↔解析器、读↔写、pack↔gate���present↔final 各有一份实现；一份修了另一份没修。
4. **消费者清单不在代码里**：新工件/字段出现后，schema/manifest/readiness/cockpit/文档注册表
   各有一份手写清单，漏一个不报红。
5. **慢壳判据**：选哪个会话、算不算过，写在 100–200s 的浏览器/回放脚本里；判据错了只能等慢档。
6. **假绿代理**：有限词表、在场、点击计数、自报结果被当成内容证明；skip/refresh 也能显示绿。
7. **夹具迁就谓词**：夹具按实现限制构造，实现错了夹具仍绿；或基线陈旧，回放比对的是旧世界。

## 根因

不是「测试写得少」，是**测试制度缺三个面**：

- **缺类级守卫**：没有「一个 BUG → 一类输入空间 → 矩阵/同源/消费者/状态/路径」的毕业规则；
- **缺必需性**：模型可见变更的唯一 keyless 判据（snapshot B）是 dev-only；CI 里没有一条
  强制它跑；客户端纯逻辑 36/59 无直测；
- **缺账本与命名**：慢资产没有 cost/uniqueClaim/oracle/sunset；测试文件名只说了「测什么」，
  没说「是哪类证据、要什么前置」；探索结束不更新失败类账本，复盘不落新守卫。

## 修复与已落地防线

| 面 | 已落地 |
|---|---|
| 命名 | D53 四车道：`*.spec.mjs` / `*.e2e.mjs` / `*.entry.mjs` / `tests/checks/*.test.mjs`；`test-lanes`、`smoke-registry`、`smoke-oracle`、`decisions-now` 机械把守 |
| 类级守卫 | 方法库 heading 40 格同源矩阵；run-lock 坏 owner/外部存活/幂等释放矩阵；方法库路径空格/CJK/缺席目录矩阵；`class-level-guards` 六形态方法 |
| 模型可见证据 | `snapshot-replay.entry` A/B 从 fresh profile 进 CI；四角色按当前 pack 重录；runtime-context 只归一 profile 安装根 |
| 客户端面 | `client-pure-logic.spec` 6 件 + `client-surface` 契约（`src/client` 36/59 缺口显式登记）；effect 回调必须返回 disposer |
| 资产账 | `smoke/registry.json` 28 条 cost/uniqueClaim/oracle/sunset/lane；`smoke-oracle-surface` 契约 |
| 证据/探索 | `reviewing-a-delivery` 证据账本；`guides/67` 三环四账五关；`exploratory-verification` 技能 |
| 决策 | D53 命名；程序卡 W0-10 / W1-2 / W2-2/4/5 / W3-1/3/4 执行记录 |

## 未完成 / 未证明

- 159 张普查是 **60 张全文 + 99 张关键节**，不是逐行全文；分类计数是样本/全量混合口径，按普查页标注。
- C 层 UI 渲染在新 fixture 下未复验（temp home 侧栏同名探针会话干扰 C0）；`ui.expected.md` 由
  `cardTitleOf`/`foldActivityRows` 纯函数重算，CI 只跑 A/B。
- 客户端 hook 行为面仍登记为 smoke-only，DOM/CSS harness 未建（W3 L）。
- 消费者矩阵、状态交错的全族矩阵、变异证明 harness 仍只落了先行片；D54 三环四账五关尚未升号。
- `test:e2e` / `test:entry` 全量未跑（需 dev home/浏览器/安装前置）；命令与选择面已验。

## 教训

**发现 → 修 → 忘** 必须换成 **发现 → 归类 → 类级守卫 → 账本 → 复盘**。修一张卡只值一张卡；
把一类输入空间钉成矩阵、把一条证据放回 required 路径、把一次漏检写进失败类账本，才值下一轮不再交学费。

关联：[程序卡](../../_backlog/issues/2026-11-13-test-strategy-institutionalization.md) ·
[失败类普查](../../_backlog/research/dsh-test-strategy/2026-11-13-failure-class-census.md) ·
[测试策略指南](../../docs/guides/67-test-strategy.md) ·
[类级守卫方法](../../_backlog/methods/class-level-guards.md) ·
[命名 Note](../implemented/2026-11-13-test-naming-lanes.md)。
