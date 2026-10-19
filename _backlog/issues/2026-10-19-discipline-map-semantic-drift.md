---
status: 推敲中
opened: 2026-10-19
---

# 推敲：discipline-map 语义重读暴露的 9 行落点/三态失真

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：Task ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** 2026-10-19 升级 vendor pin 到 `dsh-v0.2.1-rc.2` 时，对 `docs/discipline-map.md`
做了**全表 76 行逐条语义重读**（每行读上游原文 + 读本仓落点实体，不只看台账互相引用）。
**9 行已当场修正**（见 Note §实际跑过的验证），但另有 **9 行**判定为「落点不符 / 三态可疑」
——它们不是"过时"，而是**落点描述与实体不完全对应**或**三态归类站不住**。修它们要先补门禁
或重写归类理由，不是换 pin 能顺手收口的。期望：逐条给出"补门禁 / 改归类 / 认账改措辞"的裁决并落地。

**为什么这张卡重要：** `align-ledger` 门禁只判**存在性**（源在、落点在、`na` 带理由），**判不出语义过期**。
本轮已实测到该盲区的真实代价——源 10 有 2 行判「不适用」，而等价物（`replay-scene.mjs` 的
14 条比较前守卫、`sessionFormat` 钉代）**早已在仓里**，台账却记成"没做"。这类失真会让重审
永远漏检，也违反本表自己的维护规则「`不适用` 是当时不适用，不是豁免」。

## 当前情况（2026-10-19 实测，逐行）

| 源 | # | 规则 | 判定 | 失真点 |
|---|---|---|---|---|
| 1 | 6 | Prefer maintained dependencies over hand-rolling | 落点不符 | 上游判据是「替换后**确实删掉自 owned 代码与测试**」；落点写的是"选用维护中的标准件"，不涉删除。且证据与盘上不符：落点称 zstd 走 `node:zlib`，实际 `scripts/lib/zstd-read.mjs` 调外部 `spawnSync('zstd', ...)` |
| 1 | 12 | Design each tool's UI presentation up front | 落点不符 | 所称「R1 起逐角色先定稿再挂载」在 R1 scaffold Note 中零字记载；所称 RFC `2026-09-24-debug-dashboard-plus.md` 路径已悬空（实际随 `2026-09-24-observability-gui.md` 落地） |
| 3 | 3 | Cross-reference with machine-checkable links | 三态可疑 | 上游有**两个**机检面（md-links + 禁 commit id 引用）；本仓只落 md-links，第二个零对应物。原记「带证据适配」，但语义被收窄，且所称"entry-chain 语义兜底"名不副实（entry-chain 只断言文件存在，不判指针语义） |
| 3 | 4 | Slop checklist | 三态可疑 | 上游把 slop 清单写成**可运行审计**（9 条）；本仓已机械化其中至少两条（`count-free`、`doc-now-only` 门禁），台账却仍写"定性吸收，未机械化"——与既有门禁事实相悖 |
| 9 | 10 | `.agents/skills/` 命名带产品前缀（`dsh-`） | 三态可疑 | 三态列写「已具备」，不在三态值域内；且本仓技能无前缀 |
| 9 | 11 | 一段一行（`verify-md-wrap` 门禁） | 三态可疑 | 判「不适用」，但本仓确用硬折行 ~90 列——是**同规则的不同实现**而非不适用 |
| 10 | 5 | registrations are effects 的 HMR 投影 | 落点不符 | 落点是一行正则的静态包裹门，**无 dispose 行为证据**；记「照搬」过头，应为带证据适配 |
| 10 | 8 | prove-it-red 前向化 | 落点不符 | 声称的「承重四文件抽检」在该采纳 Note 中**不存在**（只有输掉方案里的反证抽检⑤） |
| 11 | 5 | 六误区清单 | 三态可疑 | 上游措辞已由「空 invariant」改为「已退役的 invariant companion」；且「已具备（散落）」的落点引用错指源 1 不适用行，mock-only 与刷新≠接受两处指向的载体实际住 `guides/60` 而非 `tests/AGENTS` |

## 另外两笔（同源发现，一并处置）

1. **`docs/alignment-ledger.json` 的 `owns` 字段 47/108 条被硬截断在 139–140 字**（43%）。
   完整原文**仓库内不存在第二份**，故截断即永久丢失语义。截断早于本次升级（旧台账 101 条中
   46 条正好 140 字）。这使 ledger 无法承担语义复核，本轮被迫改用 `discipline-map.md` 的
   76 行纪律表作为复核对象。
2. **源 10 台头「基线 = 本仓 pin」已失准**：语料 `00-map` 自报 `639ed01539`（= v0.2.0-rc.2），
   本仓 pin 已升 `0.2.1-rc.2`，仅 `11-snapshot-external-face.md` 跟到 `687f282e8`。

**未决问题：**

1. 9 行里哪几条**值得补门禁**（源 3 #3 的"禁 commit id 引用"、源 3 #4 的 slop 审计）？补门禁工作量最大但收益最实。
2. 纯措辞类的（源 9 #10/#11、源 11 #5）直接改归类是否即可？
3. `owns` 截断：是**放宽字段长度并补回原文**，还是**改存引用锚点**（源文件 + 行号）而非自由文本？
4. 语料基线漂移：本轮是否重跑 `_digested/` 专题更新，或只登记"待更新"？

**下一步：** 用户对上述 4 问拍板后逐条执行；执行完按结果归档本卡。

## 参考

- 本轮毕业 Note（含已修的 9 行与验证矩阵）：[vendor-pin-bump-021rc2](../../notes/implemented/2026-10-19-vendor-pin-bump-021rc2.md)
- 台账正本：[docs/discipline-map.md](../../docs/discipline-map.md)（§维护规则 明确"不适用是当时不适用，不是豁免"）
- 机读投影：[docs/alignment-ledger.json](../../docs/alignment-ledger.json)（门禁 `align-ledger`，只判存在性）
- 同盲区前科：[2026-10-08-sdlc-reference-absorption](../../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md) §二轮复核（当时 10 处 `na`/落点已失真）
