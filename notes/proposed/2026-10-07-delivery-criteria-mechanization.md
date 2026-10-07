# 交付判据机械化 + 归档门红对账

> 状态：proposed

## 问题

全仓 DSH-native 审计（2026-10-07，三面审计 + 逐条核实）发现：交付判据在**合同、脚本、操作面**
三方各是不同子集，且 fail-loud 的红没有消费方——

1. **判据无机械把守**：NODES.md 第 8 行承诺交付判据 = 版本记账 + present + **审计 CRITICAL=0**，
   但 schema-scan 把 `audit.md` 与 `final/v1.md` 归"尾件缺（分档）"不计红，node-gate 无 audit 门、
   门④只管 vN≥2——**7 个契约期交付 bundle 无 audit.md**（token-factory、siliconflow-financials、
   geometry-coaching〔连 final/v1.md 都缺〕、deepseek-chat-price-check、open-tts、
   openai-context-window、swebench-verified-top）；guides61 §4 拍板前操作步骤只教跑 node-gate，
   全文无一步"跑 evidence-audit"。
2. **红门无人消费**：归档存量 7 个契约期 RED——token-factory 门③（HITL2 拍板记进 journal 而非
   契约文件）、swebench 门①+③、geometry-coaching 门②+③、agent-memory 门L、open-tts 门L
   （BUG-008 前形态但未入卡）、coding-agent/video-gen 门L（推敲卡有登记、bundle 无处置）——
   队列空置无条目承接。
3. **readiness 前置无交叉断言**：final.md 已交付而 review FAIL 不触发任何门红；实测
   mcp-hosts 的「readiness: PASS（附条件）」被 node-gate 与 run-dashboard 一律读作无条件 PASS。

## 方案

1. **判据下沉**（走 writing-a-gate 全流程带反证）：node-gate/schema-scan 增断言——契约期交付
   bundle 的 `audit.md` 在场 + `final/v1.md` 在场（断代定红，沿用既有契约日机制；契约日 = 本
   条目毕业日，存量不追溯由对账步处置）；「附条件 PASS」形态识别（readiness 行含"附条件"→
   按 WARN/门红判，语义实施时定并记判据）；final.md 在场 × review 非 PASS 交叉断言。
2. **存量对账**（逐 bundle 判处置，三种归宿）：补跑（evidence-audit 对 7 个缺审计 bundle 实跑，
   CRITICAL=0 者补 audit.md 归档；有 CRITICAL 者判处置）；追认（token-factory/swebench 的门③
   红 = 拍板记进 journal 未落契约文件——按 journal 证据 append 追认行，注明追认性质）；
   豁免登记（geometry-coaching 等真违约但 run 已交付的——逐个判"追认/豁免/不处置"，结论进
   实施记录，不静默）。处置原则 = run bundle 是交付记录**不改历史**，但可以 **append** 补行。
3. **操作面补家**：guides61 §4 拍板步骤补"跑 evidence-audit"一步（拍板前审计 CRITICAL=0），
   指向审计命令与判据正本。
4. 验收判据逐条绑定检查方式（D23）。

## 输掉的方案

- **门红自动阻断归档**（schema-scan 红 = 禁止移入 archive/）：归档是操作侧动作，机械阻断会
  造成通道死亡时无法收尾（操作侧补齐显式记账的既有语义优先）；改为红门显性化 + 对账条目
  承接。
- **audit 判据全量追溯存量**：断代定红是本仓既定模式（门L/④/R 同款——契约日前的交付不
  追溯）；存量走对账步逐个判处置，不做机械翻旧账。
- **把 evidence-audit 并进 node-gate 单入口**：两脚本观察对象不同（判据级 vs 溯源审计），
  各有 verdict 契约与消费面；合并稀释失败语义。维持双门 + guides61 步骤化串联。

## 验收（判据 ↔ 检查方式绑定，D23）

| # | 判据 | 检查方式 |
|---|---|---|
| 1 | node-gate/schema-scan 新断言在场（audit.md + final/v1 在场性、附条件 PASS、final×readiness 交叉）且带反证（注入违规 → 红 → 还原绿） | 机械：契约测试（tests/node-gate.test.mjs / schema-scan.test.mjs 夹具新增用例即反证记录）+ 实施记录载红实录 |
| 2 | 7 个缺审计 bundle 逐个有 audit.md 或显式处置结论 | 机械：`ls archive/*/audit.md` 对账清单 + evidence-audit 实跑输出（keyless）；人工：处置结论审查进实施记录 |
| 3 | 7 个 RED bundle 逐个有追认行/豁免登记/不处置结论 | 人工判据：逐 bundle 处置表进实施记录（证据 = journal/audit 文件事实） |
| 4 | guides61 §4 含审计步骤（命令 + 判据正本指针） | 机械：md-links/md-anchors；人工：步骤语义审查 |
| 5 | 收尾全绿 | 机械：pnpm verify + pnpm test + gates-smoke |

## 实施记录

- 2026-10-07：RFC 落盘（全仓 DSH-native 审计批次三；审计原始报告与核实记录 = 父会话交付）。
