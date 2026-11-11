---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-070：BUG-066 的机制主张被对照实验证伪 + 修复残留（team-preflight 仍钉 `research`；profile-health 指令对该档是死路）

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 证伪记录保留（rc.2 团队层本身不阻止启动；原 banner 超时原因未定）；残留已收口：`team-preflight` 切 deep-research + 消费 `profile-health`，`profile-health` 按 profile 名给指令（research 档标弃用，不再指向 boot-run），guides/60 标注 research 档弃用（2026-11-12，去向：none — dev 工具修复，审查：agent 自审 + 机械门禁）
>
> **关系**：归档卡 [BUG-066](BUG-066-research-profile-team-version-drift-banner-timeout.md)
> 已修（消费方切换 + `profile-health` 预检 + `startup-hint` 归因）。按「已修卡不重开、修正 = 新卡」，
> 本卡记录两点：**其根因句被证伪**；**修复有两处残留**。

## 一、被证伪的机制（撤回记录）

归档 066 的核心断言是「团队层 rc.2 vs runtime rc.5 → `dsh web` 拒绝启动 → 冒烟只报 banner 超时」。
本轮三组对照实验**全部正常出横幅并监听端口**：

| # | 组合 | 结果 |
|---|---|---|
| 1 | `--profile research`（无离线闸） | `dsh web: http://127.0.0.1:3198/?token=…` ✅ |
| 2 | `--profile research` + 离线闸 preload | `dsh web: http://127.0.0.1:3197/?token=…` ✅ |
| 3 | `--profile deep-research` + 离线闸 preload | `dsh web: http://127.0.0.1:3199/?token=…` ✅ |

即：**团队层版本偏旧本身不阻止启动**（控制台会打 incompatibility 提示，但 host 照起）。
2026-11-12 02:0x 那次 `--port 3113` 的 banner 超时**仍未复现**，其真正原因未定（并发/在办编辑/其他）。
修复方随后做的「统一到 deep-research + 预检 + 归因」本身是合理加固，但**不是**被这条机制逼出来的必需修复。

## 二、残留 1：`team-preflight` 仍钉 `research`

```js
const PROFILE = 'research';            // scripts/smoke/team-preflight-smoke.mjs:31
// 且全文件 grep 不到 profileLayerIssues / profile-health 的消费
```

归档 066 的状态行写「三个消费方统一改用 `deep-research`（… team-preflight 本就用它）」——与代码不符：
它用的仍是 `research`。影响：它的 boot 走旧档，agent-team 插件可能被**静默禁用**（不会卡横幅），
于是 `spawn_teammate` 类断言会在**真模型调用之后**才失败——开销已发生、归因却在最下游。

## 三、残留 2：`profile-health` 的修复指令对 `research` 是死路

`scripts/lib/profile-health.mjs` 对所有 profile 都输出
「profile 未随 pin 重钉，先跑 **dev/boot-run.sh** 重建」；但 boot-run 只建/修 `deep-research`
（`PROFILE="${DSH_RUN_PROFILE:-deep-research}"`）。对 `research` 档，这条指令跑完并不会修它——
与归档 066 里指出的「死路文案」是同一问题，只是搬进了新助手。

## 复现

```sh
grep -n "const PROFILE" scripts/smoke/team-preflight-smoke.mjs          # research
grep -n "profileLayerIssues" scripts/smoke/team-preflight-smoke.mjs    # 无命中
node --import tsx/esm -e "
import { profileLayerIssues, runtimeVersionOf } from './scripts/lib/profile-health.mjs';
const root='.';
console.log(profileLayerIssues({ profileDir:'runtime/harness-home/profiles/research', runtimeVersion: runtimeVersionOf(root) }));
"
# → ['…0.2.1-rc.2 ≠ runtime 0.2.1-rc.5——profile 未随 pin 重钉，先跑 dev/boot-run.sh 重建']
# 而 dev/boot-run.sh 的 profile 名默认 deep-research
```

## 修复判据

1. `team-preflight` 二选一：切到 `deep-research`，或消费 `profile-health` 并在 `research` 档版本失配时
   **exit 2 + 可执行的重建步骤**（不是「先跑 boot-run」）；
2. `profile-health` 的文案按 profile 名给命令，或头注声明「仅服务 deep-research」并在不适用时返回明确
   reason（不误导）；
3. 若决定保留 `research` 档：补一个创建/重建入口（脚本或 boot-run 支持 `--profile`），否则在文档
   标注该档 deprecated、三个消费方全部切走；
4. 先红后绿：拿 `runtime/harness-home/profiles/research`（版本失配档）跑一次 team-preflight 的预检
   分支（不触模型）——当前实现不咬（红），修复后 exit 2 且文案指向正确命令；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-12）：
- `team-preflight-smoke` 的 `PROFILE` 改 `deep-research`，组合校验后调用 `profileLayerIssues`（失配 exit 2）；
- `profile-health` 增 `profileName` 参数：`deep-research` 给 boot-run 指令；其它档（含 `research`）输出「已弃用，消费方改用 deep-research」，不再给死路；
- [guides/60](../../../docs/guides/60-dev-loop.md) 写明 `research` 手工 profile 已弃用、回放/录制/预检统一 `deep-research`；
- 证据 = `tests/run/profile-health.test.mjs` BUG-070 用例（research 失配 → 弃用提示、不含 boot-run 重建句）。
- 证伪部分保留为本卡正文：团队层 rc.2 本身不阻止 `dsh web` 启动；原 3113 banner 超时的真正原因仍未定（并发/在办编辑/其他），066 的加固仍是合理防线。

## 附：本轮独立复核（与残留无关，留作证据）

- `snapshot-replay-smoke --face research-face --scenario lead`：**A PASS / C0–C5 全 PASS**
  （A 证明离线闸生效；C5 逐字命中金标准）——BUG-064 与 BUG-061 的运行级修复在本轮由我独立复跑确认；
- 仍红的三条 B（persona / headers / runtime-context）是 **D48 后快照未重录**的已知项（需 with-key）。
