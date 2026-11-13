---
name: changing-ui-copy
description: Use when adding or changing any user-visible text in the deep-research-pack cockpit — tab labels, buttons, empty states, hints, fold-generated data text, or built-in method content — so both Chinese and English ship in the same diff, canonical data stays untouched, and the locale guards stay green.
---

# 改界面文案：day-one 双语

本技能是 **guidance，不是 checklist**。合同正本 = [design/40 §4](../../../docs/design/40-research-cockpit.md)；
守卫 = `tests/cockpit/locales.spec.mjs`（键集/占位符/en 值/渲染）、`tests/cockpit/i18n.spec.mjs`（折层
en 零 CJK）、`tests/checks/cjk-source.test.mjs`（源码中文扫描 + 允许清单）。相关技能：
[`reviewing-a-delivery`](../reviewing-a-delivery/SKILL.md)。

**判据只有一句：任何界面上出现的东西，同一 diff 里必须有 zh 和 en。** 界面会持续调整，所以这不是
“上线前补翻译”，是改 UI 的第一步。

## 1. 先分类：这段文本属于哪一层

| 层 | 例子 | 住哪 / 怎么取词 |
|---|---|---|
| chrome | 页签、按钮、空态、字段提示、删除确认 | `src/client/locales/zh.ts` + `en.ts`，组件 `props.t` |
| 数据面折层输出 | 七步标签、业务摘要、图谱状态、版本面、回执、活动行 | `locales/zh-fold.ts` + `en-fold.ts`；函数接受 `PackTranslate`，UI 传 `props.t` |
| 产品内容（canonical） | 内置打法名称/摘要/四字段、推荐规则、领域示范 | 不改 canonical 表；UI 经**显示投影**取词，动作/库格式/模型 prompt 继续用 canonical |
| 模型面 prompt | 发给 Method Editor / Lead 的内部指令 | 保持原文；放独立模型面模块（如 `coach-prompts.ts` / `operation-prompts.ts`），不进 UI 扫描面 |
| 用户/模型内容 | 用户自建方法、研究问题、plan、终稿正文 | 不翻译，保持作者语言 |
| 技术标识 | `question.md`、`final/`、`task_id`、`readiness`、`HITL2`、`plan-only` | 不翻译；术语按 `docs/terms.md` |

分类错了，后面全错：把 canonical 产品内容直接翻译会破坏 skill 表、库格式、Lead 指令和既有测试；把
模型 prompt 搬进字典会改变模型行为。

## 2. chrome：加键并让槽拿到 t

1. 在 `zh.ts` 加键与中文值（键集由 zh 拥有），在 `en.ts` 加同键英文值；**占位符集合逐键一致**。
2. 组件用 `props.t('key')`；若组件是 slot 占位者且还没有 `t`，在注册处声明 `locale: 'deepResearchPack'`
   并给 props 交 `PropsLocale<'deepResearchPack'>`。
3. 不要在 JSX/`aria-label`/`placeholder`/`title`/`confirm` 里留中文字面量；中英混排的模板拆成
   “字典键 + 参数”，不要把语序写死。

## 3. 折层输出：函数收 t，UI 传入

1. 文案键加到 `zh-fold.ts` / `en-fold.ts`（不是 chrome 字典）。
2. 折层函数签名加可选 `t: PackTranslate = translateZh`；所有 UI 调用点传 `props.t`。
3. `useMemo`/effect 依赖补 `t`，否则切换语言后旧语言文案会留在 state 里。
4. 非 UI 消费面（dashboard、冒烟、keyless 测试）不传 `t`，保持中文优先——这是有意缺省，不是遗漏。

## 4. 产品内容：显示投影，不翻译 canonical

canonical 名称常常同时是**标识**（库条目名、skill 表键、Lead 指令参数）。正确做法：

- canonical 表（如 `src/lib/config-tables.ts`）逐字不动；
- 新增显示投影（如 `src/client/builtin-display.ts`）：canonical 名 → zh/en 显示名/摘要/四字段/规则；
- UI 只消费投影；查找、React key、选中态、指令载荷、库写入继续用 canonical；
- 自定义草稿名等模板把 `{name}` 传**显示名**，但 `createInstruction`/`sourceName` 继续传 canonical；
- 测试用**真实** canonical 数据 + en 字典渲染（合成英文 fixture 会掩盖混排），并断言 zh 显示与
  canonical 逐字一致（防投影漂移）。

## 5. 守卫与命令

新文案/改文案至少跑：

```sh
pnpm test          # locales/i18n/cjk-source + 既有契约
pnpm typecheck
pnpm build         # client bundle 变化时
pnpm verify
node --import tsx/esm scripts/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home
```

`cjk-source` 的允许清单只收**模型面/数据面/格式面**（如 `config-tables`、`library-fold`、
`coach-prompts`）；不要把组件文件加进允许清单来消红。`i18n.test` 用真实数据证明 en 零 CJK；
`locales.test` 证明键集/占位符/渲染。组件因 primitives 的 CSS 模块无法静态渲染时，用纯函数测试或
源面低层断言，不跳过。新增守卫或改范围时按 [`writing-a-gate`](../writing-a-gate/SKILL.md) 先红后绿。

## 6. 失败类（出现即回退重做）

- 英文界面里出现中文产品内容/历史标题 → 显示投影或持久化标题未处理；
- 中文界面里出现英文硬编码 chrome → 字典键缺失或组件绕过了 `t`；
- 把 `config-tables` 的 canonical 名翻译掉 → skill/库/指令契约断裂；
- 只改 en 不补 zh（或反之）→ 键集对账红；
- 用合成英文 fixture 让测试绿 → 真实数据仍混排，`cjk-source`/真实渲染必须补。
