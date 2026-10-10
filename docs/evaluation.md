# 评估框架 — 本 repo 的验收合同

> 性质：**合同**（评估怎么判，只写 now）。改评估标准本身 = 一个 D 号决策，进
> `notes/`，不悄悄改；时变状态（哪个面跑到哪了）不住本文件；工作进度由当前授权范围与会话记录表达。

## 0. 血缘与权威

| 原则 | 权威出处 |
|---|---|
| 完成定义 = 该面最小"真检查"通过；发现权在代理一侧 | company repo D15（依据 vendor `docs/testing.md` + postmortem 0001–0003） |
| no-key 测试只证明管道通；with-key 才证明 agent 真的能用 | vendor/dsh `docs/testing.md` "with-key policy" |
| Verify the world, not the self-report（断言重读文件/重跑命令，不信 agent 自述） | vendor/dsh `docs/testing.md` |
| 真入口路径 = 发布产物（npm pack → 干净 profile → plugin add → 真会话） | vendor/dsh `docs/testing.md` + company `docs/release.md` |
| 真模型/真浏览器不进 keyless 回归（layering 守卫防混） | company `tests/layering.spec.ts` 模式 |
| 每条新门禁带反证：先注入回归看红 → 还原 → 绿 | vendor/dsh `docs/testing.md` "A guard only guards if…" |
| 挂载失败只有真会话抓得到（dump/roster 看不见） | company postmortem 0001 → `preset-smoke.mjs` |

## 1. 五个评估面

每面 = 一个可独立判定的检查域。**面与面不互抵**：L4 绿不能补 L0 红。

### L0 结构面（机械门禁，keyless）

- **定义**：仓库结构、文件卫生、preset 三件套完整性、vendor 铁律（如采用 submodule）等机械可查的不变量。
- **最小真检查**（client 面（D18 观察面）另加：`node scripts/smoke/client-load-smoke.mjs`——headless 浏览器真挂载断言（插件零失败横幅 / 无 loader entry 失败 / 本包 client bundle 进 /plugins/ 批次 / 页签渐进面与活动流），断言清单以脚本为准）；`node scripts/verify/verify.mjs`（或 `pnpm verify`）+ `pnpm test`（= `node --import tsx/esm --test tests/*.test.mjs`，本仓唯一登记的测试命令）——均 keyless、秒级。
- **门禁登记表**（正本在此；与 `scripts/verify/verify.mjs` 的 gates 数组经门禁 `gate-ledger-sync` 机械对账——加门禁须两处同步，漏一处即红）：

