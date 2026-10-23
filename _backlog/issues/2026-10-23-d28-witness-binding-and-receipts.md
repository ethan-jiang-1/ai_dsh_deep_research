---
status: 推敲中
opened: 2026-10-23
---

# 推敲：D28 落地缺口收口——见证绑定 run、回执可校验、手册与门禁自洽

> 立卡：2026-10-23 ｜ 状态：推敲中 ｜ 类型：实施缺陷收口 ｜ 结论倾向：现在做（用户 2026-10-23 15:13「当然都需要做」） ｜ 可关闭：否（收口验收通过后翻是并归档）
> 前身：[已结宪章卡](../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)（归档卡不复开；本卡是引用它的新卡）
> ｜ 规范正本：[D28 RFC](../../notes/implemented/2026-10-23-run-bundle-charter.md)

## 0. 立项来历（用户原话）

2026-10-23 14:44，用户要求全面审查刚落地的宪章卡，并给出三点验收：

> "1) 看是否完整都实现了, 有没有疏漏, 有没有副作用 2) 是否真的有证据, 有测试资产约束吗? 这里毕竟是
> 一个核心理念 3) 跑一下测试, 看看是否要补测试. 你拟订一个计划如何?"

2026-10-23 15:13，用户对全部修复项拍板：

> "当然都需要做啊, 你拟订一个计划, 然后 setup goal 后推进"

**为什么要立卡**：D28 是 run bundle 的核心理念（状态=内容、见证=事件链）。落地 commit `0b681ed`
门禁全绿，但审查发现「核心理念」有三处没被真正钉住——**见证不绑定 run**、**回执无人校验**、
**手册合同自相矛盾**。机械绿掩盖了语义缺口，这正是卡要承载的判断记录。

## 1. 审查实测（2026-10-23，命令 + 结果）

| 面 | 结果 |
|---|---|
| `pnpm verify` | 全绿（42 门） |
| `pnpm test` | 677 pass / 0 fail |
| `node scripts/smoke/gates-smoke.mjs` | 77 案例全绿 |
| `node scripts/smoke/snapshot-replay-smoke.mjs` | 4 场景 ALL PASS（A/B/C） |
| 手册 sha1 vs 四份 fixture `baselineIdentity` | `bb85195…` = 当前手册 → 重录确为新手册真模型会话 |
| 真实语料（1831 zstd 日志） | 147 条 `deliverables/presented`、20 条 `user-question-reply`、79 条 HITL2 ask；实现的事件形状与真实形状一致 |

## 2. 缺陷清单（blocker / major / minor）

### B-1 门③见证跨 run 污染（核心理念破口）

`hitl2ReplyInLogs(sessionsRoot, slug, …)` 收了 `slug` 却只用于空值判断；ask 收集与 callId 匹配
全语料进行。**实测**：一个从未跑过的新 bundle（只有 run.md + 手写 §Decisions HITL2 行 + final/v1）
用真实语料跑门③ → **PASS**，借的是 2026-10 某个已删 run 的答复：

```
drt_fresh-new-bundle => gate③ PASS | HITL2 事件链在场：callId call_00_ET_RPJs6… 选定「按现稿定稿 (Recommended)」
```

红队反例（append 一行即 PASS）只被部分堵住：现在是「一行 + 任何历史定稿答复」。违反 I1（不跨 run
作证）与宪章卡 §10 B2「callId 必须能对上」。**同类**：门② present 无时间绑定，删后重开同 slug 会继承旧 present。

### B-2 回执是死数据，哈希无人校验

`delivered.json` / `manifest.json` 全仓只有写入方（run-accept），**零消费者**。RFC §5.4 与宪章卡
§10 B2 承诺「回执哈希防 present 后当前版被改」——无实现、无测试。C-lite 的增量目前等于两个没人读的 JSON。

### B-3 run-accept 回执与 hygiene 门自相矛盾（已实证）

run-accept 把绝对语料根写进 `acceptance.md`（`sessions` 恒为绝对路径），而 `hygieneOf` 对全部 .md
扫 `/Users/` 判核心违约。实测：`scanBundle` 对带该回执的 bundle 报
`acceptance.md 含绝对路径 /Users/（D28 新 run 禁）`。**验收绿的 bundle 过 schema-scan 必红**。

### B-4 手册里 `final/` 语义自相矛盾（模型可见合同）

