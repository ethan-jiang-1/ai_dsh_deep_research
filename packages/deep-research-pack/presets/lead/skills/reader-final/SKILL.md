---
name: reader-final
description: 把 canonical final.md 派生成 1–3 页读者版（六节结构、必须保留/省略、5 分钟自检、交付复制与 present 顺序）；在 critic 终局 PASS 后、HITL2 前由 Lead 加载，不新增事实/来源，不改 canonical
---

# reader-final — 读者版终稿

**何时加载**：critic 的 `review.md` 终局块 `readiness: PASS` 后、HITL2 之前。PASS 前不写——
canonical 还会改。quick_factual 可跳过；非 quick_factual 的新 run 交付必须有交付件。

**两个产物（canonical 不动）**：

- 工作件 `final/readable.md`——HITL2 前写，用户先在「终稿」页签读它；
- 交付件 `final/readable-vN.md`——用户定稿后，与 `final/vN.md` 同版复制。

## 输入（只读这些）

`final.md`（当前 canonical）· `question.md` 的 Purpose 与 HITL1 业务决策简报（受众与决策）·
`findings.md`（结论与 gap）· `review.md` 终局块（PASS/残余风险）。

不新增搜索、不新增证据文件、不改 `final.md` 的结论与来源。

## 写作

1. **开六节**（顺序即阅读顺序）：`## 结论` / `## 为什么` / `## 这对你意味着什么` /
   `## 什么会改变这个结论` / `## 目前不能判断` / `## 依据与延伸`。
2. **取材**：canonical 的决策摘要（§0）、判定表（§10.1）、趋势（§10.2）、无法判定（§10.4）、
   一句话给决策者（§10.6）。不要按 §1–§9 的 topic 结构重排——那是论证面，不是读者面。
3. **结论**：一句话答案 + 3–5 条分维度判断；成立条件写在括号里。不要把「结构性差异」写成
   「落后」，不要把「未取得」写成「没有」。
4. **为什么**：2–4 条最强依据，用平话解释指标；术语首次出现给一句人话解释
   （AA / ECI / TB / LHTB / as-of / 单源 等）。不逐句挂来源。
5. **意味着什么**：3–5 条可执行含义，写清适用场景与反例；不编造负责人、期限、行动。
6. **什么会改变结论**：阈值/信号，保留 canonical 的原始数字与口径。
7. **不能判断**：未取得/无法判定/单源，按重要性列 3–6 条，保留原始限定语。
8. **依据与延伸**：只链 canonical（`vN.md`、`../final.md`、`../findings.md`、`../review.md`）；
   不列 30 行表/160 卡清单/版本账。**链接从 reader 所在 `final/` 解析**：canonical 副本用同目录
   `vN.md`，工作稿/账本/审查用 `../final.md` / `../findings.md` / `../review.md`；不要写
   `final/v1.md` 或裸 `final.md`（会解析到 `final/final/…`，门C 判红）。
9. **数字**：逐字取 canonical，不四舍五入出新值，不新增实体或因果句。
10. **篇幅**：目标 1,200–2,400 字（中文），硬顶 4,500 字 / 180 行。超过就不是「1–3 页读者版」。
11. **首段**固定写：`> 读者版 · 对应 canonical: final/vN.md · 以 canonical 为准。`
12. **禁止** `[来源:`、`evidence/` 路径、`drt_` 路径；依据只用 canonical 链接。

## 自检（HITL2 前逐条打勾）

- [ ] 一个没读过本 run 的人，只读这 1–3 页，能在 5 分钟内答出：结论是什么 / 为什么 /
      什么会改变结论？
- [ ] 每个数字都能在 canonical 找到同一写法；没有 canonical 没有的实体/来源/因果。
- [ ] 反证与「目前不能判断」没有被删掉或弱化；单源/等级/时间口径保留。
- [ ] 无 `[来源:`、无 `evidence/`、无 `drt_`；canonical 链接可解析。
- [ ] 六节齐、长度在限内、首段 canonical 指针对应当前版本。
- [ ] 没有把「未取得」写成「没有」；没有把「结构性差异」写成「落后」。

## 交付

1. 用户定稿后：先把 `final.md` 忠实复制为 `final/vN.md`（既有步骤），再把
   `final/readable.md` 复制为 `final/readable-vN.md`（同 N）。
2. `present` 两份，**读者版第一、审计源第二**：
   `[{ path: "final/readable-vN.md", description: "读者版（先读）" },
   { path: "final/vN.md", description: "审计源（canonical）" }]`。
3. `final.md` 是工作稿，不是交付件；只 present 一份 = 交付不完整。
4. 最后 `update_goal action=complete`（既有）。

## 失败处理

- canonical 缺明确结论 → 读者版写「目前不能判断」及原因，不硬给建议。
- reader 与 canonical 不一致 → 以 canonical 为准，重派生；不改 canonical 迁就读法。
- 用户选「补研究」/「改说法」→ `readable.md` 是工作件，不复制为 vN；下一版 PASS 后重写。
- 门C 红（缺 reader/版本错/缺节/超长/`[来源:]`/`evidence/`）→ 按 `node-gate` detail 修，再跑。
- 旧场（无 `run.md`）或 quick_factual → 不补 reader；终稿页签回退 canonical。
