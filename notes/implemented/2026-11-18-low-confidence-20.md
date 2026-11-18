# 低置信区 20 卡：run 合同的字段/值域/外键/浅检（批 L：BUG-260…279）

> 状态：implemented
>
> 历史注记：续 [model-visible-semantics](2026-11-18-model-visible-semantics.md) 的字段消费者；
> 上一批的决定仍现行，本批把“消费者存在但只做浅检”的剩余补齐。

## 决定

1. **findings 一律块级**（260–263）。`parseFindingsOf` 的块对象保留 `hasLensGapsLine`/`lensGapsRaw`；
   支撑证据存在性与 lens 无关、所有块都查；`lens_gaps` 缺行/空列表按块判；重复 F# 红。
2. **topics 的主键/图/数量/闭集**（264–266 / 277 / 279）。`parseTopicsReport` 保留
   `mustAnswer`/`dependsOn`/`lenses`，重复 T# 红；`must_answer` ∈ [2,5]；`depends_on` 校验未知/
   自依赖/环；`LENS_IDS` 与 `content/lenses/*.md` 单一正本（template-contract 对账）；evidence
   `supports` 必须指向存在的 T#。
3. **plan 独立门**（267 / 268）。新增 `checks/lib/gates/plan-gate.mjs`，由 node-gate 聚合：
   硬结构（环/悬空 parent·dep/重号/自依赖/混合族/退役依赖/无后继墓碑）红；`owner_role ∈ 角色集`、
   `kind ∈ 闭集`、`lifecycle` 合法、`## 剩余工作` 在场、图版本 > v1 需前版快照；wave-prefix 等
   迁移提示仍只进 detail。
4. **run.md phase 矩阵**（269）。active 段 `next` 不得 none；delivery 段 `delivered` 必须非 none；
   非停放段 `parked` 必须 none；accepted 终态 `next: none`；parked 段必须有原因。
5. **claims/verdicts 的锚可核**（270 / 274 / 275）。URL 统一 `http(s)` + 去重；同一 claim 的
   裁决值不同 → `verdict-conflict` 红（同值重复仍只是 warning）；零 critical → `no-critical` 红，
   只有 claims 顶层 `critical_exemption` 写理由才降为 warning。
6. **protocol 的承诺有下游**（271–273 / 276 / 278）。`evidence_threshold` 与 evidence.quality
   逐卡比（quick_factual 豁免）；`output.length` 用 `Intl.Segmenter` 分词（zh）/非空行/50（pages）
   计 final 长度；`gates.claim_verification`/`critic` 决定 claim 裁决是否必须（跳过要有
   `approval_basis`）、`critic: none` 跳过 review 要求（`--no-review`）；`library_fields_sha256`
   从 bundle 父目录的 `method-library.md` 重算字段 sha；waves 超预算红，除非 `deviations` 显式
   批准 `effort.waves_max`。
7. **旧场只严新交付**：已归档 run 不重审计；新门作用于当前交付的 run（沿用 250–259 口径）。

## 输掉的方案

- **块级字段继续用全文正则**：假绿（261）与假红（262）都来自同一根因，不能靠“再加一条正则”修。
- **plan 只留在 UI 提示**：图的正本错误不能只在驾驶舱显示；硬/软两级拆开后，硬错误进门 P。
- **waves/zero-critical/冲突裁决继续 warning**：warning 无法让交付停下，等于没有判据；
  保留显式豁免（deviations / critical_exemption）作为唯一逃生口。
- **protocol 配置标 display_only**：用户要的是配置改变行为；只读展示会让“我关掉了 claim 验证”
  继续是假承诺。
- **方法库 sha 只校验 hex**：自由声明无法证明采用了库的哪一版；从工作区重算，缺库/条目红。
- **URL 只查字符串**：`javascript:`/非 URL 可以冒充证据锚；只认 http(s) 并去重。

## 实际跑过的验证

- `pnpm verify` / `pnpm test` 全绿；`pack.e2e` 86 条目（模板/技能变更后重导出 `_dist`）。
- 红证回放：260 无 lens + missing evidence 红；261 F2 缺 lens_gaps 红；262 只有 F1 的 `[]` 红；
  263 重复 F1 红；264 重复 T1 红；265 未知/自依赖/环红；266 0/6 问红；267 环/悬空/重号红；
  268 ghost/whatever/dead/缺剩余工作红；269 四类 phase 矛盾红；270 非 http/重复红；271 低质证据红；
  272 final < min 红；273 策略测试红；274 冲突裁决红；275 零 critical 无豁免红；276 sha 漂移红；
  277 bogus lens 红；278 waves 超预算红；279 supports T999 红；各自还原 → 绿。
- `node-gate` 新增门 F/T/P（findings/topics/plan）；`protocol-audit` 新增 evidence-threshold/
  output-length/method-library 判据；`run-accept` 读 protocol gates 策略。

## 残余风险

- **review 覆盖表仍是结构判据**：逐格卡数/质量、结论是否真被证据支持仍靠 critic。
- **plan 软提示**：wave-prefix/legacy-flat-w 只进 detail，不拦交付；迁移期可能出现“红但不阻断”的
  提示文字。
- **topicsGate 对旧 run 从严**：must_answer 是老模板就有的字段，但旧归档不重审；不要在归档件上跑门 T。
- **method-library 路径**：从 bundle 父目录找 `method-library.md`；用户工作区不在该布局时按
  “找不到库”红（声明了 library 就必须可核）。
- **长度计数是启发式**：`Intl.Segmenter('zh')` 的 word-like 切分与“字数”不完全等价；pages 按
  非空行/50 估算，仅用于预算区间，不用于精确字数验收。
- **critic: light** 目前与 `report` 同判（claim 裁决跳过），未实现更细的轻量审查映射。
- nightly / L1 / L4 未在本轮触发；无真实模型调用。
