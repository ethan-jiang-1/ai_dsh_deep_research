# Git 入库边界与跨环境纪律

> 状态：implemented

> 来源：用户 2026-10-25 指令——开源后环境不会一致，不能假定所有人 home/OS/DSH home 相同；
> 要把“哪些进 git、哪些不进”的规矩定下来，避免迭代中反复打扫。

## 决定

- **入库判据 = 三问**：① 是不是源/合同/确定性种子/门禁消费的证据？② 能否只由 tracked 源 +
  lockfile + 生成器确定性重建？③ 是否只对某台机器/某个人/某次 run 为真？① 是 → 进；
  ② 或 ③ 是 → 不进。规则正文 = [guides/63](../../docs/guides/63-git-boundary.md)。
- **tracked 生成物必须三件齐**：生成器 + 新鲜度门禁 + “为什么必须在树内”的理由。现有 =
  `_dist/安装手册.md`（`dist-manual-version`）、`dev/research.overlay.yml`（`overlay-fresh`）、
  pack `workspace/` 种子（`pack-workspace-fresh`）；缺门禁的生成物不进 git。
- **跨环境规则**：仓库内只用相对路径；脚本用 `ROOT`/`import.meta.url` 定位；不假定
  `~/.dsh`、全局 `dsh`、某个 profile 或某台机器的 home；新 fixture/录制不嵌入本机绝对路径、
  端口、时间戳或机器名；生成配置由生成器产出，贡献者不手改生成物。LF 与版本区间由
  `.gitattributes` / `package.json` 钉住，平台差异走运行时判断。
- **执行面**：AGENTS 加边界入口；CONTRIBUTING 加贡献者判据；`.gitignore` 补
  `.cursor/`、`.claude/settings.local.json`、`*.local`、OS/编辑器/缓存残留；
  `secrets-untracked` 扩这类 tracked 残留；新增 `host-paths` 门禁，扫描 live 面
  （随包内容/当前文档/脚本/CI/工作区种子）的本机绝对 home 路径，历史 `notes/`、`_backlog/`、
  `snapshots/`、`tests/fixtures/` 豁免。
- **历史证据不追溯**：旧 JSONL/旧 Note 里的 `/Users/...` 保留为录制事实；新内容不得再写。
  例外要 track 的本机/生成内容必须同 diff 写 Note（消费者、生成器、门禁、跨环境替代）。

## 输掉的方案

- **把所有“看起来像生成物”都 ignore**：会把安装手册、overlay、pack 种子等被门禁消费的
  tracked 生成物一起藏掉；改为“生成器 + 新鲜度门禁 + 理由”三件齐才 track。
- **对所有 tracked 文件禁绝对路径**：会误伤历史 Note、`_backlog` 证据、录制 JSONL；
  改为 live 面机械扫描 + 历史豁免，并由 guide 写明新 fixture 的归一化义务。
- **只在 CONTRIBUTING 写一段散文**：没有门禁，迭代中必回潮；落成 `host-paths` +
  `secrets-untracked` 两条机械断言，并带 gates-smoke 注入案例。
- **要求贡献者手工对齐本机环境**：把环境差异留给人记；改为 setup 脚本 + 相对路径 +
  占位符 + 干净 clone 验收。

## 实际跑过的验证

- `pnpm verify`：全绿（含新增 `host-paths`；`secrets-untracked` 扩编辑器/OS/缓存残留）。
- `pnpm test`：769 pass / 0 fail。
- `node scripts/smoke/gates-smoke.mjs`：83 个注入案例全红、对照组全绿；新增
  `host-paths-home-leak` 与 `secrets-untracked-editor-state-leak`。
- `git diff --check` / `md-links` / `doc-budgets` / `gate-ledger-sync`：随 verify 全绿。
- 跨环境部分以 [开源发布面 Note](2026-10-25-open-source-launch.md) 记录的干净 worktree
  （无 node_modules）`pnpm install --frozen-lockfile` + `pnpm verify` + `pnpm test` 为基线。
