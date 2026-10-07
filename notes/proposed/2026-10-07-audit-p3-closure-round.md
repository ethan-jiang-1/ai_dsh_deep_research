# 审计 P3 收尾轮（门禁小加固与清单对账打包）

> 状态：proposed

## 问题

全仓 DSH-native 审计（2026-10-07）的 P3 级发现中，有一批"值得做但不紧急"的机械加固与清单
对账项——单件都小，凑一轮卫生批次做掉，避免散落遗忘。P1/P2 已在当轮修复（审计批次一），
本条目只收 P3 的条目化残部。

## 方案（打包清单，逐件独立可做）

| # | 件 | 落点 | 检查方式 |
|---|---|---|---|
| 1 | client-keys 覆盖收口：`RESEARCH_TOOL_KEYS` 搬进 keys.ts（单一正本兑现）+ 门禁补 shorthand `key,` 形态与工具名族 | src/client/keys.ts + verify.mjs（writing-a-gate 流程带反证） | 契约测试 + client-load-smoke（改驾驶舱行） |
| 2 | README 技能/折算清单对账：加第 N 个技能时 README 静默漂移——清单 sync 门禁（同 role-list-sync 精神）或 README 改纯指路 | pack README + verify.mjs 或 tests/ | 门禁反证（删一个技能名 → 红） |
| 3 | persona↔fold 签名契约测试：hitl-fold 硬编码「按现稿定稿」「研究类型」askKindOf 签名，persona 改词则判型静默退化 unknown（BUG-002 回归形态）——契约测试读 persona 断言签名在场 | tests/ | 契约测试（改 persona 措辞 → 红） |
| 4 | doc-budgets 覆盖面 walk→git ls-files（runtime/ 进 walk 是范围纪律背离，release-smoke probeWs 铺 AGENTS.md 是潜伏 pre-commit 误红面） | verify.mjs | 门禁反证（runtime 下放未登记 AGENTS → 现红 / 改后绿） |
| 5 | 端口独占门禁：scripts/AGENTS 承诺端口互斥（3100/3101/3103/3083…）无机械检查——grep PORT 常量查重小门禁 | verify.mjs 或 smoke-contract | 门禁反证（注入撞号 → 红） |
| 6 | pre-commit 激活态检查：`git config core.hooksPath` = dev/hooks 的 fail-loud 提示（fresh clone 未 source env.sh = 无提交门禁——红 commit 溜进历史有 postmortem 前科） | verify.mjs | 门禁反证（unset hooksPath → 红） |
| 7 | 任务型路由表补行：改 scripts/lib 支撑模块 / dev 基建脚本（env.sh、render-overlay 本体）的证据路由 | guides/60 §2 | 人工判据（行语义） |
| 8 | evidence-audit 语料窗：审计语料按 run 会话窗过滤（现在全 home 会话——跨 run URL 可过审 + mcp-hosts 实测扫 920 文件） | evidence-audit.mjs | 契约测试 |
| 9 | 盘侧谓词选卡面收窄：hitl-answer 缺省扫最新 15 会话任意 pending——按 lead/preset 过滤防误答队友陈旧卡 | dev/hitl-answer.mjs + watch-run.mjs | 契约测试 |
| 10 | 换 vendor pin 技能化：两次升 pin的流程（vendor-build --clean + 逐条重审 + 兼容矩阵 + Note）已两轮实操有教训——按"缺什么再加"政策立 bumping-vendor-pin 技能 | .agents/skills/ | dev-skill-format |

## 输掉的方案

- **逐件立独立队列条目**：十件小事拆十条目 = 队列噪声；打包一轮，逐件独立验收。
- **本轮（批次一）顺手全做**：批次一已含约二十件；再塞十件会把"当场修"变大轮，违反窄切片。

## 验收（D23）

每件按上表"检查方式"列独立验收（门禁件带反证、契约件进 pnpm test、文档件人工判据）；
整条目 done = 清单逐件对账全绿 + pnpm verify + pnpm test 全绿。

## 实施记录

- 2026-10-07：RFC 落盘（全仓 DSH-native 审计批次三的 P3 残部打包）。
