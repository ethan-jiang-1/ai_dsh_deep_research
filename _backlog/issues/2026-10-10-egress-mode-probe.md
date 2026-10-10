---
status: 推敲中
opened: 2026-10-10
---

# 推敲：egress 模式探针与自适应 boot——直连/TUN 两态自动判定与分支

> 立卡：2026-10-10 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否

**问题与期望结果：** 本机 egress 环境在两种形态之间**流动**（同日实测翻转，见下），静态配置永远有一半时间错——写死代理毒害直连态，不写代理则 TUN 态全红。期望 = boot 前自动判定 egress 模式，**按态分支**：直连态零变化、TUN 态自动给出出口、无网态显性警告。**硬约束（用户定调 2026-10-10）：两种状况都必须支持，都是一等公民——不支持其中一态 = 修一半。**

**当前情况（实证链，2026-10-10 一天内两态都现身）：**

- **上午 ≤11:41（TUN/fake-IP 态）**：`research-workspace/drt_cn-moe-2026/journal.md` 自记——web_fetch 全域名撞 `resolves to a non-public IP address`（12 主机 29 次全红，含 `127.0.0.1` 控制组），journal 归因 = DNS 答 198.18.x.x 假 IP、DSH SSRF 守卫拒非公网答案；run 由此卡死在立项期。
- **晚 18:16 起（直连态）**：本日重录的 lead fixture（snapshots/replay/research-face）web_fetch **零** SSRF 错误；`dns.promises.lookup`（DSH 守卫同款路径）对 example.com / arxiv.org / huggingface.co 全部返回真实公网 IP；OS 级 curl 亦 200。
- **vendor 机制（只读核实）**：守卫 = `vendor/dsh/packages/web/web-fetch-http/src/network.ts` 的 `resolvePublicAddresses`（逐答案校验公网性，非公网即 WEB_BLOCKED_URL）；**设计内旁路** = `proxyRouteFor` 读进程 env `http_proxy`/`https_proxy`/`no_proxy`（`util/http-proxy/src/policy.ts:40-42`）——有代理路由时走 `requestVia`，**代理侧解析，守卫不再触发**。此即 [guides/61 §0.1](../../docs/guides/61-run-playbook.md) 处方的机制本体。
- **旁证史**：10-09 录制的旧 lead fixture（git 历史）内嵌 10 处 SSRF 错误串——TUN 态的失败卡烙进了渲染金标准；61 §0.1 记载 2026-09-28 同型事故。同环境异日异态 = 反复咬人的根源。

**状态分类学与判定矩阵：**

| 态 | getaddrinfo（探针主机） | OS 级 HTTP | DSH web_fetch | 处理 |
|---|---|---|---|---|
| A 直连 | 公网 IP | 通 | 原生可用 | **零变化**（不设 env、不起 daemon、不设代理） |
| B TUN/fake-IP | 保留段（198.18.x.x 等） | 通（TUN 透明路由） | 全域被守卫拒 | 给 DSH 进程设 http_proxy 出口 |
| C 无网 | 任意 | 不通 | 不可用 | boot 显式横幅警告（研究 run 无法取证） |

**方案与取舍：**

1. **探针（判断）**：keyless 秒级——`dns.promises.lookup` 解析少数探针主机（2–3 个防单主机抖动）分类答案段 + OS 级 HTTP 可达性 → 三态判定。**必须走 getaddrinfo 路径**（DSH 同款）；dig/resolv.conf 直查与 mDNSResponder 的可见性可能不同，测错路径 = 判错态。
2. **B 态出口（处理）三选**：
   - 用户指定 `DSH_EGRESS_OUTLET=http://127.0.0.1:<代理工具 HTTP 口>`（有显式代理口者零新增件）——**覆盖优先**；
   - 自旋本地转发代理（~50 行 node CONNECT 隧道：代理侧经 OS 解析 → fake-IP → TUN 路由；OS 级 HTTP 通则它必通）——B 态零用户配置的兜底；
   - 自动扫描常见代理端口（7890/6152/…）——**否**：本日实测 14013–14023 全不是 HTTP 代理，猜端口脆弱。
   - 无论哪个出口：同设 `no_proxy=localhost,127.0.0.1,[::1]`（防通道自身 localhost RPC 被误代理）。
3. **固化点**：boot-run 自检内联探针（打印模式行 + 分支）+ 独立 CLI（`dev/egress-probe.mjs`；第二消费者 = record-role-fixture——B 态录制会把 SSRF 失败卡烙进金标准，10-09 即实例）+ 61 §0.1 改写为两态模型（两态文档地位对等）。
4. **硬约束重申**：A 态行为与现状零差（仅多一行模式报告）；把修法写成"永远开代理"会反过来毒害 A 态。

**未决问题（2026-10-10 方案定夺，按 requirements-synthesis 整理）：**

1. 自旋代理落家 → **dev/ 常驻件 + scripts/lib 核心**：固化要求代码可复现；代理核心进 lib（tests 可 import，回环机制测试），CLI 进 dev/。放弃 runtime 一次性选项（不可复现 = 没固化）。
2. 探针主机集与判定规则 → **example.com + www.cloudflare.com 双主机**；判定语义与守卫同款——**逐主机全部答案公网才算该主机可过**（守卫对混合答案集整体拒绝）；任一主机可过 → direct，全主机见保留段 → tun，OS HTTP 双探针全失败 → offline；HTTP 通但解析全错 → 回落 direct（零变化默认，异常标记 anomaly）。
3. C 态 → **仅显性警告，不硬拦**：boot-run 服务多用途（无网操作合法），研究 run 的取证失败由证据契约在 run 内显性化。重议条件 = 出现"无网态误开研究 run 造成实际浪费"的第二实例。
4. 接入范围 → **本期 boot-run 单点 + 共享 lib 就位**；recorder/preset-smoke 接入为后续候选，触发条件 = 下次 TUN 态录制再次把 SSRF 失败卡烙进金标准。

