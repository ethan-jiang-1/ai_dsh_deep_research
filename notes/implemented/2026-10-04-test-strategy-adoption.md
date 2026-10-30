# test-strategy 语料采纳——测试策略增量落地

> 状态：implemented

## 决定

`_digested/test-strategy/`（DSH 测试策略消化语料，基线 `639ed01539` = 采纳时本仓 vendor pin 同
commit；现 pin 已 `687f282e86`，两者已不同步——见 [external-materials](../../docs/external-materials.md)）全文消化并逐条对照本仓合同面后，采纳其增量并落为常驻资产；
与既有落点重复的教义**不重复登记**（一个事实一个家）。对照总账的三态正本 =
[discipline-map 源 10](../../docs/discipline-map.md)；语料身份钉在
[00-index §外部研究材料](../../docs/00-index.md)。

对照结论（吸收的依据）：九条教义大半本仓已有同构落点——证据匹配面（五面合同 + 任务型路由
表）、with-key policy（真模型档四脚本 + 未跑≠通过）、verify the world（evidence-audit /
client-load-smoke 磁盘真值对账 / watch-run 谓词化）、真入口路径（L2 release-smoke）、mock 只放
边界（本仓近乎零 mock）、prove-it-red（门禁反证台账）、防假绿①（脚本 preflight exit 2）、
"单跑才绿 = 自己的缺陷"（scripts/AGENTS 原话同构）、快照层（snapshot-replay 三层判据）、
"明说测试不覆盖哪里"（值级不可证条款）。真实增量三类：消化未成登记资产、少数机械缺口
（自写代码零导出守卫、可靠性纪律未成文、verdict 契约未钉、路由表盲区、1 处裸注册）、
铺垫期缺"自写代码证据阶梯"模板。

落地物（全部沿用既有载体，零新框架）：

1. **登记**：00-index 语料行（钉版 = 语料自报基线；升 pin 随 discipline-map 重审触发路径
   对账）；discipline-map 源 10 十条三态 + 源 2 snapshot 行悬空指针修复（指向不存在的搁置池
   行）+ 重审触发路径挂语料。
2. **规则**：scripts/AGENTS §冒烟脚本可靠性纪律（verdict 0/1/2 契约、retry 白名单、等待显式
   状态、释放到静默；预算 45→48 升顶在案）；guides/60 路由表补 run 通道工具行 + 金标准红线
   （只许 `--update-expected` 重写，不许放宽比对凑绿）+ snapshot-replay 头注同句；guides/62
   §自写代码证据阶梯（五台阶：导出守卫 → 行为谓词 → 注册生命周期 → 真挂载 → 组装面——将来
   任何 `src/` 套件对号入座）；根 AGENTS §纪律常驻「证据匹配面」行（密钥节压缩腾位，132/132
   维持）；tests/AGENTS 前向反证规则 + 改夹具先想红。
3. **机械**：`tests/pack/export-shape.test.mjs`（插件两半 named exports / 零 default / inject
   形状；host 半空 inject 合法有注）；`tests/contracts/smoke-contract.test.mjs`（真模型档 verdict 契约
   机械钉住——行为本已合规，零脚本改动）；`src/client/index.ts` 工具卡循环 `scoped.effect`
   包裹收口（registrations are effects 达成全量包裹，源 1 行的裸注册例外消除）+ verify 门禁
   `client-effect-wrap`（防空语料：零注册即红；层边界 = 只查 index.ts 装配位）。
4. **命名即层**（用户点名的语料实践——"后缀即层"的本仓移植）：scripts/AGENTS §依赖与分层
   立命名规则（后缀申报证据类型与档位：`.test.mjs` = 唯一 regression 成员、`*-smoke` /
   `*-probe` / `*-gate`/`*-audit`/`*-scan` / 支援件在车道外）+ **真模型档登记制 closed
   set**——`tests/contracts/smoke-contract.test.mjs` 机械对账"要求凭据（引用 `.credentials.yaml`）的顶层脚本
   必须恰为名单"。判据事实：`withModelKey` 是条件透传（keyless 冒烟也合法调用，release-smoke
   实测四处调用），不能作档位判据；**凭据要求**（缺席即 exit 2）才是——文本标记恰好干净切出
   四脚本。今后"真模型档"是有机器账面的封闭词表，新档位脚本同 diff 进名单。

## 输掉的方案

1. **vitest / 覆盖率门 / 分区覆盖**：维持偏离登记（重估记录 =
   [vendor-submodule 毕业 Note](2026-09-24-vendor-submodule.md)）——TS 面只有 `src/` 一个包，
   迁移零收益；"未覆盖行 = 死代码探测器"思想由"新谓词同 diff 带谓词测试"既有规则承载。
