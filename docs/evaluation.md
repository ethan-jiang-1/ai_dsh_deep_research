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
- **最小真检查**：`node scripts/verify/verify.mjs`（或 `pnpm verify`）+ `pnpm test`（命令正本 = `package.json` 的 test 脚本；本仓唯一登记的测试命令）——均 keyless、秒级；改门禁时可 `--only=<gate[,gate]>` 只判该门（输出与退出码只计它，末尾自报"仅判 N 道"；收尾仍须全量）。改驾驶舱（client 面，D18）时加跑 `node scripts/smoke/client-load-smoke.mjs`（headless 真浏览器断言：插件零失败横幅 / 无 loader entry 失败 / 本包 client bundle 进 /plugins/ 批次 / 页签渐进面与活动流，清单以脚本为准；失败自动留 `runtime/smoke-workspace/client-load-*` 的 png/html/console/meta 现场；无窗口内交付目标 = exit 2 SKIP，未跑 ≠ 通过）——路由正本 = [guides/60 §2 改驾驶舱行](./guides/60-dev-loop.md)。
- **门禁登记表**（正本在此；与 `scripts/verify/context.mjs` 的 `gates` 数组经门禁 `gate-ledger-sync` 机械对账——加门禁须两处同步，漏一处即红）。**列形纪律**：断言列只写现在为真的合同；反证列只留一行指针——注入红/还原绿全程与案例正文住对应 Note 与 [gates-smoke](../scripts/smoke/gates-smoke.mjs) 案例表，本表不复述叙事；判定细节与已知边界住对应门禁块头注（`scripts/verify/gates/<域>.mjs`）：

> **反证口径（两态）**：常驻 = [gates-smoke 案例表](../scripts/lib/gates-cases.mjs) 的 `CASES` 注入案例（零注入对照组绿 + 注入后点名红；覆盖率与"无常驻案例的门禁"正本 = 同文件 `NO_CASE_GATES`，反向对账 = `tests/contracts/verify-gates.test.mjs`——本表不记数；逐门禁查法 = `grep -n "gate: '<名>'" scripts/lib/gates-cases.mjs`）；结构性不适的 4 道（vendor-pin / vendor-clean / pin-agreement / hooks-active——断言对象是 submodule 或本机 git config 的真实状态，副本不可造）理由与登记同住该常量，反证 = 一次性 Note 红录。

