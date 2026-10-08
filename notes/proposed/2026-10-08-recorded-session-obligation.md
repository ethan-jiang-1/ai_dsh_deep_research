# RFC：recorded-session 义务接进机械面（先标定假阳率，后立门禁）

> 状态：proposed

出处 = 推敲卡 [2026-10-08-sdlc-reference-absorption](../../_backlog/_done/_closed_plans/2026-10-08-sdlc-reference-absorption.md)
（§候选与取舍 第二档 C11 + §毕业门"缺什么证据才能判"）。判断材料全文住卡。

## Problem

参考卷 `12 §2` 的义务：**非平凡 model-visible 变化 → 强制同 PR 更新录制夹具**。本仓的
等价物是 `snapshot-replay-smoke` 的夹具（`tests/fixtures/snapshot-research-face/`，
vendor `dsh-llm-replay` 驱动，keyless）。**这条义务当前完全没有机械面**。

它被推敲卡判为"治症状③ 最彻底的一条"，但同时标了"**中高——易假阳**"。原因很实在：
"非平凡"是个**语义判断**，把它做成按 diff 路径判的门禁，会得到一类典型假阳——
改了 model-visible 面的**无关紧要处**（改个注释、调个措辞）也被要求更新夹具。

**所以本 RFC 不直接立门禁**，第一段是**标定**：没有分布就定不出"非平凡"的判据形状。
这与 `guides/60 §0` 的既有教训一致——"数值未标定的门禁是假牙齿"（
[item-lifecycle-tdd](../../notes/implemented/2026-10-05-item-lifecycle-tdd.md)）。

## 方案

**第一段（本 RFC 的实施范围）：假阳率标定**

统计**最近 10 次变更**里，有多少次真的改了 model-visible 面，并按"是否该更新夹具"人工
标注：

| 要标定的量 | 方法 |
|---|---|
| 近 10 次变更中**命中 model-visible 面**的次数 | 取 `git log --oneline -10` 的每个 commit，对 diff 路径做面判定 |
| 命中的那些里，**真的需要更新夹具**的次数（真阳性） | 人工判据：夹具是"四角色组装面录制语料（persona 全文 + 工具 schema 回放金标准）"——只有改动**角色 persona 或工具 schema 组装**才需要 |
| 命中但**不需要**的次数（假阳） | 同上，反向判定 |
| 漏判风险：改动**没命中**路径模式但实际该更新夹具的次数 | 反向检查（防路径模式写太窄） |

"model-visible 面"的判据须显式写进报告，不少于：preset 的 persona / skills / 工具行、
`src/lib/` 折算纯函数中进入 model 上下文的部分、`cordis.patch.yml` 声明行。

产出 = 标定报告进 [`_backlog/reference/`](../../_backlog/reference/README.md)，含：
① 10 次变更逐次一行（commit / 是否命中 / 是否该更新夹具 / 理由）；② 真阳 : 假阳 比；
③ **若立门禁，判据形状的建议**（路径模式怎么写才能把假阳压到可接受）；④ 明确结论——
**够不够格立门禁**。

**第二段（不在本 RFC 范围）**：若标定显示真阳占比足够高（判据阈值由标定数据定，不预先
拍数），另立门禁卡走完整流程（`writing-a-gate`：先想红再写绿 + 反证 + `evaluation.md` 登记）。

## 输掉的方案

- **直接立门禁**：推敲卡已标"易假阳"，而 `guides/60 §0` 明写"数值未标定前是假牙齿"。
  直接按路径判会得到"改措辞也要求更新夹具"的噪音门禁，最终被 grandfather 注释淹没。
- **按"改了 `packages/deep-research-pack/**` 就要更新"这种粗模式直接上**：范围太宽——
  本仓绝大多数 pack 改动是配置行与文档，夹具只对**角色组装面**敏感。粗模式必然假阳。
- **不做、只留文档义务**：那样它就是第二处纯文档义务（第一处是推敲卡 A7 的归档日期行
  ——实测 `grep -n "归档：" verify.mjs` = 0 命中）。**纯文档义务在本仓已有实证会静默失效**，
  不该再添一条。
- **用 `repo-conventions` 顺带做**：该门禁职责是"与 vendor 本体的机械约定对比"
  （`.editorconfig` / `.gitattributes` / `engines.node` 等），语义不同。塞进去会污染它的
  owner 边界——本轮 C17/C18 修的正是"expand 一条门禁去管它不拥有的事实"这类漂移。
- **顺带把 C12（evidence-audit misquote 升格）一起做**：C12 也有前置（假阳率标定），
  性质不同（run bundle 审计），须独立标定。**不夹带。**

## 验收判据

| # | 判据 | 检查方式 |
|---|---|---|
| 1 | 近 10 次变更**逐次**有判定（是否命中 / 是否该更新夹具 / 理由），无遗漏 | **对账命令**：报告行数 = `git log --oneline -10 \| wc -l` |
| 2 | "model-visible 面"的判据**显式写出**并列出具体路径/文件族 | 人工判据：报告须有判据节；抽查 3 次判定能对回该判据 |
| 3 | 给出**真阳 : 假阳**比与"够不够格立门禁"的明确结论 | 人工判据：结论须明确（够 / 不够 / 需换判据形状），不得含糊 |
| 4 | 含**漏判风险**的反向检查（路径模式写太窄的情形） | 人工判据：抽查是否有"未命中该模式但实际该更新夹具"的实例 |
| 5 | **不新增门禁、不改 `verify.mjs`** | **机械门禁**：`git diff --stat scripts/verify/` 为空；`pnpm verify` 全绿 |
| 6 | 标定**不产生**门禁决定（结论只到"建议判据形状"） | 人工判据：报告不写"已立门禁"；立门禁是第二段独立卡 |

判据 5/6 是范围纪律：本 RFC 最可能的失败是"标定着就把门禁写了"——那就跳过了标定的意义。

## 影响面

- 新增：`_backlog/reference/2026-10-08-model-visible-calibration.md`（标定报告）
- **不改**：`scripts/verify/verify.mjs`、`docs/evaluation.md`、`tests/`、pack 面
- 后续依赖（**不在本 RFC**）：① 若够格，门禁卡（含反证 + 台账登记）；② C12 独立标定卡
- 证据档：L0（`pnpm verify` + `pnpm test`——本 RFC 原则上零代码改动）
