---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-161：CI 聚合契约的 job 名正则漏掉下划线/大写 job——新 job 可以不在 needs 里

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — ci-jobs 解析 jobs: 块，job id 允许下划线/大写（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[tests/checks/ci-jobs.test.mjs](../../../tests/checks/ci-jobs.test.mjs)（`jobs` 提取与 `blockOf` 的
> `[a-z][a-z0-9-]*`）；合同正本 = [ci.yml](../../../.github/workflows/ci.yml) 的 `all-checks-passed`。

## 症状

`ci-jobs` 用 `^  ([a-z][a-z0-9-]*):$` 提取 job 名。GitHub 的 job id 允许下划线与大写
（`[A-Za-z_][A-Za-z0-9_-]*`）；这类 job 对该门禁**不可见**：

- 不在 `jobs` 列表里；
- `needs` 与 `jobs` 的相等断言照旧通过；
- `all-checks-passed` 不要求它；
- 该 job 的 failure/cancelled/skipped 不影响书签聚合。

## 复现（2026-11-14 实测）

在 `ci.yml` 的 `all-checks-passed` 前插入一个合法但带下划线的 job：

```yaml
  zz_probe_job:
    runs-on: ubuntu-latest
    steps:
      - run: echo probe
```

```sh
node --test tests/checks/ci-jobs.test.mjs
# ok 1 - CI 聚合：all-checks-passed 覆盖全部其它 job，且 skipped 判红
# ok 2 - CI snapshot job：真的跑 snapshot-replay.entry 的 A/B
# # tests 2 / # pass 2 / # fail 0      ← 应红：新 job 不在 needs
```

删除 `zz_probe_job` 后还原，仍 2/2 PASS（对照）。

## 根因（已证）

判据层用**正则枚举 job 名**，而不是解析 `jobs:` 的键集合；正则字符类比 GitHub job id 窄。
`blockOf(name)` 也用同一正则，因此带下划线/大写的 job 连块都取不到。`needs` 的相等断言
只在被识别出的 job 上成立——新 job 从一开始就不在比较集里。

## 影响面

- 新增一个 `deploy_2` / `pack_smoke` 之类的 job 时，书签聚合不会覆盖它；它失败也不会红。
- 与 [BUG-160](BUG-160-smoke-registry-mention-not-execution.md) 同族：**枚举面**比真实面窄，
  边角合法输入静默落在门禁之外。
- 当前 4 个 job 都是 `[a-z0-9-]`，属门禁钝化而非现行故障（P2）。

## 牵出的失败类

- **C7 假绿**（聚合声称覆盖全部 job，实际漏项）+ **C2 消费者遗漏**（job 清单的消费者）。
- 同机制第 **2** 次（BUG-160 是 smoke 执行面；本条是 job 清单面）。按类修：所有「枚举键」
  的门禁应从结构化块解析或使用 GitHub 允许的完整 id 字符集，不用窄正则。

## 修复判据

- 解析 `jobs:` 下的键集合（YAML 块或完整的 `[A-Za-z_][A-Za-z0-9_-]*` 正则），断言
  `all-checks-passed.needs` 覆盖**全部**其它 job。
- 反证：插入 `zz_probe_job`（下划线）→ 门禁必须红「needs 缺 zz_probe_job」；还原 → 绿。
  当前实测为绿 = 反例成立。
- 可顺手加一个大小写/job id 字符集的矩阵，避免下一次又用窄正则。

## 修复关联

已修（2026-11-14）。触面 = 门禁与 CI/验收合同，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`；
可与 BUG-160 的「枚举面」类修同批。

## 修复落地（2026-11-14）

- **改动**：`tests/checks/ci-jobs.test.mjs` 用 `jobNamesOf` 从 `jobs:` 块取键（`[A-Za-z_][A-Za-z0-9_-]*`）；`blockOf` 同步放宽并转义名字。
- **证据**：`node --test tests/checks/ci-jobs.test.mjs` → 3/3 PASS；新增合成 job id 字符集用例。
- **反证**：插入 `zz_probe_job:` → 聚合 `needs` 与 job 清单不一致，测试 2 红；删除 → 绿。
