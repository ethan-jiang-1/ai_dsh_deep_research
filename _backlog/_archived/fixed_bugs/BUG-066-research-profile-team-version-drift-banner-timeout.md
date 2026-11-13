---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-066：`research` profile 无创建者、无版本校验——团队层停在 rc.2，回放/团队冒烟只报「等待启动横幅超时」

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 三个消费方统一改用 `deep-research` profile（boot-run 维护版本面；snapshot-replay + record-role-fixture 已切换，team-preflight 本就用它）；新增 `profile-health` boot 前版本预检（exit 2 + 重建指令）与 `startup-hint` banner 归因（识别 incompatible/exemption）；真机回放 A/C2/C3/C5 PASS，B 的 persona/headers/runtime-context 红是快照重录问题（2026-11-12，去向：none — dev 工具修复，审查：agent 自审 + 机械门禁）

## 症状

`snapshot-replay-smoke`（以及 `team-preflight-smoke`、`dev/record-role-fixture.mjs`）依赖开发 home 里的
**`research` profile**。该 profile 的团队层版本停在 `0.2.1-rc.2`，而当前 runtime 是 `0.2.1-rc.5`：

```
$ cat runtime/harness-home/profiles/research/package.json
"@deepseek-ai/dsh-experimental-agent-team-profile": "0.2.1-rc.2"

$ node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario lead --port 3113
Error: 等待启动横幅超时
... plugin version @deepseek-ai/dsh-experimental-tool-agent-team@0.2.1-rc.2 is incompatible
    with dsh 0.2.1-rc.5 ... Exact-version exemption: not active.
```

即：**profile 未随 pin 重钉 → `dsh web` 拒绝启动 → 冒烟以「banner 超时」收场**，失败信息里只有一长段
被截断的日志尾巴，归因指向「主机/启动慢」而不是「profile 过期」。

## 复现

```sh
grep agent-team-profile runtime/harness-home/profiles/research/package.json   # rc.2
node --import tsx/esm scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario lead --port 3113
# → 等待启动横幅超时；stderr 的尾巴里才有 incompatible 的原文
```

（`runtime/harness-home/profiles/research/compatibility.json` 于 2026-11-12 02:08 由 DSH 记下
`@deepseek-ai/dsh-experimental-tool-agent-team@0.2.1-rc.2 → 0.2.1-rc.5` 的阻断记录。）

## 根因（已证）

三处缺口叠在一起：

1. **版本面缺失**：`team-preflight-smoke` 的 profile 组合校验只查 bundles + 盘上 preset
   （[team-preflight-smoke.mjs](../../../scripts/smoke/team-preflight.e2e.mjs)），**不查团队层版本**；
   `snapshot-replay-smoke` **完全不校验** profile。而 [dev/boot-run.sh](../../../dev/boot-run.sh) 的
   `profile_ok()` 早在 2026-10-19 就加过版本面——它的注释写着一模一样的教训：
   「只查 bundles 在场会把旧 pin 的组合判成在位……报 incompatible 并卡在启动横幅（表现 = snapshot-replay /
   run 通道超时，根因在 profile 未随 pin 重钉）」。
   **同一逻辑存在于两个地方，只有 `deep-research` profile 那一份修过。**
2. **错误归因**：`bootWeb` 只等横幅；插件不兼容时进程不退出、只是拒绝服务 → 120s/240s 后统一报超时，
   没有把已知的 `incompatible ... exemption` 文本识别为「profile 未重钉」。
3. **修复指令是死路**：`team-preflight-smoke` 说「先跑 dev/boot-run.sh 再来」，但 boot-run 用的是
   **`deep-research`** profile（`PROFILE="${DSH_RUN_PROFILE:-deep-research}"`），跑它并不会修 `research`；
   而仓库内**没有任何代码创建 `research` profile**（`grep -r "profiles/research"` 只有消费方：
   record-role-fixture 读它的 cordis.patch.yml、replay/team-preflight 启动它）——它是一份手工遗留的开发 home 状态。

## 影响面

- 三个依赖它的工具在 **pin 一升级就整片失效**，且表现为随机超时：本轮探索里我先后把它误判成
  「网络挂住」（BUG-064）、「并发争用」，各花掉数十轮分钟；
- 新克隆/新机器上 `research` profile 根本不会存在——`team-preflight` 会让人「先跑 boot-run」，
  跑完仍不存在，形成死循环；
- 这是**已发生过一次的事故类型**（2026-10-19）的复发形态，只是换了 profile。

## 修复判据

1. **版本面统一**：把 `dev/boot-run.sh` 的 `profile_ok`（含团队层版本 == 运行中 dsh 版本）抽成共享助手，
   `snapshot-replay` / `team-preflight` / `record-role-fixture` 在 boot 前调用同一助手；
2. **归因**：banner 超时时若输出含 `incompatible` / `Exact-version exemption: not active`，判红并输出
   「profile 未随 pin 重钉：先重建 <profile>」；不再只报「等待启动横幅超时」；
3. **创建者补位**：给 `research` profile 一个可复用的 bootstrap（或让三个消费方统一改用
   `deep-research` / 每次自建隔离 profile），并在 [guides/60](../../../docs/guides/60-dev-loop.md) 写明；
   「先跑 boot-run」的文案必须指向**真的**能修该 profile 的命令；
4. 先红后绿：构造一个团队层版本落后的临时 home（或给校验助手喂旧版本字符串）→ 旧实现超时/静默、
   新实现明确红并给准确指令；
5. 新增测试若 import `scripts/smoke/*` 需遵守 layering 守卫（当前同批在办的
   `tests/run/replay-network-offline.test.mjs` 正因为 import `scripts/smoke/*.cjs` 被 layering 测试咬红）；
6. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-12）：
- **统一 profile**：`snapshot-replay-smoke` / `dev/record-role-fixture.mjs` 从 `research` 改到 `deep-research`（`team-preflight-smoke` 本就用后者）；该 profile 由 `dev/boot-run.sh` 的 `profile_ok` 钉版本面。
- **boot 前版本预检**：`scripts/lib/profile-health.mjs`（团队层版本 == 运行时版本；缺席/落后 → exit 2 + 「先跑 dev/boot-run.sh」），snapshot-replay 与 recorder 在 boot 前调用。
- **归因**：`scripts/lib/startup-hint.mjs` 识别日志里的 `incompatible` / `Exact-version exemption: not active`，banner 超时与提前退出都前置「profile 未随 pin 重钉」提示。
- 证据 = `tests/run/profile-health.test.mjs`、`tests/run/startup-hint.test.mjs`；真机 replay（deep-research profile）A PASS、C0–C5 全 PASS；`research` 手工 profile 不再被消费方依赖。
- 未修 = B·persona/headers/runtime-context（快照重录，with-key 人审，不属本卡）。
与 [BUG-064](BUG-064-replay-a-layer-not-self-contained-tool-stall.md) 相邻但不同层：064 是「工具真执行会挂」，
本条是「profile 过期导致 host 根本不启动」；两条合起来解释了回放为什么长期不可靠。
