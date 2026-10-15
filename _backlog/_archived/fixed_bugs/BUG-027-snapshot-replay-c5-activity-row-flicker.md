---
status: 已修
severity: P2
opened: 2026-10-15
---

# BUG-027：snapshot-replay C5 渲染金标准间歇性红——捕获时就绪判据缺失，会话历史仍在流式加载

> 状态：已修（2026-10-15 同日闭环：失败场签名定位 → C0b 客户端历史就绪谓词 → 连续 5 次 ALL PASS → 归档）｜发现：2026-10-15（`snapshot-replay-smoke` 的 C5 逐字比对时红时绿）

## 症状

`snapshot-replay-smoke` 的 lead 场景 C5「渲染金标准逐字一致（卡片 + 活动行）」间歇性红：**实得比金标准少一条活动行**——金标准 2 行（`🔍 检索：DSH harness` + `💬 探针完成，搜了「DSH harness」…`），失败时只有 `🔍` 一行。A 层回放通路与 B 层四角色组装请求面同时全绿（含 `agent-instructions`、`skill-catalog`、`runtime-context`、coverage），C4 无本包 console 报错，失败只落在 C5。

## 复现

```sh
source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs
```

- **失败 3 次**：两次在"仅固定 sleep"时期，一次在"已加活动行稳定窗"之后——即稳定窗降低了频率但**未消除**。
- **压力未复现**：CPU 4 路 ×3 次、磁盘 zstd 3 路 ×2 次均绿（**非充分条件**，故不作为判据）。
- **修复后连续 5 次 ALL PASS**（C0b 报挂载 4/4；4 场景 A/B/C 全链）。

## 根因（已证实，2026-10-15）

失败场与通过场的现场签名对照（原始摘录 = `runtime/smoke-workspace/bug-027-evidence/failing-signatures.md`，gitignored 运行证据）：

| 信号 | 失败场 | 通过场 |
|---|---|---|
| C1 chat 工具调用锚 | **1 个**（`call_00_ov4QBi:…检索：DSH harness`，未展开） | **4 个**（search / fetch / …全在） |
| C3 页签活动行 | **1 行** | **2 行** |

即捕获发生时**客户端的会话历史仍在流式加载**：录制夹具的 4 个 `tool/call` 只挂上 1 个，chat 与「研究状态」面板**同缺末条**。原 `sleep(4500)` 与本轮先加的"活动行稳定窗"都会在**部分数据已稳定**时放行——**稳定 ≠ 就绪**。判据缺失在冒烟的就绪模型，不在产物。

## 输掉的方案 / 已排除的假设（留证，防重走）

- **"抓早了"用更长等待解决** → 加行稳定窗后仍红一次，且失败态是"1 行持续到 20s 死线"；
- **金标准内容过期** → `--update-expected` 写回的内容与已提交 `ui.expected.md` **逐字相同**（金标准无须变更）；
- **并发负载触发**（当时在跑 node-gate 对账 + zstd）→ 受控 CPU/磁盘压力各 2–3 次均未复现；
- **产物侧面板 fold 竞态** → 否：失败场里 chat 的调用锚同样只有 1/4，是数据面整体未就绪，非面板独有失效路径；
- **列表虚拟化** → 否：同一失败场里 chat 的调用锚也缺，非渲染窗裁剪；
- **node-gate 判据分叉**（顺手排除）→ pack `terminalReadiness` 与 `.mjs` 镜像在 9 种真实判定行形态上同判。

## 修复（已进树）

`scripts/smoke/snapshot-replay-smoke.mjs` 增 **C0b 客户端历史就绪**步骤与等待：期望值 = **录制夹具自身的 `tool/call` callId 集合**（盘侧真值；回放保留录制 callId，实测锚逐字命中），30s 死线；夹具零 `tool/call` 的场景视为就绪（无对象，防空语料另一面）。活动行稳定窗降为次级等待。**断言与比对器零改动**——就绪谓词只决定"何时捕获"，不参与"捕获得对不对"；期望值取自夹具而非金标准，也不构成放宽比对。

## 修复判据（满足，证据）

1. 捕获前夹具 `tool/call` 全挂：C0b PASS 且报 `挂载 4/4` ✓
2. C5 逐字一致**连续 5 次运行全绿**（`snapshot-replay-smoke: ALL PASS`，含 4 场景 A 回放 / B 组装请求 diff / C 渲染金标准）✓
3. 断言与比对器零改动（`git diff` 仅新增就绪等待与 C0b 步骤）✓

## 负例留证

- 修复前 3 次失败运行的现场签名与对照摘录：`runtime/smoke-workspace/bug-027-evidence/failing-signatures.md`（gitignored 运行证据；失败场 C1 锚 1/4 + C3 1 行 = 本卡的判别签名）。
- 本卡与两处索引（活跃列表移除 / 已修表登记）随归档同次变更。
