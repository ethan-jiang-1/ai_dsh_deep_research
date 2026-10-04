# 门L 判据升格——从字面形态到交接不变量

> 状态：implemented

## 决定

门L（node-gate 的 leads 交接门）判据从**字面形态**（h2 `## 方向:` 节计数）升格为**交接
不变量**（判据来源 = [leads-topic-shape 推敲卡毕业判断](../../_backlog/_done/_closed_plans/2026-10-04-leads-topic-shape.md)，三场验收 run 实物 + 用户批准）：

1. **不变量（门守，题型无关）**：leads.md 含 ≥1 个"字段齐的方向单元"——任意层级
   `#{2,4}` 的节 + 四字段行齐（状态合法值/支持来源带 A–D 分级/关键线索/建议 owner 带
   topic 映射）+ 防空语料（0 单元 = RED）；
2. **组织轴自由（门不判）**：方向轴/实体轴/前提校验段皆合法——按题型分形是 scout 的
   专业判断，字段行是硬契约，节级标题措辞不是；
3. **状态值语义识别**：markdown 强调符（`**建议挖深**`）剥除后匹配——browser 第六场
   实物实证：字面匹配把语义正确的状态判非法并连带覆盖计数清零（第二层缺口，升格后才
   显形）；
4. **模板/skill 措辞同步**：`templates/run/leads.md` 与 scout 的 lead-mapping skill 写明
   "不变量 vs 轴自由"两层（消除字面形态教唆——三例中 scout 卡头报偏的根源）。

实物反证（升格直接动机，三例反转）：第六场 browser（`### 方向:` ×11、四字段全齐）是旧
判据**假阳性**；第五场 coding-agent 与第七场 video（四字段行全零）是**真违约**。

## 输掉的方案

1. **维持字面判据 + 要求 scout 重写正确形态**：把正确形态磨回字面 = 把证据磨到跟判据
   吻合（fix fixtures, not normalizers 的门禁版）；
2. **只改模板不动门**：真违约两场依旧逃过门L（字段缺失不被抓）——门与模板必须同改；
3. **数值标定前置**：门L 是结构检查（字段在场性）非数值阈值，不依赖分布标定——防假
   牙齿教训约束数值门，此处以三例实物反证替代。

## 实际跑过的验证

- L0：`pnpm verify` 全绿；`pnpm test` pass 154 / fail 0（原 150 + 门L v3 三形态契约
  夹具新增 4 用例：h3 方向轴 PASS〔假阳性回归钉〕/ 实体轴字段齐 PASS〔轴自由钉〕/
  实体轴零字段 RED〔真违约钉〕/ 底稿形态 RED）；
- 反证：h3 夹具删字段行 → fail 1 → 还原 pass 29/fail 0（反证12）；
- **实物反证库**（三场 archive bundle 升格版实跑）：browser 转绿（字段齐方向单元 11、
  挖深 11、覆盖 3/3——覆盖检查首次真跑并通过）；coding-agent 与 video 保持 RED（0 字段
  齐单元，真违约保留）——假阳性消除与真违约保留一箭双雕；过程中第二层发现（状态值
  markdown 剥强调）即来自该实跑；
- 模型可见面梯子：`sync-pack-workspace` + `render-overlay` 重渲 → L1 preset-smoke
  （DSH_SMOKE_REAL）四角色真挂载 ALL PASS → L4-lite 真模型档 ALL PASS（四角色响应 +
  scout web_search 真调用）；
- snapshot-replay 四场景全绿——并实证 **B 层适用边界**：skill 正文不进组装请求
  （scout B1 字数在 skill 改动前后不变），B 层钉的是 persona/frontmatter/工具 schema；
  路由表"改 persona/skill"行的适用边界已同 diff 补注（guides/60）。

## 环境状态

- with-key 消耗：L4-lite 一轮（真模型档，四角色各一回合）；
- 未跑项（如实分列，均非本条目改动面）：L2 release-smoke（无部署面改动）；entry-chain
  探针按节奏（未动 docs/AGENTS.md）；
- 判据实现细节：门L 解析为扁平化（每 `#{2,4}` 标题开新单元），代码围栏内的 `##` 行会
  被误切——存量夹具与四场实物均无此形态，留待真实误报出现再收紧（fail-soft 惯例）。
