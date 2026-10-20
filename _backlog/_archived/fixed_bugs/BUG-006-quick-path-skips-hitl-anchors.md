# BUG-006：quick_factual 题型下 lead 自我豁免 HITL1、HITL2 未拍板即 present——快路径无合同且无门禁可检

> 严重级别：P1（重要——方法论两 HITL 锚点（D4 内核）在快题型上整体失效，且现有机械门禁对该失效不可见）｜发现：2026-10-05（系统探针 A：drt_swebench-verified-top）｜状态：活跃 — 已修复并活体确认 2026-10-05（用户拍板"不豁免"路线）：persona HITL1 零例外句落地，同族快答题复测 HITL1 照发（四问卡、无 wait 参数）；node-gate 门①（HITL 锚点门）落地，确认 run（drt_openai-context-window）门①③②全 PASS。

## 症状

SPA 榜单快答题（P1 单点事实）全程 **askCalls = 0**：

1. **HITL1 未发起**：lead 自行判定"三问已在请求中"——question.md 显式记录「未发起 HITL1
   选项卡」+ §Decisions「立项即执行，不发起 HITL1」。记录诚实（非伪造），但**豁免无任何
   合同授权**：persona 钉死"接到研究请求先 HITL1 三问"；research-brief 的 `quick_factual`
   是问卡里的一个选项，不是跳卡许可；question-patterns P1 分派结论仍要求"类型问卡 =
   快速事实核查（Recommended）"。
2. **HITL2 未拍板即 present**：final.md 落盘 + present 声明，全程无审阅问卡——node-gate
   门③**如实拦下**（"§Decisions 无任何 HITL2 拍板行——版本落盘先于用户裁决，G8 形态"）。
3. **bundle 迟建**：研究跑完（30+ 分钟、7 个 subagent、21 次 fetch、双轮浏览器渲染）才
   实例化 drt_ bundle——D17"立项时实例化、问题定稿写 question.md"违约。
4. **快路径不快**：单点数字核查耗 30+ 分钟——跳过 HITL1 换来的不是速度，是无校准的深挖。

## 根因（假设，两层）

- **合同层**：快路径**没有合同**。persona 与 pattern 库都只写了"要问"，没有任何文本定义
  "何时可以不问"——模型面对"用户题面已自带答案"的形态时自由裁量，裁出无授权豁免。
  两 HITL 锚点是 D4 方法论内核，豁免与否是产品交互合同级决定，不该由 lead 即兴。
- **门禁层**：**"该问没问"无机械判据**。门③查"拍板行在场"（能拦 HITL2 跳过）、G8 标
  形态，但"askCalls=0 且无豁免记录"没有任何门检查——HITL1 跳过只能靠 question.md
  自述暴露，而自述措辞合规即可穿过（本场恰因 lead 诚实才可见）。

## 复现

```sh
# 用一句"自带口径"的 P1 快答题起 run（如：SPA 榜单榜首是谁，页面 JS 渲染需浏览器抓）
# 观察：会话日志 askCalls=0；question.md §Decisions 出现"不发起 HITL1"自述；
# final.md + present 在无 HITL2 拍板下落地；node-gate 门③红（G8）但无门拦 HITL1 跳过。
```

## 修复方向（合同决定 → 门禁跟随；合同层需用户拍板）

- **合同层（产品决定）**：快路径是否豁免 HITL1，二选一并写进合同——
  (a) **不豁免**（倾向）：persona 加硬约束"任何研究请求先 HITL1，零例外"——0.2.0 timed
  语义下问卡是廉价停点（确认 run 实测四问卡 10 秒可答），30 分钟的 run 不省这 10 秒；
  (b) **有条件豁免**：豁免条件写进 research-brief（如"题面自含类型+深度+口径三问答案时"
  ）+ question.md 契约模板加"豁免记录"形态 + 门禁认该形态。
- **门禁层**：node-gate 增判据——盘侧 askCalls=0 且 §Decisions 无豁免记录形态 → 红
  （askCalls 从会话日志事件形状可判，run-state 已有 `toolCallCount`）。
- **顺带**：`quick_factual` 的"快"需要标定（本场 30+ 分钟 vs 快答预期 1–2 屏）——深度
  纪律对 P1 的适用边界（要不要限制 subagent 数/轮次）随合同决定一并写清。

## 修复关联

已落地（2026-10-05，用户拍板"不豁免"路线；TDD 红→绿，门①判据经三轮真数据打磨）：

- **persona**：HITL1 行增「HITL1 零例外」——任何研究请求先发卡，题面自含答案时全取
  推荐档照常发卡；presets.test 两断言钉（零例外句 + 推荐档操作）。
- **node-gate 门①（HITL 锚点门）**：写过 `drt_<slug>/question.md` 的会话里 HITL1 签名
  （研究类型问）ask ≥1，零 ask 红；断代 HITL_CONTRACT_DATE=2026-10-05 不追溯。
  判据三轮真数据打磨（路径提及绑定 → 邻场 ask 串场；时间锚 → 历史场次穿透；终态 =
  写事件会话绑定 + JSON 转义斜杠 normalize——presentInLogs 同款先例，每轮反证进
  tests/run/node-gate.test.mjs）。
- 活体确认：探针 D（drt_openai-context-window）同族快答题 HITL1 照发 → 交付 →
  门①③②全 PASS；探针 A 现场（drt_swebench-verified-top）门① RED + 门③ G8 双红留档。

## 牵出的失败类

**"自述合规即可穿过门禁"**——门禁检查"记录在场"而非"行为发生"（记录可以无授权地写）。
与 BUG-003/004 的"UI 观察判据 vs 盘侧事实"同族的反向实例：这里是"盘侧行为（ask 次数）
可机械判但没人判"。横切排查：所有依赖"角色自述合规"的门禁面（question.md 快照、
journal 纪要）是否都有盘侧事件形状的对应判据。