| 门禁 | 断言什么 | 反证指针 |
|---|---|---|
| `md-utf8-newline` | 所有 tracked .md 严格 UTF-8、恰一个结尾换行（git ls-files 驱动——运行区不扫） | [noise-sweep Note](../notes/implemented/2026-09-24-noise-sweep.md) |
| `md-links` | tracked .md 的相对 Markdown 链接可解析**且目标被 git 跟踪**（运行区/本机数据引用走反引号路径） | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md) + [BUG-016 卡](../_backlog/_archived/fixed_bugs/BUG-016-fresh-clone-mdlinks-runtime-links.md)；gates-smoke `md-links-untracked` 常驻案例 |
| `md-anchors` | 相对链接的 `#fragment` 在目标文件真实存在（GitHub slug 规则 + 手写 `<a id>`） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `archived-note-pointer` | 活面（notes/archived/ 之外的 tracked .md）链接引用 `notes/archived/<具名 Note>` 须在 scripts/archived-note-pointers.json 登记，双向对账 | [archive-review-surface Note](../notes/implemented/2026-10-10-archive-review-surface.md)；gates-smoke `archived-pointer-unregistered` / `archived-pointer-stale-entry` 常驻案例 |
| `preset-structure` | presets/ 每角色 `<role>.patch.yml`（0.1.7 形态）：声明行 + config 字段 + `presets/<role>/skills/` ≥1 skill（frontmatter name = 目录名） | [noise-sweep Note](../notes/implemented/2026-09-24-noise-sweep.md) |
| `claude-symlink` | 两条 symlink：根 `CLAUDE.md` → `AGENTS.md`；`.claude/skills` → `../.agents/skills`（Claude 系 harness 发现与 DSH 同一批开发技能） | [r1-scaffold Note](../notes/implemented/2026-09-24-r1-scaffold.md) + [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `pack-bundle-compat` | pack 的 dsh.bundle.patch 指向真实文件，**盘上每个 `presets/<role>.patch.yml` 都在数组里**；dsh.compatibility.dshReleases 非空且含当前 vendor 版本；`engines.dsh` 是宿主范围且覆盖当前 vendor tag；矩阵是已测基线 | [noise-sweep Note](../notes/implemented/2026-09-24-noise-sweep.md) + [release-smoke-hardening Note](../notes/implemented/2026-10-09-release-smoke-hardening.md)；gates-smoke `pack-bundle-compat-tag-missing` 常驻案例 |
| `client-half` | pack client 半声明闭环：`exports ./client` ⟺ `dsh.client` 双向一致（声明面归本门禁，安装形状归 L2 release-smoke） | [release-smoke-hardening Note](../notes/implemented/2026-10-09-release-smoke-hardening.md)；gates-smoke `client-half-no-export` / `client-half-no-decl` 常驻案例 |
| `guard-red-record` | `test/it` 标题串带 BUG-nnn = 守卫声明：事故卡双址可解析 + 同文件逐编号留证块（负例/夹具二形态），零声明被扫到即红 | [guard-red-record Note](../notes/implemented/2026-10-09-guard-red-record.md)；gates-smoke 两案例常驻 |
| `row-deps` | preset 与 bundle 行引用的 `@deepseek-ai/*` 全在 peerDependencies | [m2-p1-run-channel Note](../notes/implemented/2026-09-24-m2-p1-run-channel.md) |
| `workspace-contract` | 研究手册 + `templates/run/` 全表在位；`$DSH_HOME/AGENTS.md` 化石镜像不在场（手册唯一定居点 = 会话 cwd 注入） | [noise-sweep Note](../notes/implemented/2026-09-24-noise-sweep.md) |
| `handbook-budget` | 手册注入字节预算：逐 preset maxBytes 声明齐且同值，手册字节数 + 1024B render 余量 ≤ maxBytes | [company 钉版复核 Note](../notes/implemented/2026-10-09-company-repin-review.md)；gates-smoke 三形态常驻案例 |
| `pack-contract-sync` | pack 的 tracked yml/md 文本零 `runs/` 旧契约路径（D17） | 反证 = D17 事故 2 真实红实录（verify 逐文件点名残留 → 同 commit 修复） |
| `note-format` | 活动 Note 裸状态行（值域与目录互验）；proposed/ 另需输掉的方案；implemented/ 需「决定/输掉的方案/实际跑过的验证」三节或 grandfather；rejected/ 保留提案体 | [note-lifecycle-absorption](../notes/implemented/2026-09-24-note-lifecycle-absorption.md) + [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + 证据节断言二轮复核 = [推敲卡](../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md) |
| `note-status` | notes/ 每子目录有 README.md（含 archived/ 冻结层）；research/ 重现时状态行与索引对账断言复活 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `note-graduation-rewrite` | implemented/ 活跃 Note 零计划体残留（裸节名 `## 验收` 与未来时态标记，词表正本 = gates/c-notes.mjs 本门禁 markers 数组） | [graduation-rewrite-gate Note](../notes/implemented/2026-09-27-graduation-rewrite-gate.md) |
| `dev-skill-format` | `.agents/skills/*/SKILL.md` 在场 + frontmatter name = 目录名 + description 以 "Use " 开头 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `vendor-pin` | vendor/dsh submodule 在位：.gitmodules 正源 URL + 钉 commit `687f282e86`（tag dsh-v0.2.1-rc.2） | [vendor-submodule Note](../notes/implemented/2026-09-24-vendor-submodule.md)；副本注入不适（理由：断言对象 = submodule 真实状态——fixture 副本不拷 submodule 内容，基线即红），反证 = 一次性 Note 红录 |
| `vendor-clean` | vendor/dsh `git status --porcelain` 零未提交改动（机制权威不许就地改） | [vendor-submodule Note](../notes/implemented/2026-09-24-vendor-submodule.md)；副本注入不适（理由：断言对象 = submodule 的 git 状态——fixture 副本无此仓库，基线即红），反证 = 一次性 Note 红录 |
| `secrets-untracked` | tracked 清单零敏感/残留物（credentials/.env/.pem/.tgz/.log/node_modules/.tmp*/_tmp/、pack 构建产物 lib/、编辑器/OS/缓存残留…） | [入口链审计 Note](../notes/implemented/2026-09-24-entry-chain-fresh-agent-audit.md) |
| `host-paths` | live 面（随包内容/当前文档/脚本/CI/工作区种子）零本机绝对 home 路径；历史 notes/_backlog/snapshots/tests fixtures 豁免 | [git 边界指南](./guides/63-git-boundary.md)；反证 = gates-smoke 注入 `/Users/<name>/...` 红 |
| `role-list-sync` | 角色清单单一事实源 = 盘上 presets/；scripts/tests/dev 代码里的清单字面量（≥3 角色名）即红 | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md) |
| `gate-ledger-sync` | 本表门禁名集合 = `context.gates`（登记与实现不漂移） | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md) |
| `entry-chain` | 根入口链与子树指令门牌成员在场（六份子树 AGENTS.md 在成员清单内），AGENTS 的入口链标题存在；链接解析归 md-links | gates-smoke `entry-chain-no-title` 注入案例 + [review-driven-hardening Note](../notes/implemented/2026-09-24-review-driven-hardening.md)；成员扩围反证（移除 `tests/AGENTS.md`/`_backlog/AGENTS.md` 看红→还原绿）= 2026-10-12 卫生轮实录 |
| `doc-budgets` | 常驻文档预算：[scripts/doc-budgets.json](../scripts/doc-budgets.json) 拥有上限——登记项在场且不超限，仓内新增 AGENTS.md 必须登记 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + [审计 P3 收尾轮](../notes/implemented/2026-10-07-audit-p3-closure-round.md) |
| `align-ledger` | `docs/alignment-ledger.json` 机读对账：source 在 vendor/dsh 存在、adopted/adapted 落点存在；na 须给理由 + 活性依据（liveness 或 reReviewOn，**两者皆无即红**） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + na 活性二轮复核 = [推敲卡](../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md)；gates-smoke 案例常驻 |
| `discipline-state-vocab` | [discipline-map.md](discipline-map.md) 状态列首词属三态闭集（照搬/带证据适配/不适用），按表头定位状态列，越界即红 | 反证 = 2026-10-19 首次运行即红，抓出 2 行 `已具备`（`证据匹配面`/`六误区清单`）→ 改 `照搬`/`带证据适配` 后绿；来历 = [语义漂移卡](../_backlog/_archived/settled_issues/2026-10-19-discipline-map-semantic-drift.md)（「已具备」暗示免于重校，「带证据适配」要求每次换 pin 重验，混用 = 悄悄签免检）；gates-smoke 案例常驻 |
| `discipline-na-trigger` | [discipline-map.md](discipline-map.md) 状态列以「不适用」开头的每行必须含可判定的重估触发词 | 反证 = 2026-10-19 注入回归：把一行状态列还原成裸 `不适用` → 该门禁红、还原后绿；来历 = [vendor-pin-bump-021rc2](../notes/implemented/2026-10-19-vendor-pin-bump-021rc2.md)（§维护规则 承诺的"由门禁复核"原未兑现——`align-ledger` 只读 JSON，从不读人读表）；gates-smoke 案例常驻 |
| `repo-conventions` | 与 vendor 机械约定对齐：.editorconfig/.gitattributes 形态、engines.node = vendor 值、pre-commit 含 `git diff --cached --check`、**子进程凭据卫生**（`scripts/lib/env.mjs` 在场 + scripts 入口零 `env: {...process.env}` 整体透传） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)；gates-smoke `repo-conventions-editorconfig-root-missing` 常驻案例 |
| `vendor-links` | 根 package.json 的 `@deepseek-ai/*` devDependencies 在 lockfile 解析为 `link:vendor/dsh/...`；overrides 三件套无 registry 条目 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `overlay-fresh` | `dev/research.overlay.yml` = `dev/render-overlay.mjs` 从 pack 的渲染结果（tracked 生成物，勿手改） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `pack-workspace-fresh` | pack 的工作区种子 = `research-workspace/` 正本（手册/NODES/判型模式库/模板）的同步结果，`dev/sync-pack-workspace.mjs --check` 对账 | [部署工程化 Note](../notes/implemented/2026-09-26-deployment-engineering.md) |
| `client-keys` | 观察面 client 的 keyed 字面量单一正本 = `src/client/keys.ts`（拼错不报错永不渲染）：槽名/描述符键/族值/注入标识符全须出自其导出 | [observability-gui Note](../notes/implemented/2026-09-24-observability-gui.md) + [审计 P3 收尾轮](../notes/implemented/2026-10-07-audit-p3-closure-round.md) + gates-smoke 覆盖嵌套目录、空格路径、`.ts` 符号链接及忽略目录/目录链接 |
| `client-effect-wrap` | 驾驶舱 slot/页签/活标题注册全量包 `scoped.effect`（零裸注册），只查 index.ts 登记装配位 | [test-strategy 采纳 Note](../notes/implemented/2026-10-04-test-strategy-adoption.md) |
| `proposed-pointer-live` | live 文件里指向 `notes/proposed/<x>.md` 的具体指针必须存在（notes/ 历史层与 vendor/ 除外——md 链接族的盲区） | [信噪整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) + [lsfiles RFC](../notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md) |
| `pin-agreement` | live 文件里的钉身份复述与 submodule 一致：40 位 hex 串 = submodule HEAD，`dsh-v*` tag = submodule tag | [信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md)；扩围与收口 = [fresh-agent-doc-audit](../notes/implemented/2026-10-04-fresh-agent-doc-audit.md) / [runtime-scripts Note](../notes/implemented/2026-10-07-runtime-scripts-layout.md) / [snapshots 采纳 Note](../notes/implemented/2026-10-09-snapshots-adoption.md)；副本注入不适（理由：fixture 无 submodule，门禁在读钉身份一步即 fail-loud，注入的伪串永不到达扫描步），反证 = 一次性 Note 红录 |
| `count-free` | live 文件不写硬编码计数（`<数> 门禁/tests/断言/条源面`）——计数有正本，散文副本必腐 | [信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) + [lsfiles RFC](../notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md) |
| `port-exclusive` | tracked scripts/ 与 dev/ 的端口缺省声明同一端口号至多一文件认领（`DSH_RUN_PORT` 引用方豁免） | [审计 P3 收尾轮 Note](../notes/implemented/2026-10-07-audit-p3-closure-round.md) |
| `hooks-active` | pre-commit 激活态：`git config core.hooksPath` 指向 dev/hooks | [审计 P3 收尾轮 Note](../notes/implemented/2026-10-07-audit-p3-closure-round.md)；副本注入不适（理由：断言对象 = 本机 git config 而非 tracked 文件面——fixture 副本 git init 后本就未设 hooksPath，注入无红可造），反证 = 一次性 Note 红录 |
| `doc-now-only` | live 文档只写 now：禁「已销账 / 修订 → / 曾用 / 首版…已由…替换」措辞（docs/AGENTS.md 与本门禁自我引用行豁免） | [信噪比整治 RFC](../notes/implemented/2026-09-26-signal-to-noise-remediation.md) + [lsfiles RFC](../notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md) |
| `backlog-liveness` | backlog 各池（问题/缺陷/调研/方法/触发索引/归档）在场且生命周期合同合规——结构检查不证明结论、证据质量或实施授权 | gates-smoke 注入案例（含生命周期四形态 + 活跃索引幽灵 / 归档退出值）+ 仓内红→绿实录；借鉴三态 = [借鉴 Note](../notes/implemented/2026-10-12-backlog-process-borrow.md)；规则正本 = [backlog 入口](../_backlog/README.md)，实现 = [backlog-liveness](../scripts/lib/backlog-liveness.mjs) |
| `release-version` | 发布版本单一源：root/pack `package.json` 都是三段 semver 且相等（tag 一致性由 `release-check` 在发布前查） | [发布规则](./guides/64-release-versioning.md)；反证 = gates-smoke 改 pack 版本为 9.9.9 红 |
| `dist-manual-version` | dist 导出合同：`_dist/安装手册.md` 在库且表头版本 = pack 版本、指名 `dsh-deep-research-pack-<version>.tgz` | [dist-export Note](../notes/implemented/2026-09-28-dist-export.md) |
| `workspace-versioning` | 工作区版本控制边界：`research-workspace/.gitignore.example` 与 `drafts/.gitignore` 在库、正本与 pack 种子逐字节相等、拒收行逐项在场；**出现裸 `*` 整目录拒收即红** | 反证 = `gates-smoke` 注入案例（删 `drt_*/` 行 / 加裸 `*` / 删 drafts 白名单）；形态依据 = [工作区版本控制边界 Note](../notes/implemented/2026-10-13-workspace-versioning-boundary.md) |
| `dev-runtime-clean` | `dev/` 只住源码驱动：盘上无 `harness-home` / `drt_*` / `sessions` / `.credentials.yaml`；运行态必须住 `runtime/` 或研究工作区 | 反证 = `gates-smoke` 注入案例（在 `dev/harness-home` 造 `drt_probe`）；规则依据 = [guides/63](guides/63-git-boundary.md) 的跨环境与运行态边界 |
| `cockpit-doc-registry` | 驾驶舱 src/client 与 src/lib 每个模块的路径必须出现在[构成正本](design/40-research-cockpit.md)里（同名模块不互相遮盖） | 反证 = gates-smoke 注入案例（嵌套/同名模块/空格路径/符号链接/忽略目录）；规则来源 = [③驾驶舱卡 ③-b 行](../_backlog/_archived/settled_issues/2026-10-11-executive-research-ux-delivery.md) |
| `run-context-single-source` | `src/client` 的 tracked `.ts/.tsx`（注释除外）不得出现 `_abandoned` 三位置候选链——发现实现唯一正本 = `src/lib/run-context.ts`；`src/lib/final-target.ts` 的终稿地址校验是另一件事，不在本词法门禁范围 | 反证 = gates-smoke 注入案例（客户端文件追加候选链 → 点名红）；规则来源 = [run-context Note](../notes/implemented/2026-10-23-run-context.md) |

