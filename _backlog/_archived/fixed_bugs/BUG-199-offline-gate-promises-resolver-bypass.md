---
status: 已修
severity: P1
opened: 2026-11-16
---

# BUG-199：离线闸漏 `dns.promises.Resolver`——武装态下 `new Resolver().resolve4()` 仍解析外网

> 严重级别：P1 ｜ 发现：2026-11-16 ｜ 状态：已修 — `dns.promises.Resolver.prototype.*` 补齐 + vm 四形态行为证据（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 行为红绿 + 武装态实测）（2026-11-16）
>
> 位置：[scripts/lib/harness/replay-network-offline.cjs](../../../scripts/lib/harness/replay-network-offline.cjs)
> 的 RESOLVE 循环（`dns.Resolver?.prototype?.[name]`）；判据纯件 =
> [replay-network-offline-policy.cjs](../../../scripts/lib/harness/replay-network-offline-policy.cjs)。

## 症状

在**武装态**（`REPLAY_NETWORK_OFFLINE=1` + argv 命中 `apps/cli/lib/bin.js`）下，模块级 DNS 面被拦，
但 promises 的 Resolver 类整族漏网：

```
dns.promises.resolve4                → blocked ENOTFOUND
new dns.promises.Resolver().resolve4 → RESOLVED ["172.66.147.243","104.20.23.154"]
new dns.promises.Resolver().resolve6 → ENODATA（真实网络响应，不是闸门的 ENOTFOUND）
dns.lookup                           → blocked ENOTFOUND
```

即回放 A 层（BUG-064 的离线不变量）仍有一条可达外网的路径；只要某个工具/库用
`new dns.promises.Resolver()`，离线闸就静默失效。

## 分诊与授权

- 严重级：P1 — 打断「A 层 keyless/offline」不变量（BUG-064/067 的同一承诺）；不阻断普通测试，故非 P0。
- 表面 / 边界：run（回放 A 层）/ ② 行为——武装态子进程即最低边界
- DSH 不变量：fail-loud（离线承诺被绕过而不报警）
- 触及面：none（测试支撑 preload，不是门禁/入口链/文档合同）
- 授权：自授权（P1 修理型修复）
- 批：第十一轮探索（bug 消费侧 199–208）；前序 = [BUG-067](BUG-067-offline-gate-dns-resolve-bypass.md)

## 复现

复现状态：稳定（两条命令，keyless；出网由本机网络提供，返回真实 A 记录）。

```sh
REPLAY_NETWORK_OFFLINE=1 node --require "$PWD/scripts/lib/harness/replay-network-offline.cjs" -e '
const dns = require("node:dns");
(async () => {
  const show = async (l, fn) => { try { console.log(l, "→ RESOLVED", JSON.stringify(await fn()).slice(0,40)) } catch (e) { console.log(l, "→ blocked", e.code) } };
  await show("module", () => dns.promises.resolve4("example.com"));
  await show("promises.Resolver", () => new dns.promises.Resolver().resolve4("example.com"));
})();' apps/cli/lib/bin.js
# module → blocked ENOTFOUND
# promises.Resolver → RESOLVED ["172.66.147.243","104.20.23.154"]
```

Node 22 的结构事实（同一条命令可核对）：`dns.Resolver.prototype.resolve4 !== dns.promises.Resolver.prototype.resolve4`，
且 `new dns.promises.Resolver() instanceof dns.Resolver === false` —— 两者不是同一 prototype 链。

## 根因（已证）

`install()` 的 RESOLVE 循环只改三处：`dns[name]`、`dns.promises[name]`、`dns.Resolver.prototype[name]`。
Node 的 `dns.promises.Resolver` 是**独立类**，自己的 prototype 上有一份 resolve* 实现（不继承
`dns.Resolver.prototype`），因此 `new dns.promises.Resolver()` 完全绕开 patch。

头注却写着「DNS 面覆盖 lookup + resolve* + Resolver.prototype.*（**含 promises**）」——承诺比实现宽。
[Bug-067 的回归测试](../../../tests/run/harness/replay-network-offline.spec.mjs) 只做**源码子串**断言
（`source.includes('dns.Resolver?.prototype?.[name]')`），不执行 install()，所以把错误的类当成覆盖
（同族的「提及 ≠ 执行」= BUG-160；见 [BUG-206](BUG-206-offline-preload-source-substring-test-and-smoke-only.md)）。

根因证据：上面命令的双面对照 + 两条 Node 结构事实 + 源码三处 patch 行。

## 牵出的失败类

- C7 假绿（源码子串冒充行为覆盖）+ C2 消费者遗漏（promises 类）。
- 同机制第 2 次（BUG-067 是第 1 次：模块级 `resolve*` 漏网）；类修 = 「DNS 面 = 每一条可创建的
  Resolver 形态都必须实测拦下」，而不是枚举函数名。

## 修法

1. 在 RESOLVE 循环中补 `dns.promises.Resolver?.prototype?.[name]` 的 patch（保留现有两处）。
2. 头注的覆盖声明改成与实现一致，或列明「promises Resolver 由哪一处 patch」。
3. 把 BUG-067 的源码子串测试升级为行为测试（见 [BUG-206](BUG-206-offline-preload-source-substring-test-and-smoke-only.md)）。

## 修复判据

- 武装态下三种形态全部被拦：`dns.promises.resolve4`、`new dns.Resolver().resolve4`（callback）、
  `new dns.promises.Resolver().resolve4` → 均 ENOTFOUND；
- loopback（`127.0.0.1` / `localhost` / `[::1]`）仍放行（负控）；
- 非武装态（env 缺或 argv 不命中）三形态行为不变（互补态）；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。行为证据 = `tests/run/harness/replay-network-offline.spec.mjs`
（vm 加载 install()，假 dns/net + 假 argv）；武装态实测 `promises.Resolver → blocked ENOTFOUND`。

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