`research-workspace/AGENTS.md` 同时写「v1.md = 索引与关键事实回溯；只放版本记账，不放当前版全文」
与「`final/vN` = 不可变副本 / 唯一对外交付物」。每次 run 都会读到两条互斥指令；门②只能查文件
存在，查不出它是不是索引。

### B-5 静态契约声明只实现一半

| 声明（RFC §7/§11、宪章卡 §10 B1） | 现状 |
|---|---|
| 禁绝对路径 | 只查 `/Users/`；`/home/`、`/tmp/`、`C:\`、`~` 全过 |
| 禁指令文件 / 可执行脚本 / symlink | 无实现（全仓无 bundle 内容扫描器） |
| `leads/<axis>.md` 登记、未登记顶层文件 = RED | 无实现（P6 延后但 RFC 未标未实施） |
| `phase=delivery` + delivered 回执 ⇒ final/vN + review 终局齐 | 无实现（只查键语法） |

### Major

1. `run-accept` 零自动化测试（91 行新逻辑，唯一写回执/归档的原子动作；仅 /tmp 手工双跑）。
2. `delivered.json` 的 present 指针取 first（多版本 rerun 可能记 v1 而 final=v2）。
3. 门② 无「present ≥ HITL2 答复」事件链顺序校验。
4. RFC §6 写 present 指 final.md → UNATTESTED，代码给 RED；三处口径不一致。
5. 观察面「同态」无测试（`_abandoned` 只测 label 谓词，未测 `listScenes` 真列出；dashboard 与
   `ResearchStatusTab` 同态无断言）。
6. 性能实测：单次见证扫描 ≈13s / 11.8s（1831 日志、270MB），新 run 的 node-gate ≈35s，
   run-accept ≥1min；随语料线性增长。

### Minor

- P8 note 声称研究证据迁 `_archived/research/`，实际仍在 `_backlog/research/run-bundle-charter/`。
- `snapshot.json` 重录 `codeAnchor: unknown-historical`（P7 有理由，可记 HEAD+dirty 备注）。
- `manifest` 不含 `acceptance.md`（P5 已如实记录）。
- provenance `local-file.path` 允许 `../` 逃逸。
- 回执三件非原子写（无 temp+rename）。
- run-accept 对旧 bundle 无 guard（会给无 run.md 的旧 bundle 补新契约回执）。

## 3. 根因

1. **见证的归属维度缺失**：测试只钉「事件形状解析对」，没钉「这条见证属于这个 run」。铁律句
   「跨 run 语料不得为本 run 作证」只在 evidence-audit 里实现，门②/③ 没继承。
2. **写入方有、读取方无**：C-lite 回执按「交付物」设计，却没有同时定义消费者与校验点；无消费者
   的产物不受任何面约束（与宪章 §7「观察只读」同源的失衡）。
3. **生成物与自己写的门互斥**：回执是 ops 生成物，却被 hygiene 当研究内容扫；两类文件没有分域。
4. **手册批漏行**：P7 改目录树时只加了新行，没改同段的旧语义行；快照只钉字节/文本 diff，不钉语义一致。
5. **「未实施」与「已承诺」混写**：P6 延后的条目仍以现在时写在 RFC 的当前合同里。

## 4. 计划（红先绿后；每期独立验收）

### P0 止血（代码 + 反证测试，同 diff）

1. **见证绑定 run**：门③/门②只认**绑定本 bundle 的 lead 会话**（日志内有 `drt_<slug>/` 的
   读/写工具调用，复用 bundle-bind 语义）+ 事件日期 ≥ `run.md` 的 contract epoch；present 早于
   HITL2 答复 → RED。保留旧场 epoch 兼容路径。
2. **回执可校验**：门②/交付门复算 `delivered.json` 的 `final.sha256` / `audit.sha256`；不匹配 →
   RED；回执缺席 → 保持现状（不因缺回执拦旧场）。
3. **回执与 hygiene 分域**：回执记可复算语料根（`$DSH_HOME/…` 归一化，不再写裸绝对路径）；
   `hygieneOf` 不扫 ops 生成物（audit/node-gate/acceptance/manifest/delivered）；绝对路径识别扩到
   `/home/`、`/tmp/`、`/private/`、`/Volumes/`、盘符、`~/`。
4. **静态契约补齐**：bundle 内指令文件（AGENTS/CLAUDE 及 local 变体）、symlink、可执行脚本 → RED；
   顶层白名单 + `leads/` 分片登记；`phase=delivery|accepted` ⇒ final/vN + review 终局块。
5. **present 取 latest**；`run-accept` 旧 bundle guard（无 run.md 只写 acceptance，不补新契约回执）。
6. **抽 `scripts/lib/run-receipt.mjs`**（delivered/manifest/acceptance 纯生成 + present 选择 +
   语料根归一化），CLI 壳只做 IO；单测覆盖红/绿/归档/半回执。

### P1 合同自洽（一次手册批 + 一次快照重录）

7. `final/` 语义统一（手册 + pack 种子 + NODES + guides/61）：`final/vN` = 交付时忠实副本；索引/
   回溯表放 vN 首节或 findings 指针。
8. RFC §6/§11 口径统一（present→final.md 的红/UNATTESTED 二选一并写死）；P6 延后条目在 RFC 标
   「未实施，触发条件 = P6」。
9. 手册批一次落 → `dev/sync-pack-workspace.mjs` → 四角色 `record-role-fixture` 真模型重录 →
   `snapshot-replay-smoke`/`preset-smoke`。**所有手册改动必须一次落完，只付一次重录。**

### P2 测试资产 + 观察面同态

10. 见证夹具换真实形状录制切片（`answers[].selected` + `agent/inbox/spliced` + lead 头），保留
    手写极简夹具作补充。
11. 新增 `tests/contracts/run-bundle-charter.test.mjs`（keyless）：手册含 D28 四节、模板键 ==
    `contractEpochOf`/phase 闭集、`final/` 语义无互斥句。
12. 观察面：`listScenes` 列 `_abandoned`、dashboard/`runStateOf` 同态断言；`evidence-audit` 新 run
    `file://` 无 provenance → MAJOR。