- **契约回归**（`pnpm test` 守卫族的面对应登记）：可驾驭性契约 = [tests/contracts/navigability-contract.test.mjs](../tests/contracts/navigability-contract.test.mjs)（design/50 与状态合同唯一正本、任务入口矩阵九任务与链接目标、scripts/dev/fixtures 资产索引全覆盖、fixture 每组真实 consumer 零孤儿——D23 立红与反证记录 = [项目可驾驭性 Phase 1 Note](../notes/implemented/2026-10-05-project-navigability-phase1.md)）；fixture 分类 = [tests/fixtures/README.md](../tests/fixtures/README.md)；其余守卫的归属见各自文件头注。
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
- **冷启动补充**：`cold-start-smoke` 用独立 `DSH_DEV_HOME` + 独立 profile/端口/state，从 tarball 安装并经 `run-driver up --bootstrap` 到浏览器面 GREEN；证明不依赖仓内既有 home/profile。MCP 关闭，团队层需 registry 或缓存。
- **真用户 home 补充**：`real-home-smoke` 把 home 放到系统临时目录（仓库外），用全局 `dsh` 完成 init → install → scaffold/preflight（`--install-only`）→ 真 web 页面，断言 preflight 不再从 profile 误报 peer、boot graph 含本包、已在场团队层 `link:` 不被改写；缺全局 dsh/tarball = exit 2。`preflight-smoke` 用 fake anchor 覆盖“行依赖缺件必须红 / 无锚标未验证 / base-only profile 红 / untracked AGENTS 红 / 空凭据红”。
- **通过判据**：pack 清单与 `files` 声明一致、安装零缺失警告、干净 profile 会话能列出研究角色；安装副本带 `lib/client.js`、manifest peers-only（`dependencies` 缺席）、boot 页模块表含本包 client 行（preset-smoke 真会话档断言，安装域经 release-smoke ⑤ 委托覆盖）、端口用后无监听残留；preflight 的运行时行依赖只从安装锚解析，不把 client/构建期 peer 混进 Node 解析。
- **何时跑**：包结构/release 相关改动时；框架里程碑必跑。

