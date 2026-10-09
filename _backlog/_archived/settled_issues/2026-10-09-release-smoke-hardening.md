---
status: 已结
opened: 2026-10-09
---

# 推敲：release-smoke 补齐——L2 安装面的五处缺口

> 立卡：2026-10-09 ｜ 状态：已结——五件套已实施且全绿（③=形态 B、④=company 值，2026-10-09 用户拍板；L2 红跑另咬出 HEAD 的 pack build 断链真债并同修）；证据与去向 = [release-smoke-hardening Note](../../../notes/implemented/2026-10-09-release-smoke-hardening.md) ｜ 类型：Task ｜ 可关闭：是

**问题与期望结果：** L2 安装冒烟对 pack 的 client 半验证不足、进程卫生不完整。出处 = [company 钉版复核 Note](../../../notes/implemented/2026-10-09-company-repin-review.md)（候选②，对照 company@59551f2 逐行差异表）。期望：安装域对 client 面（装配失败 = 整 UI 砖）有断言，且冒烟进程挂死/并发互撞不再可能。

**当前情况：** [release-smoke.mjs](../../../scripts/smoke/release-smoke.mjs) 头注已列五条差异（2026-10-09 修订）。缺口按危害排序：
1. **安装副本 `lib/client.js` 断言缺席**——pack 明确带 client 半（`exports ./client` → lib/client.js、files 含 lib/**），L2 却不验它在安装副本里在场；
2. **`dependencies === undefined` 断言缺席**——防依赖面回潮成精确钉死（peers-only 发布形状）；
3. **安装域浏览器模块表断言缺席**——client-load-smoke 是源码域；client 半"槽 key 拼错静默不渲染"只有浏览器能抓（company postmortem 0003 同款）；
4. **进程卫生**：`run()` 无超时（spawnSync 可无限挂起）、无并发锁、无退出确认回收——违 scripts/AGENTS「释放到静默」完整形态；
5. **可并包的两条 L0 加宽**：client-half 门禁（`exports ./client` ⟺ `dsh.client` 声明双向一致）+ pack-compat「含当前 tag」从 L2 提前到 L0（升 pin 忘加列更早现形）。

**未决问题：** 已全部拍板（2026-10-09 用户确认）——
- **③ = 形态 B**：preset-smoke 真会话档加模块表行断言（fetch 级；源码域/安装域同跑，安装域经 release-smoke ⑤ 委托覆盖）；验收表第 3 行"真浏览器断言"措辞同 diff 修正。
- **④ = 沿用 company 值**：install 180s / boot 120s / 请求 15s（代码实证）；锁 = mkdir 原子锁；spawnSync 原生 timeout/killSignal。

**下一步：** 一张卡内五件套顺序实施，每条断言先红后绿。

## 探查实录（2026-10-09，只读核对 company@59551f2 与本仓现状）

- **company html.includes = fetch 级，非真浏览器**：`checks/smoke/release-smoke.mjs:144-145`——token 交换后 `fetch('/')` 取 HTML，断言 `html.includes('dsh-company-pack/client.js') || html.includes('"dsh-company-pack"')`。证明模块表编进 boot 页（served），不证明装载。
- **卡上引文两处失真已核正**："槽 key 拼错静默不渲染"出处 = postmortem **0002**（卡上误写 0003；0003 是 duplicate-remote-mount）。0002 含 2026-09-22 修正案：`dsh.client.inject` 仅 informational，闭包 diff ≠ 可装载，"静默失败"是误诊；实然失败形态 = client entry `apply` 抛错 → BootPage 失败屏砖整 UI（横幅 + console，真浏览器可抓）。
- **0002 guardrail 正本之家 = company preset-smoke**（解析 `window.__DSH_BOOT__` 断言依赖闭包，自家模块 missing 即红、外家 WARN）；release-smoke 另有一行 html.includes 行检查——company 两处都有，preset-smoke 是 postmortem 直系。
- **本仓 preset-smoke 已有全部所需机械**：boot（detached 组长 + banner 等待，BOOT_TIMEOUT_MS=120s 已在）、token→cookie 认证、组杀 + 端口收割（2026-09-26/27 实测加固）；rpc fetch 无超时（company 用 `AbortSignal.timeout(15_000)`，可顺带补）。源码域与安装域同跑，release-smoke ⑤ 已委托它在安装域执行。
- **④ company 值代码实证**（release-smoke.mjs）：plugin add `timeoutMs: 180_000`（L99）、boot banner `BOOT_TIMEOUT_MS=120_000`（L19）、请求 `AbortSignal.timeout(15_000)`（L117）；并发锁 = `mkdirSync(lockDir)` 原子占位（L56-58）；进程卫生 = `tools/drivers/release-process.mjs`（timeout→SIGTERM→宽限→SIGKILL→确认退出，退出不确认则报 "leave runtime files intact" fail-loud）。本仓 run() = spawnSync（Node 原生 `timeout`/`killSignal` 即可覆盖短命子进程；长命 boot 只存在于 preset-smoke，其收割机械已在）。
- **端口表**：3100 = release-smoke 调 preset-smoke 占用；3099 = preset-smoke 默认；3101/3102/3103/3109/3113 已有主。若形态 A 需新端口（如 3104）。

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
| 安装域浏览器模块表不含本包 client → 红 | preset-smoke 真会话档 fetch boot 页模块表行断言，先红实录（形态 B，用户 2026-10-09 拍板） |
| run() 超时生效（挂死子进程被杀并报"未跑"级错误） | 人工构造挂死 + 计时 |
| client-half / pack-compat-L0 各自先红后绿 | gates-smoke 案例 |
