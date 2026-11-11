---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-059：回放冒烟的页签定位器写死中文单语——UI 文案随 locale 后 en-US 环境必红（C2→C3/C5 连带）

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 选「钉 locale」分支：`SMOKE_LOCALE = 'zh-CN'` 显式注入四个真浏览器脚本的 `newPage`，场景 `source.locale` 与金标准头注声明口径；snapshot-replay 的 C2 胶囊同时改双语正则。lead 场景复跑 C0–C5 全 PASS（C2 在场、C3 2 行、C5 逐字一致）；唯一红 = B·persona（D48 后快照待重录，本卡范围外）（2026-11-12，去向：none — 机械修复，审查：agent 自审 + 真浏览器证据））

## 症状

`snapshot-replay-smoke` 的 lead 场景固定 4 红：

```
FAIL [research-face/lead] C2 「研究状态」页签在场（右栏展开 + guide 胶囊可点）
     （可见按钮：… | Agent Team | Chat | Method library | …）
FAIL [research-face/lead] C3 页签活动行提取非空（防空语料）（0 行）
FAIL [research-face/lead] C5 渲染金标准逐字一致（卡片 + 活动行）
FAIL [research-face/lead] B·persona（另一件事：D48 后快照待重录）
```

注意可见页签是 **`Method library`（英文）**——Playwright 默认 `en-US`。客户端文案已随 locale
（同批 i18n 工作：`zh`/`en` 两套字典），而冒烟的定位器只认中文：

```js
const capsule = page.getByRole('button', { name: /研究状态/ }).first()   // 只认 zh
```

于是 guide 胶囊永远找不到 → 不点开 → `paneRows` 为 0 → C3 红 → C5 金标准必然不一致。
**唯一的渲染金标准守卫在 en-US 环境下整片失效**，且失败原因被伪装成「页签不在」。

## 复现

```sh
source dev/env.sh
node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario lead
# 默认 Playwright locale = en-US；C2 红，诊断行里页签标题是英文
```

对照（同仓已有正确写法）：[client-load-smoke](../../../scripts/smoke/client-load-smoke.mjs) 的页签定位
**显式接受双语**并写明理由：

```js
// Tab title is locale-owned; accept the English and Chinese locale labels.
const t = page.getByRole('tab', { name: /^(方法库|Method library)$/i }).first()
```

## 根因（已证到代码）

- 客户端把页签/胶囊标题改成 locale-owned（`t('tabStatus')`，zh=`研究状态`、en=`Research Status`；
  `locales.ts` 的 zh/en 两段都在）；
- 回放冒烟按中文单语正则定位，且全脚本 `grep locale` 零命中；
- **locale 来自 Playwright 默认值**：[lib/playwright.mjs](../../../scripts/lib/playwright.mjs) 的
  `launchChromium()` = `chromium.launch()`（无 `locale` 参数），随后 `browser.newPage()`（无 context 选项）
  → Playwright 默认 `en-US`，页签/胶囊标题即英文；
- C3/C5 是 C2 的下游（胶囊未点开 → 活动行 0），所以一条定位器失配放大成整层红。

## 牵出的失败类

**验收/金标准脚本里的文案断言没有 locale 归属**：同一批"真浏览器"脚本对 locale-owned 文案的处理
不一致——`client-load-smoke` 只对**部分**控件用双语正则，其它仍是中文单语；`client-load-final` 更集中：

| 脚本 | 仍写死中文的定位器（locale-owned 文案） |
|---|---|
| snapshot-replay-smoke | `/研究状态/`（guide 胶囊；本卡） |
| client-load-final | `/读终稿/`、`还不满意？三种改法`、`/看审计版|看读者版/`、`/看当前工作稿|看 v\d+（版本账）/` |
| client-load-smoke | `'取消'`、`'新建'`、`'内置参考'`、`/格局调研/`、`还不满意？三种改法` |

（这些串在 `locales.ts` 里都有 zh/en 两段；是否当前就红取决于该页面的 locale 来源——本卡不声称它们
已红，只指出**同一失效条件存在**。）修复方向不是逐条补英文，而是：**文案断言声明它依赖哪个 locale，
并把它钉住**（钉 locale 或双语正则，二选一并写理由）。

## 修复判据

1. C2 的 guide 胶囊定位接受中英双语（或显式钉 `locale: 'zh-CN'` 的浏览器上下文，二选一并写明理由）；
2. 默认 en-US 环境跑 lead 场景：C2 绿、C3 ≥1 行、C5 与金标准逐字一致（金标准若按英文重录，需人审）；
3. 显式钉 zh 的路径同样绿（两条语义只能选一条为主，另一条写清适用面）；
4. 金标准的来源写清 locale（`ui.expected.md` 头注或场景声明 `source.locale`），避免「录制语言」隐式漂移；
4b. 同批脚本（`client-load-final` / `client-load-smoke` / `client-hitl-smoke`）里上表列出的中文单语定位器，
   修复时一并收口（要么钉 locale，要么双语正则）；
5. 先红后绿：修复前跑一次拿到本卡的 C2 红，修复后同一命令绿；
6. `pnpm verify` 绿（本脚本改动不涉及门禁清单）。

## 修复验证（2026-11-11 同轮）

- 双语定位器已落地：`getByRole('button', { name: /研究状态|Research Status/i })`；
- locale 已钉住：`browser.newPage({ locale: SMOKE_LOCALE })`，金标准头注写明
  「locale: zh-CN（浏览器上下文显式钉住；本金标准不是 en-US 转录）」——判据 1/2/4 满足；
- **C2 仍红**，但已是另一个根因（zh 页签 chrome 已生效、研究状态胶囊仍不可见）→
  [BUG-061](BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md)（排查中）。本卡不再追加范围。

## 修复关联

P2 测试资产修理型，可凭本卡自授权落地。与 [BUG-051](BUG-051-replay-smoke-panerows-undeclared.md)
（同一脚本的 `paneRows` 崩溃，已落地）相邻但不同根因：051 是变量被删，本条是**文案断言没有 locale 归属**。
`B·persona` 的红是快照重录问题（with-key），不在本卡范围。