| 门禁 | 断言什么 | 反证记录 |
|---|---|---|
| `md-utf8-newline` | 所有 **tracked** .md 严格 UTF-8、恰一个结尾换行（git ls-files 驱动——运行区不扫，手册合同既有） | [noise-sweep Note](../notes/implemented/2026-09-24-noise-sweep.md)（清欠账：双尾换行注入红→还原绿）；范围修正反证 = live run 的 `runtime/harness-home/runs/…/leads.md` 双尾换行被旧版全树 walk 咬红（运行区不该扫）→ 修 tracked-only → 绿 |
| `md-links` | 所有 **tracked** .md 的 Markdown 相对链接（方括号+圆括号语法）可解析**且目标被 git 跟踪**（目标盘上存在但未跟踪 → 红——链接语法 = 仓内可解析承诺，运行区/本机数据引用走反引号路径；`quotepath=false` 防非 ASCII 路径假红/漏扫，BUG-016 加宽）（**边界**：门禁由 `git ls-files` 驱动，**未 staged 的新文件扫不到**——pre-commit 在 staged 后兜住，实测 2026-09-26 一次毕业即由此咬住）（具名目录白名单版会让根目录其余 tracked .md 逃检，基础整治 C10 改；反引号裸路径不检 = 设计） | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md)（注入死链红→还原绿）+ [BUG-016 卡](../_backlog/_archived/fixed_bugs/BUG-016-fresh-clone-mdlinks-runtime-links.md)（gates-smoke `md-links-untracked` 案例不被旧门禁拦→加宽后红；真仓 22 处命中实录→修存量→绿） |
| `md-anchors` | 相对链接的 `#fragment` 在目标文件真实存在（标题按 GitHub slug 规则 + 手写 `<a id>`；《_agent_ready_development》语料 verify.mjs 吸纳——md-links 只管文件存在，标题改名后的锚点漂移是它的盲区） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（注入 `#不存在的锚点` 红→还原绿） |
| `archived-note-pointer` | 归档判定的可复核面（[notes-stocktake 体检](../_backlog/research/2026-10-08-notes-stocktake.md)"判据不可靠"结论的机械切片）：活面（`notes/archived/` 之外的 tracked .md）以 Markdown 链接引用 `notes/archived/<具名 Note>` 须在 `scripts/archived-note-pointers.json` 登记（历史指针类，逐条带理由——登记 = 活面显式承认"我在引用冻结件"）。四形态红：未登记链接 / 登记条目失真（源已无此链接）/ 登记条目失存（源或目标不在位、目标不在 archived）/ 冻结语料空而活面扫描集空；`notes/archived/README.md` 索引导航豁免；反引号裸路径不检（与 md-links 同边界）。**已知边界一：语义判断保留给人**——"不再可能指导未来变更"（进门条件 2）不可机械判定，本门禁只把"被引用还想归档"顶到对账面现形。**已知边界二（2026-10-10 对抗自审逃逸表实测，与 md-links 共享"逐行内联式"几何）**：参考式定义（`[t]: path`）/ 跨行链接 / 代码围栏内 / HTML `<a href>` 四形态逃逸——登记簿双向对账使已登记指针**不能**靠改写为逃逸形态持存（观测集丢失即失真红），逃逸面只剩"新增未登记引用"；带 title 链接本门禁可捕而 md-links 失明（正则遇空格即弃）。加宽（收参考式/HTML href）= 独立 writing-a-gate 轮（带反证），启动条件 = 出现真实的该形态引用 | [archive-review-surface Note](../notes/implemented/2026-10-10-archive-review-surface.md)（两形态注入红：活面加未登记链接点名红 / 登记条目目标改不存在路径失存红；各自还原绿；gates-smoke `archived-pointer-unregistered` / `archived-pointer-stale-entry` 常驻案例） |
| `preset-structure` | presets/ 每角色 `<role>.patch.yml`（0.1.7 形态）：id 规范 + `preset-<role>` 声明行 + name/description/order/plugins 字段 + `presets/<role>/skills/` ≥1 skill 且 frontmatter name=目录名 | 同 [noise-sweep](../notes/implemented/2026-09-24-noise-sweep.md)（清欠账：缺件角色目录注入红→还原绿） |
| `claude-symlink` | 两条 symlink（vendor 同构）：根 `CLAUDE.md` → `AGENTS.md`；`.claude/skills` → `../.agents/skills`（让 Claude 系 harness 发现与 DSH 同一批开发技能——上游 `.claude/` 只此一件） | [r1-scaffold](../notes/implemented/2026-09-24-r1-scaffold.md) + [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（断链 / 指错两形态注入红→还原绿） |
| `pack-bundle-compat` | pack 的 dsh.bundle.patch 指向真实文件；**盘上每个 `presets/<role>.patch.yml` 都在数组里**（事实源 = 盘上目录，同 `role-list-sync`——原判据只要"≥1 条"，新增角色漏登记会绿而坏）；dsh.compatibility.dshReleases 非空且**含当前 vendor tag**（升 pin 忘把新 tag 加进兼容矩阵即 L0 红——判据同 release-smoke ④，事实源在 verify） | 同 [noise-sweep](../notes/implemented/2026-09-24-noise-sweep.md)（patch 指向不存在文件注入红→还原绿）；覆盖完整性反证 = 从数组删掉 scout 一条 → 红（`presets/scout.patch.yml 在盘上但未登记`）→ 还原绿（[信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) §实施记录 S4 复验 F8）；tag 反证 = [release-smoke-hardening Note](../notes/implemented/2026-10-09-release-smoke-hardening.md)（dshReleases 换 tag 注入 → 红 → 还原绿；gates-smoke `pack-bundle-compat-tag-missing` 常驻案例） |
| `client-half` | pack 的 client 半声明闭环（vendor `validateClientHalvesDeclared()` 只 glob vendor 树内 `packages/client/*`，仓外 pack 在其射程外——本地镜像同款规则）：`exports ./client` ⟺ `dsh.client` 声明双向一致。任一方向脱钩都是静默失效：有 exports 无声明 = 浏览器模块表永不枚举（client 半等于不存在）；有声明无 exports = 无装载入口。声明面归本门禁，真实安装形状（`lib/client.js` 在场）归 L2 release-smoke | [release-smoke-hardening Note](../notes/implemented/2026-10-09-release-smoke-hardening.md)（双方向注入红：改名 exports `./client` 键 / 改名 `dsh.client` 键 → 各自红 → 还原绿；gates-smoke `client-half-no-export` / `client-half-no-decl` 常驻案例） |
| `guard-red-record` | tests 面反证义务机械化（company guard-red-record@5c050ea 移植 + 双址/夹具形态适配）：`test/it` **标题串**带 BUG-nnn = 守卫声明 → ①事故卡双址可解析（`_backlog/bugs/` 活跃 ∪ `_backlog/_archived/fixed_bugs/` 已修；悬空编号红）②同文件逐编号留证块（`// 负例留证 YYYY-MM-DD：…BUG-nnn…` 散文红配方 **或** `// 夹具留证 …` 指名永久负例夹具——夹具语义由消费它的契约测试钉住的既有惯例）；防空语料：零声明被扫到即红。**已知边界**：不制造回归不跑测试，不证明留证为真——它证明"声称守卫具体事故的测试必须把红法写在旁边" | [guard-red-record Note](../notes/implemented/2026-10-09-guard-red-record.md)（三形态注入红：标题声明无留证 / 悬空编号 / 删留证块 → 各自红 → 还原绿；双址正向 = 活跃 bugs/ 卡 + 带留证声明照常 PASS；gates-smoke 两案例常驻 + 存量 7 文件 14 声明逐件留证清单在卡） |
| `row-deps` | preset 与 bundle 行引用的 `@deepseek-ai/*` 全在 peerDependencies | [m2-p1-run-channel](../notes/implemented/2026-09-24-m2-p1-run-channel.md)（违规 insert 行被守卫+row-deps 咬红→还原绿） |
| `workspace-contract` | 研究手册 + 六件 run bundle 模板在位（bundle 目录 drt_<slug>/ 运行时由 lead 创建，无静态目录可查——D17）+ $DSH_HOME/AGENTS.md 化石镜像不在场（手册唯一定居点 = 会话 cwd projectRoot 注入） | 同 [noise-sweep](../notes/implemented/2026-09-24-noise-sweep.md)（清欠账：run 模板暂移注入红→还原绿）；化石镜像反证 = 真实事故红（旧契约镜像在场，lead 按 runs/<slug> 行动被用户实测抓到）→删除→绿 |
| `handbook-budget` | 手册注入字节预算：**逐 preset** 收集 agent-instructions `maxBytes`（任一 preset 零声明即红——摊平收集会静默放行单 preset 缺行）+ 四值同值 + 手册（research-workspace/AGENTS.md）字节数 + 1024B render 余量 ≤ maxBytes——超限时 vendor **静默截断**手册尾部（company 实测事故的同构移植；行数栅栏 doc-budgets 管不到字节） | [company 钉版复核 Note](../notes/implemented/2026-10-09-company-repin-review.md)（三形态反证实录：单 preset 改 8192 → 不一致红；四 preset 同降 8000 → 截断红；单 preset 删声明行 → 裸 preset 红〔对抗自审 S1 抓获〕；各自还原 → 绿——三形态均已入 gates-smoke 常驻案例） |
| `pack-contract-sync` | pack 的 tracked yml/md 文本零 `runs/` 旧契约路径——persona/skill 文本经会话系统提示与 skill 加载注入，携带已废目录契约即污染 run（D17 事故 2 实证：pack 不在首轮 sweep 清单，13 处残留漏网） | D17 事故 2：真实红（verify 逐文件点名 13 处 runs/ 残留）→同 commit 修复→绿 |
| `note-format` | notes/ 决定记录的状态行与骨架：**活动 Note 一律有裸状态行**（`> 状态：<值>`，值域与所在目录互验：proposed/approved/superseded · implemented · rejected（理由可用 `—` 一行附后）；不带日期括号——上游 Status 行同构）；proposed/ 另需输掉的方案在场；implemented/ 需 `## 决定` + `## 输掉的方案` + **`## 实际跑过的验证`（证据节；判定 = 恰好 h2 且标题含 验证/检查/验收/实录/记录/实证/探针/全绿/复验/证据 任一，容忍历史命名变体）** 或 grandfather——**已知边界：这是标题在场检查，不是内容检查**（`## 证据待补`/`## 未验证的猜测` 等否定式标题同样通过，对抗测试实证）；机械面只能保证"作者被逼到必须为此开一节"，证据是否真实充分仍归交付自审与 L4 人工判据；rejected/ 保留提案体 | [note-lifecycle-absorption](../notes/implemented/2026-09-24-note-lifecycle-absorption.md) + [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（双形态注入红：无骨架 implemented / 无状态行 / 状态带日期括号 → 红 → 还原绿）+ [吸收对表推敲卡 §二轮复核](../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md)（**证据节断言 2026-10-08 补**：把 plan-review-gate 的验证节标题改为中性词 `## 附注` → 点名红 → 还原绿；同轮修 1 篇真阳性——polish-to-plateau 的机械绿证据原误置 `## 环境状态`（= Consequences），已归位 Verification） |
| `note-status` | notes/ 的时态与状态面：① 每子目录有 README.md（含 archived/ 冻结层）；②③ research/ 状态行与 README 索引对账——research/ 已清并（2026-09-27），断言条件化保留，目录重现即复活 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（删状态行 / 删索引行 / 移 README 三形态注入红→还原绿） |
| `note-graduation-rewrite` | implemented/ 活跃 Note 零计划体残留（"毕业 = 正文改写"的机器面）：裸节名 `## 验收`（RFC 专有形状）与行内计划体标记（四个强标记 + 四个含「将」的未来时态短语——**词表正本 = verify.mjs 本门禁块 markers 数组**，不抄第二份）零容忍；grandfather 件豁免、archived/ 与 README 不扫、空扫描范围即红（防空语料）——判据窄带（2026-09-27 探针：候选词表对活跃区 31 篇零命中零误报；带后缀变体 `## 验收判据`/`## 验收怎么闭的` 是既有事实体形态不追改，漏报由毕业 skill 语义兜底） | [graduation-rewrite-gate](../notes/implemented/2026-09-27-graduation-rewrite-gate.md)（注入 `## 验收` 节 + `下一步将迁移` 行双形态红 → 还原绿，2026-09-27 实录） |
| `dev-skill-format` | `.agents/skills/*/SKILL.md` 在场 + frontmatter `name` = 目录名 + `description` 以 "Use " 开头（vendor 开发 Skill 约定；形状坏了 = 技能静默不触发，比写错正文更难发现） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（写错 name / 去掉 Use 前缀红→还原绿） |
| `vendor-pin` | vendor/dsh submodule 在位：.gitmodules 正源 URL + 钉 commit `639ed01539`（tag dsh-v0.2.0-rc.2）——D10 销账的机械面，机制权威自持 | [vendor-submodule 毕业 Note](../notes/implemented/2026-09-24-vendor-submodule.md)（submodule 钉错 commit 注入红 → 还原绿） |
| `vendor-clean` | vendor/dsh 只读铁律：`git status --porcelain` 零未提交改动——机制权威不许就地改 | [vendor-submodule 毕业 Note](../notes/implemented/2026-09-24-vendor-submodule.md)（touch 注入红 → checkout 还原绿） |
| `secrets-untracked` | tracked 清单零敏感/残留物（credentials/.env/.pem/.tgz/.log/…） | [入口链审计](../notes/implemented/2026-09-24-entry-chain-fresh-agent-audit.md)（.pem 注入红→还原绿） |
| `role-list-sync` | 角色清单单一事实源 = 盘上 presets/；代码（scripts/tests/dev 的 .mjs/.sh）里角色清单字面量（单行 ≥3 角色名 / `[...]` 块 ≥3 角色名字符串）即红——检测名从盘上现取 | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md)（JS 单行数组/多行数组块/bash for-in 三形态注入红→还原绿） |
| `gate-ledger-sync` | 本表门禁名集合 = verify 脚本 gates 数组（登记与实现不漂移） | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md)（表删行/数组加假名红→还原绿） |
| `entry-chain` | 根入口链成员在场，AGENTS 的入口链标题存在；链接解析归 md-links | [gates-smoke](../scripts/smoke/gates-smoke.mjs) 的 `entry-chain-no-title` 注入；[历史加固证据](../notes/implemented/2026-09-24-review-driven-hardening.md) |
| `doc-budgets` | 常驻文档预算：`scripts/doc-budgets.json` 拥有上限（登记项必须存在且不超限；仓内新增 AGENTS.md 必须登记——缺登记即红）。行数度量（CJK 词数不可靠，等价上游 verify-doc-budgets 的词数预算）；超限处置序 = 下放 > 压缩 > 升顶（升顶须同变更登记理由）。**AGENTS.md 枚举 = tracked-only**（git ls-files；2026-10-08 收口——原 walk 卷入 gitignored 运行区） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（超限/缺登记两形态注入红→还原绿）+ [审计 P3 收尾轮](../notes/implemented/2026-10-07-audit-p3-closure-round.md)（件④：runtime 探针 AGENTS.md 误红实证 → tracked-only 化绿；tracked 未登记注入仍红） |
| `align-ledger` | 对齐台账机读对账（docs/alignment-ledger.json ↔ vendor/dsh ↔ 本仓落点）：source 必须在 vendor/dsh 存在（换 pin 后源移位即红 = 重审触发器）· verdict=adopted/adapted 的 landing 必须存在 · na 必须给理由 · **na 必须给活性依据，且如实分两层**：① `liveness` 机械缺席断言（路径 `absent` / glob `globAbsent`）——该路径或匹配一旦出现即红，**仅限"目录/文件树缺席本身就是信号"形态**（如 `website/`、`.github/`、`packages/client/`）；断言对象不得是 vendor 源路径本身（装饰性断言 = 换了写法的免检区，永不为真实失效而响；自查抓获 7 处）。② 能力面缺席（"本仓无 X 子系统/实现面"）用 `reReviewOn` **声明式人工重估触发条件**——一条 glob 无法表达"没有模块实现能力 X"，故不假装机械覆盖（对抗自审实证：首版猜路径形态断言，造 `src/lib/session-v5.ts` 时门禁照旧全绿；现状 11 条机械 + 13 条声明）。**两者皆无即红**（"不适用"是当时不适用，不是永久免检区；依据静默腐烂 = 本条增设动因） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（注入不存在 source / 不存在落点 / na 无理由三形态红→还原绿）+ [吸收对表推敲卡 §二轮复核](../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md)（na 活性六形态红→还原绿，`gates-smoke` 14 案例全绿：`.github` 路径型 · `docs/**/*.zh.md` **glob 型**（此前本分支零覆盖，二轮补）· 删 `liveness` 字段型 · **装饰性断言型**（改回 vendor 源路径 → 点名"断言空转"红）· **能力面两依据皆缺型** · 存量补齐后绿） |
| `repo-conventions` | 与 vendor 本体的机械约定对齐：`.editorconfig`（root/LF/尾换行）· `.gitattributes`（`* text=auto eol=lf`）· `package.json engines.node` **直接等于** vendor/dsh/package.json 的值（换 pin 即红）· pre-commit 含 `git diff --cached --check` | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（改 engines / 删 gitattributes / 删 whitespace 检查三形态注入红→还原绿） |
| `vendor-links` | vendored 解析的机械面（E1 事故教训）：根 package.json 每个 `@deepseek-ai/*` devDependency 在 lockfile importer 里解析为 `link:vendor/dsh/...`；overrides 三件套（cordis/cosmokit/schemastery）无 registry 包条目；`link:vendor/dsh/` 出现 0 次即红（防空语料） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)（改 devDep 为 registry 版 / 注入 registry 条目 / 清空 link 三形态红→还原绿） |
| `overlay-fresh` | 源码域 overlay 是生成物：`dev/research.overlay.yml` 必须等于 `node dev/render-overlay.mjs` 从 pack 的渲染结果（0.1.7 preset 重设计后 overlay 携带 preset 行，两处手写必漂移；本仓首个 tracked 生成物） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + 本轮升 pin（改 pack 不重渲染 → 红；还原绿） |
| `pack-workspace-fresh` | pack 的工作区种子（研究手册 + NODES + 判型模式库 + templates/run/ 模板；清单 = `dev/sync-pack-workspace.mjs` 的 FILES）必须等于 `node dev/sync-pack-workspace.mjs --check` 的正本同步结果——手册/模板是会话 cwd 内容，pack 必须自带（否则部署方装了包也没有研究纪律）；正本 = `research-workspace/` | [部署工程化](../notes/implemented/2026-09-26-deployment-engineering.md)（改正本不重同步 → 红；还原绿） |
| `client-keys` | 观察面 client 的 keyed 字面量单一正本（company 坑 1：拼错不报错永不渲染）：字面量只住 `src/client/keys.ts`；`slots.inject` 首参与描述符 name/key/id 只许 keys.ts 导出的标识符。**keyed 数组族**（工具名族）同正本（审计 P3 件①收口）：族导出只许住 keys.ts（Cordis `inject` 依赖声明豁免——宿主合同非 keyed 族）、族值引号字面量别处即红、register 描述符 shorthand `key,` 的取值来源必须可溯到 keys.ts 导出（旧检查的无冒号盲区） | [observability-gui 毕业记录](../notes/implemented/2026-09-24-observability-gui.md) Stage 1（四种形态红证：keys.ts 外值位字面量/inject 字面量/描述符 key 字面量/keys.ts 缺席 → 红；还原绿。类型位（PropsRuntime<泛型参数>）豁免——编译期可查非静默失效面，Stage 2 实证误咬后收窄）+ [审计 P3 收尾轮](../notes/implemented/2026-10-07-audit-p3-closure-round.md)（件①：加宽首跑实咬 RESEARCH_TOOL_KEYS 族正本漂移（真债）→ 搬 keys.ts 转绿；注入内联族数组 → ④⑤ 双规则齐红 → 还原绿；`export const inject` 首跑误咬 → Cordis 合同豁免收窄） |
| `client-effect-wrap` | 驾驶舱 slot/页签/活标题注册全量包 `scoped.effect`（registrations are effects 的 dispose 即撤销贡献——零裸注册）+ 防空语料（`src/client/index.ts` 零注册调用即红）；层边界 = 只查 index.ts 登记装配位 | [test-strategy 采纳](../notes/implemented/2026-10-04-test-strategy-adoption.md)（工具卡循环裸 `slots.inject` 收口：还原裸语句 → 红 → 复包 → 绿） |
| `proposed-pointer-live` | live 文件（tracked，**排除 `notes/` 历史层**与 vendor/）里指向 `notes/proposed/<x>.md` 的**具体指针**必须存在——`md-links`/`md-anchors` 只扫 `.md` 的链接语法，非 `.md` 注释里的指针是它们的盲区（preset 头注还随包分发）。防空语料：0 个 live 文件、或 0 个指针被检查即红（零个具体 RFC 指针合法）；tracked 文件缺席/不可读即红 + `quotepath=false`（2026-10-07 ls-files 族收口） | [信噪整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) §实施记录（注入死指针 → 红 → 还原绿；范围实测 live 120 文件零误报；宽版 `ref-paths` 因 13 处 vendor 相对/自相对/外部引用误报被否，理由同记该处）；收口反证（2026-10-07）= 非 ASCII live 文件注入死指针 → 红（file:line 逐字）→ 还原绿（[lsfiles RFC](../notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md)） |
| `pin-agreement` | live 文件里的**钉身份复述**必须与 submodule 实际状态一致：每个 40 位 hex 串 = submodule HEAD；每个 `dsh-v*` tag = submodule tag（唯一例外：同行带外部归属标记「语料/参考仓/company/外部材料」的，是别的仓的 pin）；notes/ 历史层豁免，活动指令层（notes/README.md、notes/AGENTS.md）受检（2026-10-04 扩围）；录制语料层豁免 = `snapshots/replay/` 与 `tests/fixtures/run-state/`——录制流的 vendor 构建戳是挥发性身份、场景声明 `snapshot.json` 的 codeAnchor 是录制时的本仓 commit（历史证据身份），均非本仓钉声明（`snapshots/` 其余文件仍受检；放进 `snapshots/replay/` 的钉复述不受检——该路径是录制证据层，钉声明应住 docs/ 或 package 面）。防空语料：0 个 hex 或 0 个 tag 被检查即红；tracked 文件盘上缺席或不可读即红（2026-10-07 fail-loud 收口——迁移实证：npm 缓存件误入库靠缺席静默跳过漏检到目录迁移才现形） | [信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) §实施记录（实测三处曾写错：env.sh 的 tag、design/10 的层版本、alignment-ledger 的 commit；反证 = 改一处 hex → 红 → 还原绿）；扩围反证（2026-10-04）= notes/README.md 注入旧 tag → 红（逐字命中 file:line）→ 还原绿（[fresh-agent-doc-audit](../notes/implemented/2026-10-04-fresh-agent-doc-audit.md)）；缺席反证（2026-10-07）= 暂移 tracked 文件离盘 → [pin-agreement] 红 → 还原绿（[runtime-scripts Note](../notes/implemented/2026-10-07-runtime-scripts-layout.md)）；扩围反证（2026-10-09）= 夹具整组迁入 `snapshots/replay/` 未带豁免 → 逐个录制流点名 codeAnchor/构建戳 ≠ submodule HEAD → 红 → 豁免扩至该录制层 → 绿（[snapshots 采纳 Note](../notes/implemented/2026-10-09-snapshots-adoption.md)） |
| `count-free` | live 文件不写硬编码计数（`<数> 门禁` / `<数> tests` / `<数> 断言` / `<数> 条源面`）——计数有正本（gates 数组 / 本表 §L0 / `ls`），散文副本必腐。防空语料：0 个 live 文件即红；tracked 文件缺席/不可读即红 + `quotepath=false`（2026-10-07 ls-files 族收口） | [信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) §实施记录（首跑即咬红**本门禁自己的注释**——它照抄了那几个历史数字，即它有效的第一份证据；反证 = 写回计数 → 红 → 还原绿）；收口反证（2026-10-07）= 非 ASCII live 文件注入计数 → 红（file:line 逐字）→ 还原绿（[lsfiles RFC](../notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md)） |
| `port-exclusive` | 端口独占（scripts/AGENTS「端口与临时路径自持有」的机械面）：tracked scripts/ + dev/ 的 .mjs/.sh 端口缺省声明（`port =`/`PORT=` 赋值行；注释行用法示例不认领）同一端口号至多一文件认领；引用 `DSH_RUN_PORT` 的声明 = run 通道连接方/通道本身（hitl-answer/run-kickoff/boot-run），豁免。防空语料：0 个声明被检查即红 | [审计 P3 收尾轮](../notes/implemented/2026-10-07-audit-p3-closure-round.md)（件⑤：**首跑实咬真实撞号** 3102 = team-preflight-smoke × entry-chain-probe（file:line 逐字）→ 改 entry-chain-probe 缺省 3105 绿；注入回归 3101→3102 → 红 → 还原绿） |
| `hooks-active` | pre-commit 激活态：`git config core.hooksPath` 指向 dev/hooks（dev/env.sh 幂等设置，相对/绝对都认）——fresh clone 未 source env.sh = 提交零门禁（红 commit 溜进历史有 postmortem 前科），在手跑 verify 时 fail-loud 并给出修正入口；GIT_* 剥离（子进程纪律） | [审计 P3 收尾轮](../notes/implemented/2026-10-07-audit-p3-closure-round.md)（件⑥：unset core.hooksPath → 红 → 重设还原绿） |
| `doc-now-only` | live 文档只写 now，不写变更史：禁「已销账 / 修订 → / 曾用 / 首版…已由…替换」（`docs/AGENTS.md` 自身豁免——它是这条规则的家，必须能举例禁用词）；另豁免含『doc-now-only』字样的自我引用行。防空语料：0 个 live 文档即红；tracked 文档缺席/不可读即红 + `quotepath=false`（2026-10-07 ls-files 族收口——非 ASCII 的 .md 曾被整体跳过） | [信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) §实施记录（清扫实测 live 文档成片出现这四类措辞；反证 = 注入「已销账」→ 红 → 还原绿）；收口反证（2026-10-07）= 非 ASCII live 文档注入措辞 → 红（file:line 逐字）→ 还原绿（[lsfiles RFC](../notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md)） |
| `backlog-liveness` | 问题、缺陷、调研、方法、触发索引与归档池在场；活跃卡 frontmatter 状态、日期及缺陷严重级合规，问题卡使用日期 slug、已声明可关闭的卡不得留活跃区；活跃调研有 `topic`/`intent` 且不带 `status`；各池成员须被索引点名。历史归档正文保留，不要求追补 metadata。检查只证明结构，不证明结论、证据质量或实施授权 | [gates-smoke](../scripts/smoke/gates-smoke.mjs) 的 `backlog-liveness` 注入案例；规则正本 = [backlog 入口](../_backlog/README.md)，实现 = [backlog-liveness](../scripts/lib/backlog-liveness.mjs) |
| `dist-manual-version` | dist 导出合同（精神移植参考仓 ai_dsh_architect 的 `docs/distribution.md`）：`_dist/安装手册.md` 是 tracked 生成物（生成器 = `scripts/dist/export-dist.mjs`），必须在库；表头版本 = pack `package.json` 版本，且表头指名 `dsh-deep-research-pack-<version>.tgz`——版本 bump 不重导出即红（手册与旁边的 tarball 不能漂移） | [dist-export Note](../notes/implemented/2026-09-28-dist-export.md)（表头版本注入 `9.9.9` → 红 → 还原绿） |

