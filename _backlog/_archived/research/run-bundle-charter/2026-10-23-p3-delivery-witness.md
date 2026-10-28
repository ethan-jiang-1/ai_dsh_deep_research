---
topic: P3 交付见证
intent: 记录门②/③ 改读 DSH 结构化事件（presented / user-question-reply）、UNATTESTED 三态与 run-accept 红不写/绿写回执的落地与验收
---

# P3：交付见证（事件链，不读文本）

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 2026-10-23 ｜ **只对新 run（有 `run.md`）严格**；旧场无 run.md 走 epoch 兼容，不追溯判红。

## 1. 落地

| 面 | 改动 |
|---|---|
| 门② present | 新 run 读 `deliverables/presented`：只认 lead 顶层日志、`files[].path` 精确 `drt_<slug>/final/vN.md`（前缀 slug 不算）、目标 `final/vN` 必须在场；指 `final.md` → RED；语料缺席 → UNATTESTED。旧场仍走 `presentInLogs`/PASS-RELAY（epoch 豁免） |
| 门③ HITL2 | 新 run 读 `user-question-reply`：`callId` 绑定 ask（含“交付审阅/HITL2”）+ `outcome=answered` + 选定标签含“定稿”；§Decisions 行只作回执镜像；无事件链 → RED；语料缺席 → UNATTESTED；代理标记随行 |
| 门① HITL1 | 会话语料缺席（无日志文件）→ UNATTESTED，不再静默判红；有日志但无签名 ask → RED |
| 三态 | `gateBundle` 返回 `{red, unattested}`；`node-gate` exit 0 / 1 / 2（UNATTESTED = 未跑，不是通过） |
| 预检/回执 | `node-gate`/`evidence-audit` 支持 `--no-write`；`run-accept` 先 `--no-write` 预检，红跑不写任何文件；绿才落盘 `node-gate.md`/`audit.md` + `delivered.json`（final 版本/哈希、audit 哈希、present path/callId）+ `acceptance.md`；`--archive` 才移动 |
| 反证 | `tests/run/node-gate-witness.test.mjs` 6 例：presented 精确匹配、前缀 slug、final.md 红、语料缺席 UNATTESTED、reply callId/定稿/代理、门③ 三态 |

## 2. 验收（2026-10-23）

- `pnpm verify`：**全绿**。
- `pnpm test`：**671 pass / 0 fail**（新增 6 条 witness 断言；旧 node-gate 71 条全绿）。
- **红跑实测**（`/tmp` 复制 `tests/fixtures/node-gate/bundles/fixture-hitl2-missing`）：
  `node scripts/run-ops/run-accept.mjs <tmp>/drt_redtest --sessions ...` → exit 1；
  bundle 未新增 `acceptance.md`/`delivered.json`/`audit.md`/`node-gate.md`。
- **绿跑实测**（`/tmp` 构造 `drt_x`：run.md + final/v1 + review PASS + 结构化 audit + lead 日志含 HITL1 ask/HITL2 ask+reply/presented）：
  exit 0；写 `node-gate.md`、`audit.md`、`delivered.json`、`acceptance.md`；
  `delivered.json.present = { path: "drt_x/final/v1.md", callId: "p1", version: 1 }`，final/audit 均有 sha256。
- 旧场：53 个 bundle 无 run.md；门②/③ 走兼容路径，旧测试全绿；未写旧 bundle。

## 3. 未跑 / 边界

- L1/L2、snapshot 重录：P3 未改手册文本；P7 统一。
- 盲测 baseline：仍未跑；最迟 P7 前。
- `node-gate`/`evidence-audit` **默认仍写盘**（P4 翻为默认只读、`--write` 才落盘）；目前 `run-accept` 已用 `--no-write` 预检。
- `delivered.json` 的 present 指针来自 `presentedInLogs`（只读 lead 顶层日志）；若日志尾部丢失，回执 present 可能为 null，但 final/audit 哈希仍在。
