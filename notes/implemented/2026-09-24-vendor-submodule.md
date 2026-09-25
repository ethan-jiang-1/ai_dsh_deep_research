# RFC：vendor-submodule-and-pnpm-dsh——机制权威自持

> 状态：implemented

归宿：roadmap §队列「vendor-submodule-and-pnpm-dsh」（已离队）· 偏离销账：D10 ✓

## 决定

本条目同日立项、同日实施毕业——方案五点全部交付，细节与验证证据见毕业 Note。

## 问题

本仓机制权威借 company checkout（D10 偏离）：路径耦合他仓、无 vendor-pin 门禁、
vendor 未入 workspace（`pnpm dsh` 不可用）——机制核对与验证会话的根基悬在外部仓，
tag 升级时无从机械校验。

## 方案

1. `git submodule add` 钉住 tag `dsh-v0.1.7-rc.2`（commit `477b4f4205`）→ `vendor/dsh/`；
2. workspace 五件套：pnpm-workspace.yaml 收 vendor/dsh + 根 package.json scripts
   `dsh` 从钉住源码起会话（替代 env.sh 的 company 借用路径）；
3. verify 新门禁两条：**vendor-pin**（submodule 在位 + 指向钉住 commit）与
   **vendor-clean**（只读纪律：无未提交改动）；红绿反证按门禁规矩；
4. 机制权威切换：dev/env.sh 的 dsh 别名与 preset-smoke/release-smoke 的 DSH_SRC
   从 company checkout 切到本仓 vendor（D14 的源码域/安装域双通道随之切）；
5. D10 偏离登记簿销账（AGENTS.md 偏离表 + design/10 头注同步）。

## 输掉的方案

- **git subtree**（否——更新不透明，无法精确钉 tag）；
- **每日 copy vendor**（否——无 pin、漂移不可检）；
- **维持借用**（否——D10 登记时明示随本条目销账，久借必漂）。

## 验收判据

- vendor-pin/clean 门禁红绿反证在案（门禁 15→17，gate-ledger-sync 同步）；
- `pnpm dsh` 一条命令从本仓 vendor 起会话（实证一次）；
- preset-smoke 源码域 + release-smoke 安装域在 DSH_SRC 切换后全绿；
- D10 从偏离登记簿销账；AGENTS.md 布局树 vendor 行更新。

## 实施记录（2026-09-24，同日毕业——本文件即毕业 Note，全文自足）

**全部验收判据通过**：vendor-pin/clean 门禁红绿在案（15→17 门禁，gate-ledger-sync 同步）；
`pnpm dsh` 与 env.sh 函数双通道实证（0.1.5-rc.2）；preset-smoke 源码域预检绿 +
release-smoke 安装域 ALL PASS（内嵌四 preset 真挂载）；D10 从偏离登记簿销账、AGENTS
布局树/① 行/design/10 同步。

**实现全录**：

1. vendor/dsh pinned submodule（tag `dsh-v0.1.7-rc.2` @ `477b4f4205`；.gitmodules 正源 URL；
   本地 clone 落地免网络，URL 事后修正）。
2. workspace 全镜像 company：五件套 globs + overrides（**cordis/cosmokit/schemastery
   强制 link**——cordis 为本仓实证新增：company 靠历史 lock 自然链接，本仓全新解析时
   registry 4.0.2 混进 .pnpm 闭包）+ peerDependencyRules + allowBuilds（消
   ERR_PNPM_IGNORED_BUILDS）+ patchedDependencies（node-pty patch）。
3. 根 package.json（scripts.dsh + devDep tsx）+ 根 .npmrc（pnpm store 钉 gitignored 运行区
   + `verify-deps-before-run=false`——vendor 根 postinstall 的 lefthook 与 submodule git
   config 天然冲突，不关预检则 pnpm run 自动重装死循环死在同一处；lefthook 失败本身无害，
   不给 vendor 装 git hooks 正是想要的）。
4. **根 tsconfig.json 源码面门面**（extends `./vendor/dsh/tsconfig.base.json`）——排障最
   深的发现：没有它，tsx 把 `@deepseek-ai/*` 解析到构建产物 `lib/`（CJS，
   cjs-module-lexer 抓不到 `FiberState` 命名导出 → profile-boot 炸）；有它解析到 vendor
   `src/`。company 的 tsconfig 注释记有同根因异表征实证（他们报 ERR_MODULE_NOT_FOUND
   …/lib/index.js，本仓报 export named 缺失）——两代坑同一门面，教训：**完整照抄范式仓
   的全量文件面，不要只抄看得懂的部分**。
5. 机制权威切换：env.sh dsh 函数 + 两 smoke 的 DSH_SRC 默认 → 本仓根；vendor 一次自装
   （vendor 根工具链 tsx@4.22.4）+ 一次全量 `pnpm run build`（`lib/` 是 vendor 仓
   gitignored 构建产物，vendor-clean 门禁不受影响——company release.md 同款流程）。

**输掉的方案（实施期新增）**：初版只抄 company pnpm-workspace 头 20 行（缺 cordis
override/allowBuilds/patches）→ registry cordis 混入闭包，补全镜像后消除；修 vendor 内
文件解决 lefthook 冲突 → 否（只读铁律）；用根 tsx 替代 vendor 自装 → 门面修复后根 tsx
行为正常，vendor 自装工具链留着做 vendor 自有脚本通道（双通道并存）。

**红绿反证细节**：vendor-pin = submodule checkout HEAD~1 → 红 → 还原绿；vendor-clean =
vendor 内真内容改动（`echo >>`）→ 红 → checkout 还原绿（首版用 touch 只改 mtime，
git status 不红——无效反证，换真改动重做）。

**环境状态**：vendor 树 = submodule 钉住 + `lib/` 构建 + node_modules（全部 vendor 仓
gitignored，vendor-clean 绿）；根 node_modules = workspace 全解析（1072+ 锁条目）；
pnpm store 已重定向 `dev/smoke-workspace/pnpm-store`；双 tsx 并存（根 4.23.15 =
`pnpm dsh` 通道；vendor 自装 4.22.4 = vendor 自有脚本通道）；vendor 换 tag 重校义务 →
roadmap 触发型条目「升 pin 重校」。

## 毕业后发现（2026-09-25 00:30，通道实测抓到）：E1 机制切换的隐性回归

**现象**：run 通道（research profile）在本仓 vendor 起的 web 上，一切模型调用报
`DeepSeek request extension preparation failed (REQUEST_EXTENSION)`——全新会话同样炸
（排除会话状态因素）；同一 research profile 在 company 基线源码上正常；web 纯净 profile
+ 真模型（entry-chain-probe）在本仓 vendor 上也正常（排除凭据与 vendor 整体因素）。
**回归面 = research profile（本包 + agent-team-profile 层）× 本仓 vendor 的组合**。

**测试缺口根因**：E1 验收只重跑了 keyless 面（preset-smoke/release-smoke——无模型调用）
+ web profile 真模型（探针）——research profile 的 with-key 面没在切换后重验。
"no-key 证管道，with-key 证 agent" 的反面教训：**机制基线切换必须把 with-key 面也重验**。

**处置**：run 通道已回退 company 基线恢复服务（web 3081 + HITL2 问询重发成功，横幅在案）；
E1 的 keyless 面与 web-profile 真模型面维持切换；回归排查 = 队列新条目「E1 通道回归排查」。
