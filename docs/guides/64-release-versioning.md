# 64 · 发布版本、tag 与 npm 发布顺序

> 层：指南。本页拥有版本号、git tag、npm 发布三者的唯一顺序。发布前逐条走，不凭记忆。

## 单一版本源

- **发布版本 = `packages/deep-research-pack/package.json` 的 `version`**（用户实际安装的包）。
- 根 `package.json` 的 `version` **必须镜像同一个值**（它不是第二个发布身份，只是 workspace 的
  门面）；`release-version` 门禁强制两者相等。
- `_dist/安装手册.md` 的版本由 `export-dist` 注入，`dist-manual-version` 门禁强制它与 pack 一致。
- tag 名 = 同一个版本号，格式 `MAJOR.MINOR.PATCH`（本仓沿用无 `v` 前缀的 `0.0.1` / `0.1.2`
  形态）。tag 必须指向“该版本已提交”的那个 commit。

## tag 规矩

- **annotated tag**，message = 版本号（`git tag -a 0.1.2 -m "0.1.2"`）；不用 lightweight。
- tag 创建前先让 HEAD 的 pack/root/manual 三处版本一致；tag 创建后不要再往该 commit 追加
  版本变化。
- **tag 是发布锚，不是随手书签**：tag 与 pack 版本不一致 = 发布前必须修，不能先发 npm 再补。
- 已发布的 tag 不可移动/删除；未发布且发现打错，可在发布前删除重打（force-push tag），并在
  release 记录写明。
- 历史 tag `0.0.1`、`0.1.0` 是规则建立前的标记，**不作为发布版本使用**；从 `0.1.2` 起按本页。

## 发布顺序（不可换序）

1. 决定 semver 版本 `X.Y.Z`。
2. 同 diff 改两处 `package.json` 的 `version`；若有 lockfile 影响，跑
   `pnpm install --lockfile-only`。
3. `node scripts/dist/export-dist.mjs` 重导出 `_dist/安装手册.md` 与 tarball。
4. `pnpm verify && pnpm test && pnpm typecheck` 全绿。
5. `node scripts/dist/release-check.mjs`：确认 root = pack；HEAD 未打 tag 时它只提示
   “未打 tag”，打完后重跑必须 `tag = version` 且 tag 类型为 annotated。
6. commit 版本变更（`release: X.Y.Z ...`）。
7. `git tag -a X.Y.Z -m "X.Y.Z"`，然后
   `git push origin master` + `git push origin X.Y.Z`。
8. `npm publish`（在 `packages/deep-research-pack`，需 `npm login`/2FA）；发布后
   `npm view dsh-deep-research-pack@X.Y.Z version`。
9. 发布后 tag 不再移动；后续修复发新 patch，不改旧 tag。

## 失败处置

- tag 指错 commit / 版本不一致：**在 npm publish 前**删本地与远端 tag，修正 commit 后重打；
  已 publish 则只能发新版本。
- 根与 pack 版本漂移：跑 `release-version` 门禁看红，按提示同 diff 改两处；不要只改 tag。
- 安装手册版本漂移：重跑 `export-dist`，不要手改手册。
- 发布后发现包内容缺件：发新 patch；不要重发同版本。

## 执行面

- `release-version`（L0）：root/pack `version` 相等且为三段 semver。
- `dist-manual-version`：`_dist/安装手册.md` 版本 = pack 版本。
- `node scripts/dist/release-check.mjs`：发布前检查 root=pack、HEAD tag 与版本一致、tag 为
  annotated；不联网、不写盘。
- keyless CI（[ci.yml](../../.github/workflows/ci.yml)）跑 verify/test；tag 检查是发布前的
  本地步骤（CI 不假定 tag 在场）。
- 发布规则与 git 入库规则分家：本页管“版本与发布”，[guides/63](./63-git-boundary.md) 管
  “什么进 git”。
