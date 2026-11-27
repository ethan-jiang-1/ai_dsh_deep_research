# 外部研究材料登记（repo 外，只读引用）

> 公开读者注意：下方路径是作者本地只读参考仓，不随本仓发布，也不需要克隆；钉版 commit 仍可用于身份复核。
>
> 本页是 [00-index](../README.md) 外部材料登记的正文层（按需查）。

钉版纪律（`_agent_ready_development` 语料吸纳）：repo 外引用必须能以固定身份复核。本机参考仓以 `路径 @ <short sha>` 记录；复核 = `git -C <路径> log -1 --format=%H` 与下文比对，不一致即"上游已前进、结论待复核"（重审触发路径见 [discipline-map](./discipline-matrix.md#重审触发路径)）。

## 参考仓与外部语料清单

### 1. `ai_tool_deepresearch/` @ `24ba84636`（作者本地参考仓）

- **内容**：11-phase 生命周期 / wave 语义 / gate 体系 / 证据四层 / 反伪造教训。
- **吸收落点**：[考古报告](../../notes/archived/2026-09-24-deep-research-harness-analysis.md) → 映射表 [contracts/methodology-mapping.md](../contracts/methodology-mapping.md)。

### 2. `ai_dsh_company/` @ `bf76d36`（2026-10-10 钉，作者本地参考仓）

- **内容**：包结构 / patch 语法 / preset 教义 / verify 门禁 / 双 home / `_backlog` 推敲空间（company D31）；vendor 同 pin。
- **吸收落点**：[解剖报告](../../notes/archived/2026-09-24-dsh-plugin-repo-anatomy.md) → [architecture.md](../architecture.md) + `checks/verify/verify.mjs` + `tools/env.sh`；推敲空间借入 → 根 `_backlog/` + `backlog-liveness`（[D19](../decisions.md#d19) / [D20](../decisions.md#d20)）。
- **钉版复核**：[company 钉版复核 Note](../../notes/archived/2026-10-09-company-repin-review.md)（逐条重审结论无一被推翻；候选①上游改判：通道穷举优先、HITL = 最后手段）。

### 3. DSH 插件生态（2026-09-25 认真版）

- **内容**：vendor 能力目录差集 + 第三方市场/清单；直接竞品 8 个，差异化 = 多角色 + 证据审计 + Teams（搜索/学术/知识库已饱和不扩）。
- **吸收落点**：[dsh-plugin-ecosystem](../../notes/implemented/2026-09-25-dsh-plugin-ecosystem.md)（已毕业）；粗扫种子见 [dsh-market-scout](../../notes/archived/2026-09-24-dsh-market-scout.md)（冻结）。

### 4. DSH client/UI 扩展面（vendor 正文档 + company 多页签参考仓实例）

- **内容**：右栏平台页签契约（`sidebarRightTabs` + `sidebar.right.pane.tab` 双半注册）、数据通道（`agentTeam` 投影 · `session.follow` · `workspaceFiles` · `@Remote`）、双半 tsdown 构建契约与 12 坑。
- **吸收落点**：[琢磨稿](../../notes/archived/2026-09-24-ui-observability-surfaces.md) → 观察面 client 面（[D18](../decisions.md#d18)，正本 = [contracts/client-ui.md](../contracts/client-ui.md)，RFC = [observability-gui](../../notes/implemented/2026-09-24-observability-gui.md)）。

### 5. DSH SDLC reference @ `ad6f5319dc`（作者本地参考仓 `deepseek-harness/_dsh_plugin_agent_ready_development/sdlc-reference/`）

- **内容**：Agent Note 生命周期（决定覆盖、取代检查硬触发、毕业正文改写、alternatives 必载、grandfather 条款、目录树代替索引；初读于一代语料 @ `efdba905b2`）。
- **吸收落点**：[notes/README.md §决定覆盖与取代检查](../../notes/README.md) + `note-format` 门禁 + [吸纳 Note](../../notes/implemented/2026-09-24-note-lifecycle-absorption.md)。

### 6. 一代全语料 `_agent_ready_development/` @ `efdba905b2`（语料自身钉 DSH `dsh-v0.1.7-rc.1`）

- **内容**：开发 harness 原理（知识归属/载体分工/参与阶梯/分层反馈/运行时查询/仓库分类学/插件作者入口；三视角 37 篇）+ 语料级门禁（锚点、目录 README、钉版外链）+ 维护页（现行语料见下文二代条目）。
- **吸收落点**：[吸纳 Note](../../notes/implemented/2026-09-25-agent-ready-absorption.md) → `.agents/skills/`、[guides/plugin-authoring.md](../guides/plugin-authoring.md)、[discipline-map](./discipline-matrix.md) 源 6–8、[notes/README](../../notes/README.md)，新门禁 `md-anchors` / `note-status` / `dev-skill-format`。

### 7. `_digested/test-strategy/` @ `b830ec950f`（DSH 测试体系消化 16 篇，外部语料）

- **内容**：catalog 基线 = `dsh-v0.2.1-rc.5`（语料 7 篇 `reverified`、9 篇仍停旧基线 `639ed01539` 的 `carried`）：思想九教义、七层证据形态、快照机制、CI 防假绿、可靠性纪律与插件测试五台阶。
- **重议条件**：① 下次 pin bump 时必重跑；② 出现「语料结论与本仓现状冲突」实例时立即重跑；平时随 [discipline-map 重审触发路径](./discipline-matrix.md#重审触发路径) 对账。
- **吸收落点**：[采纳 Note](../../notes/implemented/2026-10-04-test-strategy-adoption.md) → [discipline-map 源 10](./discipline-matrix.md)、[guides/plugin-authoring.md §自写代码证据阶梯](../guides/plugin-authoring.md)、[checks/AGENTS §冒烟脚本可靠性纪律](../../checks/AGENTS.md)、[tests/AGENTS](../../tests/AGENTS.md)。

### 8. `ai_dsh_assitant/` @ `7dc4ff6`（2026-10-10 钉，姊妹参考仓）

- **内容**：`notes/README` 门牌节 + 验收门四条硬边界（未成熟不进实施 / 掩盖修法禁 / 未验不得写 implemented / 复发升门禁；第 3 条上游 2026-10 改述为"证据由交付记录承载"）。
- **吸收落点**：[D23 Note](../../notes/archived/2026-10-05-item-lifecycle-tdd.md) → [guides/dev-loop.md §0 验收门](../guides/dev-loop.md)、[notes/README §执行纪律](../../notes/README.md)；复核 = [company 钉版复核 Note](../../notes/archived/2026-10-09-company-repin-review.md)。

### 9. `ai_dsh_assitant/_backlog/` @ `7dc4ff6`（外部材料参考仓快照，非 vendor pin）

- **内容**：问题澄清优先、按需方法、证据/问题/交接分层、大小按决策依赖控制；本仓适配 = 会话内 plan/todo 组织实施、日期命名与 notes 对齐、复用本地证据命令。
- **吸收落点**：[Backlog 方法论吸收 Note](../../notes/implemented/2026-10-09-backlog-methodology-absorption.md) → `_backlog/` owner 与 [intent carriers](../policy.md)；复核 = [company 钉版复核 Note](../../notes/archived/2026-10-09-company-repin-review.md)。

### 10. `ai_dsh_loop_advisor/_backlog/` @ `b43be87`（外部材料参考仓快照，2026-10-12 借鉴）

- **内容**：backlog 制度显性化全套（入口两张票、缺陷修复通道、`修复就绪` = 自授权 + 严重/触面例外、双轨状态生命周期、agent 门牌；源卡 = 该仓 `issues/2026-10-12-backlog-process-made-explicit.md`）。
- **吸收落点**：[借鉴 Note](../../notes/implemented/2026-10-12-backlog-process-borrow.md) → `_backlog/` 全区 + [backlog-liveness](../../checks/lib/repo/backlog-liveness.mjs) + [D24](../decisions.md#d24)。

### 11. 二代语料 `_dsh_plugin_agent_ready_development/` @ `ad6f5319dc`（语料自钉 DSH `dsh-v0.2.0-rc.2`，待随现 pin 复核）

- **内容**：面向独立 DSH 插件仓的三卷（`native-development-model` / `sdlc-reference` / `repo-harness`）+ 语料自测 `verify.spec.mjs`；独立插件仓开发闭环与完成判断四分离公理（能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准）。
- **吸收落点**：[吸收审计毕业 Note](../../notes/implemented/2026-10-07-dsh-plugin-corpus-absorption.md) → [discipline-map 源 11](./discipline-matrix.md)、[evaluation §完成判断四分离](../testing.md)、`.agents/skills/reviewing-a-delivery`、`checks/smoke/gates.e2e.mjs` + `tests/checks/harness/verify-gates.test.mjs`；复核 = [company 钉版复核 Note](../../notes/archived/2026-10-09-company-repin-review.md)。

### 12. `deepseek-harness/_faq_on_digested/26_harness-release/`（2026-11-02 快照，外部语料）

- **内容**：Harness 发行版六轴、profile 归属、安装与更新生命周期、插件 README 与安装手册形状、数据卡（语料自述"六轴是检查表装置，不是对象模型"，vendor 无 `six-axis`）。
- **吸收落点**：[D41](../decisions.md#d41) → [contracts/run-forms.md](../contracts/run-forms.md) 六轴 owner 表 + [pack README](../../packages/deep-research-pack/README.md) + [安装手册](../../_dist/安装手册.md)（只借判据，不借"发行版"标签）。
