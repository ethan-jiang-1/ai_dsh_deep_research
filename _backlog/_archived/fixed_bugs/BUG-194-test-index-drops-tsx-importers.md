---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-194：test-index 的 importer 抓取漏掉 `.tsx`——6 个 client 模块在索引里永远「—」

> 严重级别：P2 ｜ 发现：2026-11-15 ｜ 状态：已修 — importer 扩展名闭集加 `.tsx` + 独立非空抽查（去向：implemented — [批 E Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)，审查：agent — 独立抽查红绿）（2026-11-16）
>
> 位置：[scripts/lib/tools/test-index.mjs](../../../scripts/lib/tools/test-index.mjs) 的 `importersUnder`；
> 生成物 = [tests/INDEX.generated.md](../../../tests/INDEX.generated.md)；对账 =
> [tests/checks/test-index.test.mjs](../../../tests/checks/test-index.test.mjs)。

## 症状

索引的「测试」列对下列 client 模块显示 `—`（无测试），但盘上有直接 import 它们的 spec：

| 模块 | 实际 importer（spec） | INDEX |
|---|---|---|
| `method-library/views`（`.tsx`） | `locales.spec.mjs`、`method-library-selection.spec.mjs`、`method-library-views.spec.mjs` | `—` |
| `BrandMark`（`.tsx`） | `locales.spec.mjs` | `—` |
| `ResearchStatusTab`（`.tsx`） | `locales.spec.mjs`、`research-tabs.spec.mjs` | `—` |
| `ResearchGraphTab`（`.tsx`） | `locales.spec.mjs`、`research-tabs.spec.mjs` | `—` |
| `defaults/DefaultsButton`（`.tsx`） | `defaults-ui.spec.mjs` | `—` |
| `defaults/DefaultsPanel`（`.tsx`） | `defaults-ui.spec.mjs` | `—` |

索引自述用途 =「谁在用、这概念在哪」。把这 6 个组件显示成「没人测」，会让 agent 重复造测试或误判覆盖空白。

## 分诊与授权

- 严重级：P2 — 文档/导航合同失准，不影响运行；但它是 D53/D55 之后「资产可见性」的常驻载体。
- 表面 / 边界：研发面（生成物）/ ② 行为（生成器纯函数）
- DSH 不变量：fail-loud（索引与盘上事实不一致必须能被发现）
- 触及面：文档合同（`tests/INDEX.generated.md` 的生成契约）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（文档合同触面）」解除
- 批：第十轮搬家探索 M6 —— 同批 BUG-191…198

## 复现

复现状态：稳定（keyless 脚本 + 索引行对读）。

```sh
node --import tsx/esm runtime/explore-20261115/idxcheck.mjs
# modules with tsx-inclusive importers: 29 ...
#   method-library/views <- tests/cockpit/client/method-library/locales.spec.mjs, …selection, …views
#   BrandMark <- tests/cockpit/client/method-library/locales.spec.mjs
# importers the index filter drops (.tsx): 6
grep -n 'method-library/views' tests/INDEX.generated.md
# | method-library | `method-library/views` | — |
```

（证据脚本在 `runtime/explore-20261115/`，gitignored；它用与生成器同一个 `parseKeylessImports` +
`localImportPath`，只把过滤条件换成语义正确的 `.tsx` 含集。）

## 根因（已证）

`importersUnder()` 解析目标后执行 `!/\.(mjs|cjs|ts)$/.test(rel) → continue`——`.tsx` 被排除。
`test-index.test.mjs` 用**同一个** `renderTestIndex` 重算比对，因此自洽、永远绿。
根因证据：上表 6 行 + 生成器源码该行 + 对账测试只做「逐字节相等」不做「importer 非空抽查」。

## 牵出的失败类

- **M6 无车道消费者**的孪生：消费者存在但索引看不见（C7 假「无覆盖」）。
- 同机制第 1 次（test-index 是 2026-11-15 新件）；类修 = importer 抓取按「测试文件能 import 的
  全部源扩展名」取闭集（`.mjs|cjs|ts|tsx`），并由一条非空抽查兜底。

## 修法

1. `importersUnder` 的扩展名集改为 `.mjs|cjs|ts|tsx`（`.json` 不算 import 面）。
2. 重生成 `tests/INDEX.generated.md`（6 行补 importer）。
3. 对账测试增加一条「至少 N 个模块有 importer，且 `src/client/**/*.tsx` 中被 spec 直接 import 的
   模块必须在索引里有非空测试列」的抽查（防空 + 防过滤条件再次收窄）。

## 修复判据

- 6 行补上上表 spec；`runtime` 探针重跑显示 `dropped (.tsx) = 0`；
- 负控：删掉 `method-library-views.spec.mjs` 对 `views` 的 import → 索引行失去该 spec；
- `pnpm test`（含 `test-index`、`asset-ledger`）绿；`pnpm verify` 绿。

## 修复关联

去向：implemented — [批 E 搬家副作用 Note](../../../notes/implemented/2026-11-15-move-side-effect-guards.md)。
修复已进树；本卡同变更归档。守卫 = `tests/checks/test-index.test.mjs` 的独立 `.tsx` 抽查
（不复用生成器的 importer 过滤器）。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/tools/test-index.mjs",
    "tests/checks/test-index.test.mjs",
    "tests/INDEX.generated.md"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/test-index.test.mjs", "exit": 1, "output": "not ok 2 - `.tsx` client 模块被测试直接 import 时，索引必须有非空测试列（BUG-194 独立抽查）；method-library/views 显示成「—」" },
  "green": { "command": "node --import tsx/esm --test tests/checks/test-index.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/test-infra/test-index.test.mjs" }
}
```
