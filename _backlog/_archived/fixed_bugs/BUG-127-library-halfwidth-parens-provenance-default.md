---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-127：library-fold 只识全角括号——半角 `(来源〔默认偏好〕)` 的标记被当默认，且名称含 provenance

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — 标题解析把半角/全角括号视为同一 provenance 语法，括号内标记不算默认；upsert 半角 heading 也命中（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts` 的 heading 解析（约 65–75 行）。
> 关联：BUG-123（provenance 内的标记不算默认）、BUG-124（段间空白一致）——这两条只修了**全角**括号。

## 症状

条目标题模板是全角 `## 名（日期，来源）〔默认偏好〕`；用户若写**半角括号**：

| 标题 | fold 的 name | isDefault | 期望 |
|---|---|---|---|
| `## 方法（来源）〔默认偏好〕` | `方法` | true | ✓ |
| `## 方法(来源)〔默认偏好〕` | **`方法(来源)`** | true | name 应为 `方法`；default ✓ |
| `## 方法（来源〔默认偏好〕）` | `方法` | false | ✓（BUG-123 的修复） |
| **`## 方法(来源〔默认偏好〕)`** | **`方法(来源)`** | **true** | name 应为 `方法`；**default 应为 false** |
| `## 方法（来源）\u3000〔默认偏好〕` | `方法` | true | ✓ |
| `## 方法\u3000（来源）〔默认偏好〕` | `方法` | true | ✓ |

即：半角 `(…)` 既不被当作 provenance 从 name 里剥掉，也不参与「标记是否在括号内」的判定——
**括号内的 `〔默认偏好〕` 被算成真默认标记**。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { foldLibrary, renderLibraryEntry } from './packages/deep-research-pack/src/lib/library-fold.ts';
import { findDefaultMethod } from './packages/deep-research-pack/src/lib/research-defaults.ts';
const body = '\n\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n';
const lib = '# 库\n\n## 假默认(来源〔默认偏好〕)' + body + '\n## 真默认（来源）〔默认偏好〕' + body;
console.log('default =', JSON.stringify(findDefaultMethod(lib)));
for (const e of foldLibrary(lib)) console.log(JSON.stringify(e.name), e.isDefault);
"
# 实测：default = "假默认(来源)"；两条 isDefault 均 true
# 期望：default = "真默认"；假默认名称 = "假默认"、isDefault = false
```

交换文档顺序后，`findDefaultMethod`（取首个带标记条目）会把**括号内写着标记的半角条目**选成库默认
——`research:defaults` prompt 会注入错误的方法默认。

## 根因（已证）

同一处两行都只认全角：

```js
const openParen = title.indexOf('（')
name: … title.slice(0, openParen) …
isDefault: title.replace(/（[^）]*）/g, ' ').includes('〔默认偏好〕')
```

半角 `(` 时不进 provenance 分支（name 保留括号内容）；strip 正则也只匹配全角 `（…）`，括号内的标记
因此留在 `title` 里被 `includes` 命中。BUG-123/124 的修复只覆盖全角空白/括号。

## 影响面

- **默认方法误选**：括号内带标记的半角条目会被 `findDefaultMethod` 选为库默认，进而注入
  `research:defaults` 的方法默认（Lead 按错方法起步）；
- **名称污染**：`方法(来源)` 与 `方法（来源）` 被当成两个不同条目，upsert/查找/去重都会错位
  （与 BUG-124 的「同名不同写」同族）；
- 面板/命令显示的名称也会带 provenance 文本。

## 修复判据

1. **括号宽度归一**：解析前把标题里的半角 `(`/`)` 归一为全角（或反之），适用于 name 截取、provenance
   截取、默认标记 strip 三处——半角与全角同一条目；
2. 半角括号内的 `〔默认偏好〕` **不算**默认标记；括号外的半角/全角标记都算；
3. 先红后绿：上表 6 行 +「半角在前/全角在后」两条默认选择用例（当前 2 条红：name/isDefault；交换顺序后
   findDefaultMethod 错选）；修复后 name 无 provenance、括号内标记不算、默认仍取真默认；
4. 回归：全角形态、全角空白、`〔默认偏好〕` 在正文（不算）、重复标记（幂等）行为不变；
5. upsert/render 往返：半角写法的条目被 edit 后仍归一为同一条目（与 BUG-124 的 heading 归一共享助手）；
6. `pnpm test` + `pnpm verify` 绿。

## 修复关联

与 [BUG-123](BUG-123-default-marker-in-provenance.md)/
[BUG-124](BUG-124-heading-whitespace-between-segments.md) 同族：
那两条只把「全角括号/空白」纳入 fold 与 write 的一致性，**半角未被覆盖**。发现方式 = 上轮遗留
「未跑」面包屑（BUG-123 下一层「多标记/全角空白」）的邻接变异。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-127。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
