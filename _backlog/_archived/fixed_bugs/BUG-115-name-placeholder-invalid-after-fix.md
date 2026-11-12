---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-115：BUG-081 修复后 zh `namePlaceholder` 仍建议全角括号名称——照示例输入立刻被拒

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — zh 名称占位符改为不含全角括号的示例，照提示输入不再被校验拒绝（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/locales/zh.ts:201`
> （`namePlaceholder: '例如：投研尽调（我的口径）'`）对照
> `packages/deep-research-pack/src/lib/library-fold.ts`（`methodNameIssue` 拒绝全角 `（）`/`〔〕`）
> 与 `client/method-library/useOperationQueue.ts` 的保存校验。

## 症状

BUG-081 的修复新增了名称校验：含全角括号的名称拒绝保存。但中文名称输入框的占位符仍是
**同一个**全角括号示例：

```json
{
  "zhPlaceholder": "例如：投研尽调（我的口径）",
  "zhExampleIssue": "名称不能包含全角括号「（）」或「〔〕」——它们是来源注记/默认标记的语法",
  "enPlaceholder": "e.g. Investment due diligence (my terms)",
  "enExampleIssue": null,
  "zhPlaceholderIssue": "名称不能包含全角括号「（）」或「〔〕」——它们是来源注记/默认标记的语法",
  "zhPlaceholderInvalid": true
}
```

用户照着中文输入框的示例起名 `投研尽调（我的口径）`，保存时会被 `methodNameIssue` 拒绝。
英文占位符用 ASCII 括号 `(my terms)`，校验允许——中英提示不一致。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/name-placeholder-invalid-after-fix.mjs
```


## 影响与触发面

- 新建/编辑方法时，中文用户最自然照提示输入 → 保存被拒，错误文案是「名称不能包含全角括号」，
  但提示本身正是该形态；体验自相矛盾；
- BUG-081 的原始触发路径（placeholder 即全角括号）没有随校验修复一起更新；
- 英文用户照 placeholder 可保存，本地化行为不一致；
- 属于修复 commit 的**回归/漏改**，不是新功能。

## 根因（已证）

- 修 BUG-081 时改了 `methodNameIssue`/保存校验，没有同步 `zh.namePlaceholder`；
- 已有 i18n 字典测试只查键集/空值，不校验「占位符示例本身能通过名称校验」；
- 英文 placeholder 用 ASCII 括号，恰好合法，掩盖了中文面。

## 修法候选（未实施）

1. 中文 placeholder 改为不含全角括号的示例（如 `投研尽调-我的口径` 或 ASCII `投研尽调(我的口径)`）；
2. 或产品决定允许全角括号（改名/转义），但那会推翻 BUG-081 的修法；
3. 加一条 i18n/组件守卫：`namePlaceholder` 的示例必须通过 `methodNameIssue`（或明确豁免）。

倾向 1；本卡不改代码。

## 修复判据

- [ ] zh `namePlaceholder` 的示例名通过 `methodNameIssue`（或产品明确允许全角括号并改校验）；
- [ ] 中英提示语义一致；保存校验不回归；
- [ ] 复现脚本 `zhPlaceholderInvalid=false`；新增 i18n/组件用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明其它用户可见文案里的示例名（如 coach prompt/内置内容）都合法；
- 不证明旧库中已存在的全角括号名称的迁移行为。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/locales.test.mjs` BUG-115。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
