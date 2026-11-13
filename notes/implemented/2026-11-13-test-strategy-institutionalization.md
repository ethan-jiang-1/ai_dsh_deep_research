# 测试策略制度化：交付记录

> 状态：implemented
> 关联：程序卡 = [2026-11-13 测试策略制度化](../../_backlog/issues/2026-11-13-test-strategy-institutionalization.md)；
> 制度决定 = [D54](../../docs/decisions.md#d54) + [三环四账五关 Note](2026-11-13-test-strategy-operating-model.md)；
> 命名决定 = [D53](../../docs/decisions.md#d53) + [命名 Note](2026-11-13-test-naming-lanes.md)；
> 操作手册 = [guides/67](../../docs/guides/67-test-strategy.md)；
> 失败类账本 = [普查](../../_backlog/_archived/research/dsh-test-strategy/2026-11-13-failure-class-census.md)

## 决定

测试制度按 D54 的三环四账五关运行；测试资产按 D53 四车道命名；证据选择先归失败类、再选最低
可见层，类级守卫或显式不可机械化登记。本卡交付的是制度、命名、证据与机械把守，不是一轮补测试。

## 交付了什么

**制度面**：三环（回归/装配/发现）、四账（资产/失败类/证据/探索）、五关（准入/变更类/必需/
退役/复盘）升为 D54；`guides/67` 是唯一操作手册；`exploratory-verification` 技能把 E1–E6 变成
可加载的程序化工作记忆；79 张探索 BUG 的五节复盘冻结在 `notes/archived/`。

**命名面**：D53 四车道——`tests/{run,cockpit,pack,contracts}/**/*.spec.mjs`、`tests/checks/*.test.mjs`、
`scripts/smoke/*.e2e.mjs`、`*.entry.mjs`、`*.support.mjs`；`pnpm test` = spec + checks；
`test:e2e`/`test:entry` 由 registry lane 选跑；错后缀/错 lane/旧名由 `test-lanes` + `smoke-registry`
+ `smoke-oracle` + `decisions-now` 机械判红。

**证据面**：快照 A/B 从 fresh profile 进 CI；四研究角色 + Method Editor 五角色 roleFace；四角色
baseline 重录；content/startup/defaults 安装态 apply 效果；可选团队层缺席仍可装起；world-tree
设计稿登记触发条件；client 侧 role picker 迁入 `client-load` 后退役 `e2e-021rc2`。

**类级守卫**：方法库 heading 40 格同源矩阵、run-lock 状态矩阵、方法库路径形态矩阵、role 消费者
矩阵、CI `skipped=failure` 聚合、with-key 手动通道；C7 代表形态（BUG-153/157/158/159）保留直测。

## 为什么

五轮探索修了 79 张 BUG（全量 159），同类以邻接变体复发；模型可见变更的 keyless 判据曾是
dev-only；客户端 36/59 文件无直测；慢资产无账本；交付无证据账本；159 张 BUG 无流程复盘。本卡
把「发现→修→忘」换成「发现→归类→类级守卫→账本→复盘」。

## 输掉的方案

- 只做命名/只补测试资产：命名解决可发现性，不解决证据必要性与类级守卫；不采纳。
- 继续逐 BUG 补实例测试：79 张卡的复发链证明不收敛；不采纳。
- 照搬 DSH 七层/vitest/coverage：本仓规模与 node:test 栈不匹配；只借语义与机械契约；不采纳。
- 为退役而退役：`e2e-021rc2` 只有 picker 断言可迁、其余有替代才删；没有替代的资产保留。

## 实际跑过的验证

- `pnpm test:spec`：1341 / 0；`pnpm test:checks`：102 / 0；`pnpm test:vendor`：4 / 0。
- `pnpm verify`：全绿；`pnpm typecheck`：通过。
- 5 角色 snapshot A/B：全 PASS；lead C 层 C0–C5：全 PASS（UI 金标准已重写）；`lifecycle.entry`：25/25；
  `client-load.entry --seed`：ALL PASS（含角色 picker 连续断言）。
- 红证：命名错后缀/旧名、roleFace 漏 method-editor、CI 聚合删 need、model-smoke 加 PR 触发等
  均先红后绿（记录在程序卡/各 Note）。

## 未跑 / 未证明

- C 层 UI 已复验：C0 改用 `data-row-key` + `dismissPreviewNotice` 后 C0–C5 全 PASS；`ui.expected.md`
  由真实 UI 捕获重写（卡片 2 / 活动行 3，含 💬）。C 仍不在 CI（需 Chromium）。
- `test:e2e` 全量已跑：PASS 6 / FAIL 0 / SKIP 0；`test:entry` 全量未跑（需 dev home/浏览器/安装前置）——
  client-load / lifecycle / snapshot 已分别实跑绿。
- `model-smoke.yml` 未真实运行（需 `DEEPSEEK_API_KEY`）；静态契约在，缺 key 会 exit 2。
- 0.2.1-rc.2 → rc.5 真实升级未重跑（`e2e-021rc2` 已退役；复活条件在 trigger）。
- 159 普查是 60 全文 + 99 关键节，不是逐行全文；分类计数按普查页口径。
- 用户验收尚未进行；本 Note 是交付记录，不是验收结论。

## 环境状态

本机 macOS / Node 22.23.1 / pnpm 11.7.0；`decisions.md` 32,725 bytes（硬顶 32,768）；CI 聚合与
with-key 工作流是静态契约，真实 GitHub 绿灯需外部运行。
