---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-451：ResearchHub「以此透镜发起研究」传入错误的 initialPrompt 字段导致透镜提示词被静默丢弃

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修（改用 vendor `DraftInitializationOptions.prompt` 并由 `buildStartResearchOptions` 构造） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

在「Orca 研究工作台（Research Hub）」→「研究透镜」页签点击任意透镜卡片底部的「以此透镜发起研究」（`LensesView.onDraftWithLens`）时，虽然正常返回对话界面并打开新会话，但输入框保持空白（placeholder 为「描述你想要构建的内容…」），透镜预填提示词完全丢失。

## 根因与边界

- [index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L331`、`L340`）中自建的影子类型与调用写为：
  `startSession(workspaceId?: string, options?: { agentPreset?: string; initialPrompt?: string; whenDraftExists?: string })`
  并传入 `{ initialPrompt: prompt, whenDraftExists: 'keep' }`；
- 而上游真实契约 `vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts`（`L33`、`L326`：`StartSessionOptions extends DraftInitializationOptions`）读取的是 `draftOptions.prompt`（而非 `initialPrompt`），导致 `prompt === undefined` 时 `uiWorkspace.startSession` 静默忽略草稿预填。
- 现场证据：`runtime/smoke-workspace/ux-audit-r2-2026-11-27/final-verify.log`（`FAIL H6 ... onboardingDialogs=0 draft=""`）与截图 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-fv-lens-prompt-check.png`。

## 复现

```sh
# 1. source tools/env.sh 并启动观测 web（或运行复核脚本）
# 2. 打开左侧「研究工作台」→「研究透镜」→ 点击「以此透镜发起研究」
# 3. 观察跳回的新会话输入框：草稿为空（draft=""），未出现预期「请围绕……（官方口径）」预设文本
node --import tsx/esm ~/.gemini/antigravity-cli/brain/76cb36c3-4eb9-4406-a90c-f3598216d26f/scratch/r2_final_verify.mjs
```

## 修复判据

1. 移除 `index.ts` 中手写的 `UiWorkspaceLike` 影子参数名 `initialPrompt`，直接按 vendor 真实导出 `StartSessionOptions` 使用 `prompt`（并在合适时机评估 `whenDraftExists` 策略）；
2. 新增客户端/浏览器单测或冒烟断言：点击「以此透镜发起研究」后新会话 composer 内真实出现对应透镜预填提示词且不自动发送。

## 分诊与授权

- 严重级：P1 — 核心引导入口「以此透镜发起研究」提示词静默丢失，破坏工作台主链路。
- 表面 / 边界：`packages/deep-research-pack/src/client/index.ts`（`startResearch` → `uiWorkspace.startSession`）。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`index.ts` 中 `UiWorkspaceLike.startSession` 的影子类型手写了不存在的 `initialPrompt` 字段，而 `vendor/dsh` `StartSessionOptions extends DraftInitializationOptions` 实际读取 `prompt`。

## 修法

- 在 `startup.ts` 导出纯函数 `buildStartResearchOptions(prompt)`，非空时返回 `{ prompt, whenDraftExists: 'keep' }`；
- 在 `index.ts` 直接引入 vendor `DraftInitializationOptions` 替换影子字段定义，`startResearch` 改传 `buildStartResearchOptions(prompt)`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/startup.ts",
    "packages/deep-research-pack/src/client/index.ts",
    "tests/cockpit/client/product-startup.spec.mjs",
    "tests/cockpit/client/research-hub-panel.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 1,
    "output": "不得使用不存在于 vendor StartSessionOptions 的 initialPrompt 字段"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/research-hub-panel.spec.mjs" }
}
```