### L3 领域面（Deep Research 方法论完整性 — 本项目独有）

- **定义**：从 codex Deep Research harness（作者本地 `ai_tool_deepresearch`，不随仓）提炼的方法论在本插件上有完整落点，且**用 DSH 原生载体**实现。
- **最小真检查**：`docs/design/30-methodology-mapping.md`（映射表）审查 + `tests/contracts/evaluation-contract.test.mjs` 的 keyless 断言。
- **通过判据**（五条全要）：
  1. **生命周期映射完整**：研究生命周期每一环节（立项对齐 / 广度侦察 / 深度挖掘 / 综合写作 / 质量把关 / 审阅交付）在映射表有 DSH 落点（preset persona / skill / agent-team / todo / present…），或带证据的显式弃用理由；
  2. **角色分工单一职责**：每角色一个 owner 列（职责、产出物、验收判据）；任何两类事实不得双 owner 或无 owner；
  3. **证据可追溯载体存在**：最终报告的关键结论 → 来源的追溯链有明确文件载体与格式约定（verify the world 的领域版：结论抽查必须能落到来源文件）；
  4. **信噪比策略显式**：对"搜索结果信噪比差"的处置有显式机制（来源质量分级 / 多源交叉 / 弃用判据），写进角色方法论，不能只靠模型自觉；
  5. **读者版合同**：Lead 在 review 终局 PASS 后、HITL2 前按 `reader-final` skill 派生
     `final/readable.md`，定稿后复制为 `final/readable-vN.md`；模型可见文本由
     `tests/pack/presets.test.mjs` 的「读者版终稿」断言钉，交付机械把守 = node-gate 门C
     （同版/六节/长度/无 `[来源:]`/`evidence/` 路径），真实 run 的 5 分钟三问是人工可读性判据。
