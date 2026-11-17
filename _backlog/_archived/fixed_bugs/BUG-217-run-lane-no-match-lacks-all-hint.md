---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-217：run-lane 的「无匹配条目」不点修正入口——dev-only 件要 `--all`，guides/67 的局部重跑也没写

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（自授权 P2 修理型：错误信息 + 文档一行） — 结论：无匹配消息补 --all/--list 修正入口；guides/67 局部重跑补 --all；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[checks/test/run-lane.mjs](../../../checks/test/run-lane.mjs)（第 24 行错误模板）；
> 文档 = [docs/guides/67-test-strategy.md](../../../docs/guides/67-test-strategy.md)（§8「局部重跑」）；
> 规则 = [checks/AGENTS.md](../../../checks/AGENTS.md)「失败信息要给出失败对象 + 违反的规则 + 修正入口」。
> 探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N4 邻接。

## 症状

按 guides/67 §8 的「局部重跑」命令跑一个 **dev-only** 车道件，得到 exit 2，但错误信息不点修正入口：

```sh
pnpm test:entry --only cold-start; echo $?
# run-lane: entry 车道无匹配条目（tier: ci; --only cold-start）
# exit=2
# 实际修正 = 加 --all（run-lane 自己的用法行写了；guides/67 的局部重跑没写）
```

`run-lane` 的 `--all` 是「带 dev-only」的唯一开关；`--only` 只过滤 tier=ci，所以 cold-start /
client-hitl / cdp-ask 等 dev-only 件在文档命令下不可达，且错误信息不告诉读者为什么。

## 分诊与授权

- 严重级：P2 — 失败信息缺「修正入口」，与 checks/AGENTS 的失败信息三要素相违；不阻断主路径。
- 表面 / 边界：车道 runner（诊断面）/ ② 行为（CLI 输出 + 退出码）
- DSH 不变量：fail-loud（exit 2 正确）+ 失败信息可行动
- 触及面：none（错误信息 + guides/67 一行；不改门禁判据）
- 授权：自授权（P2 修理型）
- 批：2026-11-17 命名空间搬家探索（N4 邻接）；同族 = 第六轮 run-lane 观察（SKIP 语义）

## 复现

复现状态：稳定。

```sh
pnpm test:entry --only cold-start; echo $?     # 2；消息只有 tier: ci 与 --only
node checks/test/run-lane.mjs entry --all --only cold-start   # 能进（前置满足时）
sed -n '142p' docs/guides/67-test-strategy.md  # 只有 --only，无 --all
```

## 根因（已证）

- `run-lane.mjs:24` 的无匹配分支只回显 `tier: ci` 与 `--only <substr>`，不回显 `--all`；
- `--all` 只在脚本头注与 `--list` 的语义里出现，guides/67 的「局部重跑」抄了 `--only` 漏了 `--all`；
- 这是「失败信息三要素」的典型缺口：对象与规则在场，修正入口缺席。

## 牵出的失败类

- C11 文档/规则漂移 + C2 消费者遗忘（文档命令无法触达 dev-only 资产）；不是门禁判据缺口。
- 同族 = BUG-203（`gates.e2e` flag 形状）的「CLI 输入/提示」面。

## 修法

1. 无匹配分支追加：`；dev-only 件加 --all（run-lane --list 看 tier）`；
2. guides/67 §8 的局部重跑改为 `--only <substr> [--all]`，并一句话说明 dev-only 默认不跑；
3. 可选：`run-lane` 的 `--list` 已在每行显示 tier，无需新测试；若加测试，钉「消息含 --all」。

## 修复判据

- `pnpm test:entry --only cold-start` 的 stderr 含 `--all`；exit 2 不变；
- 带 `--all` 能进入同一件（前置满足时 exit 0/1，不满足时 2）；
- guides/67 的局部重跑命令含 `--all`；`pnpm verify` / `pnpm test` 绿。

## 修复关联

与 [BUG-215](BUG-215-ci-tier-nightly-required-semantics.md) 同批（车道/频率账），但一个是语义、
一个是提示；批 Note 待收口。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/smoke-lane.mjs",
    "tests/checks/cli-exit-contract.test.mjs",
    "docs/guides/67-test-strategy.md"
  ],
  "red": {
    "command": "node --test tests/checks/cli-exit-contract.test.mjs",
    "exit": 1,
    "output": "not ok 2 - 无匹配条目的失败信息… error: '修正入口：dev-only 件要 --all'"
  },
  "green": {
    "command": "node --test tests/checks/cli-exit-contract.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shared/cli-exit-contract.test.mjs"
  }
}
```
