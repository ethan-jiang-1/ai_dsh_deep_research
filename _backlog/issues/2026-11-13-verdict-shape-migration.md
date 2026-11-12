---
status: 待落地
opened: 2026-11-13
---

# 推敲：判据形状迁移——把「猜判定」的判据面换成结构化权威

> 立卡：2026-11-13 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：把仍靠关键词表/装饰启发式判定的面（readiness、HITL2、人工走查、版本/present）逐面迁到
> 「结构化权威 + 歧义即红」；先 readiness 与 HITL2 两族，再按清单推进。原则 = [D51](../../docs/decisions.md#d51)，
> 理由与输掉的方案 = [Note](../../notes/implemented/2026-11-13-verdict-shape.md)。
>
> 去向：implemented — `notes/implemented/2026-11-13-verdict-shape.md`

**问题与期望结果：** 最近两天的修复批次关掉了大量「散文判定」缺陷的实例，但两族判据仍是词表路线：
readiness 保留「语境关键词」路由，HITL2 的 pending/decision 两张词表刚被再扩一轮。期望结果是：
判据不再靠猜——读不出或有互斥读法就红，且红的时候告诉写入者怎么改；结构化事实（会话事件、
canonical JSON、文件事实）是唯一权威，散文只做交叉核对。做完后，新的自然措辞变体不再自动变成新 bug 卡。

**当前情况：**

- `4d6308c9` 关闭了 BUG-149..159 的实例（其中 149/150/156 是同一族的第三、四次修复）。类没关：
  [review-readiness](../../packages/deep-research-pack/src/lib/review-readiness.ts) 的 `currentPrefix` 仍是三条采纳路径之一；
  [门③](../../scripts/lib/node-gate-session-gates.mjs) 仍有 pending / decision 两张词表，代理行另挂第三套更窄的 pending 正则。
- 现状三组实测（本卡立卡证据）：
  - `本轮 readiness: PASS` 单独一行 → **PASS**（散文前缀被当装饰，应由「非判定行」判为无法判定）；
  - `本轮 readiness: PASS；本轮 readiness: FAIL` → `null`（互斥已 fail-closed，这部分不用重做）；
  - 代理行 `HITL2 交付审阅 代理模拟：待用户点头` → `isHitl2Row` = **true**（未列 pending 词 → 当拍板，fail-open）；
  - 用户真拍板 `HITL2：行，就这么办` / `HITL2：LGTM` / `HITL2 交付审阅：用户说可以` → **false**（误杀）。
- 已有但没被判据使用的结构化权威：`hitl2ReplyInLogs` / `presentedInLogs`（绑定会话事件）、
  `claims.json`、`protocol.json`。HITL2 的拍板事实本来就在日志里，门却先读散文行。
- 版本配对只在行内带 `vN` 时生效；无版本的行直接放行。
- 基线：`verify` 全绿、`pnpm test` 1364 通过 / 0 失败（2026-11-13，`4d6308c9`）。

**未决问题：** 三项已由用户 2026-11-13 拍板（形状 = 先 fail-closed 再声明化；兼容 = 不做，冲突历史数据按清单删除；
基线 = `4d6308c9`），不再重议。仍需在 Slice B 决定的是**声明件形态**：`review.json` 独立件，还是 critic 的结构化
输出事件作为权威。判据 = 单一权威写入者 + 散文交叉核对；两种形态都能满足，选实现成本低的那个。

**下一步：** Slice A 先红——把上列三组探针写进常驻变异矩阵并跑到红，再改实现到绿。

## 方案与取舍

| 方案 | 做法 | 判定 |
|---|---|---|
| A 只 fail-closed | 保留词表但歧义即红 | 不选：去不掉摩擦，Lead 会持续被误杀拦住，判据仍在读散文 |
| B 先 fail-closed，再逐面声明化 | Slice A 拆关键词路由 + 门③ 改读事件；Slice B 加声明件 | **选**：类先关，摩擦随后消；每片可独立验收 |
| C 全量结构化重写 | 手册/skill/模板/快照一次改完 | 不选：flag day + 快照全量重录，风险与收益不匹配 |

**输掉的细节**：给历史 bundle 加 epoch 豁免（用户裁定不做兼容）；造 grep 门禁禁止关键词表
（可判的是行为不是措辞，见 D51 依据）。

## 分片与影响面

- **Slice A（keyless）**：`review-readiness.ts` 删 `currentPrefix` 路由（只认行首装饰或分隔符后的裸写；
  互斥 → `null`）；`node-gate-session-gates.mjs` 的门③ 改为「事件 + 版本配对」为决策、散文行降为交叉核对
  （不一致 → 红），删代理行的第三套正则与旧场豁免分支；同步 `tests/run/review-readiness.test.mjs`、
  `tests/run/node-gate-*.test.mjs`。
- **Slice B（真模型预算）**：readiness 声明件 + 手册/skill/模板同步（判定行独立成行、声明件形态）；
  `snapshots/replay` 的 B 层重录。
- **Slice C（keyless）**：`tests/contracts/verdict-conformance.test.mjs` + 变异矩阵夹具（包裹/分隔/互斥/缺席四族），
  把 Slice A 的行为钉成不变量；其余面（人工走查节、method heading、version/present）按同模式排队。

## 验收标准

| # | 行为 | 类 | 现红 → 后绿的判据 | 证据 owner |
|---|---|---|---|---|
| 1 | readiness 互斥候选 → 无法判定，门侧红 | 确定性逻辑 | `本轮 readiness: PASS；本轮 readiness: FAIL` → `null`；门A 判红并给改法 | `tests/run/review-readiness.test.mjs` |
| 2 | 散文前缀不再算装饰 | 确定性逻辑 | `本轮 readiness: PASS` 单行 → `null`；`##` / `-` / 加粗等行首装饰仍可读 | 同上 |
| 3 | 门③ 决策 = 绑定会话事件 + 最新版本配对 | 编排 | 合成 bundle：pending-only 行 + 旧答复 → 红；无版本行不能为新版本作证 | `tests/run/node-gate-*.test.mjs` |
| 4 | 代理行与用户行同一条判据 | 确定性逻辑 | 代理 + 未列 pending 措辞不再算拍板；合法拍板同义词不再误杀 | 同上 |
| 5 | 旧场豁免删除；冲突历史 bundle 按清单删除 | 编排 | 旧 bundle 重跑验收按新判据；删除清单落盘可复读 | `run-accept` + 清单 |
| 6 | 变异矩阵成为常驻不变量测试 | 确定性逻辑 | 包裹/分隔/互斥/缺席四族全绿；每条新守卫带负例留证 | `tests/contracts/verdict-conformance.test.mjs` |
| 7 | 声明件成为唯一权威，散文交叉核对 | 模型行为 + 确定性逻辑 | 真模型单场：错声明 → 红；对声明 + 散文不一致 → 红；B 层快照重录后绿 | `snapshots/replay` + `probes/behavior/` |

**排除项**：不改 claims/verdict 的 JSON 对账（`4d6308c9` 已落）；不改 protocol 快照内容校验（同批已落）；
不新增 verify 门禁（机械把守 = L0 行为测试）。

## 关闭条件

- 验收 1–6 绿，Slice B（7）完成或用户明确延后并登记 [triggers](../triggers.md)。
- 历史冲突 bundle 的删除清单已执行或为空，记录在卡。
- [Note](../../notes/implemented/2026-11-13-verdict-shape.md) 的验证节追加迁移证据；审查记录落卡尾。
- `pnpm verify` + `pnpm test` 绿。
