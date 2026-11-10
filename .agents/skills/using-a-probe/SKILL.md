---
name: using-a-probe
description: Use when a mechanism's contract needs evidence at a real boundary — model behavior, live GUI, entry chain, or stream capture — and unit tests or smoke cannot attribute the failure; covers choosing a probe over E2E, red-first proof, header/index registration, isolation, evidence, and promotion.
---

# 用探针，而不是再跑一遍 E2E

本技能是 **guidance**，不是 checklist。探针的单一入口 =
[`docs/guides/66-probe-playbook.md`](../../../docs/guides/66-probe-playbook.md)；
目录与索引 = [`probes/`](../../../probes/README.md) 与
[`probes/INDEX.generated.md`](../../../probes/INDEX.generated.md)。相关技能：
[`reproducing-a-failure`](../reproducing-a-failure/SKILL.md)、
[`writing-a-gate`](../writing-a-gate/SKILL.md)。

## 1. 先判断：该不该用探针

问三个问题（答不上就别写，先补可观察性）：

1. **最低可观察层是什么？** 能不能不进完整 run / E2E？
2. **能在秒—分钟内用真实入口造出这个状态吗？** 不能就先把状态做成可控（临时 home、
   屏障、假 provider、固定时钟）。
3. **失败时能拿到什么不可抵赖的类型化证据？** 事件、真实文件、DOM、进程状态；
   不是「模型说完成了」。

**症状 → 先看索引**：模型不按纪律 → `discipline-probe`；入口链 → `entry-chain-probe`；
偏好库 → `method-library-probe`；驾驶舱交互 → `cdp-probe`；流异常 → `llm-stream-tee`；
不满转接 → `rerun-triage-probe`。

**不要用探针**：纯函数 → 单测；安装/挂载 → 冒烟；整条用户链路 → E2E；内容质量 → L4 / 人读。

## 2. 先找现成的

1. 读索引的「一句话 / 何时跑 / 状态」；现有探针能覆盖就先跑它，别新写。
2. 跑之前读该脚本头注的 **判据** 与 **不证明**；绿只在这个场景/判据下成立。
3. 真模型档需要 `source dev/env.sh` 与凭据；`--port` 用脚本自己的缺省，不要改 `--port 0`
   （本仓端口独占由 `port-exclusive` 门禁守）。
4. 失败现场按头注/指南 §5 落 `runtime/smoke-workspace/`；不要覆盖旧现场。

## 3. 写新探针（先红，再绿）

1. **一个命题**：一支探针只证一个机制；红了能指认层。命题多了就拆。
2. **先看红**：改坏夹具、去掉保护或加负例，证明判据真的会红；还原后绿。只交付绿 =
   不知道它会不会咬人。
3. **隔离**：临时目录/临时 home；端口独占；结束清理（`--keep` 才留现场）；
   拒绝碰日用 home。
4. **证据**：`verdict` + 原始日志/页面文本/截图；离线拿同一份证据重扫判据仍得同样结论。
5. **登记**：补头注六字段（状态 / 一句话 / 何时跑 / 档位 / 判据 / 不证明；为什么存在推荐）
   → `node probes/_index.mjs --write` → `pnpm verify` 绿。
6. **分层**：探针之间不互相 import；共享纯函数放 `scripts/lib/`，真实驱动放 driver 面；
   真模型档同 diff 登记 `REAL_MODEL` 闭集（`tests/contracts/smoke-contract.test.mjs`）。

## 4. 反模式（写之前先排除）

- 迷你 E2E：一支断言十件事，红了不知道谁坏了。
- 固定 `sleep` 等异步：慢机器假红、快机器假绿；等 durable 事件/谓词。
- mock 被测机制：只 mock 非确定边界（模型/网络/时钟）。
- 把模型/agent 自述当证据。
- 只 print 不 exit；`SKIP` 冒充 `PASS`；环境失败与行为失败混用退出码。
- keyless 探针加重试掩盖 flake（重试只许真模型/浏览器外部边界）。
- 固定端口/污染日用状态（本仓端口独占是硬约定）。
- 手写清单/索引：头注是源，索引用 `--write` 生成。

## 5. 交付时说什么

- 实跑命令、红证与绿证、目标探针的「不证明」；
- 新增/改动的头注与索引（`_index.mjs --check` 绿）；
- 未跑项如实分列（未跑 ≠ 通过）。
