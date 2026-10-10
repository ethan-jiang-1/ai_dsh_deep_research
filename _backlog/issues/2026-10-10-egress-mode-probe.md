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

**未决问题：**

- 自旋代理落家：runtime 一次性（非仓库内容）vs dev/ 常驻件（仓库内容，走证据阶梯）——倾向前者起步；
- 探针主机集与多数决（如 2/3 通即算有网）的精确定义；
- C 态仅警告还是可选硬拦（研究 run vs 无网操作两种用途）；
- preset-smoke / recorder 是否同期接入，还是先 boot-run 单点落地。

**下一步：** 用户确认方案（尤其出口三选与硬约束口径）→ 实施：探针 + boot-run 分支 + 61 §0.1 重写 + keyless 探针测试（三态注入断言，防空语料）。**落地前的临时操作** = 重启通道前手动跑一次判定（本日晚 18:16 后实测为直连态——当前重启通道即可恢复 web_fetch）。

## 验收标准

1. 探针 keyless 秒级，三态判定各有注入式断言测试（mock resolver 三形态；防空语料）；
2. boot-run A 态：除新增模式行外，输出与行为零变化；
3. boot-run B 态：出口就位（用户 env 或自旋），通道进程内经出口 fetch 公网页得 200（undici 机制级 keyless 证据）+ 一次真会话 web_fetch 成功（真模型档）；
4. boot-run C 态：横幅显式警告，不静默；
5. 61 §0.1 更新为两态模型，直连/TUN 两态文档地位对等。

## 关闭条件

方案获用户确认、实施落地、验收全绿；结论迁移（实施 Note 或 guides 更新）后按 backlog 入口规则归档。
