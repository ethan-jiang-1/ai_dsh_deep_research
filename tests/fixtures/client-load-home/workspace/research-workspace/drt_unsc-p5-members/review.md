# Review — drt_unsc-p5-members（审查对象：`final.md` 当前稿；轻量模式 quick_factual）

<!-- 本文件最新在上；当前终局块在文件顶部，历史轮不夺权 -->

## 终局块（2026-11-01 · 第 3 轮）

readiness: PASS

**本轮范围（只确认两处微编辑，不做全篇重审；复审上限第 3 轮）**：会话时间读数 `2026-11-01T21:03:00+08:00 [Asia/Shanghai]`。只核 `final.md` 第 13、17 行的落点与变动范围；独立重抓 2 个受影响 `source_url`：`research.un.org/en/unmembers/scmembers`（HTTP 200 直连）、`www.un.org/en/about-us/main-bodies`（HTTP 200 直连）。未改 `final.md` / `findings.md` / `evidence/*`（critic 只写 review.md）。

### 1. 变动范围：只有这两处，未引入其他改动（判据 + 限制）

- **结构不变量**：仍 **35 行**（无增删行）；`[来源:]` 由 13 处 → **14 处**，唯一增量 = 第 13 行新增的指南卡引用（即 m8 要求的补标）；被引卡仍 **9 张**（无新卡、无撤卡、无换卡）。
- **句级对照第 2 轮记录**：第 2 轮我逐字引过的各处（第 3、8、13 行其余部分、15、16、17、21、23、27、28、31 行）现文与旧记录一致；`## 名单在 2026 年有没有变`、`## 来源与限制`、`## 附` 三节未见措辞变化。
- **改动恰为两处**：①第 13 行"由抓取当刻可读 + 同域 UN 图书馆指南的年度成员表 2026/2027/2028 三行共同支撑（该三行见指南卡解读节，摘录节只摘 2026 行）"并补 `[来源: evidence/un-sc-membership-research-guide.md]`；②第 17 行"主要机构"→"**主要机关**（Main Bodies）"。除此之外未见新增断言、新增限定语或删证据。
- **更正我上轮的一处计数笔误**：第 2 轮块写"12 处 `[来源:]`"，实数应为 13（本轮 14 = 上轮 13 + m8 新增 1）。不影响任何结论，此处自纠。
- **限制（不声称做不到的事）**：bundle 无 git、无 `final/vN` 快照，**无法机械 diff**；"只改这两处"以句级对照 + 结构不变量 + 锚点句在场为判据，不是客观 diff 证据。`evidence/un-sc-membership-research-guide.md` 的修改时间早于第 2 轮 review（本轮未被触碰），与"本轮只动 final.md"一致。

### 2. 两处闭合判定

| 项 | 状态 | 判据（本轮实核，非采信口头/卡片自述） |
|---|---|---|
| m8 新增指南卡引用是否真支撑"2026/2027/2028 三行"、是否如实标注所在节 | **闭合** | 卡内 `## 原文摘录` 只有"2026"年份格与 2026 成员行两格（第 37、39 行），**无 2027/2028 行** → final"摘录节只摘 2026 行"**属实**；卡内 `## 解读 · 口径`（第 49 行）明写"指南页所在表格同时列有 2026、2027、2028 三行（2028 行标注 "partial list pending elections"）" → "该三行见指南卡解读节"**属实**。我重抓原页逐行核到三行：2028 = `(partial list pending elections): Austria, China, France, Kyrgyzstan, Portugal, Russian Federation, Trinidad and Tobago, United Kingdom, United States, Zimbabwe`；2027 = 全 15 国 + `A/80/PV.86`；2026 = 全 15 国 + `A/79/PV.73`。故"三行共同支撑现行性"现在**显式可追**（此前该事实只挂在 current-members 卡上）。2028 的 partial 标注 final 未复述，但已指向解读节，**披露链完整**，不另开 MINOR。 |
| m7 "主要机关（Main Bodies）"与卡 publisher / 页面题名是否一致 | **闭合** | 重抓 `www.un.org/en/about-us/main-bodies`：页面英文主标题（H1）为 `Main Bodies`，站点 title 亦以它开头；中文站导航链接 `title="主要机关"`（`/zh/about-us/main-bodies`）→ 第 17 行"主要机关"（Main Bodies）与官方中英题名**双向一致**；被引卡 `un-main-bodies-composition.md` 的 `publisher: un.org`、`source_url` 指该页、解读节亦写"联合国官网"主要机关"页" → 卡与 final **同口径**，不存在"卡名 A、文中名 B"。摘句 `It has 15 Members (5 permanent and 10 non-permanent members). Each Member has one vote.` 与重抓正文**逐字一致**。 |
