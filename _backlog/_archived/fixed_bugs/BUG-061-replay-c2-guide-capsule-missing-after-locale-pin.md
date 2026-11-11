---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-061：回放 C2 在 locale 钉住后仍失败——研究状态 guide 胶囊不可见（四个 extension 页签都不在可见清单）

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 右栏展开/收起定位器改中英双语（`/Open right sidebar|打开右侧边栏/i`），与 BUG-059 的 zh-CN 钉住配套；C2 失败诊断补 `role=tab` id/label 与 guide 容器在场性。lead 回放复跑 C0–C5 全 PASS（C2 在场、C3 2 行、C5 逐字一致）；唯一红 = B·persona（快照重录问题，本卡范围外）（2026-11-12，去向：none — 机械修复，审查：agent 自审 + 真浏览器证据））

## 症状

[BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 的修复已落地（浏览器上下文钉
`zh-CN`、定位器双语），页签 chrome 现在确实是中文（诊断行可见「新会话 / 插件 / 方法库 / 智能体团队」），
但 lead 场景的 C2 仍失败：

```
FAIL [research-face/lead] C2 「研究状态」页签在场（右栏展开 + guide 胶囊可点）
  可见按钮：… | 智能体团队 | 对话 | 方法库 | …（无「研究状态」「研究配置」「研究图谱」「终稿」）
FAIL [research-face/lead] C3 页签活动行提取非空（防空语料）（0 行）
FAIL [research-face/lead] C5 渲染金标准逐字一致（卡片 + 活动行）（首个差异 @406）
```

注意 `client` 里四个 `sidebarRightTabs.register`（研究状态 / 研究配置 / 研究图谱 / 终稿）都不在可见清单里；
唯一在场的 pack 页签是「方法库」（走另一条注册面）。

## 复现

```sh
source dev/env.sh
node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario lead
# locale 已钉 zh-CN（页签 chrome 为中文）；C2 红，C3 0 行，C5 逐字差
```

证据：`runtime/` 外的一次性日志（本次会话 `/tmp/replay-lead4.log`）；C4「本包 client 无 console 报错」
为 PASS——渲染期没有 client 异常，问题更像**右栏没进入 guide 列表态**或**注册未被 vendor 渲染**，
不是 client 崩溃。

## 根因（已证到 vendor 文案键）

[BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 的修复把浏览器上下文钉成 `zh-CN`，
但**右栏展开按钮的定位器仍是英文**：

```js
const expand = page.getByRole('button', { name: 'Open right sidebar' })   // 英文单语
```

vendor 的该按钮可访问名是 locale 文案键 `chrome.expandAria`——en = `Open right sidebar`，
**zh = `打开右侧边栏`**（`vendor/dsh/packages/client/ui-sidebar-right/src/client/locales.ts`）。
于是钉 zh 后 `expand.count() === 0`，`if (count > 0)` 分支跳过 → 右栏没展开 → guide 胶囊不可见 →
C2 红 → C3/C5 连带。

**撤回记录（被证伪的假设，留档）**：
1. ~~流程假设（右栏打开到最近页签、guide 需二次交互）~~——不成立：展开按钮根本没被点到；
2. ~~注册假设（extension 页签注册失败）~~——不成立：C4 无 console 错误，且缺席的直接原因是右栏未展开；
3. ~~场景假设（回放上下文不触发胶囊）~~——不成立：同一夹具在金标准录制时可见，问题在定位器。

**同批对照**：[client-load-smoke](../../../scripts/smoke/client-load-smoke.mjs) 明确保持 **en-US**
（注释：「浏览器 locale 保持 Playwright 默认（en-US）：本冒烟的 UI chrome 定位器（Open right sidebar / …）」），
所以它的英文 chrome 定位器成立；回放冒烟选择了 **钉 zh**，却没同步 chrome 定位器——两条策略各自自洽，
混用才出事。

## 牵出的失败类

「渲染金标准守卫」的唯一入口依赖一条**多步 UI 交互配方**（展开右栏 → 找胶囊 → 点击 → 等稳定），
vendor 右栏行为一变，整条回放渲染面就不可达；而失败信息（"胶囊不在"）无法区分「交互配方过时」与
「产品缺页签」。修复时建议在 C2 失败诊断里补两类**结构化证据**：右栏 DOM 里所有 `role=tab` 的
id/label，以及 guide 列表容器是否存在。

## 修复判据

1. 右栏展开定位器接受中英双语（如 `/Open right sidebar|打开右侧边栏/i`），或改为不依赖文案的稳定钩子
   （如 `aria-expanded` 容器 / 语义 role + 位置）；**不许**再出现「钉了 locale 却用另一种语言找 chrome」；
2. lead 场景 C2 绿（`zh-CN` 钉住下），C3 ≥1 行、C5 与金标准逐字一致；
3. 失败诊断补结构化证据（`role=tab` 的 id/label 清单 + guide 容器是否存在），区分「配方过时」与「注册缺失」；
4. 先红后绿：当前命令复现 4 红，修复后同一命令绿；
5. `pnpm verify` 绿（不涉门禁清单）。

## 修复关联

已落地（2026-11-11）：`snapshot-replay-smoke` / `client-load-smoke` / `client-hitl-smoke` 的 `Open right sidebar`、`New tab`、`Collapse right sidebar` 全部改中英双语正则（vendor `chrome.expandAria` 的 zh 键 = 打开右侧边栏）；snapshot-replay 的 C2 失败诊断输出 `role=tab` 的 id/label 清单 + `[data-guide-page]` 在场性。证据 = `node --check` 三脚本通过；client-load-smoke 同一 locale 钉住下已 PASS「研究状态 guide 胶囊在场」并跑完全程（exit 1 仅方法库新建流程的产品断言红）。lead 回放（2026-11-12）= C2 绿、C3 2 行、C5 逐字一致；C2 诊断新增 `role=tab` 与 guide 容器信息。

原始处置（留档）：P2 测试资产修理型，可凭本卡自授权落地；与 [BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md)（locale 归属，已修）
和 [BUG-051](BUG-051-replay-smoke-panerows-undeclared.md)（`paneRows` 崩溃，已落地）同一条冒烟，但根因不同。