- **契约回归**（`pnpm test` 守卫族的面对应登记）：可驾驭性契约 = [tests/navigability-contract.test.mjs](../tests/navigability-contract.test.mjs)（design/50 与状态合同唯一正本、任务入口矩阵九任务与链接目标、scripts/dev/fixtures 资产索引全覆盖、fixture 每组真实 consumer 零孤儿——D23 立红与反证记录 = [项目可驾驭性 Phase 1 Note](../notes/implemented/2026-10-05-project-navigability-phase1.md)）；fixture 分类 = [tests/fixtures/README.md](../tests/fixtures/README.md)；其余守卫的归属见各自文件头注。
- **通过判据**：全绿；`verify` 的门禁清单与 `tests/` 守卫一一登记在案，每条带反证记录（上表）。
- **何时跑**：每轮 goal 续驶必跑。

### L1 挂载面（真挂载 = preset 类改动的完成定义）

- **定义**：每个研究角色 preset 在**真 DSH 会话**里挂载成功——persona 生效、skills 可见、工具面齐全。dump/roster 可见不算（company postmortem 0001 实证：挂载失败只有真会话抓得到）。
- **最小真检查**：`node scripts/smoke/preset-smoke.mjs`——keyless 预检（环境/安装形状断言）+ 真会话档（`DSH_SMOKE_REAL=1`：boot 真 web/headless 逐角色建会话，机器断言工具/skill 面在场；落地证据 = [L1/L2 绿灯 Note](../notes/implemented/2026-09-24-l1-l2-green.md)）。
- **通过判据**：全部角色真挂载绿；失败角色即里程碑未完成，无例外。
- **何时跑**：preset 内容/结构改动时；框架里程碑必跑。

