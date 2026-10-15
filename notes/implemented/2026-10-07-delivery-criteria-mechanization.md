# 交付判据机械化 + 归档门红对账

> 状态：implemented

## 问题（背景）

全仓 DSH-native 审计（2026-10-07，三面审计 + 逐条核实）发现：交付判据在**合同、脚本、操作面**
三方各是不同子集，且 fail-loud 的红没有消费方——

1. **判据无机械把守**：NODES.md 第 8 行承诺交付判据 = 版本记账 + present + **审计 CRITICAL=0**，
   但 schema-scan 把 `audit.md` 与 `final/v1.md` 归"尾件缺（分档）"不计红，node-gate 无 audit 门、
   门④只管 vN≥2——契约期交付 bundle 无 audit.md（对账实盘 9 个）；guides61 §4 拍板前操作
   步骤只教跑 node-gate，全文无一步"跑 evidence-audit"。
2. **红门无人消费**：归档存量 7 个契约期 RED——token-factory 门③、swebench 门①+③、
   geometry-coaching 门②+③、agent-memory 门L、open-tts 门L、coding-agent/video-gen 门L——
   队列空置无条目承接。
3. **readiness 前置无交叉断言**：final.md 已交付而 review FAIL 不触发任何门红；实测
   mcp-hosts 的「readiness: PASS（附条件）」被 node-gate 与 run-dashboard 一律读作无条件 PASS。

## 决定

- **门A（交付完整性门）落地 `scripts/run-gates/node-gate.mjs`**（契约日 2026-10-08 = 本条目
  毕业日，此前交付不追溯——存量由对账步处置）。判据四条：
  - A1 交叉：final/ 记账在场 × review readiness 非 PASS → RED（交付越过审查前置，NODES
    第 6 行「PASS = HITL2 前置」）；
  - A1b：记账在场 × review.md 缺席 × 非 quick_factual → RED（审查整缺的交付）；豁免判据与
    schema-scan CONDITIONAL 同源同判据（`runType`，不硬编码名单）——deepseek-api-pricing
    实测豁免形态驱动，防假阳性；
  - A2：交付前置达成（readiness PASS，或豁免型已记账）→ final/v1.md 版本记账 + 与 bundle 身份匹配、可解析且 `CRITICAL=0` 的 audit.md 操作侧审计须在场；quick_factual 无 review 的交付由「记账在场」触发（拍板前零红噪）；
  - **附条件 PASS = PASS 计 + ⚠ WARN 注记显性化，不机械红**：条件性是 critic 判断、HITL2
    裁决权威在用户，机械红越权；防的是"被读作无条件 PASS"的静默误读。`PASS（附条件）`与
    `PASS（条件=…）` 两种实测形态识别，并输出附条件 WARN；终局行判定规则见[readiness Note](2026-10-11-review-readiness-terminal-rule.md)。
- **落点 = node-gate，schema-scan 不动**：断言触发依赖交付形态（final/ 记账、readiness 判定），
  schema-scan 是无触发器的无条件在场级（NODES.md 头部两层正本语义）；audit.md/final/v1.md
  维持其「尾件缺（分档）」注记位。
- **存量对账（2026-10-08 执行，处置表经用户批准）**——audit.md 补跑 9 个（审计原记 7 个，
  对账实盘 9 个：claude-context-window、cn-llm-pricing-2026-10 为漏数，同等待遇）：

  | bundle | 红门（对账时态） | 事实证据 | 处置（已批准） |
  |---|---|---|---|
  | token-factory | 门③ → 已转绿 | journal 2026-10-01 载用户拍板「按现稿定稿」 | 已执行追认：§Decisions 补记行（注明追认性质 = journal 证据迁移，非新拍板） |
  | swebench-verified-top | 门①+门③ | journal 载速问通道（请求即契约，HITL1/HITL2 均未发起，present 直达） | 豁免登记——不补造追认行（HITL2 未发生是事实，补行会把未发生的拍板洗成绿灯） |
  | geometry-coaching | 门③+门②+ v1 缺席 + audit CRITICAL 1 | journal 尾停在「进入 HITL2 审阅」（拍板未闭环）；present 缺席；记账落 final/README.md（命名漂移） | 豁免登记（四缺陷如实入册） |
  | agent-memory-landscape | 门L（0 字段齐单元） | 自由体 leads.md，交付 2026-10-04（门L 契约日 10-03 次日） | 豁免登记 |
  | 2026-ai-coding-agent-landscape | 门L（0 字段齐单元） | 同上 | 豁免登记 |
  | 2026-ai-video-generation-landscape | 门L（0 字段齐单元） | 同上（门① 另为 PRE-CONTRACT 不计） | 豁免登记 |
  | open-tts-2026-landscape | 门L（状态值「建议深挖」≠ 合法值「建议挖深」） | 近义漂移、字段语义在场 | 豁免登记（语义无损） |

  审计面：7 个补跑 CRITICAL=0 落盘归档（token-factory、siliconflow-financials、
  deepseek-chat-price-check、open-tts、openai-context-window、swebench-verified-top、
  claude-context-window）；geometry-coaching CRITICAL 1（ev-t1-99 一条 URL 未入任何工具
  事件）、cn-llm-pricing CRITICAL 2 + MAJOR 164（SPA 探测的 alyasset.com JS 资产 URL 未溯源
  + 121 摘录不符）→ 追认交付 + 缺陷登记（audit.md 本身即缺陷记录，已落盘）。处置原则执行：
  不改历史（唯一 append = token-factory 追认行，有真拍板证据）、不静默（每行有事实证据列）。
  swebench/geometry 的审计原假设（"拍板记进 journal"）经 journal 核实**不成立**——实为拍板
  未发生，处置从追认改为豁免登记（对审计结论的修正）。
