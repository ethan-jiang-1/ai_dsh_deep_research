---
status: 修复就绪
severity: P2
opened: 2026-11-12
---

# BUG-067：回放离线闸的 DNS 面不完整——`dns.resolve*` 实测绕过，子进程工具也不受控

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：修复就绪（P2 test-support 修理型；与 BUG-064 同批）
>
> 说明：本卡针对**在办未提交**的 `scripts/smoke/replay-network-offline.cjs`（BUG-064 的修复件）；
> 现在提出来是为了让它提交前把边界收全。

## 症状

离线闸（preload）的成文承诺是「把非 loopback 的出站连接与 DNS 立即判失败」。实测在**已武装**状态下
（argv 命中 dsh 主进程，`isDshMain()` 为真）：

| 动作 | 结果 | 期望 |
|---|---|---|
| `fetch('https://example.com/')` | **ECONNREFUSED**（被拦） | 拦 |
| `dns.promises.lookup('example.com')` | **ENOTFOUND**（被拦） | 拦 |
| `fetch('http://127.0.0.1:<port>')` | HTTP 200（放行） | 放行 |
| **`dns.promises.resolve4('example.com')`** | **解析成功：172.66.147.243 / 104.20.23.154** | 应拦（或至少失败） |

即：`resolve*` 一族完全绕过闸门。工具若走 `dns.resolve4/6/Any` 或 `new dns.Resolver()`，仍会打真实
DNS——而**DNS 解析本身没有超时**，正是 BUG-064 里「回合停在 tool/call 240s」的那类挂起路径。

另外：preload 现在只在 `isDshMain()`（argv 尾是 `apps/cli/{src/bin.ts,lib/bin.js}`）时安装；
**工具派生的子进程**（如 bash 里跑 `curl`）不满足该条件 → 不受控。注释只解释了 pnpm/MCP/浏览器
子进程不该被拦，没有覆盖「工具自己 spawn 的网络进程」。

## 复现

```sh
mkdir -p /tmp/fake/apps/cli/lib
# 探针脚本：依次试 fetch 外网 / dns.resolve4 / dns.lookup / fetch loopback
cp /tmp/offline-probe.cjs /tmp/fake/apps/cli/lib/bin.js   # 内容见下（与会话内探针同形）
REPLAY_NETWORK_OFFLINE=1 node --require ./scripts/smoke/replay-network-offline.cjs \
  /tmp/fake/apps/cli/lib/bin.js
# → {"fetchExternal":"ERR ECONNREFUSED","dnsResolve4":["172.66.147.243","104.20.23.154"],
#    "dnsLookup":"ERR ENOTFOUND","localFetch":"HTTP 200"}
```

（探针 = 一个 CJS 脚本，顺序执行四件事并把结果 JSON 打印；与会话内 `/tmp/offline-probe.cjs` 同形。
`/tmp/fake/apps/cli/lib/bin.js` 只是为了让 argv 尾命中 `isDshMain()` 的正则，从而真正安装闸门。）

## 根因（已证）

`install()`（`scripts/smoke/replay-network-offline.cjs`）只补了：

- `dns.lookup` / `dns.promises.lookup`；
- `net.Socket.prototype.connect`。

`dns.resolve`、`dns.resolve4/6/Cname/Any`、`dns.Resolver.prototype.*` 都没碰；`node:dns/promises` 的
`resolve*` 同样未覆盖。`isDshMain()` 是后来加的（避免把 pnpm 安装子进程也挡掉——这是对的），但它的
副作用是「工具派生的子进程」也不在闸门内，而这一点没有写进承诺。

## 影响面

- 当前 fixture（`web_search` / `web_fetch` 走 fetch → `dns.lookup` + `connect`）**已被覆盖**，所以
  A 层的现实阻塞已解除——本卡是**边界与承诺**问题；
- 一旦未来 fixture 用 `bash`/`resolve*` 类工具，A 会重新出现「240s 静默超时、归因指向模型回放」的
  老形态（BUG-064 的归因改进也未必命中 DNS 挂起）。

## 修复判据

1. 补齐 DNS 面：`dns.resolve*`、`dns.Resolver.prototype.resolve*`（含 promises 面）对非 loopback
   主机立即 `ENOTFOUND`；loopback 主机仍走真实解析；
2. 明确并测试「子进程边界」：在文件头注写清「只覆盖 dsh 主进程内的网络调用；工具 spawn 的子进程
   不受控」，或提供 `REPLAY_NETWORK_OFFLINE_CHILDREN=1` 之类的可选更严模式（若启用，需同时确保
   pnpm/registry 安装子进程豁免）；
3. 运行时测试补三件：武装态下 `fetch` 外网失败、`lookup` 失败、**`resolve4` 失败**；loopback 三件全通
   （现在只有 `isLoopback` 的纯函数测试）；
4. 先红后绿：当前实现下 `resolve4` 用例必红；
5. `pnpm test` + `pnpm verify` 绿（注意 BUG-066 修法里提到的 layering：测试不得 import 驱动面）。

## 修复关联

P2 test-support 修理型，随 [BUG-064](../_archived/fixed_bugs/BUG-064-replay-a-layer-not-self-contained-tool-stall.md) 的修复
同批落地即可；若采纳「子进程更严模式」，需评估 boot 期 pnpm 安装路径，必要时提请用户拍板。
