---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-065：run-driver 的 GREEN 缓存键只有 pack+runtime——dev 通道自身的改动（overlay / boot-run）不失效

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — `probeCacheKey` 增 `extra` 身份段；run-driver 用 `devShellFingerprint()`（research.overlay.yml + boot-run.sh + render-overlay.mjs 内容哈希）参与键；payload/日志 reason 写清 pack + runtime + dev 外壳。先红后绿（2026-11-12，去向：none — 机械修复，审查：agent 自审 + 机械门禁）

## 症状

`dev/run-driver.mjs up` 的「浏览器面 GREEN」缓存（TTL 30 分钟）声称「键 = pack 指纹 + runtime 构建」，
但**决定被探测页面内容的 dev 通道产物不在键里**：

```js
const packId = packFingerprint(collectPackEntries(PACK_DIR));          // 只扫 packages/deep-research-pack
const key = `${probeCacheKey({ packFingerprint: packId, runtime: runtimeFingerprint() })}|${expectFace ?? ''}|${requireData ? '1' : '0'}`;
```

键 = `any@<pack>@<runtime>|expect|require`——`dev/research.overlay.yml`（渲染后装载的 bundle 行）、
`dev/boot-run.sh`（启动序列/档位）、`dev/render-overlay.mjs` 的内容都不参与。于是：

- 只改 overlay / boot-run（pack 未动）→ 键不变 → 仍命中 30 分钟内的旧 GREEN，**不真跑探针**；
- 开发者看到「浏览器面 GREEN（缓存）」而页面其实可能已经坏——**缓存把假绿给了 dev 环最常用的一条路径**。

实测（纯函数）：同一 `packFingerprint` + `runtime` 两次调用返回同一键 `any@p1@source`——与 overlay 内容无关。

## 复现

```sh
node --import tsx/esm -e "
import { probeCacheKey } from './scripts/lib/channel-cache.mjs';
console.log(probeCacheKey({ packFingerprint: 'p1', runtime: 'source' }));  // any@p1@source
"
# 只改 dev/research.overlay.yml（不改 pack），键不变；`up` 会走缓存 GREEN
```

## 根因（已证）

缓存身份只收了「pack 源 + vendor 构建」两项；而 dev 通道的**外壳**（overlay / boot 脚本 / 渲染器）
同样决定页面内容。`channel-cache` 头注承诺「键必须含身份：pack 源或 runtime 构建改动一律 miss」——
这句话本身没错，但它没覆盖 dev 外壳，而 `run-driver` 的探针探测的正是外壳装配出来的页面。

## 影响面

- dev 环是观察面唯一的日常验证路径；一次 overlay/boot 改动后 30 分钟内的「GREEN（缓存）」不可信；
- 缓存命中条件还要求 `drift?.clean === true`（pack 漂移门），这会让人误以为「门绿 = 页面绿」——
  pack 没漂移但外壳变了，门照样绿；
- 没有自动失效提示（payload 里只有 `cacheAgeMs` 与「同一 pack 源 + runtime 构建」），读者不会想到
  overlay 不在身份里。

## 修复判据

1. 缓存键加入 **dev 外壳指纹**：`dev/research.overlay.yml` + `dev/boot-run.sh` + `dev/render-overlay.mjs`
   （至少 overlay 与 boot-run）内容哈希；改任一文件 → 键变 → miss → 真跑探针；
2. `probeCacheKey` 接受一个 `extra` 身份段（保持现有签名向后兼容），`channel-cache` 单测覆盖
   「extra 不同 → 键不同」；
3. payload 的 `reason` 写清身份组成（pack + runtime + dev 外壳），不再只提两项；
4. 先红后绿：只改 overlay 内容 → 旧实现命中缓存（红）、新实现 miss 并真跑（绿）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-12）：`scripts/lib/channel-cache.mjs` 的 `probeCacheKey` 增 `extra`（空值保持旧键）；`dev/run-driver.mjs` 新增 `devShellFingerprint()` 并对三份 dev 外壳文件做内容哈希，缓存键与命中日志/reason 同步。证据 = `tests/run/channel-cache.test.mjs` BUG-065 用例先红后绿（7/7），extra 不同 → 键不同。去向 = none — 机械修复。

原始处置（留档）：P2 dev 工具修理型，可凭本卡自授权落地。与
[BUG-060](BUG-060-host-health-freemem-macos-underreports.md)（观察面证据不可达）
相邻：那条是**跑不起来**，本条是**跑过了但可能看的是旧页面**。