- **操作面补家**：guides61 §4 新增「拍板前跑证据审计」步（CRITICAL=0 才进 HITL2；附条件
  PASS 拍板时先核条件）+ 门A 并入拍板后判据预期态说明 + 交付动作补 v1 记账一环；NODES.md
  门编号图例补门A；研究手册（research-workspace/AGENTS.md）门全集枚举行同步；pack
  workspace 种子经 `sync-pack-workspace` 重生成（9 文件，非手改）。

## 输掉的方案

- **门红自动阻断归档**（schema-scan 红 = 禁止移入 archive/）：归档是操作侧动作，机械阻断会
  造成通道死亡时无法收尾（操作侧补齐显式记账的既有语义优先）；改为红门显性化 + 对账条目
  承接。
- **audit 判据全量追溯存量**：断代定红是本仓既定模式（门L/④/R 同款——契约日前的交付不
  追溯）；存量走对账步逐个判处置，不做机械翻旧账。
- **把 evidence-audit 并进 node-gate 单入口**：两脚本观察对象不同（判据级 vs 溯源审计），
  各有 verdict 契约与消费面；合并稀释失败语义。维持双门 + guides61 步骤化串联。
- **附条件 PASS 判机械红**：条件性是 critic 判断，HITL2 裁决权威在用户；机械红越权且会
  阻断合法的附条件交付。改为 WARN 注记显性化——门防的是静默误读，不替用户拦。
- **A1 对 review.md 缺席一刀切判违约**：quick_factual 编制豁免 review.md（schema-scan
  CONDITIONAL 既有语义），一刀切把合法豁免判成"越过审查"（deepseek-api-pricing 实测假
  阳性）。改为豁免同源判据（runType）+ 非豁免缺席才红。
- **对 swebench/geometry 补造追认行**：原假设"拍板记进 journal"不成立——HITL2 未发生，
  补追认行会把未发生的拍板洗成绿灯（门③ 正是防这个）。改为豁免登记、门红保留为诚实记录。

## 验证

- **先红后绿两轮实录**：7 用例先红（门未立、`gates.delivery` 缺席，239 旧用例零误伤）→
  实现转绿 → 豁免假阳性反证 2 用例再红（quick_factual 交付被 A1 误判 + 缺席判据措辞）→
  修正转绿（248/248）。夹具 7 件为永久反证记录（audit-missing / missing-v1 / skip-review /
  conditional / quickfactual-delivered / noreview-delivered + fixture-complete/relay 补
  audit.md——"合规交付"语义随契约自然扩展）；门④ 断代测试补注入 auditDate（夹具 mtime
  漂移防不可复现）。
- **真实 bundle 实测**：mcp-hosts 附条件 WARN 识别 ✓；geometry-coaching 双缺如实报 ✓；
  全部存量门A PRE-CONTRACT 不计红 ✓；token-factory 追认后门③ 转 PASS ✓；
  deepseek-api-pricing 豁免形态 PASS 带注记 ✓。
- **收尾全绿（2026-10-08）**：`pnpm verify` 全绿、`pnpm test` 248/248、
  `node scripts/smoke/gates-smoke.mjs` 全绿（对照组零注入 PASS + 7 注入案例点名报红）。
- **证据选型（任务型路由对账）**：改动面 = run-gates 脚本 + tests 夹具 + 工作区手册正本与
  种子 + guides61——路由行「改工作区手册/模板」= L0 档（sync → verify +
  pack-workspace-fresh）；preset/plugin 行未动，**L1/L2 无对象未跑**（如实分列，非"通过"）。
- **Readiness 显示边界（本轮范围外）**：本轮实现记录了 node-gate 对附条件 PASS 的 WARN 语义；终局判定现由驾驶舱、仪表盘、冒烟与 node-gate 收敛，当前规则与证据见[终局 readiness Note](2026-10-11-review-readiness-terminal-rule.md)。

## 环境状态

- 新增：门A（`scripts/run-gates/node-gate.mjs` 的 `deliveryGate` + `readinessOf` +
  `AUDIT_CONTRACT_DATE`）、tests 夹具 6 件 + fixture-complete/relay 的 audit.md、9 个归档
  bundle 的 audit.md（evidence-audit 补跑产出）、token-factory §Decisions 追认行。
- 改动：`docs/guides/61-run-playbook.md`（§4 审计步 + 门A 预期态）、
  `research-workspace/NODES.md`（图例）+ `research-workspace/AGENTS.md`（门全集枚举）+
  pack workspace 种子（sync 重生成）、`tests/node-gate.test.mjs`（+9 用例）。
- 队列：本条目毕业离队，▶ 移交「审计 P3 收尾轮」。
- 归档区门禁现状：除豁免登记 7 bundle 的既有红门（门①/②/③/L 如实保留）外，契约期交付
  bundle 门A 全绿。
