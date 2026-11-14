---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-160：smoke-registry 只查文件名出现——CI 执行行被注释掉仍绿

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — smoke-registry 改认可执行 run 行；注释/echo 不再算（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[tests/checks/smoke-registry.test.mjs](../../../tests/checks/smoke-registry.test.mjs)（`ci.includes(file)`）；
> 机制正本 = [guides/67](../../../docs/guides/67-test-strategy.md)「必需关」；
> 同族先例 = [BUG-053](BUG-053-plan-header-claims-first-match-anywhere.md)。

## 症状

`smoke-registry` 的「ci.yml 引用」判据是**整段文本子串匹配**：

```js
if (entry.tier === 'ci') {
  assert.ok(ci.includes(file), `${file} 标记 ci，但 .github/workflows/ci.yml 未引用它`)
}
```

把一条 `tier: ci` smoke 的 **执行行注释掉**、只在注释里保留文件名，契约仍 2/2 PASS；
该 smoke 已不在 CI 执行，registry 却继续宣称它是 CI 资产。

## 复现（2026-11-13 实测）

```sh
cp .github/workflows/ci.yml /tmp/ci.yml.bak
python3 - <<'PY'
from pathlib import Path
p = Path('.github/workflows/ci.yml')
t = p.read_text()
old = "      - name: Receipt chain (run-accept end-to-end)\n        run: source dev/env.sh && node scripts/smoke/run-accept.e2e.mjs\n"
new = "      - name: Receipt chain (run-accept end-to-end)\n        run: echo 'probe: temporarily disabled'  # node scripts/smoke/run-accept.e2e.mjs\n"
assert old in t
p.write_text(t.replace(old, new))
PY
node --test tests/checks/smoke-registry.test.mjs
# 实测：# tests 2 / # pass 2 / # fail 0   ← 应红
cp /tmp/ci.yml.bak .github/workflows/ci.yml
```

还原后同一命令仍 2/2 PASS（对照）：判据对「真执行」与「注释提及」**同判**。

## 根因（已证）

判据层选错：`ci.includes(file)` 证明的是「文件名出现在 ci.yml」，不是「存在一个执行该文件的
run 步骤，且该 step 所属 job 在 `all-checks-passed.needs` 里」。

- [ci-jobs.test.mjs](../../../tests/checks/ci-jobs.test.mjs) 只把守 **job 名**与 `needs` / skipped 语义，
  不解析 step 内容；
- `echo`、注释、`if: false`、`continue-on-error` 都能让文件名在场而执行不发生；
- 与 [BUG-053](BUG-053-plan-header-claims-first-match-anywhere.md) 同族：
  「正文提及冒充声明」→「文件名提及冒充执行」。

## 影响面

- D54「必需关」的机械前提是「registry 标 ci = CI 真跑」；该前提可被注释/字符串满足。
- 当前 9 条 `tier: ci` 资产都真跑（`client-load` / `doctor` / `gates` / `handoff` / `lifecycle` /
  `pack` / `preset` / `run-accept` / `snapshot-replay`），属**门禁钝化**而非现行故障（P2）。
- 一旦有人为省 CI 时间把某行注释掉，`pnpm verify` / `pnpm test` 仍全绿，只有人工读 CI 才会发现。

## 牵出的失败类

- **C7 假绿**（在场 ≠ 执行）+ **C2 消费者遗忘**（registry 标了 ci，执行面没接上）。
- 同机制第 **2** 次：BUG-053 已把「首次匹配/正文提及」改成 `headerBlockOf` 的范围仲裁；本条应按
  **类修**落「执行面解析」，不是再补一个 `includes` 或再加一条注释提醒。

## 修复判据

- 解析 ci.yml 的 `run:` 行（或 job/steps 结构），要求每个 `tier: ci` 的 smoke 出现在一个**实际执行**
  的 step 里；注释/`echo`/纯字符串不算。
- 可选加强：该 step 所属 job 必须在 `all-checks-passed.needs` 里；`if: false` / `continue-on-error`
  判红；`client-load` 这类「直接 `node ... entry.mjs`」的写法同样要能解析。
- 反证（先看红）：按上面的复现注释掉一条 run 行 → 门禁必须红；还原 → 绿。当前实测为绿 = 反例成立。

## 修复关联

已修（2026-11-14）。触面 = 门禁与验收合同（D54 必需关），按 [_backlog/AGENTS](../../AGENTS.md) 的 P2 规则也**不**
自授权 → `等人拍板`。修复 owner = `tests/checks`，可与 Y1 的类级守卫（执行面 vs 文本面）同批。

## 修复落地（2026-11-14）

- **改动**：`tests/checks/smoke-registry.test.mjs` 新增 `runBlocksOf` / `executedSmokeFiles`（单行 + `run: |` 块；剥离行尾注释、跳过 echo/printf/cat），ci 归属改用可执行集合。
- **证据**：`node --test tests/checks/smoke-registry.test.mjs` → 4/4 PASS；全仓 `pnpm test` checks 108/108。
- **反证**：把 `run: ... run-accept.e2e.mjs` 改成 `run: echo ... # ... run-accept.e2e.mjs` → 测试 3 红「没有可执行的 node 调用」；还原 → 绿。
