---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-052：交付早于 D46 落地 9 小时的 bundle 被追溯判红——epoch 只到日粒度

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；断代改「交付回执优先」：`delivered.json.acceptedAt` 早于 D46 落地时刻（2026-11-11T10:01:02+08:00）= legacy，同日早场不再追溯；晚场 / 无回执仍红；先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

一个**已经交付**的 bundle 今天被 `protocol-audit` 判红：

```
$ node scripts/run-gates/protocol-audit.mjs research-workspace/drt_api-context-caching-ds-openai
protocol-audit: RED（1 项）
  [no-protocol] 契约日后缺 protocol.json
EXIT=1
```

但它的交付回执说交付时门禁是绿的：

```json
// delivered.json
"acceptedAt": "2026-11-10T17:10:51.321Z",   // = 2026-11-11 01:10 +08
"gate": { "status": "PASS", "exit": 0 }
```

时间线：交付 **2026-11-11 01:10 +08**；D46（Protocol 层）落地 = 提交 `17e866d`，**2026-11-11 10:01 +08**。
即交付发生在契约存在之前约 9 小时，却因为 `run.md` 的 `created: 2026-11-11` 只到日粒度，被算作「契约日后」。

## 复现

```sh
source dev/env.sh
node scripts/run-gates/protocol-audit.mjs research-workspace/drt_api-context-caching-ds-openai; echo "exit=$?"
# → RED [no-protocol] 契约日后缺 protocol.json；exit=1
```

对照：`node scripts/run-gates/node-gate.mjs <同一 bundle>` 的门①③②/L/R/A/C 均 PASS（门②的路径红是
复制到 `/tmp` 后 present 指原路径造成的，不是本条）。范围扫描：`run.md` 创建日为 2026-11-11 的 6 场
bundle 中，5 场带 `protocol.json`（绿），仅本条没有且**已交付**。

## 根因（已证）

- `PROTOCOL_CONTRACT_DATE = '2026-11-11'`（[protocol-core](../../../scripts/lib/protocol-core.mjs)），
  契约日只有日期；
- `protocol-audit` 的 post-contract 判定 = `epoch >= PROTOCOL_CONTRACT_DATE`（字符串比较，epoch 来自
  `run.md` 的 `created:`，同样只有日期）；
- 于是「契约日当天 10:01 之前」与「之后」不可区分，**同日的早场被追溯适用新契约**。

与文档意图冲突：[D46 Note](../../../notes/implemented/2026-11-11-preference-protocol-layer.md) 写的是
「epoch = 2026-11-11，**旧 bundle 豁免**」——按时间它正是旧 bundle，按日期不是。

## 牵出的失败类

**契约纪元只到日粒度**：以日期串做 `>=` 断代的 run 门在契约落地当天都有一个「同日早场」窗口。
已核的相邻面：node-gate 的六道门优先用整数 `schema:` 断代（`isPreContract` 见 `schema` 即按现行契约，
不吃日期），所以不受影响；`verdict-audit` 与 protocol 同形（`epoch >= CLAIMS_CONTRACT_DATE`，
两者契约日都是 2026-11-11，今天没有第二个实例）。横切检查方向：`grep -rn "CONTRACT_DATE" scripts/lib/`
逐条看 epoch 来源与比较方式。

## 修复判据

1. 本条 bundle **不改 bundle 文件**即可按 legacy 判绿（`legacy-not-applicable`），依据 = 其
   `delivered.json.acceptedAt` 早于 D46 落地时刻；
2. 2026-11-11 10:01 之后创建/交付、且缺 `protocol.json` 的 bundle 仍红（不许放宽成「同日全豁免」）；
3. 未交付的同日 bundle（没有 acceptedAt 可依）保持从严（无时间证据 = 按新契约）；
4. 先红后绿：加两个合成 bundle（契约日早场 / 晚场）的契约测试，修复前分别绿/红，修复后不变；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11，取推荐第一）：`protocol-core` 增 `PROTOCOL_CONTRACT_AT` + `preContractByDelivery`；`protocol-audit-core` 导出 `requiredByProtocolContract`（交付回执优先 → epoch 日期 → 无证据从严）；CLI 读 `delivered.json.acceptedAt` 并复用该判定。证据 = `tests/run/protocol-core.test.mjs` BUG-052 用例先红后绿；真实 bundle `drt_api-context-caching-ds-openai` 由 RED 转 exit 0（不适用），其晚场回执 / 无回执副本仍 RED `no-protocol`。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始修法（留档，推荐第一）：

- **用交付回执时间**：`epoch` 判 red 前先读 `delivered.json.acceptedAt`；早于契约落地时刻 → legacy
  （回执是交付时的事实，且已有哈希绑定）；
- **把契约日换成时刻**：`PROTOCOL_CONTRACT_DATE` 改为带时区的 ISO 时刻（D46 提交时刻），epoch 取
  `run.md` 的完整 created 时间——但这要求 lead 写完整时间，且旧 bundle 的 created 仍只有日期，需兼容。

**不证**：本条不证明其他契约门的同日窗口都有问题（未逐门实测）；也不证明「日期断代」这个决定本身错了——
只证明它在同日边界与「旧 bundle 豁免」的意图不一致。