- **何时跑**：方法论/preset 内容改动时；框架里程碑必跑。

### 证据谓词与机械强度（开发仓观察面，非模型可见）

> 2026-10-20 从研究手册移出：这两段只服务开发仓的仪表盘/审计工具链，研究角色（含部署侧）
> 不需要；手册只留角色必须遵守的证据契约。

**有效证据谓词（观察面对账，分层）**：run 仪表盘（run-dashboard）按同一契约渲染——**硬五字段**
（source_url / retrieved_at / quality / found_by / supports）全齐才算有效证据，缺任一标无效
（不计入 topic × evidence 矩阵）；**软二字段**（source_tier / publisher）缺失不否决有效性，
标"未分级"（旧 run 的存量证据按此显示，不回填——run bundle 是交付记录，不改历史）；谓词正本 =
本节，tests/contracts/evaluation-contract.test.mjs 对账。

**机械强度诚实记账**：契约测试核七字段在场与执行者副本对账；仪表盘按上文谓词投影。
**evidence-audit 溯源审计**核 `source_url` 的成功抓取、摘录文本对 web-only 语料的覆盖率与
final 引用链，结果落 bundle 的 audit.md。它不校验日期校准或摘录版式、分段、逐格结构；这些语义
与结构约束由 critic 狩猎，不在仓级结构门中。

