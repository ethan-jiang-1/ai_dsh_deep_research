---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-204：live 文档散文里的失效路径无门禁——`runtime/README.md` 与 `scripts/README.md` 各一处旧路径

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — live 文档散文路径枚举（doc-prose-paths）+ doc-paths 门禁 + 三处实例修正（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 散文注入红 / 还原绿）（2026-11-16）
>
> 位置：[runtime/README.md](../../../runtime/README.md) 第 9 行；
> [scripts/README.md](../../../scripts/README.md) 第 142 行；
> 扫面 = [scripts/verify/gates/a-docs.mjs](../../../scripts/verify/gates/a-docs.mjs) 的 `doc-paths`
> （**只解析反引号 token**，散文路径不在内）。

## 症状

两处 live 文档在散文里引用搬家前的路径，按它去读会读空：

1. `runtime/README.md`：「读取判据 = scripts/lib/scene-pack.mjs」——真件已搬到
   `scripts/lib/ops/scene-pack.mjs`（2026-11-15 owner 分层）。
2. `scripts/README.md`（`lib/shared/final-version.mjs` 行）：「旧 vN 正则的机械漂移锁 =
   tests/run/final-version.spec」——真件是 `tests/run/gates/final-version.spec.mjs`（旧扁平路径 +
   缺扩展名，2026-11-15 之前就应更新）。

两处都不在反引号里，`doc-paths` 不解析；`repo-conventions` 只扫 dev shell；`md-links` 只管
Markdown 链接（用户引用运行区/散文时按约定用反引号路径）——所以 `pnpm verify` 全绿。

## 分诊与授权

- 严重级：P2 — 文档合同失准；agent 会照路径去读文件（探索成本 + 误诊），这是 doc-paths 立项时的
  同一条理由。
- 表面 / 边界：研发面（live 文档）/ ② 行为（路径存在性）
- DSH 不变量：fail-loud（合同文本指向不存在的对象）
- 触及面：文档合同（live 文档的散路径）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（文档合同触面）」解除
- 批：第十一轮探索（199–208）

## 复现

复现状态：稳定。

```sh
grep -n "scene-pack" runtime/README.md
# 9:…读取判据 = scripts/lib/scene-pack.mjs） |
ls scripts/lib/scene-pack.mjs            # No such file
ls scripts/lib/ops/scene-pack.mjs        # 存在

grep -n "final-version.spec" scripts/README.md
# …旧 vN 正则的机械漂移锁 = tests/run/final-version.spec |
ls tests/run/final-version.spec          # No such file
ls tests/run/gates/final-version.spec.mjs # 存在
```

同形状的第三处（待判）：根 `AGENTS.md` 的「scripts/dev 全档工具」——`scripts/dev` 不存在，
读法可能是「`scripts/` 与 `dev/`」的简写；若是简写，属词法歧义而非失效路径。

## 根因（已证）

`doc-paths` 的判据是「反引号里的仓内路径必须存在」；散文路径（无反引号）不被解析，这是
2026-11-03 立门时的显式范围（反引号 = 合同承诺）。两处失效路径恰好都写在散文里，于是没有车道。
`md-links` 只解析 `[..](..)` 链接，`repo-conventions` 只扫 dev shell 的 `scripts/…` 字面量。

根因证据：上面两条 `ls` 对照 + `doc-paths` 的 `matchAll(/`([^`\n]+)`/g)` 一行 + 文件不在 `_backlog/`/`notes/`
豁免面内。

## 牵出的失败类

- **M3 非 JS 字面量**的文档半边 + C11 合同漂移；同机制第 2 次（BUG-192/193 是代码侧，本条是散文侧）。
- 类修方向二选一：把 prose 路径纳入 `doc-paths`（需白名单处理「scripts/dev」这类简写/词法），
  或明确「散文路径不承诺解析」并修掉现有实例。

## 修法

1. 两处改为现路径（`scripts/lib/ops/scene-pack.mjs`、`tests/run/gates/final-version.spec.mjs`），
   并按 `docs/AGENTS` 的写作规则改用反引号（进 doc-paths 扫面）。
2. 根 AGENTS 的 `scripts/dev` 判断是简写还是失效路径：简写则改写为「`scripts/` 与 `dev/`」。
3. 可选：`doc-paths` 增一条「live 文档里形如 `scripts/…`/`tests/…` 且带文件扩展名的散文 token
   必须存在」的窄扫描（只认带扩展名的形态，避开简写误伤）。

## 修复判据

- 两处路径存在，且都在反引号内（doc-paths 可解）；
- 反向注入一条散文 `scripts/lib/__gone__.mjs` 到任一 live 文档 → 新判据红（若做第 3 步）；
- `pnpm verify` 绿；`doc-paths` 防空门（≥100 token）不变。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。散文枚举纯函数 = `scripts/lib/repo/doc-prose-paths.mjs`；
`doc-paths` 门禁按同一解析序（仓根/文档目录/vendor）验证；三处实例改现路径并进反引号扫面。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/repo/doc-prose-paths.mjs",
    "scripts/verify/gates/a-docs.mjs",
    "tests/checks/doc-prose-paths.test.mjs",
    "scripts/lib/harness/gates-cases.mjs",
    "docs/evaluation.md",
    "runtime/README.md",
    "scripts/README.md",
    "tests/INDEX.generated.md",
    "tests/fixtures/asset-ledger/ledger.json"
  ],
  "red": { "command": "node scripts/verify/verify.mjs --only=doc-paths", "exit": 1, "output": "[doc-paths] runtime/README.md:22 散文路径 scripts/lib/__gone__.mjs 不存在（仓根/文档目录/vendor 均未命中）" },
  "green": { "command": "node scripts/verify/verify.mjs --only=doc-paths", "exit": 0 },
  "guard": { "path": "tests/checks/doc-prose-paths.test.mjs" }
}
```
