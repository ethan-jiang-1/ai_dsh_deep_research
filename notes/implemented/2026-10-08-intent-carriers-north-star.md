# 意图载体总图页（`09-intake` 等价物）：载体衔接的单一入口

> 状态：implemented

出处 = 推敲卡 [2026-10-08-sdlc-reference-absorption](../../_backlog/_archived/settled_issues/2026-10-08-sdlc-reference-absorption.md)
（§候选与取舍 第一档 C2 + §逐面 gap 表 B 面）。判断材料全文住卡。

## 决定

新建 [docs/design/60-intent-carriers.md](../../docs/design/60-intent-carriers.md)，
并在 [00-index 文档地图](../../docs/00-index.md) 建行——本仓的意图载体总图。
它在 [design/](../../docs/design/) 现有 10–50 编号段后取 **60**（落笔时核对过占用为空格）。

页面拥有的事实 = 每类载体的 owner / 载什么 / 进门条件 / 出场方式 + 载体间衔接。
四节：① 载体清单表（**10 类**）② 衔接路径图 + 三条硬规矩 ③ 与参考卷差异表
④ 未决点（是否需要状态机）⑤ 分流接口指针。

### 治的是什么

推敲卡实测坐实的症状②：**链接靠人肉字符串，北星文档缺席**。

在新建之前，载体的 owner / 进门 / 出场**散在四处各说一半**——根 `AGENTS.md` §布局、
`_backlog/README` §主干、`notes/README` 时态表、`guides/60 §0` 队列生命周期，
**没有任何单页给出总图**。这与本轮另两个结论同病：
`discipline-map` 的 `na` 行会静默腐烂、`design/30` 内容面可被清空而 verify 仍全绿。
共同形态 = **没有唯一 owner 的事实会漂**。

### 与参考卷的差异（如实声明，不假装同构）

| 维度 | 参考卷 `09` | 本仓 |
|---|---|---|
| Issue 模板 / `.github/` | Issue 表单 + 模板 | 不存在（无 `.github/`，有意简化） |
| 状态机 | 六态事件驱动 | **无状态机**；阶段 = frontmatter status + 目录粗段（D24 后细化） |
| "当前"指针 | Project 看板 | 无队列指针——`queue.md` 2026-10-09 随队列机制整体退役（[吸收 Note](2026-10-09-backlog-methodology-absorption.md)，D11/D20） |
| 载体清单 | 单一 intake 页 | 10 类（含本仓特有的推敲场三件 plans/bugs/reference） |
| 需求来源 | Issue | 用户直派 + 推敲卡已结双入口 |

## 输掉的方案

- **把总图写进根 `AGENTS.md`**：根文件是"每轮常驻指令"，受 `doc-budgets` 硬上限（140 行）；
  总图是**按需查阅**的地图，不是每轮在场判据。写进去必然重走"下放 > 压缩 > 升顶"处置序，
  而正解就是下放到 `docs/design/`。
- **新建 `docs/design/70-*`**：60 是空位且语义合适（意图入口层在架构层之后、指南层之前）；
  落笔时核对过实际编号占用，未撞号。
- **同时修 `proposal-scheduled` 的子串测试洞**：那是**改门禁**（性质不同、需反证、需登记
  `evaluation.md`），治的是"机械面判归宿"，与本条"人读的北星页"是两件事。**不夹带**
  ——已实测该洞为真（`verify.mjs:365-367` 的 `queue.includes(stem)` 是子串测试，
  孤儿 RFC 的 slug 只在散文里出现即通过），回缓冲立卡处理。
- **照抄参考卷的六态状态机**：单人仓 + 文件约定，无事件源；引入六态会得到一套无人更新、
  无门禁可咬的标签。参考卷 `00-index.md:5` 自己写明独立插件仓不继承主仓制度。
- **把 `docs/00-index.md` 的 D 号台账当总图**：D 号记的是**已作出的决定**（历史），
  载体总图记的是**意图从哪进、从哪出**（当前结构）——两者是不同事实。

## 实际跑过的验证

- **判据 1（列出全部实际载体，逐个有 owner / 进门 / 出场）**：**人工判据**——与
  `_backlog/README §目录`、`notes/README` 时态表、`ls -d _backlog/*/` 与 `ls -d notes/*/`
  逐一对照；实测目录 = `_backlog/{_done,bugs,plans,reference,_postponed_plans}` +
  `notes/{archived,implemented,postmortem,proposed,rejected}`，**10 类载体全部在场**，
  含 `_done/` 五池（`_closed_plans`/`_suspended_plans`/`_fixed_bugs`/`_suspended_bugs`/`_reference`）。
- **判据 2（差异显式声明）**：§三 五维差异表在场，含"无状态机"这一最关键差异。
- **判据 3（不复制规则正文）**：抽查每条规则句的**正本仍在原文件**——
  三条硬规矩在 `_backlog/README` 命中 3 处、毕业四门命中 4 处、队列生命周期在
  `guides/60` 命中 4 处。**同时如实登记一处张力**：§一"出场方式"列与 owner 文件存在
  **压缩式重述**（索引粒度一句话）；判读边界 = 本页不写判据细节，已写进页面
  §已知限制与延后工作。
- **判据 4（页内链接可解析）**：**机械门禁** `md-links` + `md-anchors` 全绿。
  实测首轮红 9 处（`docs/design/` → 仓根应为 `../../` 而非 `../`），已全部修正。
- **判据 5（不出现时变状态）**：**机械门禁** `doc-now-only` 全绿——页内无"当前条目是 X"，
  唯一的"当前"概念以 `queue.md` 的 `▶` 指针形式**引用**而非**复述**。
- **判据 6（被索引页指到，否则是孤儿页）**：`docs/00-index.md` 文档地图第 66 行建行，
  `rg` 实测命中。判据 6 针对本仓已实证的失败形态（"没通读 `discipline-map.md`"的
  方法论漏洞）：**文档在场 ≠ 文档被读到**。
- **判据 7（受限文件未撑超预算）**：**机械门禁** `doc-budgets` 全绿——总图落
  `docs/design/`（生长面，不设顶），根 `AGENTS.md` 未被触碰。
- **全量**：`pnpm verify` 全绿（37 门禁）· `pnpm test` 252/252。
- **未跑项**：无。本条是纯文档改动，按 [guides/60 §2](../../docs/guides/60-dev-loop.md)
  任务型路由表证据档 = L0，四道文档门禁即其机械面（`md-links`/`md-anchors`/`doc-now-only`/
  `doc-budgets`），均已跑且全绿。

## 环境状态

- 队列条目毕业：RFC 迁入本目录并改写为事实体；`_backlog/queue.md` 该行删除，
  **▶ 移交"recorded-session 义务标定"**（本轮队列最后一条）。**后续（2026-10-09）**：
  `queue.md` 与队列机制整体退役（[吸收 Note](2026-10-09-backlog-methodology-absorption.md)）——
  上两行是当时交付事实，现行模型 = 工作由用户授权 + 会话内 plan/todo。
- 新增承载物：`docs/design/60-intent-carriers.md`（77 行）+ `00-index` 索引行。
- 未改：`verify.mjs`、`evaluation.md`、`tests/`、pack 面、`notes/` 树既有 Note。
