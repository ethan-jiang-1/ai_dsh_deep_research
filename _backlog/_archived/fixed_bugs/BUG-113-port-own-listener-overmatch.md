---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-113：port-reclaim 身份判定按仓库路径子串——仓库里启动的无关进程仍会被 SIGKILL

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 端口身份只认真正的 DSH CLI 入口/`dsh --profile web`，仓库路径子串、tail、任意 node 脚本不再算（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`scripts/lib/port-reclaim-policy.mjs`（`isOwnListener`）+ `port-reclaim.mjs`。
> 背景：这是对 BUG-104（reclaimPort 杀任意 listener）的修复；修复引入了新的 overmatch。

## 症状

`isOwnListener` 只要求命令行匹配 `vendor/dsh|...bin.ts|dsh-deep-research-pack|ai_dsh_deep_research`：

```json
{"label":"unrelated node script in repo","command":"node /Users/me/ai_dsh_deep_research/scripts/my-server.mjs","own":true}
{"label":"tail repo file","command":"tail -f /Users/me/ai_dsh_deep_research/runtime/harness-home/logs/x.log","own":true}
{"label":"unrelated elsewhere","command":"node /tmp/other/server.mjs","own":false}
```

仓库路径出现在命令行里的任意进程（用户自己的 server、tail、debug 脚本）都被判为「本仓
DSH web」，`reclaimPort` 仍会 SIGKILL。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/port-own-listener-overmatch.mjs
```

## 影响与触发面

- BUG-104 的修复只排除了「完全无关的 node -e」；在本仓目录/路径下启动的无关服务仍被杀；
- 用户常用 `node ./scripts/...`、`tail -f runtime/...` 等；命令行含仓库路径即命中；
- `isOwnListener` 不校验可执行文件名/参数形态（必须是 dsh web/vendor 入口）；
- 仍是破坏性：可能杀掉用户服务。

## 根因（已证）

- 正则 `/(?:vendor[\\/]dsh|apps[\\/]cli[\\/]src[\\/]bin\.ts|dsh-deep-research-pack|ai_dsh_deep_research)/`
  对整条 `ps command` 做子串匹配；
- 没有要求可执行文件/入口参数在特定位置，也没有排除 `tail`/任意 node 脚本；
- `ai_dsh_deep_research` 这个宽词几乎匹配本仓任何启动命令。

## 修法候选（未实施）

1. 解析 argv：必须是 `node` + DSH web 入口（vendor bin.ts / 安装副本 bin）或明确的 dsh 进程；
2. 用启动时写的 pid/端口锁文件做身份，不靠命令行子串；
3. 只接受 `dsh web`/`--profile deep-research` 形态，`tail`/任意脚本一律拒绝。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] 仓库路径下的无关 node server/tail 不再被判 own，reclaimPort 拒绝杀；
- [ ] 真正的 vendor DSH web / 安装副本 web 仍可收割；
- [ ] 复现脚本 `unrelated node script in repo` / `tail repo file` own=false；
- [ ] 新增 keyless 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 macOS/Linux `ps` 输出差异；不证明进程组/孙进程身份；
- 不证明 BUG-104 的完整修复（另一卡）。

## 已落地（2026-11-13）

- 证据 = `tests/run/port-reclaim.test.mjs` 仓库脚本/tail/dsh web。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
