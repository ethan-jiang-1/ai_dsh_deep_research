---
status: 待落地
opened: 2026-11-23
---

# 实施计划：填补 L0 客户端测试盲区与高密度自动化寻虫底座

> 立卡：2026-11-23 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-23-l0-client-and-property-testing.md`；业务验收：用户
> 研究依据：[预防试点后缺陷复盘调研](../research/post-pilot-bug-prevention-and-discovery/README.md) · [实证基线](../research/post-pilot-bug-prevention-and-discovery/2026-11-23-empirical-baseline-and-issue-plan.md) · [非 E2E 寻虫手段](../research/post-pilot-bug-prevention-and-discovery/2026-11-23-non-e2e-bug-discovery-methods.md)

**问题与期望结果：** 11-20～23 爆发的 44 张真缺陷中有 32 张集中在观察面客户端。根本原因是 `tests/cockpit/client/` 只做 `renderToStaticMarkup` 静态渲染，对 `useStatusFeed`/`useGraphFeed`/`useConfigFeed` 与 4 个 Tab 的异步流、竞态、定时器和故障状态在 L0 几乎零覆盖，迫使每次都靠缓慢的 Playwright 端到端“挤牙膏式”抓虫。期望在 L0 建起毫秒级客户端行为测试底座、**通用恶意 `RunSource` 故障注入矩阵**，以及针对纯折算与解析器的 `fast-check` PBT + `mdast` 差分测试。

**当前情况：** `pnpm test:coverage` 实测基线：
- `ResearchStatusTab.tsx` 分支覆盖仅 **8.00%**，[useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 行 **56.28%**（扫描主体 86–228 行零覆盖）；
- `ResearchGraphTab.tsx` 分支覆盖仅 **10.34%**，[useGraphFeed.ts](../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts) 函数 **33.33%**；
- [useConfigFeed.ts](../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts) 行 **58.04%**；
- `ResearchFinalTab.tsx`、`ResearchConfigTab.tsx` 在 [tests/INDEX.generated.md](../../tests/INDEX.generated.md) 中测试覆盖为空（`—`）；
- `vendor/dsh/` 已验证 `@testing-library/react` + `jsdom` + `fast-check` + `mdast-util-from-markdown`，但本仓根 `package.json` 尚未引入。

**未决问题：** 若恶意 `RunSource` 故障矩阵与 PBT 在执行过程中立刻挖出一批现存代码的新 bug，是随本卡并行建 `bugs/` 卡还是按批消化（停损边界预设：发现新 bug 先建独立缺陷记录或按小范围收口，不无限扩大本卡范围）。

**下一步：** 建议在 [Issue 1](2026-11-23-static-semantic-guardrails.md) 修完已知实时隐患后（或同步安装测试 devDependencies 后）按 §实施顺序 启动落地。

## 已知与未决

- **现有 `test:spec` 加载约束**：根脚本使用 `node --import tsx/esm --test`，部分组件若直接 import CSS 模块会触发 Node loader 报错（见 `research-config-source.spec.mjs` 头注）；`jsdom` + `@testing-library/react` 测试需验证 CSS/primitives 导入兼容方案（如按需 mock 或独立 loader hook）。
- **前置关系**：Issue 1 与本卡可独立验收，但本卡是后续 [Issue 3（Hook 状态机重构）](2026-11-23-state-machine-and-contract-architecture.md) 的安全前置护栏。

## 方案与取舍

| 候选 | 取舍 | 理由 |
|---|---|---|
| 引入 `jsdom` + `@testing-library/react` + `node:test` `mock.timers` 跑 Hook/Tab 真实挂载测试 | **选** | 与 `vendor/dsh` 同技术栈，可在毫秒级验证 `useEffect`、切会话竞态、30s 轮询与 `retry` 点击 |
| 自研**通用恶意 `RunSource` 故障注入矩阵** | **选** | 所有 Tab/Hook 共用 `RunSource` 注入面，一套故障工厂（missing/EACCES/truncated/0B/空白/仅标题/坏JSON/延迟乱序）自动扫遍全部读取点 |
| 引入 `fast-check` 对 `src/lib/` 建 PBT（无矛盾、`unknown` 单调性、sentinel 蜕变、round-trip） | **选** | 纯函数已有 95%+ 行覆盖但缺组合边界验证；`vendor/dsh` 已实战使用 `fast-check` |
| 引入 `mdast-util-from-markdown` 对手写 Markdown 正则做差分测试 | **选** | 专门针对 `markdown-mask`、`artifact-content`、`review-readiness`、`plan-index` 的解析盲区 |
| 立即把 StrykerJS 变异测试接入默认 `pnpm test` | **不选** | 变异测试全量运行耗时数分钟，违反 `test ≈ 15s` 纪律；可作为后续按需体检手段 |

## 判据形状

- **权威事实**：通用产品公理不变量（读失败/空态不得亮 `✓` 或渲染空白正文、不得输出互斥交付/不交付文案、切会话绝不串台）；CommonMark AST（`mdast`）作为 Markdown 结构切分的差分参考。
- **读取方**：`tests/cockpit/client/` 新增 Hook/Tab 行为测试、`tests/cockpit/lib/` PBT 与差分测试、`pnpm test:spec`、`pnpm test:coverage`。
- **坏输入**：恶意 `RunSource` 的 11 类标准故障态；乱序慢响应与定时器推进；`fast-check` 随机生成的畸形 Markdown、BOM/CRLF、`_failed.md` 混合、冲突状态组合。
- **旧形态**：`ResearchFinalTab`/`ResearchConfigTab` 在 L0 零运行时覆盖、`renderToStaticMarkup` 代替行为测试的缺口补齐；保留既有静态 SSR locale 对比测试。
- **反证**：每个新测试族至少带 1 条注入回归红证（例如临时恢复“切会话不清理旧异步结果”“`deriveSteps` 抹掉 `unknown`”“`brief-fold` 交付×FAIL 互斥文案”），确认在 L0 当场红。

## 验收标准

| 行为 | 类 | 输入/状态 | 通过/失败信号与独立期望 | 负控/恢复 | 证据 owner | 人工判断 |
|---|---|---|---|---|---|---|
| 1. Hook + Tab L0 行为测试底座 | 编排 + 确定性 | `ResearchStatusTab`、`ResearchFinalTab`、`ResearchGraphTab`、`ResearchConfigTab` 及 `use*Feed`（`jsdom` + 假 `RunSource` + `mock.timers`） | 覆盖切会话竞态、30s 重扫/停摆计时、点击 `retry` 重读、异步回执更新锚点；4 个 Tab 在 L0 脱离“0 测试/个位数分支覆盖” | 注入“旧会话延迟回写覆盖新会话”或“去掉 `retry` 绑定” → L0 单测红 | `tests/cockpit/client/` 新 spec、`pnpm test:coverage` | 无 |
| 2. 通用恶意 `RunSource` 故障注入矩阵 | 编排 + 确定性 | `artifacts × {missing, unreadable, truncated, empty, headings-only, invalid-json, conflict}` | 全部读取点逐一跑完矩阵且满足通用产品公理（无假绿、无空白正文、无未捕获异常） | 任一读取点恢复为 `view.hasFile()` 或吞错回退 `null` → 矩阵用例精准点名红 | `tests/cockpit/client/` 共享故障工厂与矩阵测试 | 若矩阵暴露新产品语义边界歧义，由用户拍板取值 |
| 3. `fast-check` PBT + `mdast` 差分测试 | 确定性 | `brief-fold`、`run-fold`、`final-target`、`artifact-content`、`plan-index`、`review-readiness`、`research-defaults` | 随机 ≥100 组/性质全过；验证无矛盾不变量、`deriveSteps` `unknown` 单调性、BOM/CRLF/`_failed.md` 蜕变不变性、Markdown 掩码/正文切分与 `mdast` 一致 | 注入“线性推断覆盖 `unknown`”或“剥夺代码围栏掩码” → PBT/差分自动 shrink 出最小反例并报红 | `tests/cockpit/lib/` 新 PBT/差分 spec、`pnpm test:spec` | 无 |
| 4. 成本与回归纪律 | 编排 | 全量 `pnpm test` | `pnpm verify` + `pnpm test` 全绿零 skip；`test:spec` 总耗时增长保持在日常可接受范围（目标总 `verify+test` ≤25s） | 若某 PBT 迭代数过多拖慢热路径，固定合理 `numRuns`（如 100）并把高迭代留给按需脚本 | `package.json`、`tests/INDEX.generated.md`、`docs/evaluation.md` | 用户接受测试运行耗时与发现的新缺陷分流处置 |

## 实施顺序与停损边界

1. **P0 底座探路**：评估根 `package.json` 引入 `jsdom`、`@testing-library/react`、`fast-check`、`mdast-util-from-markdown`（或复用 workspace 解析）及 CSS import 处理方式，验证最小测试可跑通。
2. **P1 客户端盲区补齐**：建立受控 `RunSource` 故障工厂，优先覆盖 `useStatusFeed`/`ResearchStatusTab` 与零覆盖的 `ResearchFinalTab`/`ResearchConfigTab`、`useGraphFeed`。
3. **P2 PBT 与差分寻虫**：为纯折算与 Markdown 解析补 `fast-check` 性质与 `mdast` 差分测试，并记录覆盖率变化（对比 `test:coverage` 基线）。
4. **P3 收口与分流**：若实测挖出新潜伏 bug，简单确定性缺陷可随修复证据同批修掉或登记 `bugs/` 卡，不把“无限修新 bug”混入底座验收。

## 关闭条件

全部 4 条验收标准实测通过并记录 `test:coverage` 前后对比，[notes/implemented](../../notes/implemented/README.md) 落地对应 Note，用户完成验收后本卡同变更归档至 `_archived/settled_issues/`。
