# 63 · Git 入库边界与跨环境纪律

> 层：指南。本页拥有“什么内容该进 git、什么不该进、跨环境怎么不互相污染”的判据。
> 新增文件、调整 `.gitignore`、把生成物标成 tracked、或发现仓库里出现本机残留时，先按本页分类。

## 一个前提：用户装的东西 ≠ 贡献者 clone 的东西

- **用户**安装的是 `packages/deep-research-pack` 的 tarball / npm 包；包内边界由
  `package.json` 的 `files` 白名单决定，`tests/`、`docs/`、`notes/`、`_backlog/`、`runtime/`
  都不随包。
- **贡献者** clone 的是整个开发仓库；`vendor/dsh` 是 pinned submodule，`runtime/` 是本地运行态，
  `research-workspace/` 是运行场。
- 因此“用户不装垃圾”靠 pack `files` + 发布冒烟；“仓库不反复打扫”靠 `.gitignore` +
  入库判据 + 门禁。两者不是同一件事。

## 三问判据

对每个候选文件问三句，按顺序命中即停：

1. **它是不是源、合同、确定性种子，或门禁消费的证据？**
   是 → 进 git（源码、配置、presets/skills、模板、文档、决策 Note、测试、fixtures、快照证据）。
2. **它能不能只由 tracked 源 + lockfile + 生成器确定性重建？**
   是 → 不进 git（构建产物、依赖、缓存、tarball、日志、运行态）。
3. **它是不是只对某台机器、某个人、某次 run 为真？**
   是 → 不进 git（凭据、home、会话、run bundle、用户数据、本机路径/编辑器配置）。

**tracked 生成物**是唯一需要额外条件的类别：必须同时有生成器、新鲜度门禁、以及“为什么必须在
树内”的理由。现有例子 = `_dist/安装手册.md`（`dist-manual-version`）、`dev/research.overlay.yml`
（`overlay-fresh`）、pack `workspace/` 种子（`pack-workspace-fresh`）。没有门禁的生成物不进 git。

## 必须进 git

- 源码、构建配置、`pnpm-lock.yaml`、`package.json`、`.npmrc`、`.gitattributes`、`.editorconfig`
- `packages/deep-research-pack/` 的 presets、skills、`cordis.patch.yml`、workspace 种子、部署脚本
- `docs/`、`notes/`、`_backlog/`、`.agents/skills/`、`AGENTS.md`、README/CONTRIBUTING/SECURITY
- `scripts/` 门禁、冒烟、探针、生成器；`tests/` keyless 回归与 fixtures
- `snapshots/` 中被回放/审计消费的场景证据（录制流、声明、期望文件）
- `LICENSE`、CI workflow、发布边界需要的 tracked 手册

## 绝不进 git

- 凭据：`.credentials.yaml`、`.env*`（`.env.example` 除外）、`.envrc`、`*.pem`、`*.key`
- 运行态：`runtime/harness-home/` 的 sessions/profiles/logs、`runtime/smoke-workspace/` 产物
- 研究数据：`research-workspace/drt_*`、`archive/`、`_abandoned/`、`method-library.md`
  （用户数据，无版本史；pack 侧只有格式正本）
- 依赖/构建：`node_modules/`、`.pnpm-store/`、`packages/deep-research-pack/lib/`、`*.tgz`
- 临时/缓存/日志：`*.log`、`*.tmp`、`.tmp*/`、`_tmp/`、`_cache/`、`coverage/`
- OS/编辑器/本机：`.DS_Store`、`Thumbs.db`、`Desktop.ini`、`.idea/`、`.vscode/`、`.cursor/`、
  `*.local`、`.claude/settings.local.json`、`*.swp`
- 本机参考仓与绝对路径：`/Users/<name>/...`、`/home/<name>/...`、`C:\Users\<name>\...`
  （`notes/`、`_backlog/`、`snapshots/`、`tests/fixtures/` 中的历史证据已冻结，见下）

## 跨环境：不假定别人和你一样

- **路径**：仓库内只用相对路径；脚本用 `ROOT` / `import.meta.url` 定位，不写 home、用户名、
  OS 盘符。需要展示路径时用环境变量或 `<workspace>` 占位。
- **DSH home / 凭据**：`DSH_HOME` 默认由 `dev/env.sh` 指向 `runtime/harness-home`；多实例的
  隔离根/profile/端口/state 变量与默认值 = [guides/65 §4](65-run-forms.md)（单一 owner）。
  凭据由使用者自己提供，不入库。不要假定 `~/.dsh`、全局 `dsh` 或某个已安装 profile 在场。
- **运行时**：Node 区间与 pnpm 版本由 `package.json` 钉住；LF 由 `.gitattributes` 强制；
  macOS/Linux 差异走运行时判断（如 `process.platform`），不提交平台二进制或 `.cmd` 脚本。
- **夹具/录制**：新录制/新 fixture 不得嵌入本机绝对路径、端口、时间戳或机器名；需要确定性时
  显式归一化或在测试里注入日期（例：node-gate 的契约日注入）。历史 JSONL 中的旧路径保留为
  证据，不再扩写。
- **生成配置**：`research.overlay.yml`、`workspace/` 种子等由生成器产出；贡献者不手改生成物，
  改源后跑生成器与新鲜度门禁。
- **干净 clone 是底线**：`git worktree`/fresh clone + `pnpm install --frozen-lockfile` +
  `source dev/env.sh && pnpm verify && pnpm test` 必须绿。只在作者机器上绿不算绿。
- **移交不是复制工作树**：源码移交 = `node scripts/dist/export-handoff.mjs`（只含 tracked 源，不含运行态/凭据/run 数据/依赖）；插件移交 = `export-dist.mjs` 的 tarball；run bundle 单独按研究数据移交。`dev/` 只住源码驱动，门禁 `dev-runtime-clean` 直接看盘。

## 新文件怎么判

1. 先看路径：命中 `.gitignore` 的已知运行区 → 默认不进；要进必须写理由。
2. 再看来源：源/合同/种子 → 进；生成物 → 找生成器与门禁；机器态 → 不进。
3. 最后看环境：内容里出现本机路径、用户名、OS 专属命令 → 改写成环境无关形式；
   改不了就说明它只属于运行区。
4. 仍拿不准 → 按“不进 git + 在文档/脚本里给出重建方式”处理；不要“先提交再说”。

## 执行面

- [`.gitignore`](../../.gitignore) 两段式：位置性运行区（中部）与绝不进库置底段（末尾）。
- `secrets-untracked`：tracked 清单零凭据/依赖/日志/临时目录/构建中间产物。
- `host-paths`：live 文档/源码/随包内容零绝对 home 路径（历史 `notes/`、`_backlog/`、
  `snapshots/`、`tests/fixtures/` 豁免）。
- `pack-workspace-fresh` / `overlay-fresh` / `dist-manual-version`：tracked 生成物不漂移。
- 干净 clone / CI：`pnpm verify` + `pnpm test` keyless；平台差异走运行时判断，不写死环境。
- 例外：确实必须 tracked 的本机/生成内容 → 同 diff 写 Note，说明消费者、生成器、门禁与
  跨环境替代方案；没有这些就不进。
