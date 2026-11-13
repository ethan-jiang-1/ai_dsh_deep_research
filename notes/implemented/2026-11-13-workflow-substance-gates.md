# 加工环路的实体检查：字段 + 门

> 状态：implemented
> 关联：[D52](../../docs/decisions.md#d52)；合同 = [evaluation §判据形状](../../docs/evaluation.md#verdict-shape)；
> 证据 = [三次独立审计](../../_backlog/research/workflow-substance/2026-11-13-three-audits.md)

## 决定

判据类工作不再只靠散文规则，落成「一个字段 + 两道门 + 一条必答」：

- **设计字段**：引入/修改机器判据的卡/RFC 必填 `## 判据形状`——权威事实（谁写、写成什么结构化形式）、
  读取方、缺/非法/互斥的判定、旧形态退场、反证。方法 = `_backlog/methods/judgment-design.md`，
  挂在 `guides/60 §2` 的判据任务行、`writing-a-gate`、`evaluation §判据形状`。
- **Note 同节**：判据类 Note 另需 `## 判据形状`（同上五格）；机械与局部编辑不写。
- **Note 不许早写**：`backlog-liveness` 对 `待落地` + `去向：implemented` 的卡，解析目标路径；
  目标文件已存在 = 红（Note 与卡关闭同变更）。
- **暂存区成对判据**：`staged-change-pairing` 门禁（pre-commit 有对象）检查两类配对——
  归档卡与它 `去向` 指向的 Note 在同一暂存集；`ui.expected.md` 重录（M/R）与同目录
  `snapshot.json.lastRewrite`（why 非空、载体存在）同暂存集。A（新场景）不按重录判。
- **bug 复发必答**：`## 牵出的失败类` 第 2 次起写「类修（链接类卡）」或「实例修 + 为什么」。
- **判据测试负例**：文件名含 `conformance` 的测试必须有 `负例留证/夹具留证` 块（即使标题不带 BUG 号）。
- **金标准重录理由**：`--update-expected` 必带 `--why <载体>`，写入 `snapshot.json.lastRewrite`。

## 判据形状

- **权威事实**：卡片/Note 的显式节（人写）；git 暂存索引（机器看）；`snapshot.json.lastRewrite`。
- **读取方**：`backlog-liveness`、`staged-change-pairing`、`guard-red-record`、评审。
- **坏输入**：缺 `## 判据形状` → 评审退回；`待落地` 目标已存在 → 红；归档卡目标不在暂存集 → 红；
  `lastRewrite.why` 空/载体不存在 → 红；暂存区为空 → 无对象（不判）。
- **旧形态**：无（新规则；旧卡 grandfather，不追改）。
- **反证**：`backlog-liveness` 两例；`staged-change-pairing` 六例 + 一次性真红录；`guard-red-record`
  新案例；`gates-smoke` 108 案例全绿。

## 为什么

三次独立审计（fresh-agent 冷启动 / D51 真实链路 / 五类失败对照）给出同一结论：**五类失败都有成文
规则，机械门只查非空、节名、标题、状态——一句合格散文即可满足。** 冷启动 agent 在读到
`evaluation §判据形状` 之前，会自然地写出该节明文禁止的 grep 门禁；它还在 D51 的实现里实测出两个
fail-open（互斥散文 + 声明 PASS 仍放行；重复键 JSON 取末值），已修并留负例。

D51 的真实链路本身有 6 处违反自己的规则（Note 立项即 implemented、禁兼容分支而保留散文回退、
8 个冲突 bundle 未删未登 trigger、归档索引表被插坏、卡 II 未等验收、归档后仍改行为），零门禁拦截。
这不是「作者不小心」，是**规则的形状与门的形状不匹配**：规则是散文，门是形态；中间的字段和时机没人管。

## 输掉的方案

- **只写一份「判据设计」文档**：fresh agent 已实证读不到/读到了也晚；文档没有门就会变成作文。
- **用 grep 门禁禁止关键词表**：判不出「有没有在猜」，只会制造假安全感（`evaluation` 明文禁止）。
- **改动面 → 必跑面的自动对账门**：方向对，但要先把任务路由表变成机读 manifest；成本高，登记为
  F3 暂缓，不在本轮硬做。
- **把所有 Note 写长**：噪声，不解决「判据类」这一小撮；只对判据类 Note 加节。
- **让 notes 依赖 backlog 的状态机**：层间依赖错位。notes 只认自己的收件规则；交接物 = Note 本身，
  发起方负责把结论落过来（`notes/AGENTS` 已按此改写，不再引用 backlog 的 `待落地`/状态机）。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` 1400 通过 / 0 失败；`pnpm typecheck` 绿。
- `node scripts/smoke/gates-smoke.mjs` 全绿（零注入对照 + 108 个注入案例点名报红）。
- **新门红证（一次性）**：造一张归档卡、只暂存卡不暂存 Note → `staged-change-pairing` 点名红：
  「归档但其去向 Note … 不在同一暂存集」；还原后绿。
- 新增回归：`backlog-liveness` 2 例、`staged-change-pairing` 6 例、`guard-red-record` 新案例。
- 未跑：l4-lite / client-load（本变更不触模型可见面与客户端运行时）。

## 环境状态

新规则只对新增/修改生效；旧卡 grandfather，不追改。`staged-change-pairing` 在普通 verify（无暂存）
时无对象；pre-commit 才有真对象。`--update-expected` 无 `--why` 时 exit 2，历史金标准未重录。
