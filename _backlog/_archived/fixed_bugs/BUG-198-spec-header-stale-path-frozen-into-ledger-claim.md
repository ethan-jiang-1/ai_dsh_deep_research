---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-198：搬家后 7 个 spec 的头注仍写旧路径，并被资产账的 uniqueClaim 固化成「不存在的事实」

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — 7 处头注改现路径 + asset-ledger claim 存在性判据（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 假 claim 红 / 重生成绿）（2026-11-16）
>
> 位置：7 个 spec 的首行自指注释（下表）；生成物 =
> [tests/fixtures/asset-ledger/ledger.json](../../../tests/fixtures/asset-ledger/ledger.json) 的 `uniqueClaim`；
> 生成器 = [scripts/lib/tools/asset-ledger.mjs](../../../scripts/lib/tools/asset-ledger.mjs)。

## 症状

2026-11-15 搬家（`a81f9424` / `09e98025`）重写了 import，但没有改文件首行自指注释。7 个 spec 的
头注是**自己的旧路径**，且该注释被 `uniqueClaimOf` 取成资产账的 `uniqueClaim`，于是生成物里出现
「测试资产声称自己住在不存在路径」的 7 条记录：

| spec（现路径） | 头注写的路径 | 资产账 uniqueClaim |
|---|---|---|
| `tests/run/channel/hitl1-intake-samples.spec.mjs` | `tests/hitl1-intake-samples.spec.mjs` | 同（旧路径开头） |
| `tests/run/channel/inject-reconcile.spec.mjs` | `tests/inject-reconcile.spec.mjs` | 同 |
| `tests/run/gates/plan-card.spec.mjs` | `tests/plan-card.spec.mjs` | 同 |
| `tests/run/ops/member-activity-fold.spec.mjs` | `tests/member-activity-fold.spec.mjs` | 同 |
| `tests/run/ops/provider-errors.spec.mjs` | `tests/provider-errors.spec.mjs` | 同 |
| `tests/run/probes/probe-send-target.spec.mjs` | `tests/probe-send-target.spec.mjs` | 同 |
| `tests/run/probes/probe-status-tab.spec.mjs` | `tests/probe-status-tab.spec.mjs` | 同 |

`uniqueClaim` 是资产账用来回答「这条资产唯一证明什么」的字段，也是 `asset-ledger` 与守卫账、
人工审查对读的入口；一个不存在的路径会让读者按旧名去找文件而读空。

## 分诊与授权

- 严重级：P2 — 文档/生成物失准，不影响运行；但 `uniqueClaim` 是账本字段，属「合同文本」不是随笔。
- 表面 / 边界：研发面 / ② 行为（生成器取首行）——最低可观察层 = 纯函数 `uniqueClaimOf` + 盘上路径
- DSH 不变量：fail-loud（合同文本指向不存在的对象时应被拒绝）
- 触及面：文档合同（资产账生成物与测试头注）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（文档合同触面）」解除
- 批：第十轮搬家探索 M3 —— 同批 BUG-191…197

## 复现

复现状态：稳定（脚本对读，keyless）。

```sh
python3 - <<'PY'
import json, os, re
led = json.load(open('tests/fixtures/asset-ledger/ledger.json'))['assets']
bad = [(a['path'], m.group(1)) for a in led
       if (m := re.search(r'(tests/[A-Za-z0-9_./-]+\.(?:mjs|cjs))', a.get('uniqueClaim','')))
       and not os.path.exists(m.group(1))]
print(len(bad)); [print(' ', p, '->', c) for p, c in bad]
PY
# 7
```

## 根因（已证）

- 搬家工具链只处理 import 语句与路径登记簿，不处理「注释里的自指路径」；
- `doc-paths` 只扫反引号（且排除 `_backlog/`、`notes/`），`repo-conventions` 只扫 dev shell，
  `md-links` 只管 Markdown 链接——注释文本没有任何一条判据；
- `uniqueClaimOf` 直接取注释正文，把错误路径复制进生成物，且 `asset-ledger` 对账只比「重新生成是否一致」，
  不比「claim 里的路径是否存在」。

根因证据：上表 + 生成器 `uniqueClaimOf` + 三条门禁的扫描面。

## 牵出的失败类

- **M3 非 JS 字面量**（注释面）+ C11 生成物固化错误事实。
- 同机制第 1 次（搬家批）；类修方向见修法第 3 条。

## 修法

1. 更新 7 个头注为现路径，重生成 `tests/fixtures/asset-ledger/ledger.json`。
2. `asset-ledger.test.mjs` 增一条：`uniqueClaim` 里形如 `tests/….(mjs|cjs)` 的 token 必须存在
   （防空：至少 N 条 claim 含路径 token 才做断言）。
3. （可选类修）加静态检查：spec 首行若形如 `tests/…/x.spec.mjs` 且 basename 与自身相同，
   必须等于自身路径——这是搬家友好的「自指路径」判据。

## 修复判据

- 7 处头注逐条等于自身路径；上面脚本输出 `0`；
- `asset-ledger` 重生成后 `pnpm test` 绿，且新增的 claim 路径检查在注入一条假路径时红（先红后绿）；
- `pnpm verify` 绿。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。7 处头注逐条等于现路径；`asset-ledger.test` 的 claim 路径检查
常驻（防空 ≥10 条 claim）。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "tests/run/channel/hitl1-intake-samples.spec.mjs",
    "tests/run/channel/inject-reconcile.spec.mjs",
    "tests/run/gates/plan-card.spec.mjs",
    "tests/run/ops/member-activity-fold.spec.mjs",
    "tests/run/ops/provider-errors.spec.mjs",
    "tests/run/probes/probe-send-target.spec.mjs",
    "tests/run/probes/probe-status-tab.spec.mjs",
    "tests/checks/asset-ledger.test.mjs",
    "tests/fixtures/asset-ledger/ledger.json"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/asset-ledger.test.mjs", "exit": 1, "output": "not ok 3 - uniqueClaim 里形如 tests/… 的路径 token 必须存在（BUG-198；防空 ≥10 条 claim）；tests/checks/asset-ledger.test.mjs: uniqueClaim -> tests/__fake-claim-path__.spec.mjs（不存在）" },
  "green": { "command": "node --import tsx/esm --test tests/checks/asset-ledger.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/asset-ledger.test.mjs" }
}
```
