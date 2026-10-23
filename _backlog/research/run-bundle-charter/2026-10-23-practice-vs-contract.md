---
topic: run bundle 实物与契约偏差审计
intent: 为宪章提供 53 个 bundle 的实际形态、位置矛盾、交付链断点与 readiness 可读性证据
---

# 53 个 run bundle：实际形态 vs 声明契约

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 只读审计（2026-10-23），未改任何文件。口径：磁盘 53 个（工作区根 4 · `archive/` 46 · `_abandoned/` 3），
> 2,078 张 evidence 卡，**symlink 0 个**。契约正本 = `research-workspace/NODES.md` + `research-workspace/AGENTS.md` §目录约定。
> ｜ **2026-10-23 复核修正**：node-gate 现存 **46/53**（本文件原写 47，含一次审计误写后删除的 gate）；
> 跨 bundle `../drt_` 互引 **14 处/4 文件**（原写「无」）；readiness 终局解析 **46 PASS / 3 FAIL / 2 null**
> （原写「3 例末次匹配」未给全量分布）。逐条复算 = [issue-review-verification](2026-10-23-issue-review-verification.md)。

## 一、顶层件频次（53）

| 件 | 在场 | 缺失 / 异常 |
|---|---|---|
| question / topics / journal | 53 | 无 |
| findings.md / final.md / final/ | 52 | 同缺 `_abandoned/drt_cn-us-agriculture-gap`（只剩 4 件） |
| review.md | 51 | 缺 agriculture-gap、`archive/drt_deepseek-api-pricing` |
| audit.md | 47 | 缺 4 个 root + agriculture-gap + `_abandoned/drt_deepseek-v4-status` |
| node-gate.md | 46 | 缺 4 个 root + v4-status + `archive/drt_cn-us-open-source` + `deepseek-chat-context`（7 缺）；`open-source` 的 gate 为审计误写后删除，复核按「原无 gate」计；`deepseek-chat-context` 有 audit 无 gate（分布行按扫描时点保留，未逐门重算） |
| leads.md | 37 | 缺 16（单 topic / quick_factual 为主） |
| drafts/ | 29 | 合同可选 |
| plan.md | 6 | 4 root + e2e-rerun + v4-status → plan 是 10-21 后新实践，47/53 无 |
| plan/ | 1 | 仅 e2e-rerun（`plan/v1.md`） |
| acceptance.md | 2 | e2e-rerun、deepseek-r1-license |
| leads-gaps.md | 6 | 第二波 scout 分裂文件 |
| leads-eu.md / leads-supply.md | 各 1 | 仅 eu-us-cn-ai-stack，三份 leads 共 1,238 行 |
| review-critic.md / evidence-s2/ | 各 1 | 仅 nvidia-dc-gpu-share |
| topics-rerun.md | 1 | siliconflow-financials（T5–T9 扩层，无门读取） |
| `_scout-verify.mjs` | 1 | dr-product-landscape（54 行脚本进交付 bundle） |
| MECHANISM-TEST.md | 1 | v4-status |

门分布（扫描时点 47 份 node-gate.md；现存 46 份——`cn-us-open-source` 的 gate 是审计误写后删除，
复核按「原无 gate」计；下述分布未逐门重算）：① 43 PASS / 3 PRE-CONTRACT / 1 RED；③ 44 PASS / 2 RED；
② 41 PASS / 2 RED / 3 N/A；L 仅 12 PASS（19 N/A / 12 PRE / 4 RED）；④ 39 N/A / 7 PASS / 1 PRE；
A 43 PASS / 1 RED / 2 PRE。

## 二、抽样 6 个：只凭 bundle 能推出什么

| bundle | 阶段 | 最近拍板 | 下一步 | 交付态 | 必须外看 |
|---|---|---|---|---|---|
| `drt_cn-us-ai-models-hardware`（在飞，plan v2） | 可推：v2 证据扩张收尾 | 首条=10-22 v2 rerun 立项；**v2 的 HITL2 拍板行不在** | journal 明写「待 HITL2 答复」 | v1 已交付 / v2 未交付 | 卡是否已被答复=只能查 session log；goal 不在 bundle |
| `archive/drt_2026-ai-browser-landscape`（旧，无 plan） | **不可推**：无 plan → 图/Wave 全缺，只能从 3 条 Decisions+journal 倒推 | 可推 | 无 next 字段 | 可推（门② PASS+present+audit CRITICAL 0） | 阶段顺序只能靠 node-gate 的会话计数 |
| `archive/drt_mcp-security-landscape`（已交付） | 可推 | 可推（2 条 HITL2） | — | 可推 | question.md:61「非拍板·操作侧 steer 注记」只有读门③红报才懂来由 |
| `_abandoned/drt_semver-caret-prerelease`（停放） | 可推：HITL2 后 | 可推（review PASS+present PASS） | — | **单看 bundle 会误判「已交付」** | 未交付理由只在 audit.md（CRITICAL 7/MAJOR 272）+ `_abandoned/README.md` |
| `archive/drt_e2e-rerun-2026-10-23`（rerun v2） | 可推（plan+plan/v1+rerun 行） | 可推（HITL2 v2 行） | 可推 | 可推 | review.md:1 标题是 **v1 的 PASS**，v2 终局在 `:213` r3；node-gate 全 PASS 需打开 gate |
| `drt_gha-ubuntu-latest`（quick_factual） | 可推 | 可推（HITL2+代答 provenance） | — | **不可机械核**：无 audit/node-gate，present 只在 journal 散文 | present 真实性只存在于 session log |

