# RFC：E1 通道回归排查——research profile 在本仓 vendor 上的模型调用失败

> 状态：**proposed（2026-09-25 00:35 登记，事故驱动）** ·
> 归宿：roadmap §队列「E1 通道回归排查」（bug 型）·
> 来源：[vendor-submodule 毕业 Note §毕业后发现](../implemented/2026-09-24-vendor-submodule.md)

## 问题

E1（机制权威切换到本仓 vendor/dsh submodule）带隐性回归：**research profile**（本包 +
vendor agent-team-profile 层）在本仓 vendor 起的 web 上，一切模型调用报
`DeepSeek request extension preparation failed (REQUEST_EXTENSION)`。对照矩阵：

| 组合 | 结果 |
|---|---|
| research profile × company 基线源码 | ✅（原 run 通道整晚正常） |
| research profile × 本仓 vendor | ❌ REQUEST_EXTENSION（全新会话亦炸） |
| web 纯净 profile × 本仓 vendor | ✅（entry-chain-probe 真模型 ALL PASS） |
| keyless 面（L1/L2）× 本仓 vendor | ✅（release-smoke ALL PASS） |

回归面锁定 = research profile 组合（agent-team-profile 层的请求扩展路径）× 本仓 vendor。
当前 run 通道已回退 company 基线运行（HITL2 已恢复），服务不中断。

## 方案（排查方向，按性价比排序）

1. **agent-team-profile 层构建产物 diff**：research profile node_modules 里的层包（lib/）
   与 company 侧对照——层是 npm 装的还是本地构建的、两侧是否同源；
2. **请求扩展接口核对**："request extension" 的准备路径（vendor web/search/agent-team
   涉及模型请求扩展的 hook）在两棵 vendor 树的 src 差异（同 commit 理论上零差异——
   若零差异则嫌疑转向构建/解析层）；
3. **最小复现脚本化**：boot research profile × 本仓 vendor → session/prompt 探针——
   把对照矩阵变成可一键重跑的脚本（回归修复的验收载体）；
4. **修复后全量重验**：l4-lite-smoke + team-preflight-smoke（真模型档，E1 毕业时欠跑的
   with-key 面）绿后，run 通道切回本仓 vendor。

## 输掉的方案

- **弃 E1 回退 company 借用**（否——机制自持目标不变，回归是可修的接口面问题）；
- **在 vendor 里就地改代码绕过**（否——只读铁律）。

## 验收判据

- 最小复现脚本对四格矩阵全跑通（绿/红与上表一致 → 修复后全绿）；
- research profile × 本仓 vendor 的真模型调用绿（l4-lite + team-preflight 复跑）；
- run 通道 boot-run（本仓 vendor）+ 一次真实交互验证后切换登记。
