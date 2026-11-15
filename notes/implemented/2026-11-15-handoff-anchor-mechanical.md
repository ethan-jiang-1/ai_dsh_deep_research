> 状态：implemented

# 移交锚机械化：`dist-freshness` 门禁、tag 时点检查与 0.3.6 发布

## 决定

1. 发布 **0.3.6**（patch）。0.3.5 tag 之后的 17 个 commit 是 owner 镜像重构（95 个 pack 文件、
   +162/−162，本质是路径搬家），已发布的 `0.3.5` tag 不移动——移动会让同一版本号对应两套制品，
   正是 0.3.4 的旧病（[release-anchor 头注](../../scripts/lib/repo/release-anchor.mjs)）。
2. 「制品由当前 pack 源生成」成为 L0 门禁 `dist-freshness`：读 `_dist/build-manifest.json` 的
   源指纹，与 pack 输入根逐一比对；**制品或 pack `lib/` 缺席 = note**（clean clone、源码
   handoff、接收方把 sender 三件放进未构建 clone 都合法），两者都在场而指纹不符 = 红并给出
   重建命令。
3. tag=HEAD、annotated tag、manual sha=制品 sha 仍由 `release-check --handoff` 在发布/移交
   **时点**判；普通 commit 不假定 tag 在场，所以不进 L0。
4. dev shell 里写死的 `scripts/lib/*.mjs` 字面量由 `repo-conventions` 把守（模块搬家后消费方
   未跟 = 红）——2026-11-15 实测 `bootstrap --check` 因路径搬家永远误报「vendor 产物缺席」。
5. **移交单位 = sender 的 `_dist` 三件**，不是「同源重建」。实测同一 commit 在两台机器上
   `export-dist` 的 tarball sha 不同（sender `abc1c56…` vs clean clone `d6f2a67…`，npm pack
   不可重放）；接收方 `--receiver` 只对账 tag/manual/tarball/manifest，不重算制品。

## 输掉的方案

- **把 0.3.5 的 tag 移到 HEAD**：已发布 tag 不可移动；同版本号两套制品会让接收方无法判断
  「装的是哪份 0.3.5」。发包新 patch 是唯一无歧义路径。
- **只靠 `release-check --handoff` 的散文步骤**：0.3.4/0.3.5 两轮都漏——门禁全绿与交接锚红
  可以同时成立，因为 `dist-tarball` 只证「手册↔制品」、`release-version` 只证「版本↔版本」。
- **把 tag=HEAD 放进 L0**：CI 与日常 commit 未打 tag，会让每个普通 commit 红；tag 是发布时点
  事实，不是常驻结构事实。
- **让 CI 在 tag 上重建 `_dist` 再判 handoff**：手册含本地日期，且实测 tarball 跨机不可重放
  （同 commit、同 pnpm/npm 版本，sha 仍不同），重建会让工作树变脏、`--handoff` 的
  worktree-clean 与制品 sha 断言必然失败。接收方路径因此固定为「收制品、不重建」。

## 判据形状

- 权威输入 = `_dist/dsh-deep-research-pack-<pack version>.tgz` + 同目录 `build-manifest.json`
  的 `sourceFingerprint`；唯一写入者 = `scripts/dist/export-dist.mjs`；读取者 = 门禁与
  `release-check`。
- 缺失（clean clone / 源码 handoff / 接收方未构建：tarball 与 manifest 在场但 pack `lib/`
  缺席）→ note，不静默也不误红；tarball 与 `lib/` 都在场、指纹不匹配或缺 manifest → 红，
  报 `mode: reason` 与重建命令。
- 接收方同时持有 sender 制品与本地构建产物时仍红：同源只能由构建者证明；接收方的对账入口
  是 `release-check --receiver`，不是重算指纹。
- 互斥/非法：版本文件名与 pack version 不一致由 `dist-manual-version` 判；手册 sha 与制品
  sha 不一致由 `dist-tarball` 判；两处与本源指纹检查互不顶替。
- 反证：2026-11-15 旧 0.3.5 制品在场 → `dist-freshness` 点名红；重导出后绿。
- 旧形态退场：`dist-tarball` 的「sha 自洽」不再被当作「制品↔源同源」的证据。

## 实际跑过的验证

- 红证 ①：`node scripts/verify/verify.mjs --only=dist-freshness` → FAIL
  `source-changed（409 → 409 files）`（旧 0.3.5 制品与当前源文件数相同、内容不同）。
- 红证 ②：`node scripts/verify/verify.mjs --only=repo-conventions` → 5 处
  `dev/*.sh: 引用不存在的 scripts/lib/...`（boot-run 4 处、bootstrap 1 处）。
- 绿证 ①：修 4 处 shell 路径 + `vendor-artifacts` 默认 root（两层→三层）后
  `--only=repo-conventions` PASS；`node scripts/lib/harness/vendor-artifacts.mjs` exit 0；
  `bash dev/bootstrap.sh --check` → 就绪。
- 绿证 ②：`node scripts/dist/export-dist.mjs` 重建 0.3.6（186 条目、preset 行 5/5、skill 15、
  模板 11、manifest 源 409 files）后 `dist-freshness` / `dist-tarball` / `dist-manual-*` PASS。
- L0：`pnpm verify` 全绿；`pnpm test` spec 1,358 + checks 198 pass / 0 fail / 0 skip（含 asset-ledger 重算）；
  `pnpm typecheck` exit 0。
- L2 安装面：`lifecycle.entry` ALL PASS（market → tarball → 干净 profile 装包 → dump 10 行 →
  真启动 → readPluginMeta 5 specifier → remove 回落）；`install-shape.entry` ALL PASS
  （手册 CLI 分支：profile init → plugin add pack + 团队层 → 真启动，roster 三态）；
  `product-boot.entry` GREEN（首屏、Lead session、cwd = 工作区）。
- L1 真挂载：`DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs` ALL PASS（5 角色 + 2 worker、
  skills 按角色隔离）。
- 移交边界：`node scripts/smoke/handoff.e2e.mjs` ALL PASS（源码包无运行态/凭据/run 数据，
  HANDOFF 接收命令在场）。
- clean clone（`/tmp/cold-clone`，submodule 从本机 object store 取同 pin）：`pnpm install
  --frozen-lockfile` 88s → `pnpm verify && pnpm test` 14s（spec 1,358 + checks 198）→ `bash dev/vendor-build.sh`
  147s → `node scripts/dist/export-dist.mjs` 7s；重建 tarball 与 sender 不同 sha（见决定 5）。
- 发布锚：打 tag 前 `release-check --handoff` 仅 `handoff-tag-missing`（其余四项绿）；在版本
  提交上打 annotated `0.3.6` 后 `release-check --handoff` exit 0（OK version=0.3.6 tag=0.3.6）；
  clean clone 同 tag + sender 三件 → `release-check --receiver` exit 0。
- review 复核（同轮）：接收方形态（sender tarball + manifest 在场、pack `lib/` 缺席）→
  `dist-freshness` 只 note（PASS）；本仓（`lib/` + fresh manifest）→ PASS；`repo-conventions`
  扩到 `dev/hooks/*` 后 PASS；`gates.e2e` 128 案例全中、`pnpm verify` / `pnpm test` 仍绿。
