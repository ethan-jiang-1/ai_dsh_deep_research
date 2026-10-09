---
status: 推敲中
opened: 2026-10-09
---

# 推敲：release-smoke 补齐——L2 安装面的五处缺口

> 立卡：2026-10-09 ｜ 状态：推敲中 ｜ 类型：Task ｜ 可关闭：否

**问题与期望结果：** L2 安装冒烟对 pack 的 client 半验证不足、进程卫生不完整。出处 = [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md)（候选②，对照 company@59551f2 逐行差异表）。期望：安装域对 client 面（装配失败 = 整 UI 砖）有断言，且冒烟进程挂死/并发互撞不再可能。

**当前情况：** [release-smoke.mjs](../../scripts/smoke/release-smoke.mjs) 头注已列五条差异（2026-10-09 修订）。缺口按危害排序：
1. **安装副本 `lib/client.js` 断言缺席**——pack 明确带 client 半（`exports ./client` → lib/client.js、files 含 lib/**），L2 却不验它在安装副本里在场；
2. **`dependencies === undefined` 断言缺席**——防依赖面回潮成精确钉死（peers-only 发布形状）；
3. **安装域浏览器模块表断言缺席**——client-load-smoke 是源码域；client 半"槽 key 拼错静默不渲染"只有浏览器能抓（company postmortem 0003 同款）；
4. **进程卫生**：`run()` 无超时（spawnSync 可无限挂起）、无并发锁、无退出确认回收——违 scripts/AGENTS「释放到静默」完整形态；
5. **可并包的两条 L0 加宽**：client-half 门禁（`exports ./client` ⟺ `dsh.client` 声明双向一致）+ pack-compat「含当前 tag」从 L2 提前到 L0（升 pin 忘加列更早现形）。

**未决问题：** ③的实现形态（借 company 的 html.includes 浏览器模块表形态 vs preset-smoke 增 client 检查——倾向前者，真浏览器断言）；④的超时预算取值（company：install 180s / boot 120s / 请求 15s，可直接沿用）。

**下一步：** 用户确认后一张卡内五件套顺序实施，每条断言先红后绿。

## 方案与取舍

- **推荐候选**：五件套一次窄切片（同一改动面 = release-smoke.mjs + verify.mjs 两条 L0 加宽 + 对应台账/案例）。
- **不采纳**：照搬 company 的 built-CLI 前置检查与 rm-lib 重建步（本仓 tsx 源码基线 = D10 定案、prepack 已覆盖构建发生——头注已登记为有意裁剪）。

## 关闭条件

- 五条各自有反证实录（断言注入 → 红 → 还原 → 绿），新 L0 门禁两处同步（gates 数组 + evaluation 台账）+ gates-smoke 案例；
- `release-smoke` 全绿实跑 + `pnpm verify`/`pnpm test` 全绿。

## 验收标准

| 判据 | 检查方式 |
|---|---|
| 安装副本缺 lib/client.js → 红 | 断言注入反证 |
| pack manifest 出现 dependencies → 红 | 同上 |
| 安装域浏览器模块表不含本包 client → 红 | 真浏览器断言（先红实录） |
| run() 超时生效（挂死子进程被杀并报"未跑"级错误） | 人工构造挂死 + 计时 |
| client-half / pack-compat-L0 各自先红后绿 | gates-smoke 案例 |