**结论**：阶段/拍板可推（§Decisions + journal 头部），但**下一步与交付态不可只凭 bundle 推**——
next-action 无机器字段；present 是会话动作（门② 读 session log）；版本账与当前版会错位
（`drt_cn-us-ai-models-hardware/final.md` 已 427 行 v2，`final/` 只有 v1 记账）。

## 三、跨 run 依赖

- **symlink 0，但存在 `../drt_` 互引 14 处/4 文件**（`archive/drt_computer-use-benchmarks` 的
  final/findings/final-v1/review，其中 **7 条是 `[来源:]` 跨 bundle 证据链接**，源 = `drt_cn-agentic-parity`）；
  其余互引是 prose slug 或 `archive/<slug>/<file>` 路径。**独立性不是零违约**（见复核 §4.1）。
- **被引度数**（删除即断别处文字引用）：cn-llm-deep-research 11、cn-us-cpu-gap 10、cn-llm-infra 10、
  cn-agentic-parity 8、deepseek-api-pricing 8、cn-moe-2026 7、2026-ai-coding-agent-landscape 6。
- **已发生的删除断链 2 组**：① anthropic timeline 5 处（`evidence/g-platform-docs-302-cross-origin.md:48`、
  `t1-2026-01-05-opus-3-retirement.md:37`、`g-sdk-enum-channel-failed.md:30`、`t2-docs-index-llms-txt.md:74`、
  `leads.md:6`）指向 2026-10-19 已删的 `_abandoned/drt_anthropic-claude-release-line{,-map}`；
  ② `archive/drt_cn-us-ai-enterprise` question.md:65/106/107/143、journal.md:9/116 指向 3 个已删 bundle
  （:107 还称 `drt_cn-us-ai-gap`「已交付」，与 :141 自记「无 final.md」矛盾）。
- **跨树依赖**：7 张卡 `source_url: file:///Users/.../vendor/dsh/node_modules/.pnpm/semver@7.8.5/...`
  → pnpm 重装即断源。
- **29 个文件写死 `/Users/bowhead/...`**（11 个 bundle：semver 15、default-upgrade 3、cn-us-ai-enterprise 2、
  open-weight 2、余 7）。
- **所有审计依赖仓外状态**：47 份 audit.md 的复算依赖 `runtime/harness-home/sessions`（gitignored），
  但 audit 只记「N 个日志文件 / N 个 web 事件」，**不记语料根**（46 份归档 audit 中 0 份写路径）；
  2 份 acceptance 记绝对语料根。删 session 即无法复算，且当前连「用哪个根」都不可从 audit 复现。

## 四、异常清单（按严重度）

### S0 · 交付链或交付语义已失效

1. `drt_eu-us-cn-ai-stack` **交付版断链**：`final.md:34,127` 与 `findings.md:25` 引
   `evidence/t4-eu-mistral-code-license-apache.md`，磁盘实为 `t1-eu-...`；该 bundle 同时**无 audit.md/node-gate.md**，
   断链从未被机械面扫到。
2. `archive/drt_geometry-coaching`：位置=已交付，`node-gate.md:9-13` 自记门③ RED+门② RED（G8），门A PRE-CONTRACT；
   `final/` 只有 README.md（无 v1.md）。
3. `archive/drt_swebench-verified-top`：位置=已交付，node-gate.md:8/10 门① RED（HITL1 锚点缺）+ 门③ RED。
4. `_abandoned/drt_deepseek-v4-status`：位置=未交付，内容=全齐（review PASS、final/v1、2 条 HITL2、present）；
   `_abandoned/README.md:14` 只登记「当前 2 个」，实有 3 个 → 该 bundle 无登记，且自带
   `MECHANISM-TEST.md:1-6` 声明「非用户委托研究、未归档」。
5. `_abandoned/drt_semver-caret-prerelease`：node-gate.md:13 门A 红报「audit.md 缺席」，但 audit.md 已在场
   （CRITICAL 7/MAJOR 272）→ **门文物与其声称的事实相反**；同 bundle 门②/③ 均 PASS，单读 gate 会判可交付。
