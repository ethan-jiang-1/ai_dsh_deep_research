# member-activity 首验（2026-10-11）：subagent follow 必须走持久父地址

> 状态：implemented

## 决定

⑦ 区队员动作流的多路 follow，目标形态 = `FollowTarget`（普通会话 id ∪ subagent 持久父地址
`{kind:'subagent', parentSessionId, childSessionId, mode:'unknown'}`）。队员（teammate）会话
origin = subagent，host 侧 `validateAddress`（vendor session-controller `history.ts`）对纯
sessionId 形态一律抛 `session/agent-busy "subagent Sessions require their durable parent
address"`；父地址形态 = 官方 ui-session `sessionAddress()` 同款，`mode:'unknown'` 跳过
one-shot/continuable 对账（观察者不断言队员形态）。通道探明材料（2026-10-10，
[_backlog/_archived/research/2026-10-10-teammate-channel-probe.md](../../_backlog/_archived/research/2026-10-10-teammate-channel-probe.md)）
的"任意会话可 follow"对 subagent 会话**不成立**——本 Note 即该论断的实证修正，材料按归档纪律不回改。

client-load-smoke 的有团队正例环境：自起 web 必须补 agent-team **host 行**（roster 投影的计算点；
research.overlay.yml 只带 client 面）——smoke 运行时生成"overlay + agent-team 行"合并补丁（行内容
镜像 vendor agent-team-profile 层 rc.2 config），升 pin 随 bump-vendor-pin 重校。实证：新 host 从
盘上持久状态重算 roster 全量在场，不需要 run 通道在场——smoke 的正例断言因此可持续咬合。

对在飞 run 的观察面断言取值：期望值（证据计数/交付态/停靠点/journal 挂起态）一律**断言时刻现扫**
（journal 重读 + 文件现扫），UI 侧存在 30s bundle 面刷新周期 + 被动跟读 host 的日志尾部追平延迟
（被跟会话在别的 host 上活跃时）——复核环 = reload 再水化（有界两轮），仍不一致才判红。

## 输掉的方案

- **纯 sessionId follow**（通道材料原推荐形态）：被 host 守卫结构性拒绝——不是接线错误而是寻址
  形态错误，三队员流全灭实证（console 三条 `RemoteError`）。
- **把 agent-team host 行写进 pack overlay**（正例环境另一解）：违反 A 定案（团队机制组合归 run
  通道 profile 层，pack 发布集不带）——行由 smoke 侧运行时合成，pack 不动。
- **等待型复核**（只 sleep 不 reload）：被动跟读 host 的尾部追平实测可超 30s 刷新周期，等待不解决
  问题；reload 强制重 follow → host 重读 journal 发新快照才行。
- **boot 前快照作期望**（旧形态）：对在飞 run 必然过期（首验红：UI 4 份证据 vs 快照 2 份）——期望
  必须现扫，快照只供前置判空与非时敏字段。

## 实际跑过的验证

真实 run `research-workspace/archive/drt_mcp-security-landscape`（四编制：scout + analyst×2 +
critic 后置）首验全绿：

- 真通道 CDP 探针：⑦ 区四人折叠区渲染（● phase + 🔍/🌐/⚠️ 真实计数 + 错误徽标）；修复前
  console 三条"队员流失败"，修复后归零；
- client-load-smoke **ALL PASS**——"队员 roster = 盘侧 spawn 名对账（一个不漏）"正例断言首次
  咬合（修复前该断言红：折叠区不渲染）；
- 对照实证：独立第二 host（无 run 通道）+ agent-team 行 → 从盘上持久状态重算 roster 全量在场；
- N 流稳定性：lead + 4 队员多路 follow 同开，三个 host 实例（run 通道 + 冒烟自起 + 对照测试）
  各自稳定、console 零错。

修复过程中的中间红（证据计数时点竞态、● ×5 队员 phase 圆点与轨道 current 计数碰撞、停靠点
被动侧滞后）均复现→修复→复绿。顺带缺陷登记 = BUG-020：hitl-answer 代答 provenance 误归给
无关在飞 bundle；同日已修（[BUG-020 卡](../../_backlog/_archived/fixed_bugs/BUG-020-hitl-answer-provenance-misattribution.md)）。问题卡 =
[_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md](../../_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)。
