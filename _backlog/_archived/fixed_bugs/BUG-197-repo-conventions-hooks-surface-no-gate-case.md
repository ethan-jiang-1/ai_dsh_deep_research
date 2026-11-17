---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-197：repo-conventions 扫面扩到 dev/hooks，但 gates.e2e 没有对应注入案例——新扫面零红证

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — `dev/hooks` 扫面新增注入案例 + `verify-gates` 静态钉（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 去扫面红 / 恢复绿）（2026-11-16）
>
> 位置：[scripts/verify/gates/d-vendor.mjs](../../../scripts/verify/gates/d-vendor.mjs) 的 `repo-conventions`
> （2026-11-15 `482abf14` 把扫描面从 `dev/*.sh` 扩到 `dev/hooks/*`）；
> 自测案例表 = [scripts/lib/harness/gates-cases.mjs](../../../scripts/lib/harness/gates-cases.mjs)。

## 症状

- 门禁本体有效：给 `dev/hooks/pre-commit` 追加一行 `node "$ROOT/scripts/lib/__moved-probe__.mjs"` →
  `pnpm verify` 红，报因点名 `dev/hooks/pre-commit: 引用不存在的 …`。
- 但 `gates.e2e` 的案例表里**没有任何 `dev/hooks` 注入案例**：`CASES`/`CONTROLS` 只有
  `repo-conventions-editorconfig-root-missing` 与 `repo-conventions-dev-script-path`（后者 mutate
  `dev/bootstrap.sh`，走的是搬家前就有的 `dev/*.sh` 扫面）。

于是本次扩面「靠人手跑一次 verify 看红」证明过，**没有被自测台钉住**：未来有人把 `dev/hooks` 从
扫描面里删掉/改窄，`gates.e2e` 仍全绿。

## 分诊与授权

- 严重级：P2 — 门禁代码本身正确；缺口是「新扫面没有反证案例」，属于门禁自测合同。
- 表面 / 边界：研发面 / ② 行为（门禁自测）
- DSH 不变量：fail-loud（新判据必须能先红）
- 触及面：门禁与验收合同（案例表是门禁的一部分）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十轮搬家探索 R8 —— 同批 BUG-191…198

## 复现

复现状态：稳定。

```sh
# 1) 门禁本体确实管事（手工注入 → 红）
printf '\nnode "$ROOT/scripts/lib/__moved-probe__.mjs"\n' >> dev/hooks/pre-commit
pnpm verify        # FAIL repo-conventions … dev/hooks/pre-commit: 引用不存在的 scripts/lib/__moved-probe__.mjs
git checkout -- dev/hooks/pre-commit

# 2) 自测台没有该案例
grep -n "repo-conventions" scripts/lib/harness/gates-cases.mjs
# 785/788/797 三行：editorconfig-root-missing、dev-script-path（bootstrap.sh）
grep -n "dev/hooks" scripts/lib/harness/gates-cases.mjs   # 零命中
grep -n "gates.e2e 128" /tmp/gates-e2e.log                 # 全量跑仍报 128 案例全绿
```

## 根因（已证）

`482abf14` 改了门禁逻辑（扫描面加宽），但同 diff 没有加案例；`tests/checks/verify-gates.test.mjs`
只做「案例表的 gate 名 ↔ `context.gates` 名单」的静态对账，无法知道某个扫面分支是否被覆盖。
这与 [scripts/AGENTS](../../../scripts/AGENTS.md) 「改门禁逻辑必跑 gates.e2e（案例表 CASES 增删同 diff）」
的纪律直接冲突。

根因证据：上面三组命令；对照 = 旧扫面（`dev/*.sh`）有案例、新扫面（`dev/hooks/*`）无。

## 牵出的失败类

- **C7 假绿**（门禁判据的某个分支没有红证）+ C11 合同漂移。
- 同机制第 N 次（BUG-160 的「提及即执行」、BUG-172 的「if:false 仍算」都是同一族：判据面宽于证据面）。
  类修 = 门禁新增扫面时，案例表必须以「扫面单位」而非「门禁名」对账。

## 修法

在 `CASES` 增一例（名字建议 `repo-conventions-dev-hook-path`）：

```js
{ id: 'repo-conventions-dev-hook-path', gate: 'repo-conventions',
  mutate: appendTo(join('dev', 'hooks', 'pre-commit'), '\nnode "$ROOT/scripts/lib/__moved-probe__.mjs"\n'),
  expect: '引用不存在的 scripts/lib/__moved-probe__.mjs' },
```

并按现有救援方式登记「本门禁在副本基线非 PASS」的前提（见 785 行注释）。

## 修复判据

- `node scripts/smoke/gates.e2e.mjs --case=repo-conventions-dev-hook-path` 先红后绿（案例自身有效）；
- 删掉 `d-vendor` 里 `dev/hooks` 分支的合并 → 该案例红（证明它守的是新扫面，不是旧扫面）；
- 全量 `gates.e2e` 129 案例全绿；`pnpm verify` 绿。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。常驻案例 = `repo-conventions-dev-hook-path`（gates.e2e）；
`verify-gates.test` 静态钉住案例在场（案例被删 = 红）。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/harness/gates-cases.mjs",
    "tests/checks/verify-gates.test.mjs"
  ],
  "red": { "command": "node scripts/smoke/gates.e2e.mjs --case=repo-conventions-dev-hook-path", "exit": 1, "output": "repo-conventions-dev-hook-path：repo-conventions 报了红但非本案例的报因（去掉 dev/hooks 扫描面后注入不再命中）" },
  "green": { "command": "node scripts/smoke/gates.e2e.mjs --case=repo-conventions-dev-hook-path", "exit": 0 },
  "guard": { "path": "tests/checks/harness/verify-gates.test.mjs" }
}
```
