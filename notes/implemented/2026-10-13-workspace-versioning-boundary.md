# 研究工作区的版本控制边界：仓库正本 vs 安装方种子

> 状态：implemented

## 决定

**一、研究工作区的"跟踪面"分两层，不共用一份规则。**

| 面 | 谁 | 规则载体 |
|---|---|---|
| 本仓开发工作区 `research-workspace/` | 工作区自己的 `.gitignore` | **显式列名单拒收运行区**：`drt_*/`、`archive/`、`method-library.md`；资产与 `drafts/` 开发证据照常跟踪 |
| `drafts/` 目录自身 | 目录内 `research-workspace/drafts/.gitignore` | deny-by-default（`*` 拒收 + `!` 白名单）——只有被 docs/notes/backlog 或测试引用的**开发证据**入库 |
| 安装方工作区 | 随包分发的 `workspace/.gitignore` 种子 | 同一份规则（与正本逐字节相同）：运行区拒收，资产（手册/NODES/判型库/templates）与用户自选留档照常可提交 |

**为什么不把 `research-workspace/` 整个忽略**：工作区里有安装方**必须**拿到的资产——手册
`AGENTS.md`、`NODES.md`、`question-patterns.md`、`templates/run/` 六件模板，它们是
`dev/sync-pack-workspace.mjs` 的正本（门禁 `pack-workspace-fresh`）。整目录一条 `!` 一加，
pack 种子就静默失去正本；安装方拿到的研究纪律会与仓库脱钩。

**为什么拒收用"显式列名单"而不是裸 `*` 拒收全部**：工作区里不止有运行区，还有被
**跨目录引用**的材料——本仓 `drafts/` 里的开发证据被 `docs/`、`notes/`、`_backlog/` 以相对
链接引用，`tests/run/hitl1-intake-samples.test.mjs` 还直接读盘。裸 `*` 会把它们一起拒收：全新
clone 后这些文件根本不在工作树里，`md-links` 立刻报"链接目标未被 git 跟踪"（fixture 实测，
见 §实际跑过的验证）。列名单的漏项表现为"该拒的没拒"（用户可见、可修），比"整目录静默消失"
可诊断得多。

**为什么 `drafts/` 仍要自己的 deny-by-default 规则**：同一目录里住两类东西——被测试读盘、
被多处文档引用的开发证据（入库），与探针稿/dry-run 输出（不入库）。靠"记得哪份算证据"区分
会腐；把判定写进目录自己的 `.gitignore` 后，新草稿默认被拒，要入库先显式加 `!` 行——
**入库成为一次显式动作**。这一层不存在"误拒已跟踪材料"的风险：已被 git 跟踪的文件不受
`.gitignore` 作用（规则只筛未跟踪文件）。

**为什么安装方要单独一份，且包内名是 `.gitignore.example`**：安装方的工作区是独立 git 仓，
本仓根 `.gitignore` 不作用于它。不带种子时，用户一次 `git add -A` 会把几十个 run bundle
（含证据卡、草稿、审计报告）与 `method-library.md` 一起提交；而"什么不该进版本控制"本就是
工作区知识的一部分，应与手册同批交付，而不是靠事后文档追认。**包内不能叫 `.gitignore`**：
`npm pack` 永不打包该文件名——`files: ["workspace/**"]` 也不例外（实测：同名文件连着两次
导出都没进 tarball，`export-dist` 的 inventory 断言把它拦下才暴露）。故包内名
`.gitignore.example`，`scaffold.mjs` 落地时改回 `.gitignore`；两个名字都进门禁，
改名回归即红。

**连带面**（同批交付）：这份规则是**种子文件**，触碰五处——`dev/sync-pack-workspace.mjs` 的
`FILES` 清单、`scaffold.mjs` 的种子收集器 + 落地改名（`.gitignore.example` → `.gitignore`）、
`preflight.mjs` 的工作区检查（缺 `.gitignore` 即报，带补救命令）、`export-dist.mjs` 的发布集
清单断言、门禁 `workspace-versioning`（含"包内不得出现 `.gitignore`"与"scaffold 会改名"两条）。
种子内容由 `pack-workspace-fresh` 保证与正本一致。

## 输掉的方案

- **一条 `research-workspace/` 整体忽略 + 逐条 `!` 放行资产**：否决——正本一旦被忽略，
  `sync-pack-workspace.mjs` 与 `pack-workspace-fresh` 的正本方向就失效（readFileSync 仍能跑，
  但仓库里再也没有它的版本历史，"部署方装到的纪律"随时可与仓库脱钩而无人察觉）。
