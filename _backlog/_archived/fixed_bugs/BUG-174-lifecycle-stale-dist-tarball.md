---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-174：lifecycle.entry 不校验 `_dist` tarball 新鲜度——可能验证旧产物并 ALL PASS

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — 共享 `artifact-freshness` 谓词 + lifecycle 入口 exit 2；用户当轮指示继续推进
>
> 位置：[scripts/smoke/lifecycle.entry.mjs](../../../scripts/smoke/lifecycle.entry.mjs) 的 tarball 选择；
> 前置生产者 = [scripts/dist/export-dist.mjs](../../../scripts/dist/export-dist.mjs)；
> 对照资产 = `client-load.entry` 的构建新鲜度自检。

## 症状

`lifecycle.entry` 直接按版本号取 `_dist/dsh-deep-research-pack-<version>.tgz`，没有比较 tarball 与
当前源码/构建产物的时间或内容：

```js
const tarball = process.env.PACK_TARBALL ?? join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
if (!existsSync(tarball)) notRun(`tarball 缺席：${tarball}（先 node scripts/dist/export-dist.mjs）`)
```

本机实测 `_dist` tarball 是 2026-11-13 11:54，而 `packages/deep-research-pack/lib/client.js` 是
18:36、源文件更晚：`lifecycle.entry` 会安装旧 tarball 并跑 `content/startup/defaults` 的 apply
断言——断言对象不是当前 HEAD。

## 根因（已证）

判据只验证「tarball 存在 + 版本号文件名」，不验证「tarball 由当前源码构建」。CI deploy job 在
`lifecycle.entry` 前跑 `export-dist`，所以 CI 不受影响；本地/其他入口可以跳过前置，测试仍
ALL PASS（未跑 ≠ 通过，但这里是**旧产物冒充当前证据**）。

## 影响面

- 新加的 lifecycle ⑤（装起后 content/startup/defaults 真注册）在旧 tarball 上通过，会给出
  「当前 pack 的装起效果已验证」的错误结论。
- 与 BUG-162/160 同属证据新鲜度/执行面；`client-load.entry` 已有 `lib/client.js 旧于 src → exit 2`
  的自检，lifecycle 没有同款。

## 牵出的失败类

- **C9 夹具漂移**（基线/产物落后于判据）+ **C10 安装/发布**（旧产物被当当前产物）。
- 同机制第 **1** 次（lifecycle 的装起效果断言是 W1-4 新面）；类修：所有消费 `_dist` 的 entry
  共用「产物新鲜度」谓词（mtime 或构建指纹）。

## 修复判据

- `lifecycle.entry` 在存在 tarball 后比较其 mtime 与 pack `src/` + `lib/` 的最新 mtime（或
  `export-dist` 写入的构建指纹）；tarball 更旧 → `NOT-RUN`（exit 2）并提示先跑
  `node scripts/dist/export-dist.mjs`，不得 ALL PASS。
- 允许显式 `PACK_TARBALL`/`--allow-stale` 覆盖时打印「旧产物」理由；CI 无感（先 export-dist）。
- 反证：touch 一个 `packages/deep-research-pack/src` 文件 → `lifecycle.entry` 必须 exit 2；
  重跑 export-dist → 恢复；保留 `PACK_TARBALL` 正例。

## 修复关联

未修。P2 修理型，授权范围 = `scripts/smoke/lifecycle.entry.mjs`（可抽 `scripts/lib/` 新鲜度谓词
+ 直测）；去向可记 `none — 机械修复`。

## 修复落地（2026-11-14）

- **改动**：新增 `scripts/lib/artifact-freshness.mjs`（产物 mtime vs 源/构建树最新 mtime；缺产物/无源 fail-closed；跳过 node_modules/.git/_tmp）；`lifecycle.entry` 在 tarball 存在后比较 `packages/deep-research-pack/{src,lib,presets,content,package.json,cordis.patch.yml}`，旧于任一 → exit 2 并给相对路径与 export-dist 指令；`--allow-stale` / `LIFECYCLE_ALLOW_STALE=1` 显式覆盖。
- **证据**：`node --test tests/checks/artifact-freshness.test.mjs` → 2/2 PASS；本机真实 `_dist` tarball 探针 → `lifecycle.entry` **NOT-RUN / exit 2**（"早于 packages/deep-research-pack/src/lib/review-readiness.ts"）；`scripts/README.md` 登记 lib 与入口前置。
- **反证**：把谓词的 mtime 比较反向 → 2/2 红；还原 → 绿。L2 全链未跑（`_dist` 需先 export-dist；CI deploy job 自带该前置）。