### L2 安装面（真实安装形状）

- **定义**：插件以用户实际获得的方式可用——`npm pack` 产物完整，装进**干净 profile** 成功，起会话可用；client 半（观察面）在安装形状里在场。
- **最小真检查**：`release-smoke`：`npm pack` → 在选定 `DSH_HOME` 重建测试 profile → `dsh plugin add` → scaffold/preflight（`--install-only`，跳过模型就绪检查）→ 安装域会话断言；无模型调用。独立默认 preflight 仍检查凭据在场。进程卫生全程有界：run() 超时预算（install 180s / 默认 120s / preset-smoke 外层 300s——company 实证值）+ mkdir 原子并发锁 + 子进程组退出确认回收。
- **通过判据**：pack 清单与 `files` 声明一致、安装零缺失警告、干净 profile 会话能列出研究角色；安装副本带 `lib/client.js`、manifest peers-only（`dependencies` 缺席）、boot 页模块表含本包 client 行（preset-smoke 真会话档断言，安装域经 release-smoke ⑤ 委托覆盖）、端口用后无监听残留。
- **何时跑**：包结构/release 相关改动时；框架里程碑必跑。

### L3 领域面（Deep Research 方法论完整性 — 本项目独有）

- **定义**：从 codex Deep Research harness（`/Users/bowhead/ai_tool_deepresearch`）提炼的方法论在本插件上有完整落点，且**用 DSH 原生载体**实现。
- **最小真检查**：`docs/design/30-methodology-mapping.md`（映射表）审查 + `tests/evaluation-contract.test.mjs` 的 keyless 断言。
- **通过判据**（四条全要）：
  1. **生命周期映射完整**：研究生命周期每一环节（立项对齐 / 广度侦察 / 深度挖掘 / 综合写作 / 质量把关 / 审阅交付）在映射表有 DSH 落点（preset persona / skill / agent-team / todo / present…），或带证据的显式弃用理由；
  2. **角色分工单一职责**：每角色一个 owner 列（职责、产出物、验收判据）；任何两类事实不得双 owner 或无 owner；
  3. **证据可追溯载体存在**：最终报告的关键结论 → 来源的追溯链有明确文件载体与格式约定（verify the world 的领域版：结论抽查必须能落到来源文件）；
  4. **信噪比策略显式**：对"搜索结果信噪比差"的处置有显式机制（来源质量分级 / 多源交叉 / 弃用判据），写进角色方法论，不能只靠模型自觉。
