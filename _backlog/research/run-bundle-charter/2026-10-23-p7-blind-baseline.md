---
topic: P7 盲续跑 baseline
intent: 在手册改动前记录 4 个样本的盲续跑结果与 ground truth 对比，供 P8 判断“续跑是否变好”
---

# P7 盲测 baseline（手册改动前）

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ ground truth = `/tmp/run-bundle-blind/ground-truth.md`（operator-only）。
> ｜ **样本状态**：用户 2026-10-23 告知旧 run bundle 已清；本 baseline 是清理前结果，只作“旧事实是否够用”的参照，P8 不再用旧样本做正式验收。
> ｜ **口径偏差（如实）**：先用 run 通道 3083 的 lead 会话跑，两次都在 5 个工具调用后
> `max-tokens` 结束、无 assistant 文本（session-f323… 8 calls、3ff7… 5 calls）——这是探针
> 通道的模型/预算问题，不是 bundle 事实问题。故 baseline 改用**新 subagent（同一模型、全新
> 上下文、只读目标 bundle）**执行；它不是正式 lead 会话，P8 的正式验收需另跑一次 lead 或
> 记录该限制。subagent 是否写盘由操作侧核对（本次三样本均未改工作树）。

## 样本与结果

| # | 样本 | 结果 | 对 ground truth |
|---|---|---|---|
| A | `drt_cn-us-ai-models-hardware` | **5/5 方向正确**：阶段 = W9 收工/HITL2 pending；拍板 = 2026-10-22 v2 rerun HITL1（用户原话）；风险 = 数学 32.4pp 单域单源 + 8 张承重卡未二次核验；下一步 = 重呈 HITL2 → 拍板行 → final/v2；交付 = 未交付（无 HITL2 行/final/v2/present/audit） | 全部命中；下一步把“转 `run-accept`”略去，但动作可执行 |
| B | `archive/drt_2026-ai-browser-landscape` | **5/5 方向正确**：已交付归档（无 plan）；拍板 2026-10-04 HITL2「按现稿定稿」（代理）；风险 = Comet/Perplexity 定价单源（Apple US 页）；下一步 = 若续跑先落补研究拍板再定向换源，否则不动；交付 = 四步齐 + audit CRITICAL 0 / MAJOR 30 | 命中；未把 archive 位置当状态，明确“已交付但未归零” |
| C | `archive/drt_mcp-security-landscape` | **5/5 方向正确**：已交付归档；拍板 2026-10-10 HITL2 代理；风险 = audit MAJOR 42 未分诊（具体 OWASP 卡未抓取）；下一步 = critic/ops 分诊 42 条；交付 = 四步齐、present 指 final.md（旧场） | 命中；风险比 ground truth 更具体（好） |
| D | `_abandoned/drt_semver-caret-prerelease` | **5/5 且负样本正确**：停放/未交付；拍板 2026-10-19 HITL2 代理；风险 = audit CRITICAL 7（file:// 本地副本）+ MAJOR 272；下一步 = 重跑 gate/分诊 7 卡；交付 = 声明有、见证不过；明确指出 review PASS ≠ 验收通过 | 命中；未被 HITL2/present/final 误导 |

**baseline 结果：4/4 样本全部命中 ground truth 的关键维度**（phase/delivery/拍板/风险/下一步方向）。
这说明旧 bundle 的文件事实已足以支撑盲续跑，**旧样本不能用来证明“改手册后变好”**；P8 的价值应转向
（a）新 run 的 `run.md` 首屏/next 可执行性，（b）交付回执（presented/delivered/manifest）的可解释性，
（c）真实 lead 会话在通道 max-tokens 限制下能否产出最终答案。baseline 由 subagent 执行（非正式 lead
会话），已在上面注明偏差；P8 需另跑正式 lead 或如实保留该限制。

## 评分口径

- phase / delivery 精确；last decision 引用 + 日期；risk 一个具体未闭合项；next 一个可执行动作。
- 负样本（D）不得因 HITL2/present/final/v1 齐全就报“已交付”。
- 记录：读序/调用数/是否写盘/是否越界读；未跑 = 未跑，不冒充通过。
