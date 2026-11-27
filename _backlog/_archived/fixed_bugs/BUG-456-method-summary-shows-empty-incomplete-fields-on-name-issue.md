---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-456：MethodSummaryView 在方法名含括号等非法字符禁用保存时渲染空后缀「还需补齐：」误导提示

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（明确展示名称错误原因、拦截前导 `#` / 换行、新增重名提示） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

在「方法库」工作台新建或编辑方法时：
1. 若四项均已填写、名称非空但含禁止语法字符（如括号 `()` / `（）` / `〔〕` 或零宽格式字符导致 `methodNameIssue(draft.name) !== null`），顶部摘要条的「保存到方法库」「保存并设为默认」按钮会被正确禁用，但按钮下方状态栏会渲染断尾提示：**「还需补齐：」**（英文下为 `Complete: `，冒号后为空），未告知用户是名称含非法字符；
2. 若用户输入含前导 `#` 的名称（如 `# 含井号非法名称`），`methodNameIssue` 未予校验直接放行保存，`## # ...` 写入 `method-library.md` 后存在标题层级解析混淆风险；且摘要层对与现有方法完全同名的条目缺少即时的重名覆盖提示。

## 根因与边界

- [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)（`L159-L162`）定义 `canSaveDraft = draft !== null && draft.name.trim() !== '' && methodNameIssue(draft.name) === null && ...`；
- [views.tsx](../../../packages/deep-research-pack/src/client/method-library/views.tsx)（`L155-L158`、`L192`）在渲染提示时仅检查空名称与空章节组装 `missingFields`，遇到 `methodNameIssue !== null` 且所有字段非空时，`missingFields` 为空数组，从而渲染 `{t('incompleteFields', { fields: '' })}` → `还需补齐：`；
- [library-fold.ts](../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts)（`L118-L122`）的 `methodNameIssue` 仅拦截括号与不可见格式字符，实测输入 `# 含井号非法名称` 时保存按钮保持可点（`final-verify.log`: `invalidDisabled=false`）。

## 复现

```sh
# 1. 进入会话或工作台「方法库」→「新建」→ 从内置方法「事实核查」开始 →「检查表单」
# 2. 在名称框输入「测试 (v1)」→ 观察顶部摘要条底部状态文本出现「还需补齐：」且保存按钮禁用
# 3. 在名称框输入「# 含井号非法名称」→ 观察「保存到方法库」仍处于启用态
node --import tsx/esm ~/.gemini/antigravity-cli/brain/76cb36c3-4eb9-4406-a90c-f3598216d26f/scratch/r2_final_verify.mjs
```

## 修复判据

1. `MethodSummaryView` 接入 `nameIssue` 判据：当 `methodNameIssue !== null` 时展示具体的错误说明而非空后缀「还需补齐：」；
2. 审视 `methodNameIssue` 是否需覆盖 Markdown 标题前缀/换行符，并在重名编辑新建时于摘要/表单区明确提示将覆盖同名条目或要求改名；补单测覆盖。

## 分诊与授权

- 严重级：P2 — 保存按钮禁用却出现无内容的「还需补齐：」，用户无法得知为何无法保存。
- 表面 / 边界：`MethodLibraryView.tsx` + `method-library/views.tsx` + `library-fold.ts`。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`library-fold.ts` 的 `methodNameIssue` 仅拦截括号与不可见格式字符，放行前导 `#` 与换行；同时 `MethodSummaryView` 与 `EditorView` 仅拼接 `missingFields`，导致名称非法时渲染出空后缀「还需补齐：」，且新建模式缺少重名提示。

## 修法

- 在 `library-fold.ts` 导出 `methodNameIssueKind(name)` 覆盖 `brackets` / `leading-hash` / `newline` / `invisible`；
- 在 `{zh,en}-cockpit.ts` 增加对应 5 条名称诊断与重名提示词条；
- 在 `views.tsx` 抽出统一 `draftStatusOf` 供 `MethodSummaryView` 与 `EditorView` 共用，优先显示具体名称错误，新建且同名时额外给出重名提示，从 `MethodLibraryView.tsx` 传入 `mode` 与 `existingNames`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/method-library/library-fold.ts",
    "packages/deep-research-pack/src/client/locales/zh-cockpit.ts",
    "packages/deep-research-pack/src/client/locales/en-cockpit.ts",
    "packages/deep-research-pack/src/client/method-library/views.tsx",
    "packages/deep-research-pack/src/client/MethodLibraryView.tsx",
    "tests/cockpit/lib/method-library/library-fold.spec.mjs",
    "tests/cockpit/client/method-library/method-library-views.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/method-library/method-library-views.spec.mjs",
    "exit": 1,
    "output": "名称含括号时 MethodSummaryView 渲染空后缀「还需补齐：」"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/method-library/method-library-views.spec.mjs" }
}
```
