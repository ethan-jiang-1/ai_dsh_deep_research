---
topic: D28 见证绑定与回执校验（P0 收口）
intent: 记录门③跨 run 污染的复现、见证绑定/契约纪元/事件链顺序的修复、回执生成与哈希校验的落地，以及红先测试清单
---

# D28 落地缺口 · P0 见证绑定与回执校验

> 消费者：[D28 缺口收口卡](../../settled_issues/2026-10-23-d28-witness-binding-and-receipts.md)
> ｜ 2026-10-23 ｜ 前身 = [已结宪章卡](../../settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)（归档不复开）

## 1. 复现（修复前）

真实语料 = 开发 home 的 1831 条会话日志（270MB，`runtime/harness-home/sessions`）。构造一个**从未跑过**
的新 bundle（只有 `run.md` + 手写 §Decisions HITL2 行 + `final/v1.md` + review PASS），跑门③：

```
drt_fresh-new-bundle => gate③ PASS | HITL2 事件链在场：callId call_00_ET_RPJs6… 选定「按现稿定稿 (Recommended)」
```

借的是 2026-10 某个已删 run 的答复——`hitl2ReplyInLogs` 收了 slug 却只用于空值判断，ask 收集与
callId 匹配全语料进行。隔离夹具（另一 run 的 lead 日志）同样 PASS。**红队反例只被部分堵住**。

同轮复现的另外三条：

- `delivered.json` / `manifest.json` 全仓只有写入方（run-accept），零消费者；RFC/卡承诺的「回执哈希
  防 present 后当前版被改」无实现。
- run-accept 把绝对语料根写进 `acceptance.md`，`hygieneOf` 对全部 .md 扫 `/Users/` → 验收绿的 bundle
  过 schema-scan 必红（`acceptance.md 含绝对路径 /Users/`）。
- 手册 `final/` 行写「v1.md = 索引…只放版本记账，不放当前版全文」，与同文件 `final/vN`「不可变副本 /
  唯一对外交付物」互斥；门④ 又依赖 v1 当活索引（v2 必须登记进 v1）。

## 2. 红先证据（先看红）

修复前新增测试的失败面（`node --import tsx/esm --test`，三个文件）：

```
ℹ tests 32  ℹ pass 19  ℹ fail 13
✖ presentedInLogs：会话未绑定本 bundle → 不算见证
✖ presentedInLogs：别的 run 的会话写了 drt_other/ → 它的 present 不算本 run
✖ presentGate：present 早于 HITL2 答复 → RED
✖ presentGate：present 早于契约纪元（旧 epoch 同名 run）→ RED
✖ hitl2ReplyInLogs：别的 run 的 HITL2 答复不算本 run（跨 run 污染）
✖ hitl2RowGate：…别的 run 答复不算
✖ tests/run/run-receipt.test.mjs（模块不存在 → import 红）
✖ D28 卫生：绝对路径族 / 指令文件 / 脚本 / symlink / 未登记顶层 / leads 分片 / ops 回执 / phase=delivery
```

run-receipt 实现后其 7 例转绿；schema-scan 扩到 18 例全绿；witness 13 例、node-gate 72 例（含新增
门④ D28 例）全绿。

## 3. 修复

