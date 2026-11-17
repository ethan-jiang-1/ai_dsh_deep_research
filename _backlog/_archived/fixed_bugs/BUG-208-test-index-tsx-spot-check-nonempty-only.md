---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-208：索引的 `.tsx` 独立抽查只验「非空」不验集合——丢一半 importer 仍绿

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — 索引测试列 = 独立 .tsx importer 集合（行缺/多/少都红）（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 部分过滤红 / 恢复绿）（2026-11-16）
>
> 位置：[tests/checks/test-index.test.mjs](../../../tests/checks/test-index.test.mjs) 的
> 「`.tsx` client 模块被测试直接 import 时，索引必须有非空测试列」；生成器 =
> [scripts/lib/tools/test-index.mjs](../../../scripts/lib/tools/test-index.mjs) 的 `importersUnder`。

## 症状

BUG-194 的修复加了一条「独立抽查」：自己扫一遍 `.tsx` importer，然后只断言索引行的测试列
`!== '—'`。只要行里还剩**任意一个** importer，抽查就绿——哪怕生成器丢了另外两个：

```sh
# 临时在 importersUnder 里丢一个 importer（synthetic：跳过 method-library-selection 的 spec）
# 重生成索引后：method-library/views 行只剩 2 个 importer（原有 3 个）
node --import tsx/esm --test tests/checks/test-index.test.mjs    # 2/2 绿
```

独立扫描算出的集合是 `{locales, selection, views}`，索引行是 `{locales, views}`，抽查不比较两者，
只看「非空」。BUG-194 的失败类（importer 过滤收窄）因此只被挡住「收窄到 0」，没被挡住「收窄一部分」。

## 分诊与授权

- 严重级：P2 — 索引是「谁测了这个模块」的导航合同；部分丢失比全丢更难发现。
- 表面 / 边界：研发面（生成物对账）/ ② 行为（纯函数）
- DSH 不变量：fail-loud（生成物与独立事实的差异必须红）
- 触及面：文档合同（索引生成与对账）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（文档合同触面）」解除
- 批：第十一轮探索（199–208）；前序 = [BUG-194](BUG-194-test-index-drops-tsx-importers.md)

## 复现

复现状态：稳定（合成过滤缺陷；验证后已还原源码与索引，`git status` 为 0）。

```sh
cp scripts/lib/tools/test-index.mjs /tmp/test-index.bak
# 在 importersUnder 的循环里临时加：if (file.includes('method-library-selection')) continue;
node dev/render-test-index.mjs
node --import tsx/esm --test tests/checks/test-index.test.mjs   # 2/2 绿（应红）
cp /tmp/test-index.bak scripts/lib/tools/test-index.mjs && node dev/render-test-index.mjs
```

## 根因（已证）

检查的断言只到「非空」：

```js
assert.notEqual(cells[3], '—', `索引把 ${module} 显示成「—」…`)
```

它没有把独立扫描的 `tests` 集合与索引行的 spec 集合做相等比较；`—` 是 BUG-194 的原始形态，
修法只把这个形态挡住了。

根因证据：上面的合成缺陷 + 绿/绿对照；源码只有 `notEqual` 一条断言。

## 牵出的失败类

- **C7 假绿**（判据弱于声称的「独立抽查」）+ C2（importer 集合不完整）。
- 同机制第 2 次（BUG-194 是第 1 次）；类修 = 「独立来源算出的集合 = 生成物里的集合」，
  不是「生成物非空」。

## 修法

1. 把索引行的测试单元格拆成 spec 列表（`<br>` 分隔），与 `tsxClientImporters()` 的集合做
   `deepEqual`（排序后）；行缺/多/少都红。
2. 防空语料保持（≥6 个 .tsx 模块有 importer）；另加一条「索引里该模块的行必须存在」。
3. `renderTestIndex` 的输出格式不变（只改对账方式），避免生成物与检查一起漂。

## 修复判据

- 上面合成缺陷 → 红并点名缺失的 importer；
- 恢复后绿；多出一个 imreporter（索引行多列一个 spec）→ 红；
- `pnpm test` + `pnpm verify` 绿；索引逐字节对账用例保持。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。索引单元格解析为 spec 列表，与独立 `tsxClientImporters()` 集合
`deepEqual`（行缺/多/少都红）；生成器输出格式不变。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "tests/checks/test-index.test.mjs"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/test-index.test.mjs", "exit": 1, "output": "not ok 2 - `.tsx` client 模块被测试直接 import 时，索引测试列 = 独立扫描集合（BUG-194 / BUG-208）；索引 method-library/views 的测试列与独立扫描不一致" },
  "green": { "command": "node --import tsx/esm --test tests/checks/test-index.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/test-infra/test-index.test.mjs" }
}
```
