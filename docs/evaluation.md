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

每面 = 一个可独立判定的检查域。**面与面不互抵**：L4 绿不能补 L0 红。探针（根 `probes/`）**不是第六个评估面**：它是 L1/L4 的证据工具，定义与操作 = [guides/66](guides/66-probe-playbook.md)。

### L0 结构面（机械门禁，keyless）

- **定义**：仓库结构、文件卫生、preset 三件套完整性、vendor 铁律（如采用 submodule）等机械可查的不变量。
- **最小真检查（fresh clone 可跑）**：`pnpm verify`（= `node scripts/verify/verify.mjs`；package.json 的 verify 脚本）+ `pnpm test`（命令正本 = `package.json` 的 test 脚本；默认回归）——两件均 keyless、无 vendor 构建产物。**加跑面**：`pnpm test:vendor`（vendor **源码**契约：组合层与设置 schema；根 tsconfig 的 vendor 源映射，fresh clone 可跑）+ `pnpm typecheck`（pack 双半类型面；需要 vendor 构建产物，CI deploy job 在构建后跑，不计入 fresh clone 的最小集）；改门禁时可 `--only=<gate[,gate]>` 只判该门（输出与退出码只计它，末尾自报"仅判 N 道"；收尾仍须全量）。改驾驶舱（client 面，D18）时加跑 `node --import tsx/esm scripts/smoke/client-load-smoke.mjs`（干净机器/CI 加 `--seed tests/fixtures/client-load-home` 自建 home；CI job `client-load` 常驻，失败现场作为 artifact 上传）（headless 真浏览器断言：插件零失败横幅 / 无 loader entry 失败 / 本包 client bundle 进 /plugins/ 批次 / 页签渐进面与活动流，清单以脚本为准；失败自动留 `runtime/smoke-workspace/client-load-*` 的 png/html/console/meta 现场；无窗口内交付目标 = exit 2 SKIP，主机不健康（预检）或失败时的不健康 + 连接死亡 = exit 2 NOT-RUN（判据 = `lib/host-health`），未跑 ≠ 通过）——路由正本 = [guides/60 §2 改驾驶舱行](./guides/60-dev-loop.md)。
- **门禁登记表**（正本在此；与 `scripts/verify/context.mjs` 的 `gates` 数组经门禁 `gate-ledger-sync` 机械对账——加门禁须两处同步，漏一处即红）。**列形纪律**：断言列只写现在为真的合同；反证列只留一行指针——注入红/还原绿全程与案例正文住对应 Note 与 [gates-smoke](../scripts/smoke/gates-smoke.mjs) 案例表，本表不复述叙事；判定细节与已知边界住对应门禁块头注（`scripts/verify/gates/<域>.mjs`）：

> **反证口径（两态）**：常驻 = [gates-smoke 案例表](../scripts/lib/gates-cases.mjs) 的 `CASES` 注入案例（零注入对照组绿 + 注入后点名红；覆盖率与"无常驻案例的门禁"正本 = 同文件 `NO_CASE_GATES`，反向对账 = `tests/contracts/verify-gates.test.mjs`——本表不记数；逐门禁查法 = `grep -n "gate: '<名>'" scripts/lib/gates-cases.mjs`）；结构性不适的门禁（vendor-pin / vendor-clean / pin-agreement / hooks-active / dist-tarball——断言对象是 submodule、本机 git config 或 gitignored 制品的真实状态，副本不可造）理由与登记同住该常量，反证 = 一次性 Note 红录。