| 面 | 改动 | 文件 |
|---|---|---|
| 见证归属 | 单遍 `scanWitnessLogs`：只认**写过 `drt_<slug>/` 的 lead 顶层会话**（bundle-bind 写强信号）；跨 run / 子 agent 会话不作证 | `scripts/lib/node-gate-session-gates.mjs` |
| 契约纪元 | 事件日期早于 `run.md` 的 `contract` 不计（同名 slug 重开不继承旧见证） | 同上 + `contractEpochOf` |
| 事件链顺序 | present 时间早于绑定的 HITL2 答复 → RED（ask → answer → present） | `presentGate` |
| 性能 | `gateBundle` 一次扫描供门②/③ 共用（1831 日志单遍实测 ≈13s） | `scripts/lib/node-gate-core.mjs` |
| 回执生成/选择 | `run-receipt.mjs`：present 取**最新版本化**事件；语料根写 `$DSH_HOME/…` 标签；manifest 不自我引用 | `scripts/lib/run-receipt.mjs`（新） |
| 回执校验 | 门A 复算 `delivered.json` 的 final/audit sha256，不符 → RED | `scripts/lib/node-gate-delivery-gate.mjs` |
| run-accept | 用 lib 生成三件回执；旧 bundle（无 run.md）只写 acceptance，不补新契约文件 | `scripts/run-ops/run-accept.mjs` |
| 卫生族 | 指令文件/脚本/symlink/绝对路径族（`/home`、`/tmp`、盘符、`~/`…）/顶层白名单/leads 分片登记/`phase=delivery|accepted` 一致性；ops 生成物不扫内容 | `scripts/lib/schema-scan-core.mjs` |
| 门④ × D28 | 新 run 的 vN 是不可变交付副本，跨版本登记住 §Decisions——不再要求在 v1 里登记 vN | `scripts/lib/node-gate-run-gates.mjs` |
| 手册/NODES/guides/skill | `final/vN` 统一为「交付时忠实副本」；见证绑定句进手册（模型可见合同） | `research-workspace/AGENTS.md`、`NODES.md`、`docs/guides/61`、`presets/lead/skills/synthesis` |

## 4. 修复后复跑（真实语料）

```
drt_fresh-new-bundle => gate③ RED | …无**绑定本 bundle 的 lead 会话**里 callId 绑定的答复…
drt_nvidia-dc-gpu-share（合成 contract=2026-10-23）=> gate③ RED（其真实答复不存在/早于该纪元）
```

真实 run 的绑定面核验：nvidia 会话含 `write` 1 次 + `edit` 32 次命中 `drt_nvidia-.../`；语料中
16 个含「定稿」答复的 lead 会话**每一个都有 write 命中自己的 bundle**——写强绑定不会误伤真实 run。

## 5. 本次测试资产（新增/扩充）

- `tests/run/node-gate-witness.test.mjs`：13 例（绑定/跨 run/非 lead/前缀 slug/epoch/顺序/旧场兼容）。
- `tests/run/run-receipt.test.mjs`：7 例（最新 present、语料根标签、回执哈希、manifest 自引、旧 bundle
  守卫、门A 消费）。
- `tests/run/schema-scan.test.mjs`：18 例（+7 卫生族：路径族/指令文件/脚本/symlink/顶层/分片/ops 回执/
  delivery 相位）。
- `tests/contracts/run-bundle-charter.test.mjs`：7 例（手册四节、互斥句、读序 = `READ_ORDER`、模板键 =
  解析器、种子逐字一致、RFC 现在时）。
- `tests/run/node-gate.test.mjs`：+1（门④ D28 忠实副本）。
- `tests/run/run-state.test.mjs` / `run-dashboard.test.mjs` / `evidence-audit.test.mjs`：各 +1（三桶
  落定/停放场进总表/file:// 新 run 缺 provenance 分级）。

## 6. 边界与未跑

- 见证绑定停在「会话写过 bundle」这一既有语义（本地单用户信任模型），不引入签名/哈希链。
- `manifest.json` 仍不自我引用、不含后写的 acceptance（P5 已记录）。
- 正式 lead 盲测与 L2 安装验收未跑（非发布轮）。

## 7. 快照重录（P7 二批，同一合同批）

手册改了两处模型可见文本（`final/vN` 语义、见证绑定句）→ 四角色真模型重录：

```
node --import tsx/esm dev/record-role-fixture.mjs --role lead|scout|analyst|critic --port 3105
```

- 录制身份：`codeAnchor = 72f392a`（录制时 HEAD，工作树干净）、
  `vendor = 687f282e8625c6b8d11ff58211a90524be2e4317`、`recordedAt` = 各 fixture mtime。
- 注入手册 digest = `32108b85` = 当前 `AGENTS.md` sha1（四份一致）。
- `snapshot-replay-smoke`：A/B 全绿；lead C5 金标准按新措辞重写（仅活动行一句：
  「用 web_search 搜索了…」→「搜了 1 次…」），结构未变——人审接受。
- `preset-smoke`：预检绿（真挂载档需 `DSH_SMOKE_REAL=1`，本轮未跑全挂载）。