**候选步骤（每步独立可验收；非执行队列）：**

1. `scripts/lib/egress.mjs`（三态判定核心，注入式 IO）+ `tests/egress-probe.test.mjs`（红→绿）；
2. `scripts/lib/egress-proxy.mjs`（CONNECT 隧道 + 绝对 URI 转发核心）+ `tests/egress-proxy.test.mjs`（回环机制测试，红→绿）；
3. CLI ×2（`dev/egress-probe.mjs`、`dev/egress-proxy.mjs`）+ boot-run 自检分支 + A 态零变化观察；
4. 文档固化：61 §0.1 两态重写 + dev/scripts README 索引行 + verify 全绿；
5. B/C 态现场证据 = 等待环境复现（blocked 登记，见验收矩阵）。

## 验收标准（2026-10-10 按 validation-design 重写；行为类别/信号/反例/证据 owner）

| # | 行为 | 类别 | 输入态 / 信号 | 反例与互补态 | 证据 owner（能证/不能证） | 人工判断 |
|---|---|---|---|---|---|---|
| 1 | 三态分类正确 | 确定性逻辑 | 注入 mock：公网答案 / 保留段答案（含混合答案集）/ HTTP 断 / 解析错 / 双主机混合；信号 = mode 值 | 每态注入断言即反例本体；offline 优先于 DNS 判定 | `tests/egress-probe.test.mjs` + `pnpm test`（证分类语义；不证真实网络形态） | 无 |
| 2 | 代理转发机制 | 确定性逻辑（网络内置件 → smoke 道） | 回环：CONNECT 隧道字节透传 + 绝对 URI GET 转发 + 上游不可达 502；信号 = 透传/转发命中 | 上游不可达 → 502 已列为独立检查 | `node scripts/smoke/egress-proxy-smoke.mjs`（keyless；证隧道机制；**不证**真实外网可达——那属 #4。为什么是 smoke 不是 tests：layering ③ 禁 tests 闭包引入 node:http/net——与 port-reclaim 同款归属） | 无 |
| 3 | boot-run 直连态零变化 | 观察（bash 无单测 owner） | 直连态跑 `--drift-check`；信号 = 输出与改前逐字一致（唯一新增 = 模式行） | 当前环境实测直连（2026-10-10 晚）即触发态本体 | reading protocol：`bash dev/boot-run.sh --drift-check` 输出 diff 记录于本卡与实施记录；无既有机械 owner（bash 面缺席为已知名义 owner） | 无 |
| 4 | TUN 态端到端 + 无网态警告 | 观察（现场缺席） | TUN 态：boot 后 lead 会话 web_fetch 一次公网抓取成功，或 `dev/egress-probe.mjs` 报 tun 且经出口请求 200；无网态：boot 输出含警告行 | 直连态（当前）即互补态——不得据直连态绿灯冒充 TUN 态通过 | **blocked**（B/C 态现场不可复现，按 validation-evidence §1b 登记）：reading protocol 如左；触发条件 = 下一 TUN/无网日重跑补证 | 无 |
| 5 | 61 §0.1 两态文档 | 文档合同 | 直连/TUN 两态地位对等、boot 自动分支如实描述 | 无 | `pnpm verify`（md-links/md-anchors/doc-now-only）+ 文档评审 | 无 |

## 实施记录（2026-10-10）

- 验收 #1 **通过**：`tests/egress-probe.test.mjs` 4/4——注入三态（direct / tun / offline）+ 双主机混合 + 异常回落；红→绿实录：模块未建 ERR_MODULE_NOT_FOUND 红 → 实现绿；`isPublicIp` 首版让 `not-an-ip` 落穿（非 IP 文本直落真值）被测试咬住 → 补 IPv6 形状门转绿。
- 验收 #2 **通过**：`node scripts/smoke/egress-proxy-smoke.mjs` ALL PASS（CONNECT 隧道透传 / 上游不可达 502 / 绝对 URI 转发）。途中 layering ③ 咬住 tests 闭包引入 `node:http`/`node:net` → 按分层纪律迁 smoke 道（与 port-reclaim 之 spawnSync 同款归属：能力件住 smoke 道），矩阵 #2 证据 owner 已同步修正。
- 验收 #3 **通过**：直连态实测（2026-10-10 晚，当前环境态）`DSH_RUN_PORT=3119 bash dev/boot-run.sh --drift-check` 输出与改前逐字一致，唯一新增 = `boot-run: egress 模式 = direct` 模式行。
- 验收 #4 **blocked**（现场缺席，按 validation-evidence §1b 登记）：当前为直连态，B/C 态不可复现；reading protocol 见矩阵行；补证触发 = 下一 TUN/无网日。
- 验收 #5 **通过**：61 §0.1 重写为两态模型（直连/TUN 地位对等 + boot 自动分支 + 手动判定入口 `dev/egress-probe.mjs`）；`pnpm verify`（md-links / md-anchors / doc-now-only / port-exclusive / 资产索引）全绿。
- 全量证据：`pnpm verify` 全绿 + `pnpm test` 327/327（含新增 4）；port-exclusive 认领 14200 单文件（`dev/egress-proxy.mjs`）；探针实跑当前判 `direct`。

**下一步：** #4 现场补证（下一 TUN/无网日按 reading protocol 跑 boot-run 观察并回填本卡）→ 全绿后关闭归档。

## 关闭条件

验收 #1–#3、#5 全绿、#4 保持 blocked 登记（等环境复现补证）；结论迁移（实施记录/Note 由 notes 规则决定）后按 backlog 入口规则归档。
