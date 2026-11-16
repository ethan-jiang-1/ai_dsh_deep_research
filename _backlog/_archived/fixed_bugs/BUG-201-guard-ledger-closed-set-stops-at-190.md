---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-201：守卫台账闭集停在 BUG-190——批 E 的 8 卡与三个类级守卫未入账

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — 守卫台账 90 条（A–F）+ 反向「守卫标题 ≥191 必须入账」（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 缺账/反向负控红绿）（2026-11-16）
>
> 位置：[tests/fixtures/guard-ledger/ledger.json](../../../tests/fixtures/guard-ledger/ledger.json)
> 与 [tests/checks/guard-ledger.test.mjs](../../../tests/checks/guard-ledger.test.mjs)；
> 批 E 的新守卫 = `test-placement`（[scripts/lib/repo/test-placement.mjs](../../../scripts/lib/repo/test-placement.mjs)）、
> `smoke-child-paths`（[tests/checks/smoke-child-paths.test.mjs](../../../tests/checks/smoke-child-paths.test.mjs)）、
> `gates-cli`（[tests/run/harness/gates-cli.spec.mjs](../../../tests/run/harness/gates-cli.spec.mjs)）。

## 症状

守卫台账 scope 自述是「失败类普查 D-1 + D-2 + 探索批 A–D（BUG-160..190）**全量闭集**」，
条目数写死 72、最大 id 是 `BUG-190`。批 E（191–198）修复归档后：

- 台账里 **0 条** BUG-191…198；
- 新守卫文件里的 `test()` 标题却已声称 `BUG-191` / `BUG-192 / BUG-193`（见下）；
- `guard-ledger.test.mjs` 的 `SCOPED_IDS` 与 `assert.equal(bugs.length, 72)` 把闭集钉死——
  想入账必须同时改三处常量，而当前没有任何判据要求批 E 必须入账（反向也不查）。

结果是：**类级守卫存在、卡也归档了，但「验证层 oracle」台账看不见它们**；D55 的「守卫双账」
在最新一批上断层。

## 分诊与授权

- 严重级：P2 — 不阻断运行；但这是「守卫有没有被记住」的账，断层会让下一轮把类级守卫当一次性修复。
- 表面 / 边界：研发面 / ② 行为（台账与守卫的机械对账）
- DSH 不变量：fail-loud（新守卫没有 ledger 归宿时应红）
- 触及面：门禁与验收合同（guard-ledger 的闭集与常量）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十一轮探索（199–208）

## 复现

复现状态：稳定。

```sh
python3 -c "import json;d=json.load(open('tests/fixtures/guard-ledger/ledger.json'));print(d['scope']);print(len(d['bugs']));print(sorted(b['id'] for b in d['bugs'])[-1])"
# scope: … 探索批 A–D（BUG-160..190，31）全量闭集 …
# 72
# BUG-190
grep -n "BUG-19[1-8]" tests/checks/test-placement.test.mjs tests/checks/smoke-child-paths.test.mjs
# test('合法落点全集零问题（BUG-191 负控）'…
# test('子进程/前置的分段路径字面量全部可解析（BUG-192 / BUG-193 类级守卫）'…
grep -c "BUG-19[1-8]" tests/fixtures/guard-ledger/ledger.json   # 0
```

## 根因（已证）

- `ledger.json` 是**手写闭集**（不是生成物），批 E 修复提交只更新了 8 张卡与代码，没有扩账本。
- `guard-ledger.test.mjs` 只校验 `requiredIds`（72 张）齐全 + 账内条目与 asset-ledger/标题一致；
  **不校验「守卫文件里声称的 BUG-nnn 必须在账内」**。因此给守卫加 `BUG-191` 标题不会触发任何红。
- 两个写死的 `72` 让「有意排除批 E」与「漏了批 E」在测试面上不可区分。

根因证据：上面三条命令；`validateGuardLedger` 只做「账 → 守卫」方向，不做「守卫 → 账」方向。

## 牵出的失败类

- **C2 消费者/台账遗漏**（守卫存在但账本不知道）+ C7（闭集常量冒充全量）。
- 同机制第 1 次（D55 双账建立后的第一批新守卫）；类修 = 台账覆盖「所有带 BUG-nnn 标题的守卫文件」，
  或把守卫台账改为生成物。

## 修法

1. 台账补 8 条（191–198），`guard` 指向各自 `fix-evidence.guard`，`oracleType` 与 asset-ledger 同源，
   `status: closed`，`redRecipe` 抄卡内红证。
2. `SCOPED_IDS` 增 `BATCH_E = 191..198`；三处 `72` 改为由 `SCOPED_IDS.length` 推导（消掉手抄常量）。
3. 加一条反向判据：`tests/checks` 与 `tests/run` 里 `test()` 标题声称的 `BUG-nnn`（≥191）必须在台账里——
   漏一条 = 红。

## 修复判据

- 台账含 191–198 共 80 条，`oracleType` 与 asset-ledger 零冲突、guard 路径存在、标题绑定；
- 故意删一条批 E 入账 → 红；给守卫加一个未入账的 `BUG-199` 标题 → 反向判据红；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。台账 90 条（D-1/D-2/A–F）；反向判据 = 守卫标题声称的
BUG-nnn（≥191）必须入账，负控用合成 BUG-199 标题。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "tests/fixtures/guard-ledger/ledger.json",
    "tests/checks/guard-ledger.test.mjs",
    "tests/fixtures/asset-ledger/ledger.json"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/guard-ledger.test.mjs", "exit": 1, "output": "not ok 1 - guard ledger 全量对账（BUG-201）；缺账：BUG-191" },
  "green": { "command": "node --import tsx/esm --test tests/checks/guard-ledger.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/guard-ledger.test.mjs" }
}
```