### L4 交付面（真模型端到端 — 唯一证明"研究做得好"）

- **定义**：真模型、真实研究问题、完整研究 run，产出可核查报告。
- **最小真检查**：
  - **L4-lite（框架里程碑档）**：每角色一条消息的真模型冒烟（验证模型响应 + 工具调用真实发生，类比 company presence-e2e ~$1 档）；
  - **L4 全量（方法论里程碑档）**：一个真实问题的完整 run。四条判据里**两条机器、两条人工走查**：

    | 判据 | 类型 | 载体 / 命令 | 通过 |
    |---|---|---|---|
    | ① 报告存在且含来源清单 | 机器 | `node scripts/run-gates/node-gate.mjs <bundle>`（门A）+ `final/vN` 在场 | exit 0 |
    | ② 结论能回溯到来源文件 | 机器 | `node scripts/run-gates/evidence-audit.mjs <bundle>` → `audit.md` | exit 0 且 `CRITICAL=0` |
    | ③ 两点交互纪律（HITL 之间静默自主） | 人工走查 | 会话日志里 HITL1 与 HITL2 之间无 `ask_user_question`、无"要不要继续"式汇报 | 结论一行 + 日期写进 bundle 的 `acceptance.md`「人工走查」节 |
    | ④ 中断后从 run 工作区恢复 | 人工走查 | 停通道 → 重启 → 新会话说「继续 `<slug>`」，能接着跑且不依赖 chat memory | 同上 |

    人工走查不是"随便看看"：**没有记录 = 未跑**（未跑 ≠ 通过）。记录位之所以选 `acceptance.md`
    而不是新文件，是因为它已经由 `run-accept` 生成、随 bundle 交付。
