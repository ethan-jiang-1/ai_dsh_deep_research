# 发布版本、tag 与 npm 发布顺序

> 状态：implemented

> 来源：2026-10-25 用户指令——tag 与 npm 版本曾出现 root / pack / tag 三套号；要求把发布规矩
> 定下来并内化，避免下回再错。

## 决定

- **单一发布版本 = `packages/deep-research-pack/package.json` 的 `version`**（用户实际安装的包）；
  根 `package.json` 必须镜像同一个值，不是第二个发布身份。`release-version` 门禁强制
  semver + 两处相等。
- **tag = 同版本号，annotated**，指向“该版本已提交”的 commit；不用 lightweight。tag 创建前
  root / pack / `_dist/安装手册.md` 三处必须一致；`_dist` 由 `export-dist` 重导出，
  `dist-manual-version` 门禁对账。
- **发布顺序**（正本 = [guides/64](../../docs/guides/64-release-versioning.md)）：改两处版本 →
  重导出 `_dist` → `pnpm verify && pnpm test && pnpm typecheck` →
  `node scripts/dist/release-check.mjs` → commit → `git tag -a X.Y.Z` → push branch + tag →
  npm publish → 核对 `npm view`。
- **`release-check` 只读检查**：root = pack；HEAD 的 tag 若存在必须 = version 且类型为 tag
  （annotated）；未打 tag 是合法的发布前态。它补上 CI 不能假定的 tag 面。
- **当前对齐**：root/pack/manual 均为 `0.1.2`；tag `0.1.2` 指向发布 commit。历史 tag `0.0.1`、
  `0.1.0` 是规则建立前的标记，不作为发布版本使用；不追改已公开历史。
- **发布后 tag 不可移动**；发布前发现打错可删/重打并记录。版本 bump 与 `_dist` 重导出必须
  同 diff；tag 不替代版本门禁。

## 输掉的方案

- **以 root 版本为发布版本**：root 是 private workspace，用户装的是 pack；用它会让 npm 包与
  tag 再次分叉。
- **root / pack 各自独立版本**：保留两套真相，发布时必须人工判断 tag 对谁；正是本次事故形态。
- **只写发布清单、不加门禁**：下次仍会漂移；改为 `release-version` + `release-check` 双检查。
- **lightweight tag + 事后补 message**：tag 类型与发布身份不可机械核对；统一 annotated。
- **把 tag/远端检查塞进 CI**：CI 不假定 tag 在场；tag 一致性属于发布前本地动作，CI 只跑
  keyless verify/test。

## 实际跑过的验证

- 修正前事实：root `0.1.0`、pack `0.1.1`、tag `0.1.2` 指向旧 commit——三者分叉。
- 版本对齐后：root/pack `0.1.2`；`node scripts/dist/export-dist.mjs` 全绿，手册版本 `0.1.2`、
  tarball `dsh-deep-research-pack-0.1.2.tgz`。
- `node scripts/dist/release-check.mjs`：打 tag 前 `OK version=0.1.2（HEAD 未打 tag）`；
  打 annotated tag 后 `OK version=0.1.2 tag=0.1.2（annotated）`。
- `pnpm verify`（含 `release-version` 与 `dist-manual-version`）、`pnpm test` 769 pass。
- `gates-smoke` 含 `release-version-drift` 注入案例（pack 改 9.9.9 → 红）。
- GitHub Actions keyless run：verify + test 全绿。