2. **驾驶舱 HMR 行为断言**（语料台阶三的全形态）：用户无法确认见过 HMR 残留，且文档化迭代
   循环走"重启 web"不走热重载（路由表改驾驶舱行、persona 行实证）——给不在热路径上的机制
   付行为断言租金不划算。以静态 effect 包裹门禁替代。重启条件：dev:web watcher 进入迭代
   循环，或用户再遇页签重复/卡片残留。
3. **fixture 形状 corpus 测试**：node-gate / schema-scan / run-dashboard / run-state /
   vendor-artifacts 的消费测试已把每个夹具的语义逐个钉死（用例即永久反证记录，夹具腐烂即红
   ——抽检⑤实测）——再加形状层是重复保护，踩"不发明重复机制"负面判据。以"改夹具先想红"
   规则 + 抽检夹具突变实证替代。
4. **真模型录制快照通道**：维持搁置——snapshot-replay B 层（组装请求 diff）已是模型可见变更
   的 keyless 独立信号，且语料自证"同一资产身兼输入与期望会一致地复现坏脚本"，B 层 diff 恰是
   该风险的对冲。
5. **run-gates 式门禁编排器 / 七层宪法层照搬 / 性能基准层 / flake 八分类**：无对应面或规模
   未到——L0–L4 已是证据形态分层，pre-commit verify+tests 秒级已够；flake 诊断阶梯等真
   flake 出现再议。

## 实际跑过的验证

- L0：`pnpm verify` 全绿（新增门禁 `client-effect-wrap` 入 gates 数组 + evaluation §L0
  台账，`gate-ledger-sync` 对账绿）。
- 反证实录（注入回归 → 红 → 还原 → 绿）：
  ① export-shape：src/index.ts 注入 `export default` → fail 1 → 还原 pass 2/fail 0；
  ② smoke-contract：entry-chain-probe 收尾 exit 判定改常量 0 → fail 1 → 还原 pass 2/fail 0；
  ③ client-effect-wrap：工具卡循环还原裸 `slots.inject` → 门禁 FAIL → 复包 PASS + verify 全绿；
  ④ layering：临时测试文件注入子进程依赖 → fail 1 → 删除 pass 1/fail 0；
  ⑤ schema-scan（夹具突变手法，同证"改夹具先想红"）：删 clean-post 夹具 leads.md → fail 1
  → 还原 pass 9/fail 0；
  ⑥ evidence-audit：URL 语料判据突变（`corpusUrlSet.has(...)` → `true`）→ fail 3 → 还原
  pass 12/fail 0；
  ⑦ evaluation-contract：手册 owner 表 final 行突变 → fail 1 → 还原 pass 5/fail 0；
  ⑧ smoke-contract closed set：keyless 的 run-dashboard 注入 `.credentials.yaml` 引用 →
  fail 1 → 还原 pass 3/fail 0（closed set 事实基线 = 顶层 scripts 引用 `.credentials.yaml`
  者恰为四真模型档脚本）。
- L0 计数终态：`pnpm test` pass 145 / fail 0（原 140 + 新增 5）。
- 改动面（`src/client/`）真挂载：pack 构建 + `client-load-smoke`——22 条断言 PASS、2 条 FAIL
  （重入点描边 / ↻ rerun 回边）。**隔离反证**：还原裸版重建重跑，失败集完全一致——2 红与本
  改动无关，系绑定会话（`drt_2026-ai-video-generation-landscape`）盘侧真值与 UI 渲染的既有
  错位，立 [BUG-003](../../_backlog/_archived/fixed_bugs/BUG-003-client-load-smoke-loop-edge-mismatch.md)
  （P2）跟进，不阻断本条目。

## 后续核对

[目录与入口治理 Note](2026-10-05-project-navigability.md) 细化本篇“命名即层”与
closed set 的证明范围：后缀不决定凭据档位；凭据字符串名单不发现 CDP 经既有会话触发模型的路径。
分层、默认回归与反证纪律保持有效，独立 smoke 负责其余执行路径。

## 环境状态

- 工作树含上条目在飞改动 `dev/hitl-answer.mjs`（HITL 代答修复待实弹复验）——本条目未触碰，
  窄证据切片提交绕开。
- 未跑项（如实分列，均非本条目改动面）：L1 preset-smoke / L2 release-smoke（无 preset 与包
  结构改动）；entry-chain 探针（未动 docs/AGENTS.md，按节奏不跑）；L4-lite（无模型可见文本
  改动）。
- 语料消化输入 = `/Users/bowhead/deepseek-harness/_digested/test-strategy/`（11 篇全文）。