- **通过判据**：按档位全绿；L4 全量**不进常规回归**（成本），只在里程碑跑。
- **何时跑**：**里程碑 + [guides/60 §2 任务型路由表](guides/60-dev-loop.md)要求跑 L4-lite 的改动，取并集**。

### 五面的退出语义（统一口径）

每面的最小真检查都按三态收口：**exit 0 = 该面绿 / 1 = 红 / 2 = 未跑（前置缺席）**。未跑 ≠ 通过——
交付报告必须分列"已跑绿 / 已跑红 / 未跑"。脚本层面的正本 = [scripts/AGENTS §verdict 契约](../scripts/AGENTS.md)；
本页只声明它适用于**全部五面**，不只 L0：

| 面 | 最小真检查的退出码来源 |
|---|---|
| L0 | `node scripts/verify/verify.mjs` + `pnpm test`（均 0/1；无 2 态） |
| L1 | `preset-smoke`（缺环境 exit 2） |
| L2 | `release-smoke` / `cold-start-smoke` / `real-home-smoke`（缺全局 dsh、tarball、chromium = exit 2） |
| L3 | `pnpm test` 的 `methodology-mapping` + `evaluation-contract` 契约（0/1） |
| L4 | 上表机器 ①② 的 node-gate / evidence-audit 退出码；③④ 人工走查记录在场即"已跑"，缺席即"未跑" |

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

### 完成判据的四个作用域（谁管哪一层）

"完成"在本仓有四个作用域，**不互相顶替**：

| 作用域 | 回答什么 | 正本 |
|---|---|---|
| 面级 | 这次改动涉及的每个评估面各自绿了吗 | 本页 §1（下限：任何一件都不能少） |
| 任务级 | 本轮授权范围内的交付做完了吗 | [guides/60 §0/§4](guides/60-dev-loop.md)（交付收尾五件） |
| goal 级 | 跨轮目标达成吗 | 本页 §3 里程碑矩阵（只对持续目标） |
| 语义级 | diff 与意图/文档/证据说的是同一件事吗 | [reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md) |

**优先序**：面级是下限（缺一面即未完成，不能被任务级的"做完了"覆盖）；任务级决定当次能不能
交付；goal 级只在有持续目标时生效；语义级是最后一道自审——它可以否决前三者，但不能替代它们
（"我看了一遍觉得没问题"不是面级证据）。

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

## 5. 已知限制与延后工作（诚实记账）

- L1/L2/L4 需要真 DSH 环境与（L4）`DEEPSEEK_API_KEY`；环境未就绪时该面标"未跑"，**不等同通过**（已 green 面的证据 = 各面定义里的毕业 Note 引用；未闭面的状态由当前工作证据表达，"未跑"≠"通过"）。
- watch-run 的轮询循环与 `dev/env.sh` 本体为壳面不测（状态谓词与折算已下沉 `scripts/lib/` 被 `pnpm test` 覆盖；维持现状的显式登记，防下次审计重复排查）。