- **裸 `*` deny-by-default（本变更的第二稿，被 fixture 打回）**：种子统一成"`*` 拒收全部 +
  `!` 白名单资产 + `!` 逐条放行开发证据"，看起来比列名单更安全。**实测反证**：fixture 副本里
  种子生效后 `git add -A` 不再收 `drafts/` 下任何文件，全新 clone 的工作树里没有那 5 份开发
  证据，`md-links` 直接红（4 条"链接目标未被 git 跟踪"）——被跟踪文件虽不受 ignore 作用，
  但**没被跟踪过**的文件在 clone 里根本不存在。整目录规则会把工作区连"要留档的东西"一起
  拒收，代价是仓库不再自洽，故回到显式列名单。
- **`drafts/` 整目录忽略**：否决——`tests/run/hitl1-intake-samples.test.mjs` 读盘上该材料，
  多处文档以链接引用它（`md-links` 要求链接目标被跟踪）；整目录忽略会让测试与文档同批失效。
- **让安装方看本仓 `.gitignore` 自己抄**：否决——安装方没有本仓，抄写必然漂移；种子随包
  是唯一能保证"装到就有"的形态（与手册同理由）。
- **`sync-pack-workspace` 的孤儿扫描继续只认 `.md`**：否决——点文件种子会成为免检区，
  漏登记不报红（静默漏发）；改为全扩展名扫描后，`workspace/` 下任何未登记文件都在 check 时报红。

## 实际跑过的验证

| 面 | 命令 / 方式 | 结果 |
|---|---|---|
| 种子同步与新鲜度 | `node dev/sync-pack-workspace.mjs` + `--check` | 10 个文件同步；check 一致（含 `.gitignore`） |
| 全新 clone 形态（关键面） | tracked-only 副本 → `git init` + `git add -A` → `verify` | `drafts/` 5 份证据仍被跟踪，`md-links` 绿——**第二稿（裸 `*`）在同一副本上实测 0 份被跟踪、`md-links` 红 4 条**，这是形态回退的直接依据 |
| 探针稿拒收 | `git check-ignore -v research-workspace/drafts/prefetch-system-cn-2026-10-13.md` | 命中 `research-workspace/drafts/.gitignore:3:*` |
| 安装方形态（净仓实测） | 临时仓放种子 `.gitignore` + 资产 + `drt_x/` + `method-library.md` | 暂存仅资产；`drt_x/`、`method-library.md` 进 ignored；资产与用户留档未被误拒 |
| 门禁反证（红→绿，逐条实测） | 在 tracked-only 副本上逐项注入 | 删拒收行 `drt_*/` → `workspace-versioning` 红并点名该行；正本与种子漂移 → 红（"正本与分发件漂移"）；删 `drafts/.gitignore` → 红；种子加裸 `*` → 红（"出现裸 `*` 整目录拒收"）；删 `!templates/` 目录级放行 → 红。还原即绿 |
| **打包面（本次最硬的一条反证）** | `tar -tzf _dist/dsh-deep-research-pack-0.1.1.tgz \| grep workspace` | 种子名 `.gitignore` 时 **tarball 里根本没有它**（`files: ["workspace/**"]` 也照删）；改 `.gitignore.example` 后在场，`export-dist` inventory 断言同时把它拦下过 |
| 真装一次（端到端） | 解 tarball → `scaffold.mjs --workspace /tmp/scaf/ws` | 10 个种子落地，工作区根出现 `.gitignore`（改名生效）；`git add -A` 后暂存仅资产，`drt_demo/`、`method-library.md` 进 ignored |
| L2 安装形状 | `source dev/env.sh && node scripts/smoke/release-smoke.mjs --install-only` | ALL PASS，安装域 preflight 报"工作区 .gitignore 在场（run 产物默认拒收）" |
| 门禁自测 | `node scripts/smoke/gates-smoke.mjs` | 全绿（37 个注入案例；本门禁 3 个案例） |
| 契约回归 | `pnpm test` | 412 项全绿（含 `deploy-bin` 新增的两条：preflight 检查项名、scaffold 收集器 `.gitignore` 分支） |
| L0 聚合 | `node scripts/verify/verify.mjs` | 全绿 |

`gates-smoke` 的零注入对照组是本次最有价值的一道防线：它不测"新门禁会不会红"，而测
"**形态本身在全新 clone 上自洽吗**"——裸 `*` 那一稿正是在这里被拦下的（新门禁当时是绿的）。
