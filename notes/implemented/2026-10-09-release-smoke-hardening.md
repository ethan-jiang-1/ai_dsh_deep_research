# release-smoke 五件套补齐：L2 安装面的 client 半断言与进程卫生

> 状态：implemented

同轮关闭的推敲卡：[_backlog/_archived/settled_issues/2026-10-09-release-smoke-hardening.md](../../_backlog/_archived/settled_issues/2026-10-09-release-smoke-hardening.md)（探查实录与形态拍板记录在卡上）。

## 决定

对照 company@59551f2 逐行差异表补齐 L2 安装面的五处缺口（出处 = [company 钉版复核 Note](2026-10-09-company-repin-review.md) 候选②；探查修正与形态拍板记录在卡上）：

1. **安装副本 `lib/client.js` 在场断言**（release-smoke ④）：client 半装配失败 = 整 UI 砖；声明面归新 L0 门禁 `client-half`，安装形状归 L2。
2. **manifest peers-only 断言**（`dependencies === undefined`，读安装副本 manifest——npm pack 原样带入）：防依赖面回潮成嵌套闭包。
3. **boot 页模块表行断言**（形态 B，用户 2026-10-09 拍板）：落 `preset-smoke.mjs` 真会话档（company postmortem 0002 guardrail 的正本之家），fetch boot 页断言本包 client 行 served——源码域/安装域同跑，安装域经 release-smoke ⑤ 委托覆盖，零新 boot。served ≠ loadable：真装载仍归 client-load-smoke（真浏览器）。探查核正：company 的 html.includes 是 fetch 级非真浏览器；卡上"postmortem 0003"引用实为 0002（0002 含 2026-09-22 修正案：inject 闭包 ≠ 可装载）。
4. **进程卫生**（company `release-process.mjs` 移植收窄）：release-smoke `run()` 改有界进程组驱动（超时 → SIGTERM → 宽限 → SIGKILL → 确认退出，退出不确认 = fail-loud 保留现场含锁）+ mkdir 原子并发锁（在场 = exit 2）+ ⑤ 后端口释放验证；超时预算沿用 company 实证值（install 180s / 默认 120s / preset-smoke 外层 300s 兜底）。preset-smoke 的 rpc/boot 页 fetch 补 `AbortSignal.timeout(15s)`（值级不可证——触发它需构造接受连接不响应的服务，证的是 Node 语义非本仓逻辑）。
5. **两条 L0 加宽**（writing-a-gate 全流程，反证见下）：新门禁 `client-half`（`exports ./client` ⟺ `dsh.client` 声明双向一致——vendor `validateClientHalvesDeclared()` 只 glob 树内 `packages/client/*`，仓外 pack 在其射程外，本地镜像同款规则）；`pack-bundle-compat` 加宽（`dshReleases` 含当前 vendor tag——升 pin 忘加列从 L2 前置到 L0 秒级红；tag 正本 = `scripts/verify/context.mjs` 的 `VENDOR_TAG` 常量，升 pin 与 vendor-pin 的 PIN 同 diff 改）。

连带交付（L2 红跑首跑咬出的 HEAD 真债，当场修复）：`src/client/index.ts` 对 `RESEARCH_TOOL_KEYS` 的 import 停在旧家 `ResearchToolCard.tsx`（fdc1421 迁正本进 `keys.ts` 时漏改 import）——pack 在 HEAD 干净态 build 即红（`tsc -b` TS2305），L0 门禁全绿掩护（L0 不构建 pack）。修复 = import 改指 `keys.ts`。这个断链本身就是本卡的立场证据：安装/装配面无断言时，client 半坏到 build 不过都无人拦。按 bugs 入口"当场修掉的缺陷不建档"记于此，不立 BUG 卡。

端口收割逻辑（listenersOn/reclaimPort）从 preset-smoke 抽出 `scripts/lib/port-reclaim.mjs`（消费方 = preset-smoke 兜底/收尾、release-smoke ⑤ 后释放验证——一个事实一个家）。

## 输掉的方案

