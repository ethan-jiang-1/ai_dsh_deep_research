# 研究驾驶舱（Research Cockpit）命名显性化——已定名并钉面

> 状态：implemented

2026-09-28 用户拍板并当日钉面："这个东西我们应该起名……今后用这个名字来沟通，甚至你代码里头
也叫这个"。命名类决定从此显性化留档（本 Note = 该命名的决定正本：名字、理由、输掉的备选、
钉面清单）。

## 决定

**套件名 = 研究驾驶舱（Research Cockpit）**。命名分层从此固定：

| 层 | 名 | 指什么 | 改动频率 |
|---|---|---|---|
| 伞 | 观察面 | 驾驶舱 + 仪表盘投影（D18 原语义不变） | — |
| **套件** | **研究驾驶舱（Research Cockpit）** | `src/client/` 的 React 件全体（研究状态页签 / 工具卡 / 活标题 / 挂起显性化 / 装配） | **最频** |
| 共用层 | 折算层（folds） | `src/lib` 纯函数谓词（keyless 单测；驾驶舱与仪表盘共用） | 少 |
| 投影 | 仪表盘（run-dashboard） | 只读 HTML 投影（抛弃型、永不入库） | 少 |

- 件名保留：研究状态页签是驾驶舱**里的一个件**，不与套件名混用；
- 代码面约定：`src/client/` 目录名**保留**（DSH 插件双半约定 host/client——循 DSH 不发明），
  套件名钉在**入口头注**（前门身份）；wire id（`research-status` / `openTab('research-status')`）
  不动——页签的身份，不是套件的。

**钉面清单（实际落位，同 diff）**：00-index **D18 台账行**（别名入行）+ 00-index **术语映射**
（新行：驾驶舱 → 载体 `src/client/` + `src/lib/`）+ pack **README**（首段套件自述 + 构成表行）+
`src/client/index.ts` **入口头注**（前门身份）+ 根 **AGENTS 布局行**（一句话级）。

## 输掉的方案

- **研究面板（Research Panel）**：平淡、无隐喻，弃；
- **观察台**：不如驾驶舱贴交互哲学（cockpit = 看仪表 + 关键时刻接手，恰是静默自主 + HITL
  接手的设计本体），弃；
- **不加新名（只用观察面）**：伞名指不到件上——"改一下观察面"分不清驾驶舱还是投影，弃；
- **目录改名 `src/cockpit/`**：破坏 DSH 双半约定（host/client 半是 vendor 插件架构词汇），
  违背研发宪章"循 DSH 而不发明"，弃——代码身份由入口头注承载。

## 实际跑过的验证（2026-09-28）

- 钉面五处同 diff 落位（上列清单）；`pnpm verify` 全绿 · `pnpm test` 83/83；
- entry-chain 探针 ALL PASS（真值正确抽取"▶ 当前 = 研究驾驶舱命名显性化"——链上名字可寻）；
- pack 重建（`pnpm build`）绿。

## 环境状态

- **沟通词汇**：今后"驾驶舱"一词即指本套件（改驾驶舱 = 改 `src/client/` + 联动 `pnpm build` →
  client-load-smoke，走 60 §2 路由表的观察面 client 面行）；
- pack README 随包发布：改驾驶舱后 run 通道镜像刷新走全量重建（`rm profile + boot-run`——
  逐文件 cp 已实测脆弱：漏构建产物即漂移红拦 web 起，见 right-pane-ux-debt Note）。
