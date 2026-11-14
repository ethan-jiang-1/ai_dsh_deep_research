---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-167：方法标题不归一 Unicode 格式字符——ZWSP/软连字符造出同名幽灵条目

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — heading codec 剥 Unicode Cf；写入路径拒绝 Cf（2026-11-14，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）
>
> 位置：[library-fold.ts](../../../packages/deep-research-pack/src/lib/library-fold.ts) 的
> `parseMethodHeading` / `methodNameIssue`；写路径 =
> [method-library-write.ts](../../../packages/deep-research-pack/src/lib/method-library-write.ts)
> 的 `matchingHeadingLines`。同族前科 = BUG-127（半角括号）、BUG-128（U+3000）、BUG-138（未识别尾缀）。

## 症状

标题里的**不可见格式字符**没有被归一，也没有被拒绝：`foldLibrary` 的 `name` 带上该字符，
写路径按精确 `name` 匹配 → 看不见的差异让 `upsertMethodEntry` 判「没有同名条目」→ `created`
写第二条。两条视觉上完全同名；后续编辑/删除会命中错的一条，留下幽灵。

## 复现（2026-11-14 实测）

```sh
TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { foldLibrary } from './packages/deep-research-pack/src/lib/library-fold.ts';
import { upsertMethodEntry } from './packages/deep-research-pack/src/lib/method-library-write.ts';
const sections = { source: 's', verify: 'v', report: 'r', limit: 'l' };
for (const ch of ['\u200B','\u00AD','\u2060','\u200E','\uFEFF']) {
  const text = '## 方法' + ch + '（来源）\n- 找来源: s\n- 怎么核实: v\n- 报告怎么写: r\n- 不承诺: l\n';
  const folded = foldLibrary(text);
  const res = upsertMethodEntry(text, { name: '方法', provenance: null, isDefault: false, sections, legacyText: null });
  console.log(JSON.stringify(ch), 'foldName=', JSON.stringify(folded[0]?.name), 'action=', res.action, 'count=', foldLibrary(res.text).length);
}
"
```

实测（前四行）：

```text
"\u200B" foldName="方法\u200B" action=created count=2
"\u00AD" foldName="方法\u00AD" action=created count=2
"\u2060" foldName="方法\u2060" action=created count=2
"\u200E" foldName="方法\u200E" action=created count=2
"\uFEFF" foldName="方法"      action=updated count=1   ← trim 会去 BOM，其余不会
```

负对照：无隐藏字符的 `## 方法（来源）` 与 `upsert('方法')` → `updated`、1 条。

## 根因（已证）

1. `parseMethodHeading` 只用 `.trim()` 归一（`trim` 覆盖空白类与 U+FEFF，不覆盖 `\p{Cf}` 格式字符）；
2. `name` 直接作为条目身份，`matchingHeadingLines` 用 `parsed.name === name` 精确比较；
3. `methodNameIssue` 只拒绝 `（）()〔〕`，不检查不可见字符；
4. `renderMethodHeading` 把带隐藏字符的 name 原样写回——重复一旦产生，下一轮 fold 仍读得出两个不同 name。

## 影响面

- **同名幽灵**：UI 显示两条同名方法；默认标记/编辑/删除命中错对象；`removeMethodEntry` 只删新的一条，
  旧条目再删返回 false，再编辑又新建（与 BUG-138 同构）。
- 来源常见：从网页/PDF 复制标题带入零宽空格、软连字符、LRM；中文输入法/排版工具也可能带。
- 方法库是用户可见的持久数据；静默重复比抛错更难恢复。

## 牵出的失败类

- **C4 边界/编码**：标题语法矩阵没有覆盖「不可见格式字符」这一维。
- 同机制第 **4** 次（127 半角括号 → 128 U+3000 → 138 未识别尾缀 → 本条 `\p{Cf}`）。按类修：
  heading codec 的 name 归一必须是**单一函数**，fold/写路径共用，并覆盖 Unicode 类别（空白 + 格式符）。

## 修复判据

- 在 `parseMethodHeading` / `methodNameIssue` 的共享 codec 里处理 `\p{Cf}`：**归一剔除**或
  **fail-loud 拒绝**（二选一，读/写同判）。推荐剔除，保留历史库可读；若拒绝，必须在 UI 保存时
  给出可读错误，不得静默 created。
- 矩阵：U+200B / U+00AD / U+2060 / U+200E / U+180E / U+FEFF / 无字符；`foldLibrary` 的 name 与
  `upsertMethodEntry('方法')` 后的条目数必须一致（1 条，action=updated）。
- 反证：先让上述矩阵在旧实现上红（当前 4 个变体 created/2 条），修后全绿；同时跑
  `tests/pack/library-heading-consistency.spec.mjs` 的 40 格矩阵，确认 127/128/138 不回归。

## 修复关联

已修（2026-11-14）。P2 修理型，授权范围 = `library-fold.ts` + `method-library-write.ts` + 对应 pack spec
（不触 UI/命令层）；去向可记 `none — 缺陷修复`，审查 = agent 自审 + 机械门禁。

## 修复落地（2026-11-14）

- **改动**：`library-fold.ts`：`parseMethodHeading` / `renderMethodHeading` 剥离 `\p{Cf}`（零宽空格/软连字符/LRM 等）；`methodNameIssue` 对含 Cf 的名称 fail-loud，避免写路径静默新建。新增 `tests/cockpit/library-heading-consistency.spec.mjs` 的格式字符矩阵。
- **证据**：`TSX_TSCONFIG_PATH=... node --test tests/cockpit/library-heading-consistency.spec.mjs` → 3/3 PASS；`pnpm test:spec` 1342/1342；`pnpm typecheck` 通过。
- **反证**：旧实现 fold 名称含 `\u200B`、upsert 判 created/2 条；新用例先红后绿。
