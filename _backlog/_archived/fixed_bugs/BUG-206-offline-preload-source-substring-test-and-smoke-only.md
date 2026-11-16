---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-206：离线闸的回归判据是源码子串，不执行 install()——BUG-067 的「覆盖」是提及冒充执行

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — 离线闸回归改 vm 行为证据（四形态）+ SMOKE_ONLY 理由指向直测（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 删 patch 红 / 恢复绿）（2026-11-16）
>
> 位置：[tests/run/harness/replay-network-offline.spec.mjs](../../../tests/run/harness/replay-network-offline.spec.mjs)
> 的 BUG-067 用例；被登记为 SMOKE_ONLY 的件 =
> [replay-network-offline.cjs](../../../scripts/lib/harness/replay-network-offline.cjs)
> （见 [tests/checks/test-surface.test.mjs](../../../tests/checks/test-surface.test.mjs) 的 `SMOKE_ONLY`）。

## 症状

BUG-067 用例不执行 `install()`，只读源码做子串断言：

```js
const source = readFileSync(…replay-network-offline.cjs, 'utf8')
for (const name of ['resolve','resolve4',…]) assert.ok(source.includes(`'${name}'`))
assert.ok(source.includes('dns.promises?.[name]'), 'promises 面必须覆盖')
assert.ok(source.includes('dns.Resolver?.prototype?.[name]'), 'Resolver.prototype 面必须覆盖')
```

这三条在**存在 BUG-199**（`dns.promises.Resolver` 整族绕过）的树上全绿——因为它只证明
「源码里出现了某个字符串」，不证明「武装态下每个可创建的 Resolver 形态真的被拦」。
同时该文件被 `test-surface` 登记为 `SMOKE_ONLY`（理由：只能经子进程 `NODE_OPTIONS --require` 生效），
于是武装分支在 `pnpm test` 里零行为证据。

## 分诊与授权

- 严重级：P2 — 回归判据假绿（C7）+ 覆盖登记理由不成立（C2）；BUG-199 就是这条盲区里长出来的。
- 表面 / 边界：研发面（回归判据）/ ② 行为（武装态）
- DSH 不变量：fail-loud / 完成定义 = 真检查
- 触及面：门禁与验收合同（SMOKE_ONLY 登记 + 回归判据）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十一轮探索（199–208）；关联 = [BUG-199](BUG-199-offline-gate-promises-resolver-bypass.md)、
  [BUG-067](BUG-067-offline-gate-dns-resolve-bypass.md)

## 复现

复现状态：稳定。

```sh
# ① 子串断言在真缺陷面前绿
node --import tsx/esm --test tests/run/harness/replay-network-offline.spec.mjs   # 2/2 绿（含 BUG-067 用例）
# ② 同一棵树上，武装态 promises Resolver 仍解析外网（BUG-199 的复现）
REPLAY_NETWORK_OFFLINE=1 node --require "$PWD/scripts/lib/harness/replay-network-offline.cjs" -e \
 'new (require("node:dns").promises.Resolver)().resolve4("example.com").then(v=>console.log("RESOLVED",v))' \
 apps/cli/lib/bin.js
# ③ SMOKE_ONLY 登记
grep -n "replay-network-offline" tests/checks/test-surface.test.mjs
```

## 根因（已证）

- 「只读源码」比「执行」便宜，但把「文件里有这个 API 名」当成「这条网络面被覆盖」——与 BUG-160
  （文件名提及冒充执行）同构。
- 同仓已有**可执行**的先例：[tests/checks/isolation-preload.test.mjs](../../../tests/checks/isolation-preload.test.mjs)
  用 `node:vm` 加载 `dev/llm-socket-isolation.cjs` 并注入假 fetch/假 undici，驱动武装分支；
  离线闸同样可在 vm 里用假 `process.argv`（命中 `apps/cli/lib/bin.js`）武装，再断言三种 Resolver
  形态都抛 ENOTFOUND。SMOKE_ONLY 的理由因此不成立。
- 根因证据：①+② 的对照（同一棵树，测试绿而缺陷在）+ `isolation-preload` 的 vm 先例。

## 牵出的失败类

- **C7 假绿**（源码子串 = 完成定义）+ **C2 覆盖豁免**（SMOKE_ONLY 理由不成立）。
- 同机制第 2 次（BUG-160 是第 1 次：提及 ≠ 执行）；类修 = 「判据必须调用被测入口」，
  SMOKE_ONLY 只允许「真的无法在 keyless 进程内驱动」的件。

## 修法

1. 把 BUG-067 用例改为 vm 行为测试：假 `process.argv` 命中 dsh 主进程 → `require(preload)` →
   断言 `dns.lookup` / `dns.promises.resolve4` / callback `Resolver` / **promises `Resolver`** 四形态
   均 ENOTFOUND，loopback 放行；再断言非武装态（arm 条件不满足）四形态不装。
2. 修好 BUG-199 后，从 `SMOKE_ONLY` 移除 `harness/replay-network-offline`（有直测），
   或保留登记但理由改为「子进程集成另见 snapshot-replay.entry」并指向直测。
3. 若保留源码子串断言，降级为辅助（不得单独作为覆盖证据）。

## 修复判据

- 新 vm 测试在删掉 `dns.promises.Resolver` patch 时红（先红后绿，与 BUG-199 同变更）；
- 非武装态断言不装（互补态）；loopback 放行（负控）；
- `SMOKE_ONLY` 的 preload 条目要么移除、要么理由指向真实直测；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。vm 行为测试与 BUG-199 同变更；SMOKE_ONLY 理由改为指向该直测。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/harness/replay-network-offline.cjs",
    "tests/run/harness/replay-network-offline.spec.mjs",
    "tests/checks/test-surface.test.mjs"
  ],
  "red": { "command": "node --import tsx/esm --test tests/run/harness/replay-network-offline.spec.mjs", "exit": 1, "output": "not ok 2 - 离线闸武装态：lookup / promises resolve / callback Resolver / promises Resolver 四形态均 ENOTFOUND（BUG-199 / BUG-206）；error: Missing expected rejection: promises Resolver.resolve4 必须被拦" },
  "green": { "command": "node --import tsx/esm --test tests/run/harness/replay-network-offline.spec.mjs", "exit": 0 },
  "guard": { "path": "tests/run/harness/replay-network-offline.spec.mjs" }
}
```
