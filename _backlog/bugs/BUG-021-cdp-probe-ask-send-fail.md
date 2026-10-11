---
status: 活跃
severity: P2
opened: 2026-10-11
---

# BUG-021：cdp-probe `--ask` 发送系统性失败——asked:false 三连，消息不落盘

> 严重级别：P2（次要——不损 bundle，但剥夺运行期最轻量的操作侧续推手段）｜发现：2026-10-11｜状态：活跃

## 症状

`scripts/probe/cdp-probe.mjs --ask` 向会话发送消息的链路失效：2026-10-11 验证 run 期间三种会话状态下连续三次 `asked: false`——①通道重启前的在飞会话、②通道重启后已终局化（`end-seed`）的会话、③turn 干净结束的活跃续跑会话——三次消息均未落盘（journal 无对应用户/message）。失败输出 = `asked: false` + `failed: "ask 后未见模型回复（探针收到）"`，且 `consoleProblems` 与 `exceptions` 均空——页面无报错，发送动作静默未生效。

## 根因（假设）

未定位，两个候选：①发送动作本身失败——探针的输入区选择器随 vendor UI 漂移（探针与 hitl-answer 的选择器不同源，后者同环境点击/提交正常，浏览器链路本身可用）；②发送后判据误判——`asked` 字段语义混杂（发送成功 vs 见到模型回复），消息可能已发送但探针没认出来。验证途径：发送后直接读 journal 是否出现 user/message（对账判据，比 UI 回复等待可靠），并在 `asked:false` 时 dump 输入区选择器状态。

## 复现

通道活着 + 会话在场（任意状态）→ `node scripts/probe/cdp-probe.mjs '<gui-url>' --open-session '<标题子串>' --ask '<消息>'` → 输出 `asked: false`，journal 无新 user/message。2026-10-11 三次复现实录见 [①卡挂账段](../issues/2026-10-11-executive-research-intake-brief.md) 与 `drt_deepseek-default-upgrade/journal.md` round 2 操作侧记账。

## 牵出的失败类

操作侧对 run 的**非挂起干预面**只有一条腿：hitl-answer 覆盖挂起卡、cdp-probe 覆盖自由消息——后者失效即整条干预面失效，lead 停滞时只剩「重启通道 + 新开续跑会话」这条重手段。值得横切：凡「向在飞会话注入输入」的工具，其成功判据都应对账 journal 落盘，而不是 UI 回复等待。

## 修复关联

（未修——先诊断后修：①`asked:false` 时 dump 输入区状态；②对齐选择器；③成功判据改 journal 对账。修后归档补 commit。）
