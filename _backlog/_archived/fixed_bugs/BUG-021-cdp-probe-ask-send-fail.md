---
status: 已修
severity: P2
opened: 2026-10-11
---

# BUG-021：cdp-probe `--ask` 发送系统性失败——asked:false 三连，消息不落盘

> 严重级别：P2（次要——不损 bundle，但剥夺运行期最轻量的操作侧续推手段）｜发现：2026-10-11｜状态：活跃 — 已修复 2026-10-11：送达判据改会话日志落盘对账（纯函数 + 页面自动探测会话 id + fail-loud 四态），真模型两阶段 E2E 全绿（含生产现场 `Queue message` 形态）；见修复关联 + [Note](../../../notes/implemented/2026-10-11-cdp-probe-ask-journal-reconcile.md)。

## 症状

`scripts/probe/cdp-probe.mjs --ask` 向会话发送消息的链路失效：2026-10-11 验证 run 期间三种会话状态下连续三次 `asked: false`——①通道重启前的在飞会话、②通道重启后已终局化（`end-seed`）的会话、③turn 干净结束的活跃续跑会话——三次消息均未落盘（journal 无对应用户/message）。失败输出 = `asked: false` + `failed: "ask 后未见模型回复（探针收到）"`，且 `consoleProblems` 与 `exceptions` 均空——页面无报错，发送动作静默未生效。

## 根因（已定位，2026-10-11 操作侧只读实测）

**不是「模型没回」，而是探针根本没把消息发出去**——且失败信息把真因盖住了。证据来自只读 DOM 诊断
（`runtime/diag-ask-selectors.mjs`：不发送、不重启通道、收尾清空 composer）：

1. **输入侧选择器是对的（原假设①被证伪）**：全页 `[contenteditable="true"]` 只有 1 个，就是 composer——
   稳定钩子 `data-composer-input`、`role="textbox"`、`aria-label="Message or run a task, / commands, @ files or sessions"`。
   「选中了会话标题框」不成立。
2. **发送按钮选择器是错的（真因）**：`find(b => (b.ariaLabel ?? '').includes('Send'))` 在页内
   233–238 个按钮里**零命中**。提交按钮的 aria-label 是**状态机**（vendor `ui-conversation`
   `locales.ts` 的 `input.send*` 族）：空闲 `Send message`／在飞 `Queue message`／插话 `Steer message`，
   中文对应 `发送消息`／`排队发送`／`插话发送`。观测当刻（会话在飞）实为 **`Queue message`**
   （x=1333,y=785,34×34）→ `find` 返回 undefined → `sent='no-send-button'`。
3. **判据把真因折叠掉**：`sent !== 'sent'` 时不报「没发出去」，而是统一落
   `failed = 'ask 后未见模型回复（探针收到）'`——三次现场的可见症状即这句。
4. **第二条静默路径（本轮新发现）**：ask 段以 `verdict.sessionOpened` 为门，而标题行可能点不中
   （本轮复现 `sessionOpened:false`，输入面其实在场）→ 整段 ask 被静默跳过，落进同一句误导信息。
5. **修法陷阱（重要，防复发）**：`InputBar.tsx` 同一位置的主按钮在 `running && 草稿为空` 时变成
   `input.stop`（`Stop generating`／`停止生成`）——**点它等于掐断在飞 turn**。故「抓 composer 区最后一个
   按钮」这类懒修法是危险修法，必须显式匹配 send 家族并对 stop 设防。

## 复现

通道活着 + 会话在场（任意状态）→ `node scripts/probe/cdp-probe.mjs '<gui-url>' --open-session '<标题子串>' --ask '<消息>'` → 输出 `asked: false`，journal 无新 user/message。2026-10-11 三次复现实录见 [①卡挂账段](../settled_issues/2026-10-11-executive-research-intake-brief.md) 与 `drt_deepseek-default-upgrade/journal.md` round 2 操作侧记账。

## 牵出的失败类

操作侧对 run 的**非挂起干预面**只有一条腿：hitl-answer 覆盖挂起卡、cdp-probe 覆盖自由消息——后者失效即整条干预面失效，lead 停滞时只剩「重启通道 + 新开续跑会话」这条重手段。值得横切：凡「向在飞会话注入输入」的工具，其成功判据都应对账 journal 落盘，而不是 UI 回复等待。

## 修复关联

**修复 commit = 本卡归档的同一次提交**（索引行 = [_archived/fixed_bugs](README.md)）；
判据变更的持久理由 = [Note](../../../notes/implemented/2026-10-11-cdp-probe-ask-journal-reconcile.md)。落地四处：

1. **判据本体（卡上第③条）**：新增纯函数 `scripts/lib/inject-reconcile.mjs` 的
   `reconcileInjectedMessage`——只认 `user/message`、时间下界（点击时刻，防上一次同文注入假阳）、
   空 text 显式拒绝；探针发送后取会话日志对账，命中才算送达，UI 回复等待降为次信号。
2. **入口与提交按钮（卡上第②条）**：`scripts/probe/cdp-probe.mjs` 入侧改稳定钩子
   `[data-composer-input]`；提交按钮改 **send 家族显式匹配**（`Send message`／`Queue message`／
   `Steer message` ＋中文三态）＋ **stop 家族拒绝**（`Stop generating`／`停止生成`——同一位置在 running
   且空草稿/挂起时是它，点了会掐断在飞 turn）；命中标签记入 `verdict.sentBy`。
3. **会话 id 与根（卡上第①条的可用形态）**：缺省从页面 `[data-conversation-session]` 自动探测，
   `--session`／`--sessions` 只作覆盖；用哪个根进 verdict（不自拒：错根只报 `session-log-not-found`，
   可见不静默）。
4. **fail-loud 四态**：`sent != sent`（附候选标签与 stop 在场）／`session-mismatch`（页面前台会话 ≠
   `--session`——消息可能进了别的会话）／`not-landed`／`log-unreadable`（在飞尾帧不完整，fail-closed）
   ——不再一律冒充「未见模型回复」。

**验证（已跑）**：keeless 契约测试 `tests/run/inject-reconcile.test.mjs` 先红后绿 7/7，**四路反证注入**各看红
一次再还原（恒 true→4 红／丢时间下界→1 红／只扫末条→1 红／类型过滤失效→1 红）；**真模型两阶段 E2E**
（一次性通道 + 独立 workspace，刻意不打在交付会话上）**全绿**——①空闲态 `sentBy=Send message` +
`landed=true`（seq 9）+ 自动探测会话 id 与建会话 id 一致；②**在飞态 `sentBy=Queue message` +
`landed=true`（seq 54）＝生产现场旧探针构造性零命中的形态**；顺带实测挂起态该位置 `send 家族候选=[]`、
`stop 家族在场=["Stop generating"]`，探针报 `no-send-button` 且**未点击**（Stop 陷阱防线生效）。
`pnpm verify` 全绿、`pnpm test` 360/360。

**仍挂账（不属本卡，已记 Note）**：`session/prompt` RPC 直注这条**非 DOM 第二腿**（本轮用它唤醒在飞
会话，见 bundle journal round 3）是否转正为 `scripts/run-ops/` 工具，待评审——不在本卡擅自扩面。