| 门禁 | 断言什么 | 反证指针 |
|---|---|---|
| `md-utf8-newline` | 所有 tracked .md 严格 UTF-8、恰一个结尾换行（git ls-files 驱动——运行区不扫） | [noise-sweep Note](../notes/archived/2026-09-24-noise-sweep.md) |
| `md-links` | tracked .md 的相对 Markdown 链接可解析**且目标被 git 跟踪**（运行区/本机数据引用走反引号路径） | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md) + [BUG-016 卡](../_backlog/_archived/fixed_bugs/BUG-016-fresh-clone-mdlinks-runtime-links.md)；gates-smoke `md-links-untracked` 常驻案例 |
| `md-anchors` | 相对链接的 `#fragment` 在目标文件真实存在（GitHub slug 规则 + 手写 `<a id>`） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `doc-paths` | live 文档反引号里的仓内路径必须可解析（仓根 / 文档所在目录 / `vendor/dsh/` 三处试；无扩展名再试 `.md/.mjs/.sh/.cjs/.ts`）；排除 notes/、_backlog/、tests/fixtures/ 与三条带理由的外链白名单 | gates-smoke `doc-paths-dangling` 常驻案例；来历 = [七维卫生轮 Note](../notes/archived/2026-11-03-seven-dimension-hygiene-round.md) |
| `doc-drefs` | live 文档里的 `[D<n>]` Markdown 链接必须指向 `docs/decisions.md#d<n>`（该页有对应锚点）——D 号台账是按需跳的唯一落点 | gates-smoke `doc-drefs-misdirected` 常驻案例；来历 = 七维卫生轮（D23/D24 曾指向无锚点的 00-index） |
| `archived-note-pointer` | 活面（notes/archived/ 之外的 tracked .md）链接引用 `notes/archived/<具名 Note>` 须在 scripts/archived-note-pointers.json 登记，双向对账 | [archive-review-surface Note](../notes/archived/2026-10-10-archive-review-surface.md)；gates-smoke `archived-pointer-unregistered` / `archived-pointer-stale-entry` 常驻案例 |
| `preset-structure` | presets/ 每角色 `<role>.patch.yml`（0.1.7 形态）：声明行 + config 字段 + **恰一条 `time-context` 时钟行（D32）** + `presets/<role>/skills/` ≥1 skill（frontmatter name = 目录名） | [noise-sweep Note](../notes/archived/2026-09-24-noise-sweep.md)；时钟行反证 = 删 lead 的 time-context 行即红（gates-smoke `preset-structure-clock-missing`） |
| `claude-symlink` | 两条 symlink：根 `CLAUDE.md` → `AGENTS.md`；`.claude/skills` → `../.agents/skills`（Claude 系 harness 发现与 DSH 同一批开发技能） | [r1-scaffold Note](../notes/archived/2026-09-24-r1-scaffold.md) + [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `pack-bundle-compat` | pack 的 dsh.bundle.patch 指向真实文件，**盘上每个 `presets/<role>.patch.yml` 都在数组里**；`engines.dsh` 是宿主范围且覆盖当前 vendor tag（版本合同只有它，没有第二个兼容矩阵字段）；根 README / 包 README / design/40 / 手册源 / 生成手册的 `engines.dsh` 人类副本与 `package.json` 同步 | [noise-sweep Note](../notes/archived/2026-09-24-noise-sweep.md) + [release-smoke-hardening Note](../notes/archived/2026-10-09-release-smoke-hardening.md)；gates-smoke `pack-bundle-compat-preset-unlisted` / `pack-bundle-compat-engines-drift` / `pack-bundle-compat-engines-copy-drift` 常驻案例 |
| `pack-manifest` | 发布清单只写 DSH 读的东西：`dsh.*` 仅 `bundle`/`client`，`engines.dsh` 在场；`files` 含 locale/icon、不含 `src/` 与 maps；四个 specifier 的 en/zh `meta.title`+`meta.description` 与 `./icon` 导出齐（子路径不读 package.json） | [lifecycle Note](../notes/implemented/2026-11-01-plugin-lifecycle-conformance.md)；gates-smoke `pack-manifest-invented-key` 常驻案例 |
| `market-index` | `_dist/market.json` 是 format 1 的 **staged 空索引**：`description.en` 含 `staged`、`plugins` 为空；npm 未发布时不得出现可安装条目（真 `parseMarketIndex` 归 lifecycle-smoke） | [lifecycle Note](../notes/implemented/2026-11-01-plugin-lifecycle-conformance.md)；gates-smoke `market-index-staged-claim` 常驻案例 |
| `readme-shape` | 插件 README = DSH `package-bundle`（`kind: "package-bundle"`、模板节、七问、91 数据卡、无维护者/教程节、≤310 行、无 `dsh.compatibility`）；**pack README 的 profile 引导必须先于 tarball 装包**；安装手册源 ≥10 节且含运行时/安全/平台/Discover 前置，profile 的 CLI 引导先于 Plugins 页、Plugins 页先于 CLI 装包且标注"仅 `dsh web`" | [lifecycle Note](../notes/implemented/2026-11-01-plugin-lifecycle-conformance.md) + [D41](../docs/decisions.md#d41)；gates-smoke `readme-shape-no-frontmatter` / `readme-shape-wrong-kind` / `readme-shape-maintainer-section` / `readme-shape-too-long` / `readme-shape-no-profile-bootstrap` / `readme-shape-install-before-profile` / `readme-shape-profile-after-plugins` / `manual-shape-missing-security` / `manual-shape-no-market` 常驻案例 |
| `release-vocab` | 现行合同文档（README/AGENTS/CONTRIBUTING/docs/guides/design/pack README/manual 源）不出现 D41 退役词（`插件即产品`、`产品 profile`、`产品形态`、`产品设置`、`产品用户`、`产品启动`、`产品面`、`产品化`、`产品包`、`产品账本`、`产品内`、`P0–P4`）；`产品` 仅作 DSH 形容词 | [D41](../docs/decisions.md#d41) + [terms](../docs/terms.md)；gates-smoke `release-vocab-retired-term` 常驻案例 | <!-- term-policy: allow -->
| `client-half` | pack client 半声明闭环：`exports ./client` ⟺ `dsh.client` 双向一致（声明面归本门禁，安装形状归 L2 release-smoke） | [release-smoke-hardening Note](../notes/archived/2026-10-09-release-smoke-hardening.md)；gates-smoke `client-half-no-export` / `client-half-no-decl` 常驻案例 |
| `guard-red-record` | `test/it` 标题串带 BUG-nnn = 守卫声明：事故卡双址可解析 + 同文件逐编号留证块（负例/夹具二形态），零声明被扫到即红 | [guard-red-record Note](../notes/implemented/2026-10-09-guard-red-record.md)；gates-smoke 两案例常驻 |
| `row-deps` | preset 与 bundle 行引用的 `@deepseek-ai/*` 全在 peerDependencies | [m2-p1-run-channel Note](../notes/implemented/2026-09-24-m2-p1-run-channel.md) |
| `content-shape` | 研究内容只在包内：`content/manual.md` 在场且只含 `research_pack_root` 插值、**硬顶 12,288 字符（下放触发 10,000，`content-disclosure` 把守）**、`content/templates/run/` 八件齐；包内无 `workspace/` 种子、无 `seed.json`；`files` 含 `content/**` 不含 `workspace/**` | D40；反证 = 放回 `workspace/seed.json`、删一件模板或把手册加超预算即红（`content-shape-manual-over-budget`） |
| `pack-contract-sync` | pack 的 tracked yml/md 文本零 `runs/` 旧契约路径（D17） | 反证 = D17 事故 2 真实红实录（verify 逐文件点名残留 → 同 commit 修复） |
| `note-format` | 活动 Note 裸状态行（值域与目录互验）；proposed/ 另需输掉的方案；implemented/ 需「决定/输掉的方案/实际跑过的验证」三节或 grandfather；rejected/ 保留提案体 | [note-lifecycle-absorption](../notes/implemented/2026-09-24-note-lifecycle-absorption.md) + [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + 证据节断言二轮复核 = [推敲卡](../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md) |
| `note-status` | notes/ 每子目录有 README.md（含 archived/ 冻结层）；research/ 重现时状态行与索引对账断言复活 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `note-graduation-rewrite` | implemented/ 活跃 Note 零计划体残留（裸节名 `## 验收` 与未来时态标记，词表正本 = gates/c-notes.mjs 本门禁 markers 数组） | [graduation-rewrite-gate Note](../notes/implemented/2026-09-27-graduation-rewrite-gate.md) |
| `dev-skill-format` | `.agents/skills/*/SKILL.md` 在场 + frontmatter name = 目录名 + description 以 "Use " 开头 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `vendor-pin` | vendor/dsh submodule 在位：.gitmodules 正源 URL + 钉 commit `b830ec950f`（tag dsh-v0.2.1-rc.5） | [vendor-submodule Note](../notes/implemented/2026-09-24-vendor-submodule.md)；副本注入不适（理由：断言对象 = submodule 真实状态——fixture 副本不拷 submodule 内容，基线即红），反证 = 一次性 Note 红录 |
| `vendor-clean` | vendor/dsh `git status --porcelain` 零未提交改动（机制权威不许就地改） | [vendor-submodule Note](../notes/implemented/2026-09-24-vendor-submodule.md)；副本注入不适（理由：断言对象 = submodule 的 git 状态——fixture 副本无此仓库，基线即红），反证 = 一次性 Note 红录 |
| `secrets-untracked` | tracked 清单零敏感/残留物（credentials/.env/.pem/.tgz/.log/node_modules/.tmp*/_tmp/、pack 构建产物 lib/、编辑器/OS/缓存残留…） | [入口链审计 Note](../notes/archived/2026-09-24-entry-chain-fresh-agent-audit.md) |
| `host-paths` | live 面（随包内容/当前文档/脚本/CI）零本机绝对 home 路径；历史 notes/_backlog/snapshots/tests fixtures 豁免 | [git 边界指南](./guides/63-git-boundary.md)；反证 = gates-smoke 注入 `/Users/<name>/...` 红 |
| `probe-registry` | 根 `probes/` 每支探针头注六字段齐全（状态/一句话/何时跑/档位/判据/不证明）；`INDEX.generated.md` 与目录渲染字节一致；`probes/README.md` 链接索引；零探针即红 | [probe-surfacing 卡](../_backlog/_archived/settled_issues/2026-11-10-probe-surfacing.md)；gates-smoke `probe-registry-missing-header` 常驻案例 |
| `role-list-sync` | 角色清单单一事实源 = 盘上 presets/；scripts/tests/dev 代码里的清单字面量（≥3 角色名）即红 | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md) |
| `gate-ledger-sync` | 本表门禁名集合 = `context.gates`（登记与实现不漂移） | [基础整治 Note](../notes/archived/2026-09-24-foundation-remediation.md) |
| `entry-chain` | 根入口链与子树指令门牌成员在场（六份子树 AGENTS.md 在成员清单内），AGENTS 的入口链标题存在；链接解析归 md-links | gates-smoke `entry-chain-no-title` 注入案例 + [review-driven-hardening Note](../notes/archived/2026-09-24-review-driven-hardening.md)；成员扩围反证（移除 `tests/AGENTS.md`/`_backlog/AGENTS.md` 看红→还原绿）= 2026-10-12 卫生轮实录 |
| `doc-budgets` | 常驻文档预算：[scripts/doc-budgets.json](../scripts/doc-budgets.json) 拥有上限——登记项在场且不超限，仓内新增 AGENTS.md 必须登记 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + [审计 P3 收尾轮](../notes/archived/2026-10-07-audit-p3-closure-round.md) |
| `align-ledger` | `docs/alignment-ledger.json` 机读对账：source 在 vendor/dsh 存在、adopted/adapted 落点存在；na 须给理由 + 活性依据（liveness 或 reReviewOn，**两者皆无即红**） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) + na 活性二轮复核 = [推敲卡](../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md)；gates-smoke 案例常驻 |
| `discipline-state-vocab` | [discipline-map.md](discipline-map.md) 状态列首词属三态闭集（照搬/带证据适配/不适用），按表头定位状态列，越界即红 | 反证 = 2026-10-19 首次运行即红，抓出 2 行 `已具备`（`证据匹配面`/`六误区清单`）→ 改 `照搬`/`带证据适配` 后绿；来历 = [语义漂移卡](../_backlog/_archived/settled_issues/2026-10-19-discipline-map-semantic-drift.md)（「已具备」暗示免于重校，「带证据适配」要求每次换 pin 重验，混用 = 悄悄签免检）；gates-smoke 案例常驻 |
| `discipline-na-trigger` | [discipline-map.md](discipline-map.md) 状态列以「不适用」开头的每行必须含可判定的重估触发词 | 反证 = 2026-10-19 注入回归：把一行状态列还原成裸 `不适用` → 该门禁红、还原后绿；来历 = [vendor-pin-bump-021rc2](../notes/archived/2026-10-19-vendor-pin-bump-021rc2.md)（§维护规则 承诺的"由门禁复核"原未兑现——`align-ledger` 只读 JSON，从不读人读表）；gates-smoke 案例常驻 |
| `repo-conventions` | 与 vendor 机械约定对齐：.editorconfig/.gitattributes 形态、engines.node = vendor 值、pre-commit 含 `git diff --cached --check`、**子进程凭据卫生**（`scripts/lib/env.mjs` 在场 + scripts 入口零 `env: {...process.env}` 整体透传） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md)；gates-smoke `repo-conventions-editorconfig-root-missing` 常驻案例 |
| `vendor-links` | 根 package.json 的 `@deepseek-ai/*` devDependencies 在 lockfile 解析为 `link:vendor/dsh/...`；overrides 三件套无 registry 条目 | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `overlay-fresh` | `dev/research.overlay.yml` = `dev/render-overlay.mjs` 从 pack 的渲染结果（tracked 生成物，勿手改） | [agent-ready-absorption](../notes/implemented/2026-09-25-agent-ready-absorption.md) |
| `client-keys` | 观察面 client 的 keyed 字面量单一正本 = `src/client/keys.ts`（拼错不报错永不渲染）：槽名/描述符键/族值/注入标识符全须出自其导出 | [observability-gui Note](../notes/implemented/2026-09-24-observability-gui.md) + [审计 P3 收尾轮](../notes/archived/2026-10-07-audit-p3-closure-round.md) + gates-smoke 覆盖嵌套目录、空格路径、`.ts` 符号链接及忽略目录/目录链接 |
| `client-effect-wrap` | 驾驶舱 slot/页签/活标题注册全量包 `scoped.effect`（零裸注册），只查 index.ts 登记装配位 | [test-strategy 采纳 Note](../notes/implemented/2026-10-04-test-strategy-adoption.md) |
| `proposed-pointer-live` | live 文件里指向 `notes/proposed/<x>.md` 的具体指针必须存在（notes/ 历史层与 vendor/ 除外——md 链接族的盲区） | [信噪整治 RFC](../notes/archived/2026-09-26-signal-to-noise-remediation.md) + [lsfiles RFC](../notes/archived/2026-10-07-lsfiles-gate-coverage-sweep.md) |
| `pin-agreement` | live 文件里的钉身份复述与 submodule 一致：40 位 hex 串 = submodule HEAD，`dsh-v*` tag = submodule tag | [信噪比整治 RFC](../notes/archived/2026-09-26-signal-to-noise-remediation.md)；扩围与收口 = [fresh-agent-doc-audit](../notes/archived/2026-10-04-fresh-agent-doc-audit.md) / [runtime-scripts Note](../notes/archived/2026-10-07-runtime-scripts-layout.md) / [snapshots 采纳 Note](../notes/implemented/2026-10-09-snapshots-adoption.md)；副本注入不适（理由：fixture 无 submodule，门禁在读钉身份一步即 fail-loud，注入的伪串永不到达扫描步），反证 = 一次性 Note 红录 |
| `count-free` | live 文件不写硬编码计数（`<数> 门禁/tests/断言/条源面`）——计数有正本，散文副本必腐；录制证据（`snapshots/replay/**`、`tests/fixtures/run-state/**`）豁免，改夹具迁就门禁 = 篡改证据 | [信噪比整治 RFC](../notes/archived/2026-09-26-signal-to-noise-remediation.md) + [lsfiles RFC](../notes/archived/2026-10-07-lsfiles-gate-coverage-sweep.md) |
| `port-exclusive` | tracked scripts/ 与 dev/ 的端口缺省声明同一端口号至多一文件认领（`DSH_RUN_PORT` 引用方豁免） | [审计 P3 收尾轮 Note](../notes/archived/2026-10-07-audit-p3-closure-round.md) |
| `dev-parity` | dev 通道 = 用户安装路径的同机制子集：默认 profile 名 `deep-research`、团队层版本从 `dsh --version` 派生、profile 用户层零写入（dev-only 行走 `--patch` 覆盖层）、`dev/README` 的 parity 表在场且 ≥8 个机制点 | [dev-parity Note](../notes/archived/2026-11-02-dev-product-path-parity.md)；gates-smoke `dev-parity-driver-profile` 常驻案例 |
| `hooks-active` | pre-commit 激活态：`git config core.hooksPath` 指向 dev/hooks | [审计 P3 收尾轮 Note](../notes/archived/2026-10-07-audit-p3-closure-round.md)；副本注入不适（理由：断言对象 = 本机 git config 而非 tracked 文件面——fixture 副本 git init 后本就未设 hooksPath，注入无红可造），反证 = 一次性 Note 红录 |
| `doc-now-only` | live 文档只写 now：禁「已销账 / 修订 → / 曾用 / 首版…已由…替换」措辞（docs/AGENTS.md 与本门禁自我引用行豁免） | [信噪比整治 RFC](../notes/archived/2026-09-26-signal-to-noise-remediation.md) + [lsfiles RFC](../notes/archived/2026-10-07-lsfiles-gate-coverage-sweep.md) |
| `backlog-liveness` | backlog 各池（问题/缺陷/调研/方法/触发索引/归档）在场且生命周期合同合规——含研究题目录/题名页状态与材料清单对账、`待落地` 的非空验收标准与去向、`修复就绪/修复落地` 的修复判据；结构检查不证明结论、证据质量或实施授权 | gates-smoke 注入案例（含生命周期形态 + 活跃索引幽灵 / 归档退出值 / 研究题平铺与题名页 + 新 ready 形状）+ 仓内红→绿实录；借鉴三态 = [借鉴 Note](../notes/implemented/2026-10-12-backlog-process-borrow.md)；规则正本 = [backlog 门牌](../_backlog/AGENTS.md) + [入口](../_backlog/README.md)，实现 = [backlog-liveness](../scripts/lib/backlog-liveness.mjs) |
| `staged-change-pairing` | 暂存区成对变更：归档卡 ↔ 去向 Note 同暂存集；`ui.expected` ↔ `snapshot.lastRewrite`（why 非空、载体存在）；无暂存 = 无对象 | 一次性注入红录（需 git 索引；gates-smoke 副本无索引，NO_CASE 登记） |
| `release-version` | 发布版本单一源：root/pack `package.json` 都是三段 semver 且相等（tag 一致性由 `release-check` 在发布前查） | [发布规则](./guides/64-release-versioning.md)；反证 = gates-smoke 改 pack 版本为 9.9.9 红 |
| `dist-manual-version` | dist 导出合同：`_dist/安装手册.md` 在库且表头版本 = pack 版本、指名 `dsh-deep-research-pack-<version>.tgz` | [dist-export Note](../notes/archived/2026-09-28-dist-export.md) |
| `dist-manual-fresh` | 源手册 `scripts/dist/product-manual.md` 的正文与 `_dist/安装手册.md` 正文逐字一致（表头版本由 `dist-manual-version` 管） | [dist-export Note](../notes/archived/2026-09-28-dist-export.md)；gates-smoke `dist-manual-fresh-body` 常驻案例 |
| `dist-tarball` | 若 `_dist/dsh-deep-research-pack-<version>.tgz` 在场：手册 sha256 = 制品 sha256、制品内 `package.json` version = pack version、`dsh.bundle.patch` 每个目标与 `content/templates/run/` 源文件逐件在制品内；缺席（clean clone）→ note 而非静默 | [handoff gap closure Note](../notes/implemented/2026-11-11-handoff-gap-closure.md)；反证 = 改手册 sha 行 → 红、重导出 → 绿（一次性红录；制品 gitignored，gates-smoke 副本无 tarball，故登记 NO_CASE） |
| `dev-runtime-clean` | `dev/` 只住源码驱动：盘上无 `harness-home` / `drt_*` / `sessions` / `.credentials.yaml`；运行态必须住 `runtime/` 或研究工作区 | 反证 = `gates-smoke` 注入案例（在 `dev/harness-home` 造 `drt_probe`）；规则依据 = [guides/63](guides/63-git-boundary.md) 的跨环境与运行态边界 |
| `cockpit-doc-registry` | 驾驶舱 src/client 与 src/lib 每个模块的路径必须出现在[构成正本](design/40-research-cockpit.md)里（同名模块不互相遮盖） | 反证 = gates-smoke 注入案例（嵌套/同名模块/空格路径/符号链接/忽略目录）；规则来源 = [③驾驶舱卡 ③-b 行](../_backlog/_archived/settled_issues/2026-10-11-executive-research-ux-delivery.md) |
| `run-context-single-source` | `src/client` 的 tracked `.ts/.tsx`（注释除外）不得出现 `_abandoned` 三位置候选链——发现实现唯一正本 = `src/lib/run-context.ts`；`src/lib/final-target.ts` 的终稿地址校验是另一件事，不在本词法门禁范围 | 反证 = gates-smoke 注入案例（客户端文件追加候选链 → 点名红）；规则来源 = [run-context Note](../notes/implemented/2026-10-23-run-context.md) |

- **契约回归**（`pnpm test` 守卫族的面对应登记）：**决策台账 now-only = [tests/contracts/decisions-now.test.mjs](../tests/contracts/decisions-now.test.mjs)（已定表 ≤800 字、无日期化修订/退役措辞、D1–D42 锚点唯一）**；可驾驭性契约 = [tests/contracts/navigability-contract.test.mjs](../tests/contracts/navigability-contract.test.mjs)（design/50 与状态合同唯一正本、任务入口矩阵逐行完整（六列非空、首选入口可执行）与链接目标、scripts/dev/fixtures 资产索引全覆盖、fixture 每组真实 consumer 零孤儿——D23 立红与反证记录 = [项目可驾驭性 Phase 1 Note](../notes/implemented/2026-10-05-project-navigability-phase1.md)）；fixture 分类 = [tests/fixtures/README.md](../tests/fixtures/README.md)；**run bundle 契约版本 / 见证下界 = [tests/contracts/run-bundle-charter.test.mjs](../tests/contracts/run-bundle-charter.test.mjs) + [tests/run/schema-scan.test.mjs](../tests/run/schema-scan.test.mjs)（D33；整数契约四例、模板↔解析器同源、`epochDateOf` 三形态）**；**claim 级裁决 = [verdict-audit.test.mjs](../tests/run/verdict-audit.test.mjs) + [verdict-audit-fixture.test.mjs](../tests/run/verdict-audit-fixture.test.mjs)（真实 child 日志线形夹具）**；**回执三态 / 数据卡形状 = [tests/pack/data-plane-invariants.test.mjs](../tests/pack/data-plane-invariants.test.mjs)（D34；10 列 + 可移植闭集）**；**内容注入 = [tests/pack/content-injection.test.mjs](../tests/pack/content-injection.test.mjs)（D40；手册/模板随包、无 workspace 种子、注入行注册）**；**preset 技能接线 / content 覆盖 = [tests/pack/presets-wiring.test.mjs](../tests/pack/presets-wiring.test.mjs) + [tests/pack/content-coverage.test.mjs](../tests/pack/content-coverage.test.mjs)（技能根归属 + 加载器成对 + 无孤儿技能；研究类型闭集、P1–P8 × lens 选择覆盖、模板消费面；红证 = 跨接 skill 根 / 幽灵 lens / 孤儿模板）**；**模板 schema 集 / 解析键 = [tests/pack/content-injection.test.mjs](../tests/pack/content-injection.test.mjs) + [tests/pack/template-contract.test.mjs](../tests/pack/template-contract.test.mjs)（盘上集 = `CORE_TEMPLATES` 双向对账；question/topics/leads/findings 只钉解析器/门禁消费键，final 六节不重复）；具名非 quick 类型条件性 = [tests/run/schema-scan.test.mjs](../tests/run/schema-scan.test.mjs)（exploratory_map / claim_verification 合成 bundle）；T0 渐进披露 = [tests/pack/content-disclosure.test.mjs](../tests/pack/content-disclosure.test.mjs)（T0 ≤10,000、每个 generic 被 T0 指针点名、指针可解析、T0 不复制 generic H1）**；**client 组件直测 = [tests/cockpit/method-library-views.test.mjs](../tests/cockpit/method-library-views.test.mjs)（react-dom/server 静态渲染：字段/文案/按钮接线；`pnpm test` 的 TSX_TSCONFIG_PATH 提供 jsx=react-jsx）**；**client 单文件 ≤500 行 = [tests/cockpit/client-file-size.test.mjs](../tests/cockpit/client-file-size.test.mjs)（P4 拆分守卫；超限 = 抽 hook/子组件，不抬上限）**；**组合层 = [tests/vendor/bundle-composition.vendor.mjs](../tests/vendor/bundle-composition.vendor.mjs)（用 Loader 自己的 `applyEntryPatches`/`entryListSchema` 组合 base→web-app→pack：零跳过 + 出厂面契约；红证 = 上游改名即红）**；**减法契约 = [tests/contracts/no-unused-code.test.mjs](../tests/contracts/no-unused-code.test.mjs)（未使用 import / 未导出顶层声明零引用；2026-11-04 红先清理）**；**README 命令与生成手册同源 = [tests/contracts/readme-manual-commands.test.mjs](../tests/contracts/readme-manual-commands.test.mjs)（README 的 `dsh` 行逐字出现在 `_dist/安装手册.md`；防空 ≥3 条；`DSH_VER` 赋值行同守；首跑红 = README 0 条命令）**；**方法库标题同源 = [tests/cockpit/library-heading-consistency.test.mjs](../tests/cockpit/library-heading-consistency.test.mjs)（40 格矩阵：`foldLibrary` 与 `upsertMethodEntry` 对同一标题变体的「同名」判断一致；未识别后缀 fail-loud；红证 = 去掉半角括号分支或 `wellFormed` 过滤即红）**；其余守卫的归属见各自文件头注。
- **版本与常驻面副本回归**：live 安装文档只写当前 pack 版本与 tarball 名（[release-copies.test.mjs](../tests/contracts/release-copies.test.mjs)）；T0 与 lead persona 的常驻预算（[content-disclosure.test.mjs](../tests/pack/content-disclosure.test.mjs)）；安装命令副本顺序与团队层（[install-copies.test.mjs](../tests/contracts/install-copies.test.mjs)）——反证 = 改副本/预算/顺序即红。
- **通过判据**：全绿；`verify` 的门禁清单与 `tests/` 守卫一一登记在案，每条带反证记录（上表）。
- **何时跑**：每轮 goal 续驶必跑。

### L1 挂载面（真挂载 = preset 类改动的完成定义）

- **定义**：每个研究角色 preset 在**真 DSH 会话**里挂载成功——persona 生效、skills 可见、工具面齐全。dump/roster 可见不算（company postmortem 0001 实证：挂载失败只有真会话抓得到）。
- **最小真检查**：`node scripts/smoke/preset-smoke.mjs`——keyless 预检（环境/安装形状断言）+ 真会话档（`DSH_SMOKE_REAL=1`：boot 真 web/headless 逐角色建会话，机器断言工具/skill 面在场；落地证据 = [L1/L2 绿灯 Note](../notes/archived/2026-09-24-l1-l2-green.md)）。
- **通过判据**：全部角色真挂载绿；失败角色即里程碑未完成，无例外。
- **何时跑**：preset 内容/结构改动时；框架里程碑必跑。**CI**：deploy job 在 vendor 构建后跑真挂载档（`DSH_SMOKE_REAL=1`），与 L0 同一次 push。

### L2 安装面（真实安装形状）

- **定义**：插件以用户实际获得的方式可用——`npm pack` 产物完整，装进**干净 profile** 成功，起会话可用；client 半（观察面）在安装形状里在场。
- **发布面/显示面最小真检查**：`node scripts/smoke/lifecycle-smoke.mjs`——`_dist/market.json` 是 staged 空索引且过 DSH 的 `parseMarketIndex`、tarball 带 locale/icon 无 sourcemap、干净 profile 装 tarball 后 dump 出本包声明的行、真启动无降级、运行期 `readPluginMeta` 读出五个 specifier 的中英标题/描述/图标、`remove` 后 roster 回落；缺 dsh/pnpm/_dist = exit 2。
- **安装/首启面最小真检查（D40）**：`node scripts/smoke/install-shape-smoke.mjs`——原样执行手册的 CLI 装包分支（profile init → `dsh plugin --profile … add` pack+team → 真启动），断言 roster 三状态、无 `did not activate`、首屏可达；缺 pnpm/registry/缓存 = exit 2（未跑 ≠ 绿）。`node scripts/smoke/product-boot-smoke.mjs`——真 Web + 浏览器，断言 Host 注册工作区、首屏 blank Lead Session（`cwd` = 工作区）、Orca/工作区标题/起步卡/Lead preset/composer；无模型调用。
- **安装形态最小真检查**：`release-smoke`：`npm pack` → 在选定 `DSH_HOME` 重建测试 profile → `dsh plugin --profile … add` → doctor（`--install-only`，跳过模型就绪检查）→ 安装域会话断言；无模型调用。独立默认 doctor 仍检查凭据在场。进程卫生全程有界：run() 超时预算（install 180s / 默认 120s / preset-smoke 外层 300s——company 实证值）+ mkdir 原子并发锁 + 子进程组退出确认回收。
- **冷启动补充**：`cold-start-smoke` 用独立 `DSH_DEV_HOME` + 独立 profile/端口/state，从 tarball 安装并经 `run-driver up --bootstrap` 到浏览器面 GREEN；证明不依赖仓内既有 home/profile。MCP 关闭，团队层需 registry 或缓存。
- **真用户 home 补充**：`install-shape-smoke` 在系统临时 home 里原样执行手册的 CLI 装包分支（profile init → plugin add pack+team → 真启动），断言 roster 三状态、无 `did not activate`；缺全局 dsh/pnpm/团队层/tarball = exit 2。`doctor-smoke` 用 fake anchor 覆盖“缺 pack 红 / engines 不匹配红 / 坏设置 warn / 不写 profile”。
- **通过判据**：pack 清单与 `files` 声明一致、安装零缺失警告、干净 profile 会话能列出研究角色；安装/首启面 = `install-shape-smoke`/`product-boot-smoke` 绿（roster 三状态、首屏 Lead Session、cwd = 工作区）；安装副本带 `lib/client.js`、manifest peers-only（`dependencies` 缺席）、boot 页模块表含本包 client 行（preset-smoke 真会话档断言，安装域经 release-smoke ⑤ 委托覆盖）、端口用后无监听残留；doctor 的运行时行依赖只从安装锚解析，不把 client/构建期 peer 混进 Node 解析。
- **何时跑**：包结构/release 相关改动时；框架里程碑必跑。**CI**：deploy job 在 `export-dist` 之后以 vendor CLI 作 `DSH_BIN` 跑 `lifecycle-smoke`（安装→显示→remove，无全局 dsh）。

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
  - **L4 全量（方法论里程碑档）**：一个真实问题的完整 run。六条判据里**四条机器、两条人工走查**：

    | 判据 | 类型 | 载体 / 命令 | 通过 |
    |---|---|---|---|
    | ① 报告存在且含来源清单 | 机器 | `node scripts/run-gates/node-gate.mjs <bundle>`（门A）+ `final/vN` 在场 | exit 0 |
    | ② 结论能回溯到来源文件 | 机器 | `node scripts/run-gates/evidence-audit.mjs <bundle>` → `audit.md` | exit 0 且 `CRITICAL=0` |
    | ⑤ claim 级裁决覆盖（新契约 run） | 机器 | `node scripts/run-gates/verdict-audit.mjs <bundle>` → `review/verdict-audit-r<N>.md` | exit 0（critical 全有结论性裁决；旧 bundle/quick_factual/契约日前不适用） |
    | ⑥ Protocol 工件与审计（新契约 run） | 机器 | `node scripts/run-gates/protocol-audit.mjs <bundle>` → `protocol-audit.md` | exit 0（schema/effort/output/投影/版本/批准链自洽；§Protocol 的 来源/投入/输出 行缺席 = warning（不静默通过），行在值漂移 = 红；深度集合按端点区间或显式集合对账（单值/非连续不再跳过）；plan 的 `- 策略:` 行按 Strategy 投影对账通道/worker/预算上限，通道缺席 = warning，声明 workflow 无 Wave 拓扑 = 红，预算不可解析 = 红；plan 依赖图有环 = 红；旧 bundle/契约日前不适用） |
    | ③ 两点交互纪律（HITL 之间静默自主） | 人工走查 | 会话日志里 HITL1 与 HITL2 之间无 `ask_user_question`、无"要不要继续"式汇报 | 结论一行 + 日期写进 bundle 的 `acceptance.md`「人工走查」节 |
    | ④ 中断后从 run 工作区恢复 | 人工走查 | 停通道 → 重启 → 新会话说「继续 `<slug>`」，能接着跑且不依赖 chat memory | 同上 |

    人工走查不是"随便看看"：**没有记录 = 未跑**（未跑 ≠ 通过）。记录位之所以选 `acceptance.md`
    而不是新文件，是因为它已经由 `run-accept` 生成、随 bundle 交付。该文件的「人工走查」节是
    唯一不可再生的部分：重新验收与 `--repair` 都保留它（只重建机械回执）；要清除必须手改文件。
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
| L2 | `lifecycle-smoke` / `release-smoke` / `install-shape-smoke` / `product-boot-smoke` / `cold-start-smoke` / `doctor-smoke`（缺全局 dsh、tarball、chromium = exit 2） |
| L3 | `pnpm test` 的 `methodology-mapping` + `evaluation-contract` 契约（0/1） |
| L4 | 上表机器 ①②⑤⑥ 的 node-gate / evidence-audit / verdict-audit / protocol-audit 退出码；③④ 人工走查记录在场即"已跑"，缺席即"未跑" |

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
**用户批准**（Plan 呈批/验收——方向取舍）· **显式交互**（HITL 等）。拿 L4 绿掩盖 L0 红 =
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

### 判据形状：判据不猜，投影不编（跨面）

<a id="verdict-shape"></a>

机器判据与投影是两种东西，失败方式不同，纪律也不同：

| 层 | 例子 | 读不出 / 有歧义时 | 禁止 |
|---|---|---|---|
| 判据 | 交付门、审计、验收决定 | **红**，并给出可执行的改法 | 「取最后一个 / 取最像的 / 关键词命中即算」 |
| 投影 | 驾驶舱、仪表盘、回放 | 显式 `unknown` / `unreadable` | 显示一个看起来合理的值 |

- **权威输入 = 结构化事实**：canonical JSON、会话事件、文件事实。散文（review.md / question.md / leads.md）是人读副本；判据读它只做交叉核对，不一致 = 红。交付终局的第一例 = `review/readiness.json`（critic 写；门禁以它为准，review.md 的判定行只做副本）。
- **不猜**：同一行或同一文件存在互斥判定，或只有散文包裹、没有裸写声明 → 不判 PASS/FAIL，判「无法判定」。
- **不新增兼容分支**：新判据对全部 bundle 同一口径；历史 bundle 冲突时由操作者按清单删除（用户 2026-11-13 裁定），不为它加 epoch 豁免。既有门的 schema/日期断代 = [D33](decisions.md#d33)，不在本条范围。
- **机械化**：可判的是行为，不是措辞——变异矩阵 + 不变量测试住 `tests/contracts/`（L0），不另造 grep 门禁。设计方法 = [_backlog/methods/judgment-design.md](../_backlog/methods/judgment-design.md)。判据形状的常驻守卫 = `tests/contracts/verdict-conformance.test.mjs`（五条不变量 + 生成矩阵）。
- **逐面迁移**：判据面清单与迁移记录 = [迁移 I](../_backlog/_archived/settled_issues/2026-11-13-verdict-shape-migration.md) · [迁移 II](../_backlog/_archived/settled_issues/2026-11-13-prose-surfaces-migration.md)；本页只写规则，不复述进度。

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