- **形态 A**（release-smoke 自 boot + fetch html.includes，company release-smoke 原样）：需新端口 + 搬 boot/收割机械，每次 L2 多一次 boot——输给形态 B（guardrail 正本之家 + 零新 boot）。
- **形态 C**（真浏览器安装域化，验收表原措辞）：抓 apply 抛错砖屏，但装载面源码域 client-load-smoke 已守，安装域特有风险（装配/槽位错）fetch 已抓——成本高边际收益低。验收表措辞同 diff 修正为 fetch 断言（依据 = 0002 修正案，非迁就实现）。
- **真注入级红证**（对每条历史断言真注入一次）：留证块/gates-smoke 静态对账够用；真注入义务留给新门禁自身反证（同 guard-red-record 卡的取舍）。
- **照搬 company 的 built-CLI 前置检查与 rm-lib 重建**：本仓 tsx 源码基线（D10）+ prepack 覆盖构建发生，有意裁剪不变。
- **动态读 submodule tag 做兼容矩阵判据**：gates-smoke 副本不拷 submodule 内容（gitlink），动态读在副本内必 fail-loud、案例无法断言注入报因——改 `verify/context.mjs` 内 `VENDOR_TAG` 常量（vendor-pin 的 PIN 同款形态，pin-agreement 对该复述对账）。

## 实际跑过的验证

反证（先红后绿，全部实跑）：

- `client-half` 双方向：真仓改名 exports `./client` 键 → `[client-half] 声明 dsh.client 但 exports 无 ./client` 红；改名 `dsh.client` 键 → `exports ./client 但未声明 dsh.client` 红；各自还原 → 绿。
- `pack-bundle-compat` tag：真仓 dshReleases 值换 `dsh-wrongtag` → `[pack-bundle-compat] 不含当前 vendor tag dsh-v0.2.0-rc.2` 红 → 还原绿（探针值避开 `dsh-v<数字>` 形态——pin-agreement 会把形似 tag 的字面量当钉复述，首跑实咬后改形）。
- 件①②：真仓 sabotage（files 去 `lib/**` + 塞空 `dependencies`）跑完整 L2 → `安装副本带 client 产物（lib/client.js）` 与 `manifest peers-only` 双 FAIL（且安装域 preset-smoke 的模块表断言同红、roster 照常 PASS——postmortem 0002 "host healthy, UI empty" 形态复现）→ 还原 → L2 ALL PASS。
- 件③ 互补案例：`--profile web --no-patch`（无本包 boot）→ `boot 页模块表含本包 client 行（served）` FAIL（exit 1）。
- 件④ 超时：临时挂死步（`node -e setTimeout 60s`、预算 1s）→ elapsed=1013ms status=null timedOut=true 被杀报红；并发锁：占位锁在场 → exit 2 + 指名报因，释放后正常进入。
- 自然红（计划外真债）：HEAD 干净态 `pnpm build` 即 TS2305（RESEARCH_TOOL_KEYS 断链）→ 修复 import → build 绿 → client-load-smoke `/plugins/ 批次包含 dsh-deep-research-pack/client.js` PASS（真浏览器取到模块）。

绿灯面（全部实跑）：`pnpm test` 318/318；`gates-smoke` 全绿（含三个新案例 `client-half-no-export` / `client-half-no-decl` / `pack-bundle-compat-tag-missing`）；`pnpm verify` 全绿（含新台账两处同步）；preset-smoke 源码域 ALL PASS（模块表行断言 PASS + lib 化收割消费方复跑）；release-smoke ALL PASS（五件套断言全绿 + 端口释放验证）。

未跑项：L4-lite / team-preflight（真模型档，本轮无模型可见面改动——改的是冒烟/门禁/装配，persona/skills/手册零改动）；client-hitl-smoke（真模型档，同前）。client-load-smoke 2 FAIL 为脚本自诊断的环境态（"dev home 缺该会话——用 --session 指定"），与前两轮毕业登记的环境性红同款，与本 diff 无关（本 diff 对 client 面仅改 import 指向，模块收录断言 PASS）。

## 环境状态

dev home = `runtime/harness-home`（source dev/env.sh）；L2 跑过两轮 sabotage 红与一轮全绿，`release-check` profile 与锁均正常回收。