6. anthropic timeline 的 5 处悬空路径引用（见 §三）。

### S1 · 交付件缺失 / 豁免

7. `archive/drt_deepseek-api-pricing`：**无 review.md**，node-gate.md:13 仍判门A PASS（quick_factual 编制豁免，
   journal 有主编亲核记录）→ 唯一「零对抗审查」的已交付 bundle。
8. `archive/drt_deepseek-chat-context`：有 audit、**无 node-gate.md** → 交付无任何门记录。
9. `archive/drt_deepseek-default-upgrade`：final.md:90/152/210 三次 `[来源: drafts/review.md]`，该文件不存在
   （drafts 只有 critic-evidence-audit-1.md），且 drafts 是过程稿不是证据。
10. kimi：final/v2.md 在场但 §Decisions 无 v2 行（门④ PRE-CONTRACT）；selfhosted 同形态，
    question.md:64 自认「v2 首次落盘时 HITL2 与 present 两项形式要件均缺席」。
11. siliconflow：同 bundle rerun 落 v2 + 新建 topics-rerun.md，但 question.md **无 `> rerun:` 行**（全库仅 e2e 有），
    topics-rerun.md 不被任何门读取。
12. **位置滞后**：4 个 root bundle 中 3 个内容上已交付（eu-us、gha、node24 均有 HITL2 拍板行 + final/v1）
    → 违反「工作区根只留活跃 run」。

### S2 · readiness 终局形态与升级权（51 份 review.md）

13. 文本形态 5 类：25 个单一 PASS、20 个 FAIL+PASS 混排、3 个无可裸匹配声明（反引号包裹：chat-price-check、open-llm、zhipu）、
    1 个仅 FAIL、1 个 `PASS-WITH-CONDITIONS`（cn-llm-infra:325）、1 个 `CONDITIONAL PASS`（harness-conventions:196）。
14. **但当前解析器可读大半**：逐份 `terminalVerdictLine` = **46 PASS / 3 FAIL / 2 null**；3 FAIL =
    video-generation（文末「附：第一轮历史」的 FAIL 夺权）、mcp-server-ecosystem（文末首轮 FAIL 块）、
    ai-coding-agent-landscape（critic 首轮 FAIL + lead 回写升级）；2 null = cn-llm-infra（`PASS-with-conditions`）、
    eu-us-cn-ai-stack（无终局行）。**问题在「谁是终局、谁能升级」，不是「完全不可读」**。
15. `archive/drt_2026-ai-coding-agent-landscape`：review.md:9 正式判定 **FAIL**，:18 由 lead 回写「记 PASS」，位置已在 archive。
16. `archive/drt_nvidia-dc-gpu-share`：review-critic.md:3 `readiness: FAIL` 与 review.md PASS 并存
    （非契约文件名的第二份 critic 报告）+ 平行 `evidence-s2/`。
17. e2e review.md:1 标题 = v1 的 PASS，交付的 v2 终局埋在 :213 r3 → 头部判定≠当前判定。
18. 机械边界：`scripts/lib/schema-scan-core.mjs:95` 只校验 `readiness...(PASS|FAIL)` 在场，**不判哪条是当前**。

### S3 · 形式漂移 / 卫生

19. journal 方向：4 个声明「最新在下」、27 个「最新在上」、22 个无声明；严格反序 ≥2
    （chat-price-check 10-04→10-05、open-weight 10-05→10-06）。
20. e2e question.md:6 残留模板行 `> rerun: v2 · evidence-expansion · YYYY-MM-DD · 触发：<一句话>`。
21. 6 个非 md 产物：`_scout-verify.mjs`（`import './leads.md'`）、`analyst-1-shell-probe.sh`、`fetch-issues.mjs`、
    `v2-b/`、`t7-rename.flag`、`.html`。
22. leads 三分裂（eu-us 597+383+258 行），门L 只解析 leads.md → 三分之二的候选面从未过门。
23. 47/53 无 plan.md → 「阶段/图」这一层对旧场永久不可得。

## 五、结论

- **契约的实际执行面是「弱在场 + 强散记」**：8 件里 3 件 100%，其余 47–52；audit/node-gate 只在非 root 场存在，
  root 4 个全缺。
- **位置不是可信状态源**：5 例位置与内容矛盾（geometry、swebench、v4-status、api-pricing 豁免、3 个已交付滞留 root），
  且矛盾早已被 node-gate 记录却未处置。
- **一条真实交付链已断**（eu-us 的 t4/t1 卡名）；两条历史断链由 10-19 清理造成。优先修 eu-us 的卡名引用并补跑 audit，
  其次统一 readiness 声明形态、给 geometry/swebench 补处置记录。
