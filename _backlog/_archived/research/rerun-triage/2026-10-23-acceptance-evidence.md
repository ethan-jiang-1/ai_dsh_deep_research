---
topic: rerun 不满转接层（L1 词表 / L2 措辞与末节 / L3 只读出口）
intent: 记录落地的命令级证据、验收矩阵逐行判定、真模型探针输出与未跑边界
---

# rerun 不满转接层 · 验收证据

> 消费者：[2026-10-23-rerun-dissatisfaction-triage](../../settled_issues/2026-10-23-rerun-dissatisfaction-triage.md)
> ｜ 方法：[_backlog/methods/validation-evidence](../../../methods/validation-evidence.md) + [validation-judgment](../../../methods/validation-judgment.md)
> ｜ 实现 commit：`77ae9fa`（快照重录 `d961e33`）

## 1. 判定矩阵（逐行）

| # | 行 | 判定 | 证据 | 限制 / 未跑 |
|---|---|---|---|---|
| 1 | L1 词表正本 | **pass** | `tests/contracts/rerun-triage-contract.test.mjs`（七类说法 / 四手段 / 五纪律 / persona 指向）+ `preset-smoke` 真挂载（lead 只看见自己的 skills） | 不证明模型按词表回话——见 #6 |
| 2 | HITL2 三选项带后果 + ≤200 字 | **pass** | 契约测试三处逐字同源 + 后果；persona `定稿（按现稿交付）(Recommended)` | 真实用户体感 = 人判（本卡未决 2 保留观察） |
| 3 | 报告末节 | **pass** | 契约测试：模板两节 + quick_factual 缩略 + synthesis 完成判据 | 不证明模型填得实（review 抽样） |
| 4 | L3 只读出口 | **pass**（终稿页）/ **pass**（状态页，条件断言） | `client-load-smoke`：「终稿页脚：三种改法折叠块在场」PASS；状态页 ⑤ 折叠块按 present 窗条件断言（见 §3） | 文案密度/位置 = 人读 |
| 5 | 不触碰既有合同 | **pass** | 契约测试（两点交互句在场 / 常量模块无动作 API）；diff 无新增 tool/按钮 | 长期不腐靠 review |
| 6 | 模型行为五条 | **pass**（1 次真模型） | `scripts/probe/rerun-triage-probe.mjs` 五条全中（§2） | 单次行为；长尾说法可能误判 = 人读 |
| 7 | persona 交付语义 = D28 | **pass** | 契约测试（present 指 final/vN、无旧句）+ snapshot B·persona | 模型旧习复发由门②兜底 |
| 8 | 非回归 | **pass** | `pnpm verify` 全绿；`pnpm test` **719**；`snapshot-replay` 4 场景 ALL PASS；`preset-smoke` ALL PASS | L2 安装验收未跑（非发布轮） |

## 2. 真模型探针（五条判据）

```
node scripts/probe/rerun-triage-probe.mjs --port 3118
  PASS (a) 复述了用户的不满（深度/证据侧）
  PASS (b) 手段数 2（≤2）：补研究、改说法
  PASS (c) 说清了代价/版本后果
  PASS (d) 未在用户确认前动手（无写/派工/rerun 调用）
  PASS (e) 补研究范围指到报告末节/具体项
rerun-triage-probe: ALL PASS
```

模型原答要点（留档）：开头即「我不写文件、不派工、不重跑，只做分诊」；复述「属于证据不足，
不是方向错误」；给两个手段并各自写代价（补研究 → 出新版本、需重过 critic/HITL2；改说法 →
版本号不变但治不了"数字没有"）；范围引 `final.md` 末节两条 + `findings.md` gap；结尾问「要哪条？」。
**没有**擅自开跑。

判据口径（探针内注释）：(a) 允许同义转写（"证据不足"= 深度侧）；(b) 手段按语义组计（改说法 =
表述修订别名）；(d) 只禁写/派工/rerun 类调用，读与 skill 加载允许。

## 3. 观察面（client-load）

- 终稿页脚：`PASS 终稿页脚：三种改法折叠块在场（与状态页同源文案）（fold expanded）`。
- 状态页 ⑤：`PASS 状态页 ⑤：已交付后的三种改法折叠块（与终稿页脚同源文案）（fold expanded）`。
  首轮曾因切页签后固定读一次 DOM（读到终稿页旧文本）而 SKIP；改为按显式内容（停靠点/已交付）
  有界等待后再断言 → 同一会话两处均 PASS。
- 金标准 C5 变化（快照重录）：仅活动行一句措辞，结构未变——人审接受。

## 4. 快照身份

- `codeAnchor = 77ae9fa`（录制时 HEAD，工作树干净）、`vendor = 687f282e…`、
  手册 digest = `553a02a5…`（四份 fixture 一致 = 当前 `research-workspace/AGENTS.md` sha1）。
- `snapshot-replay-smoke`：A 回放 + B 组装 diff（persona / 手册注入 / skill catalog）+ C 渲染
  金标准 4 场景 ALL PASS。

## 5. 未跑 / 边界

- L2 安装验收（非发布轮）。
- 正式 lead 盲测（沿用宪章卡仪器缺口）。
- 真实用户对三选项措辞的体感（人判；本卡未决 2 保留"观察几场再定"）。
- 探针是单次行为证据，不构成回归套件；长尾抱怨说法不走机械分类（设计如此）。
