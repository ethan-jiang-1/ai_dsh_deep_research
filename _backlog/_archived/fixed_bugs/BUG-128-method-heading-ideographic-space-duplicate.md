---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-128：method 写路径的标题正则不认全角空格（U+3000）——编辑一次就多出一条同名方法

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — heading 空白类改 `[^\S\n]*`，U+3000 全角空格不再导致编辑即新增（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/method-library-write.ts:22-25`（`methodHeadingPattern`）。
> 关联：BUG-124（heading 段间空白归一）——它把 `[ \t]*` 当成了「空白」，**U+3000 全角空格不在内**。

## 症状

方法库标题里只要出现**全角空格**（中文输入法下极常见），`foldLibrary` 能正确读出 name，但
`upsertMethodEntry` 认不出同一标题 → 编辑/保存时**新建**一条同名条目：

| 标题 | fold name | upsert 动作 | 结果 |
|---|---|---|---|
| `## 方法（来源）` | `方法` | updated | ✓ |
| `## 方法  （来源）`（两个半角空格） | `方法` | updated | ✓（BUG-124 修好） |
| **`## 方法\u3000（来源）`** | `方法` | **created** | **两条同名 `方法`** |
| **`## 方法（来源）\u3000〔默认偏好〕`** | `方法` | **created** | **两条同名 `方法`** |

复现（实测输出）：

```
U+3000 before paren  → action= created entries= 2 names= 方法|方法
U+3000 before marker → action= created entries= 2 names= 方法|方法
```

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { foldLibrary } from './packages/deep-research-pack/src/lib/library-fold.ts';
import { upsertMethodEntry } from './packages/deep-research-pack/src/lib/method-library-write.ts';
const body = '\n\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n';
const lib = '# 库\n\n## 方法\u3000（来源）' + body;
const e = foldLibrary(lib)[0];
const r = upsertMethodEntry(lib, e);
console.log(r.action, foldLibrary(r.text).map(x => x.name));  // created [ '方法', '方法' ]（期望 updated ['方法']）
"
```

## 根因（已证）

```js
return new RegExp(`^##\\s+${escapeRegExp(name)}(?:[ \\t]*(?:（[^）\\n]*）|〔[^〕\\n]*〕))*[ \\t]*$`, 'm')
```

名称与括号段之间、段与段之间只允许 `[ \t]*`（半角空格/制表符）。U+3000 全角空格不匹配 → 该标题
不被视为同一方法。而 `foldLibrary` 用 `title.trim()`（trim 会去掉 U+3000）得到 `方法`，两条路径对
「空白」的定义不一致。

## 影响面

- **编辑即新增**：UI 上编辑一条带全角空格的方法 → 库里出现两条同名条目；
- **编辑对象错位**：条目列表里两条同名，编辑「旧」那条时 `matchingHeadingLines` 只匹配新写的那条
  （旧标题仍带 U+3000）→ 实际改的是另一条，旧条目永远带着旧内容；
- **默认偏好/去重连锁**：若两条都带 `〔默认偏好〕`，后续普通保存会因 `defaultCount > 1` 被拒
  （`库里存在多个默认偏好，拒绝普通保存`）——用户只能手改文件；
- 中文输入法下全角空格是自然产物，不是罕见畸形输入。

## 修复判据

1. `methodHeadingPattern` 的空白类改成「任意非换行空白」：`[^\S\n]*`（或显式 `[ \t\u3000]*`），
   名称后、括号段之间、末尾三处统一；
2. 先红后绿：上表 4 行（当前第 3/4 行=created/2 条，红）→ 修复后全部 updated/1 条；
3. 回归：BUG-124 的段间半角空白、BUG-085 的「provenance 与默认标记任意顺序」、重名拒绝、默认迁移
   行为不变；
4. 可选一致性收口：把「标题归一（空白/括号宽度）」抽成 fold 与 write 共用的单一函数，避免两套空白定义
   再漂移（与 [BUG-127](BUG-127-library-halfwidth-parens-provenance-default.md) 的半角括号问题同源）；
5. `pnpm test` + `pnpm verify` 绿；真实 `method-library.md`（含中文输入法空格）复跑 fold↔upsert 往返。

## 修复关联

与 [BUG-124](BUG-124-heading-whitespace-between-segments.md) 同族
（那条修了半角空白）；与 [BUG-127](BUG-127-library-halfwidth-parens-provenance-default.md)（半角括号）
共同指向「fold 与 write 对标题的归一不一致」。发现方式 = 上轮「未跑」面包屑（全角空白/多空格）变异。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-128。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
