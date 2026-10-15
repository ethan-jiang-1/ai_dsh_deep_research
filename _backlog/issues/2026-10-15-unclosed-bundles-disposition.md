---
status: 等人拍板
opened: 2026-10-15
---

# 推敲：活动区未归档 bundle 的处置（4 场有 final.md 未闭合 + 9 场未交付；另 1 场并行在飞 run 不在处置内）

> 立卡：2026-10-15 ｜ 状态：等人拍板（每类处置路线需用户定；涉及"新增弃用去处"与"是否授权真模型 run 补齐闭合"）｜ 类型：Task ｜ 结论倾向：未定（分三类给建议）｜ 可关闭：否

**问题与期望结果：** `research-workspace/` 活动区积压 **13 个未归档 bundle**（位置=状态：未归档即在飞）；按文档"每次启动前先扫一眼在飞 run"协议，每次开通道都要重复报同一批。期望：逐类给出诚实处置，把活动区清零/显著收敛，且**绝不把红场洗成已交付**（`archive/` 是已交付位）。

**当前情况（2026-10-15 实测；缺审计的已由本次补跑 `evidence-audit` 落盘 audit.md）：**

> 处置范围外的 1 场：`drt_cn-us-enterprise-ai-ecosystem`（2026-10-16 00:42 起，**并行工作流正在跑的 run**）——不属本卡处置对象，盘点后活动区总数 = 13（本卡对象）+ 1（在飞）。

### A 类 · 有 final.md 但未闭合（4 场）

| bundle | final | 门③ 拍板行 | 门② present | 门A | 审计 |
|---|---|---|---|---|---|
| `drt_nvidia-dc-gpu-share` | ✓ | **RED** | PASS | **RED** | ~~CRITICAL 1 = 伪造链接~~ → **2026-10-15 复核：疑为审计假红**（该 URL **在本 run 自己的 web_fetch 结果里以百分号编码/协议相对形态出现**，抽取器漏抽；正确定性 = "搜索列表里见过、本 run 未抓过" = MAJOR 档，见 [BUG-029](../../_backlog/bugs/BUG-029-evidence-audit-url-extraction-encoded-forms.md)）；仍缺 HITL2 拍板行 |
| `drt_ai-coding-security` | ✓ | PASS | PASS | **RED** | CRITICAL **1 = 本 run 未取证**（`open-vsx.org` 仅出现在**别场** mcp-* 的 web_search 结果里，跨 run 语料窗设计上不予作证——实质成立，措辞应限定"本 run"）；另门L RED（方向 H 缺分级、覆盖缺口 T7/T8） |
| `drt_anthropic-latest-model` | ✓ | **RED** | **RED** | PASS | CRITICAL 0（审计干净） |
| `drt_cn-moe-2026` | ✓ | **RED** | N/A | **RED** | CRITICAL 0 |

**建议（按 2026-10-15 复核修正）**：前两场都不是"凭空编造 URL"，而是"**引用了本 run 未曾真正抓取的页面**"——最省且正确的路线 = **补一次真实抓取**（`web_fetch` 该 URL，核内容是否支撑结论；支撑则补摘录重跑审计，不支撑则换源或修结论）。nvidia 场另需等 [BUG-029](../../_backlog/bugs/BUG-029-evidence-audit-url-extraction-encoded-forms.md) 的抽取修复后复判档位。前两场（伪造）如按旧定性则优先走**补证据重审**——人工核该 URL 是否真实存在：存在则补一次真实 `web_fetch` + 修正摘录 + 重跑 `evidence-audit`；不存在则修结论或换源（若结论依赖伪造源 → 退回对应节点补研究，需真模型 run）。后两场（审计干净但缺 HITL2 拍板行/present）不能按已交付归档；建议要么补齐闭合（拍板 + present，人/真模型介入），要么与 C 类同办。

### B 类 · 已交付且审计通过（0 场）

唯一闭合的 `drt_cn-us-ai-enterprise` 已按此判据于 2026-10-15 归档（补跑审计 CRITICAL 0 → 门A 转 PASS）。

### C 类 · 未交付（9 场，无 run 根 final.md）

`drt_1-plus-1` · `drt_cn-ai-coding-assistants` · `drt_cn-us-ai-gap` · `drt_cn-us-enterprise-ai-procurement` · `drt_cn-us-enterprise-genai-adoption` · `drt_deepseek-chat-ctx-202610` · `drt_enterprise-ai-procurement-cn-us` · `drt_lead-role-oneliner` · `drt_openai-valuation`

其 audit.md 的 `CRITICAL 1` = **"无 final.md——final 溯源链无处可查；这不是'通过'，是没有对象"**（防空语料判据），**与 A 类的伪造链接不是同一回事**，报告与后续阅读请勿混同。

**建议**：这些是中途停摆的实验（多为 10-13 上游畸形风暴期），保留价值 = 历史会话证据；可**批量移出活动区到专用弃用去处**（保持文件与会话日志完整，不占 archive/ 的已交付语义）。候选去处二选一：`research-workspace/_abandoned/`（须新增一处目录约定 + 文档一行）或留在原地（代价 = 每次启动重复报同一批）。

**未决问题：**

1. A 类两场伪造：走补证据重审（推荐）还是重研究/弃用？若需真模型 run，请授权。
2. A 类两场缺闭合：补齐闭合还是按未交付处置？
3. C 类 9 场：移到 `_abandoned/`（推荐，含新目录约定）还是留原地？
4. 本次为补齐判据给 A/C 类补写的 `audit.md` 是否保留（建议保留——它们是"未闭合"的机械证据）。

**下一步：** 用户逐类拍板后执行（含必要的文档/索引同步与 L0 复跑）；执行完本卡按结果归档。

## 参考

- 审计与门禁命令（可复跑）：`node scripts/run-gates/evidence-audit.mjs <bundle>`、`node scripts/run-gates/node-gate.mjs <bundle> --sessions runtime/harness-home/sessions`（均 keyless，须先 `source dev/env.sh`）；
- 交付判别 = run 根 `final.md` + `present` 声明（[guides/61](../../docs/guides/61-run-playbook.md) §6）+ NODES 第 8 行审计 CRITICAL=0；
- 失败类 = 证据身份链（[00-index D5](../../docs/00-index.md)）。