13. 见证单遍扫描（一次 walk 同时产 presented/replies），node-gate 回到 2 次全扫、run-accept ≤4 次。

### P3 收尾

14. `pnpm verify && pnpm test && gates-smoke && snapshot-replay` 全绿；`docs/evaluation.md` /
    `scripts/README.md` / D28 RFC「实际跑过的验证」同 diff 更新。
15. 本卡证据记录 → 归档；未跑项（L2、正式 lead 盲测）如实分列。

## 5. 验收标准

1. **B-1**：跨 run 夹具门③ **不 PASS**（RED/UNATTESTED）；真实语料下新 slug 不得借旧答复 PASS；
   同 diff 测试先红后绿。
2. **B-2**：验收后篡改 `final/vN` 一字节 → 门② **RED**；`delivered.json` 哈希与盘上不符必红。
3. **B-3**：run-accept 绿产物过 `scanBundle` **零核心违约**（含回执文件）。
4. **B-4**：手册/NODES/种子三处 `final/vN` 语义一致；keyless 契约测试咬住互斥句。
5. **B-5**：四类静态契约各有红案例（指令文件 / symlink / 脚本 / 顶层未登记 / 绝对路径族）；
   `phase=delivery` 缺 final/vN 必红。
6. **run-accept**：纯函数单测覆盖红/绿/归档/半回执；CLI 与 lib 同源。
7. **非回归**：`pnpm verify`、`pnpm test`、`gates-smoke`、`snapshot-replay` 全绿；旧 bundle 零改写。
8. **文档**：RFC/台账/脚本 README 与实现同 diff；未实施项显式标注，不用现在时伪装。

## 6. 边界与不承诺

- 旧 bundle 不追溯改写；新门禁只对新 run（有 `run.md`）严格，旧场走 epoch 兼容路径。
- 见证绑定用「会话写过本 bundle」的既有语义，不新增签名/哈希链（本地单用户信任模型）。
- 不承诺回执进入观察面状态派生（本卡只把它接入门禁校验；观察面仍从文件+事件派生）。
- 手册批的代价 = 一次真模型重录；未重录不得声称 B 层绿。

## 7. 证据落点

- 本卡 §1/§2 = 审查实测；逐期结果回写本卡 §8（实施记录）与
  [`_backlog/research/d28-witness-binding/`](../research/d28-witness-binding/)（命令 + 结果 + 红证）。
- 规范正文更新 = [D28 RFC](../../notes/implemented/2026-10-23-run-bundle-charter.md)。