- **何时跑**：方法论/preset 内容改动时；框架里程碑必跑。

### L4 交付面（真模型端到端 — 唯一证明"研究做得好"）

- **定义**：真模型、真实研究问题、完整研究 run，产出可核查报告。
- **最小真检查**：
  - **L4-lite（框架里程碑档）**：每角色一条消息的真模型冒烟（验证模型响应 + 工具调用真实发生，类比 company presence-e2e ~$1 档）；
  - **L4 全量（方法论里程碑档）**：一个真实问题的完整 run，机器断言四条——① 报告存在且含来源清单；② 抽查 N 条结论能回溯到来源文件；③ 两点交互纪律（HITL 之间静默自主，不中途问人）；④ 中断后从 run 工作区状态恢复，不依赖 chat memory。
- **通过判据**：按档位全绿；L4 全量**不进常规回归**（成本），只在里程碑跑。
- **何时跑**：里程碑级。

### 完成判断四分离（交付判断公理）

**能加载 ≠ 有行为证据 ≠ 能安装 ≠ 已获交付批准——四个结果必须分别被观察和记录**（语料
来源登记 = [discipline-map 源 11](discipline-map.md#source-11)；判据正本 = 本节）：任何一个
结果都不被其余结果自动补齐，门禁绿灯只证明它执行的断言通过。

| 结果 | 证明它的面 | 不证明 |
|---|---|---|
| 能加载 | L1 真挂载（roster、逐角色会话建起） | 行为正确、安装形态可用 |
| 有行为证据 | L1 行为断言（工具/skill 面）+ L3 契约 + L4 与 run 机械审计 | 安装形态可用、交付获批 |
| 能安装 | L2 release-smoke（发布产物 → 干净 profile → 安装域） | 交付获批 |
| 已获交付批准 | 收尾对账 + 语义自审（[reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md)）+ 用户批准 | —（终点） |

**交付判断四角色**各证明不同的东西、互不冒充：**机械检查**（门禁/契约测试——只证明它执行的
断言通过）· **语义自审**（技能——意图/实现/文档/证据是否说的是同一件事，agent 可自主完成）·
**用户批准**（Plan 呈批/验收——产品取舍）· **显式交互**（HITL 等）。拿 L4 绿掩盖 L0 红 =
§2 互抵违例；拿机械全绿冒充语义自审或用户批准，同理。

## 2. 负面判据（任一出现 = 框架不合理，触发重构而非继续堆功能）

1. 自建机制与 DSH 现成载体重复（如自建 markdown 任务队列 vs agent-team 任务板），且拿不出"DSH 载体不可用"的证据——**不发明纪律**（company D13/D15 否决依据同源）；
2. 角色职责重叠或漂移，某类事实出现双 owner / 无 owner；
3. 挂载假绿：preset 在 dump/roster 可见但真会话缺工具/skill；
4. 生命周期环节在 DSH 上无落点且无弃用登记；
5. keyless 回归里混入真模型/真浏览器依赖（layering 违例）；
6. 评估面互抵尝试（拿 L4 绿掩盖 L0 红）。

## 3. 里程碑 × 面 矩阵

| 里程碑 | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| M1 框架搭建 | ✓ | ✓ | ✓ | ✓ | lite |
| M2 首次完整研究 run | ✓ | 改动则跑 | 改动则跑 | ✓ | **全量** |
| M3+ 打磨/回归固化 | ✓ | 改动则跑 | 改动则跑 | 改动则跑 | 按需 |

里程碑进度由本轮目标与交付范围判断；本表只定义里程碑的验收形状，不携带时变状态。

## 4. 每轮 goal 续驶的判定程序

1. 每轮必跑 L0；本轮改动涉及哪些面，就加跑哪些面（判定权在代理，跑过什么报什么，只报告实际跑过的检查）；
2. goal 标 `complete` 的唯一条件：当前里程碑矩阵全绿；
3. 同一面连续 3 轮无法转绿且阻塞条件明确 → goal 标 `blocked`，报告具体条件（区分"缺上游能力"与"设计缺陷"：前者找 DSH seam 或提议上游，后者触发负面判据重构）；
4. 评估标准本身的变更 = D 号决策登记，禁止静默放宽。

## 5. 已知边界（诚实记账）

- L1/L2/L4 需要真 DSH 环境与（L4）`DEEPSEEK_API_KEY`；环境未就绪时该面标"未跑"，**不等同通过**（已 green 面的证据 = 各面定义里的毕业 Note 引用；未闭面的状态由当前工作证据表达，"未跑"≠"通过"）。
