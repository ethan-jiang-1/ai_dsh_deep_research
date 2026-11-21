---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-345：present 已发生，驾驶舱仍报「交付未见证」且终稿页签不出现

> 严重级别：P2 ｜ 发现：2026-11-20 ｜ 状态：已修（2026-11-21）— 结论：回执只认工具形状（version 1 + slug + acceptedAt + gate.PASS），手写 install-only 不冒充；窗口外无回执 = 未见证，不伪造；审查：agent — 注入红回归；去向：none — 合同收紧
>
> 现场 = `runtime/e2e-2026-11-20/run-a-delivered.png`；run = `research-workspace/drt_pg-latest-stable/`。

## 症状

会话日志里 present 在 22:08:25 发生（`presentCalls=1`，payload `final/v1.md`），但 22:14 新开
一个浏览器加载同一会话，右栏研究状态显示：

```text
v1 版本账 · 交付未见证
```

且页签栏只有「对话 / 方法库」，**没有「终稿」**。用种子夹具跑 `client-load.entry --seed` 时
交付门与终稿页签全绿——同一客户端代码在另一种数据下有正确行为。

## 根因（三段）

1. **浏览器 RunSource 没有 root**：`browserRunSource` 不提供 `RunSource.root`（接口注明"浏览器适配器可缺"），
   而 `useStatusFeed` 用 `props.runSource(sessionId).root` 当 `cwd` 传给 `latestFinalDelivery`。
   present 事件里的路径是**绝对路径**；`finalPathOfWithin(absolutePath, undefined)` 返回 null →
   交付永远"未见证"。
2. **回执兜底失效**：兜底读 `delivered.json`，`deliveryFromReceipt` 期待
   `{ present: { path }, final: { version } }`；而本 run 的 `delivered.json` 是 lead 自写的
   install-only 形态（`presented: [ … ]` / `final_copy` / `machine_audit`），解析不出交付。
   同一份回执还是**先写后交**：22:05 写入时把 `presented` 记成已交付，present 22:08 才发生。
3. **观察窗口加重**：`journalEvents` 来自 follow 的 history 帧（窗口有界）。run A 的 present
   在随后的 goal round（+170 事件）之后可能落出窗口；即使窗口内，也会被 (1) 挡掉。

## 复现

```sh
# 1) 会话确实有 present
node --import tsx/esm probes/analyze/session-events.mjs session-93752db0-e400-4ec3-bf9a-de7641f76184 \
  --tail 0 --type tool/call | grep present
# 2) 浏览器看到未见证（需通道在跑）
node probes/browser/cdp-probe.mjs '<gui-url>' --open-session 'PostgreSQL 最新稳定版本' --open-status
#    statusPaneText 含「交付未见证」
# 3) 种子夹具对照全绿
node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home --port 3109
```

### 形态证明（keyless）

```sh
node --import tsx/esm -e "
import { readFileSync } from 'node:fs'
import { deliveryFromReceipt } from './packages/deep-research-pack/src/lib/run/final-target.ts'
const lead = JSON.parse(readFileSync('research-workspace/drt_pg-latest-stable/delivered.json', 'utf8'))
console.log('lead receipt →', deliveryFromReceipt(lead, 'pg-latest-stable'))
console.log('accept shape →', deliveryFromReceipt({ present: { path: 'drt_pg-latest-stable/final/v1.md', callId: 'x' }, final: { version: 1 } }, 'pg-latest-stable'))
"
# lead receipt → null
# accept shape → { path: 'drt_pg-latest-stable/final/v1.md', turn: 0, callId: 'x' }
```

```sh
node --import tsx/esm -e "
import { readFileSync } from 'node:fs'
import { latestFinalDelivery } from './packages/deep-research-pack/src/lib/run/final-target.ts'
const lines = readFileSync('runtime/e2e-2026-11-20/runb-events-full.jsonl', 'utf8').split('\n').filter(Boolean); lines.shift()
const ev = lines.map(l => JSON.parse(l))
console.log('cwd=undefined →', latestFinalDelivery(ev, undefined))
console.log('cwd=workspace →', latestFinalDelivery(ev, '/Users/bowhead/ai_dsh_deep_research/research-workspace'))
"
# cwd=undefined → null
# cwd=workspace → { path: 'drt_sodium-ion-bess/final/readable-v1.md', … }
```

浏览器适配器不提供 `root`，所以线上永远是第一行；回执兜底又因形态不符 null。两条路同时断。

## 修法（需拍板）

1. 交付见证改为**不依赖窗口**：present 事实由回执/盘上快照承载，或 history 窗口覆盖全部
   （代价见性能）；
2. 定义 install-only 回执 schema 并让 `deliveryFromReceipt` 接受，lead 按 schema 写；
3. present 时由工具侧或 lead 写一条可解析回执，禁止「先记交付、后 present」。

## 修复判据

- 本卡现场在窗口滚出 present 后仍显示「已交付 v1」且出现终稿页签。
- 未 present 的 bundle 不显示终稿/已交付（负例），未绑定会话零泄漏（既有断言不回退）。
- `client-load.entry --seed` 与 dev-home 两手都绿。


## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/final-target.ts",
    "tests/run/gates/final-target.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/final-target.spec.mjs",
    "exit": 1,
    "output": "回退宽松回执解析：install-only 手写形状与缺 gate/缺 acceptedAt 的仿制品被当成交付（1 例红）"
  },
  "green": {
    "command": "node --test tests/run/gates/final-target.spec.mjs",
    "exit": 0,
    "output": "21 tests 全过：canonical 回执 → 交付；install-only / 缺 gate / slug 不符 → null"
  },
  "guard": {
    "path": "tests/run/gates/final-target.spec.mjs"
  }
}
```

判据修订（用户 2026-11-21 裁定不做旧产物兼容）：
- 只认工具回执（`run-accept` 写的 `version:1 + slug + acceptedAt + gate.PASS`）。本卡现场那份 lead 手写的 install-only 形状**不算回执**，保持未见证——不为它加兼容分支。
- 观察窗口外且无工具回执 = **未见证**（不伪造已交付）；生产侧正路 = 交付时跑 ops `run-accept`，由工具写回执。窗口本身由 vendor follow 快照策略决定，本仓不改 vendor；这条残差记入批 Note 的未证边界。

可关闭：是
