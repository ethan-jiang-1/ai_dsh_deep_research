# BUG-008：leads.md 状态词漂移（建议深挖 ≠ 建议挖深）穿透交付——critic 未狩猎、门L 只能事后

> 严重级别：P2（次要——机械门拦住了、交付物本体未坏；但暴露"交付前无人在环跑机械门 + critic 不查 leads 术语"两个流程洞）｜发现：2026-10-05（系统探针 E：drt_open-tts-2026-landscape）｜状态：已修复并实测确认（2026-10-06，drt_mcp-hosts-governance：门L PASS + critic 狩猎第 4 线在场——归档）

## 症状

dr_open-tts-2026-landscape（exploratory_map + run 内方向修订）交付后 node-gate 门L RED：
leads.md 里 **7 个方向单元的状态行写成「建议深挖」**（合同词 = 「建议挖深」，挖/深字序
颠倒），同文件 A1–A4 又是正确的——**同一代内漂移**。语义对人不损（读者全懂），但
机械白名单 correctly 判非法；且 critic 对抗审查 readiness PASS——**没有狩猎 leads.md
的术语纪律**；交付（HITL2 拍板 + present）在门L 红的情况下照常完成。

## 根因（假设，三层）

- **生成侧**：scout 的 lead-mapping skill / templates 钉了合同词，但 spawn 队友的转写
  仍是概率行为——本场 4 次 spawn（含方向修订触发的补搜轮），漂移集中在后段单元
  （B 段全部 + A5/A7），与"修订后加 spawned 的轮次"相关（未确证）。
- **审查侧**：critic 的对抗审查面 = final.md 本体；leads.md 的术语白名单不在其狩猎
  清单（门L 设计注释说"计数对账归 skill 自检 + critic 狩猎"——狩猎清单里没有这条）。
- **流程侧**：lead 无 bash、跑不了 node-gate——机械门只能操作侧事后跑，交付前无人在
  环；门L 红**不阻塞** HITL2/present（门③②才阻塞），红门交付无拦截点。

## 复现

```sh
source dev/env.sh && node scripts/node-gate.mjs research-workspace/drt_open-tts-2026-landscape
# 门L RED：7 个单元状态值非法「建议深挖…」（其余四门 PASS；critic readiness PASS 在先）
```

## 修复方向

- **critic 狩猎清单**（本仓，最小修）：adversarial-review skill 增一行 leads.md 术语
  狩猎（状态值 ∈ {建议挖深, 已排除} 逐字；顺带字段齐自查）——critic 在草稿段就在场，
  能在 HITL2 前拦住。
- **操作序**（61）：呈交纪律补一步——HITL2 拍板前操作侧先跑 node-gate（当前"呈交纪律"
  只覆盖 boot 面，交付面缺对称条款）。
- **生成侧**（观察）：若漂移跨 run 复现，考虑 spawn prompt 第⑤件装载里加"状态词逐字"
  硬约束（装载扩六件）——先攒场次再动。

## 修复关联

已落地（2026-10-05，TDD 红→绿）：

- **critic 狩猎清单第 4 线**：adversarial-review skill 增「leads 交接纪律狩猎」（状态值
  逐字白名单 + 近形漂移「建议深挖」点名 + 字段齐自查 + 不重写只定位）；presets.test
  三断言钉（狩猎节/白名单词/近形形态）。critic 在草稿段在场 → HITL2 前可拦。
- **61 §4 拍板前机械门**：呈交纪律补"拍板前操作侧先跑 node-gate，门①/③/L 红先修再拍板"。
- 生成侧（装载扩六件加"状态词逐字"）：按卡内修复方向攒场次再动。
- 验证：verify 全绿 + tests 185/0；L1 preset-smoke ALL PASS；L4-lite 真模型 ALL PASS；
  overlay 渲染同步；通道重启漂移绿。

## 牵出的失败类

**"词形漂移穿透语义审查"**—— critic 抓内容矛盾、机械门抓白名单外词形，但机械门在
交付后才有机会跑。与 BUG-006 同向（交付前缺机械判）、与门L 升格（2026-10-04）的
"语义识别 vs 字面白名单"边界互补：强调符可剥、词序漂移不可放。

## 实测确认（2026-10-06，drt_mcp-hosts-governance——含 leads 的 team 型 run）

- **门L PASS（修复实效的机械判定）**：22/22 方向单元字段齐、状态值 挖深 22 / 排除 0、primary/comparison 覆盖 6/6——**零漂移形态**（本场早期信号亦然：leads.md 状态词 25 处全合同形态）；
- **critic 狩猎第 4 线在场且工作**：review.md 显式核查 leads 交接纪律（知道查「- 状态:」白名单与字段齐备），并诚实圈定核查范围（leads 未进最终交付链 → 建议门L 处机械核一遍）——修复设计的"critic 草稿段狩猎 + 门L 机械确认"分工如实呈现；
- 交付链按修复后的操作序走完：HITL2 拍板前机械条件齐（readiness PASS 在前），门①②③L 全 PASS 交付。
- 归档闭卡；生成侧（spawn prompt 状态词逐字硬约束）按卡内既定"攒场次再动"维持观察。
