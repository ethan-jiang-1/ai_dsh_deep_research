---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-138：标题带未识别后缀的方法条目——编辑会新建同名条目，旧条目成为「删不掉、改不动」的幽灵

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — 未识别尾部标题 upsert fail-loud，remove 按 fold 名称寻址，幽灵可删（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`packages/deep-research-pack/src/lib/method-library-write.ts`（`matchingHeadingLines` /
> `upsertMethodEntry` / `removeMethodEntry`）与 `library-fold.ts`（名称提取）。
> 关联：BUG-124（段间空白）、BUG-127（半角括号）、BUG-128（U+3000）——都修在「标题归一」上，本条是
> 它们的**结构性剩余**：未被归一的尾部文本。

## 症状

方法标题在标准段之后带了**任意未识别文本**（用户/模型自然写法）时：

```md
## 方法（来源）[草稿]      ← [草稿] 不是 〔默认偏好〕/（…）段
```

- `foldLibrary` 读出的 name = `方法`（正确）；
- `upsertMethodEntry` 的标题正则只认「名称 + 若干（…）/〔…〕段」→ **匹配不到**这条 → **created**：
  库里出现两条同名 `方法`（现实测）；
- 之后 `removeMethodEntry(text, '方法')` 只删得掉新建的那条（pattern 命中），**旧的带 `[草稿]` 的条目
  留在库里**；再删一次返回 `removed: false`（pattern 仍不命中）——**幽灵条目**；
- 再编辑「方法」→ 又新建一条（仍匹配不到幽灵）→ 每编辑一次多一条，幽灵永久留存。

实测序列：

```
after edit entries= [ '方法', '方法' ]
remove: true remaining= [ '方法' ]
remove again: false remaining= [ '方法' ]
```

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { foldLibrary } from './packages/deep-research-pack/src/lib/library-fold.ts';
import { upsertMethodEntry, removeMethodEntry } from './packages/deep-research-pack/src/lib/method-library-write.ts';
const body = '\n\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n';
const lib = '# 库\n\n## 方法（来源）[草稿]' + body;
const e = foldLibrary(lib)[0];
const r = upsertMethodEntry(lib, e);
console.log(r.action, foldLibrary(r.text).map(x => x.name));       // created [ '方法', '方法' ]
const rem = removeMethodEntry(r.text, '方法');
console.log(rem.removed, foldLibrary(rem.text).map(x => x.name));  // true [ '方法' ]（幽灵）
console.log(removeMethodEntry(rem.text, '方法').removed);          // false
"
```

其它等效触发器（同一根因）：`## 方法（来源）v2`、`## 方法（来源）[草稿]`；而 `## 方法（来源）(待审)`
（半角括号段）能正常 updated——差别只在「尾部段是否落在正则的段白名单里」。

## 根因（已证）

1. **写路径的标题识别是白名单正则**（只认（…）/〔…〕段），而 **fold 的 name 提取是宽松的**
   （按「最后一个括号前」截断）——两者对「同一标题」的定义不同；
2. `upsertMethodEntry` 在「无标题命中」时**直接 created**，没有先检查「fold 里是否已存在同名条目」；
3. `removeMethodEntry` 同样只按标题正则删，fold 里看到的同名幽灵无法寻址；
4. 结果：**写路径制造了 fold 能看见、自己却改/删不掉的条目**。

## 影响面

- 用户编辑一个「带后缀」的方法 → 库里出现两条同名条目，UI 列表出现重复；
- 幽灵条目改不动（再编辑又新建）删不掉（remove 返回 false）——只能手改 `method-library.md`；
- 如果幽灵与默认标记相邻，还可能影响「唯一默认」判定（两个同名条目、default 计数）；
- 与 BUG-124/127/128 的修复叠加：那几条把「归一化」逐步补全，本条指出**归一化覆盖不到的尾部文本
   需要失败关闭（fail-loud）而不是静默新建**。

## 修复判据

1. `upsertMethodEntry` 在 `target.length === 0` 时，先查 `foldLibrary(text)` 里是否有 **name 相同**的条目：
   有 → 抛明确错误（「已存在同名条目但标题格式不可识别（行 N）：先规范化标题再编辑」），**不新建**；
2. `removeMethodEntry` 按 **fold 的 name** 删除（用条目起始行定位），而不是仅靠标题正则——保证 fold
   看得见的条目都能删；
3. 先红后绿：上表 `[草稿]`/`v2` 触发序列——当前 created/2 条 + remove 两次才到幽灵（红）；修复后
   编辑抛「标题不可识别」、删除一次即移除（或文档明确「先规范化」的 UI 流程）；
4. 回归：标准标题、半角括号、U+3000、多空格、provenance/默认段任意顺序的 updated 行为不变；
5. `pnpm test` + `pnpm verify` 绿；`method-library-probe` / client-load 的方法库编辑路径复跑。

## 修复关联

[BUG-124](BUG-124-heading-whitespace-between-segments.md) /
[BUG-127](BUG-127-library-halfwidth-parens-provenance-default.md) /
[BUG-128](BUG-128-method-heading-ideographic-space-duplicate.md)
的延续：**归一化不可能覆盖所有用户写法，未识别的条目必须失败关闭**。发现方式 = 上轮 127/128 修复后的
邻接变异（尾部文本）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-138。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
