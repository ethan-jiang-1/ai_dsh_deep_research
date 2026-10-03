# RFC：HITL 停靠点打磨首棒——拍板记账与交付序列（pipeline-polish 面⑤）

> 状态：proposed

出处：[pipeline-polish 卡](../../_backlog/plans/2026-09-28-pipeline-polish.md) 2026-10-03 基座
适配复查后面⑤（HITL 停靠点）按判次序第一棒拆出；用户 2026-10-03 拍板开始推进第二阶段并
确认主序 ⑤→②→③→④。

## 问题（全部带实证）

1. **拍板行回写在模型可见面缺席（G8 #3 根因）**——2026-09-29 契约期首例：lead 拍板 HITL2
   后落 final/ 并 present，但未回写 `question.md` §Decisions 拍板行，node-gate 门③活体抓红、
   操作侧补齐转绿。机械门在岗且咬过真回归，但 **persona 与 synthesis skill 从未教过这一步**
   （grep 实证：`presets/` 全树 §Decisions 仅 workspace 种子与 NODES 表出现，lead 模型可见面
   零命中）——把关成本落在操作侧而非判据进模型，本末倒置。
2. **交付无序列化完成定义（G8 #2 同源）**——present 从未声明 + 拍板行缺席双双发生
   （cn-us-open-source）。persona 交付行的三件事（final/ 版本化、present、来源链）无先后
   顺序、无"缺一即未完成"的收口，逐例漂移靠门禁兜底。
3. **HITL2 摘要 ≤200 字执行方差**——第八场 576 字部分遵守（[unprocessed-inventory
   Note](../implemented/2026-09-27-unprocessed-inventory.md)），synthesis §5 有纪律与实测
   依据但缺**发出前自检**动作句。
4. **HITL1 侧不动**——样本 3/4 的卡点全在 HITL2 侧与通道；HITL1 问项拟法判据已在
   （research-brief 三问结构 + 模式库判型痕 + 推荐判据），无失败实证不改（防无证据打磨）。

## 方案

1. **lead persona「审阅（HITL2）」行**：补"拍板（无论哪支）立即回写 §Decisions 拍板行"半句；
2. **lead persona「交付」行**：改写为**拍板后四步序列**——① §Decisions 拍板行（append-only，
   先记账后落盘）② final/ 版本化（v1 首/扩张 +1/修订原位）③ present 声明当前版
   ④ update_goal complete——与 NODES 门②③判据逐一对齐，收口"缺一即未完成"；
3. **synthesis §5**：补拍板行回写判据（门③的模型侧）+ 摘要发出前自检（超 200 字 = 先删后发）；
4. **scope-round 试点预案**：搁置池触发条件未发生（首场补研究型 HITL2 未出现），预案留本 RFC
   附录，模型可见面零改动。

## 输掉的方案

- **只靠 node-gate 事后抓红**（现状）：已实证能抓（G8 #3），但每次走操作侧补齐——把模型
  该会的判据留给门禁兜底，救场计数永远下不去；
- **顺带改 HITL1 问项拟法**：无失败实证，违反"实测前不动判据"（floor 教训同源）——等 run
  采样喂证据再立卡；
- **拍板行机械化代写**（脚本代 lead 补行）：伪造记账源头，违反 model-visible ⟺ logged
  与"完成只认文件事实"——记账必须出自 lead 本手。

## 验收

1. persona/synthesis 文本在场 + L1 四角色真挂载 ALL PASS（skills 硬隔离断言随跑）；
2. snapshot-replay B 层红 = 有意变更已捕获 → fixture 借真模型探针重录换代 → B 层绿 + 人审
   （快照换代纪律：record/refresh 不改写，换代走实录）；
3. L4-lite 四角色真模型 ALL PASS（模型可见面改动的行为证据）；
4. run 通道重启后新 persona 生效（boot 文本缓存刷新——重启动作归用户终端，见 guides/61 §0
   通道纪律）；
5. `pnpm verify` + `pnpm test` 全绿。

## 附录：hitl2-scope-round 试点预案（触发即用）

搁置池复活条件 = 首场补研究型 HITL2 发生（体感定形 → 立 RFC）。预案（自
[_done 卡](../../_backlog/_done/_closed_plans/2026-09-28-hitl2-scope-round.md)）：HITL2 拍板
= 补研究支时，lead 按 findings gap 清单 + review 残留 + final 末节优先项拟**范围轮提案卡**
（逐 topic 推荐置首、卡数有上限），用户裁决 → §Decisions 范围锁定行（append-only）→ 重入
挖掘（最深重入点）→ final/ v(n+1)。触发后本附录升格独立 RFC，模型可见面届时一并改。
