# RFC：M2 计划形状升级——把 rb_plan 的范围纪律与修订记录吸收进模板

> 状态：**approved（2026-09-24 用户批准；同日实施落地——实施记录见文末）** · 2026-09-24 ·
> 归宿：roadmap ▶「首个完整研究 run」
> 依据：源头仓亲读实证——`dpt_rb_glm-5-3-deepseek-v4-domestic-chips/rb_plan.md`（真实
> run 的计划书实物）对照本仓 `research-workspace/templates/run/`。

## 依赖与落地次序

第 ① 件（落地序见 roadmap 队列行）：无前置；run-mechanics 的流程图与验收引用本件产物。

## 问题

源头计划书里三块真功夫，我们的模板没有载体：

1. **范围纪律**：源头的 Scope 显式分 In / **Out（带排除理由——该 run 把"沐曦"排除、
   理由"目标模型无 Day0 适配且规格冲突未定案"记录在案）** / **待定**；我们的
   question.md 只有"背景与动机"，范围漂移无处可锚。
2. **研究问题分解**：源头 Goal 带 Purpose（**为谁决策什么**）+ 5 条 Research Questions；
   我们只有一句话定稿——lead 的拆解没有落点（拆完直接进 topics，中间层丢了）。
3. **方向修订记录**：源头 `## Decisions` append-only——每次 rerun/方向修订记：
   delta 类型（新增/移除/方向补充）+ 受影响 topics + **agent interpretation** +
   **用户原话 verbatim**。我们的 journal.md 是自由纪要，没有这个结构。

## 方案（模板三改，全部最小改）

1. **question.md 增四节**（HITL1 快照之前）：
   - `## 研究问题（定稿）`（现有）之后：`## Purpose——为谁决策什么`（一句话，**必填**）；
   - `## 研究问题分解`（3–6 条 Research Questions）；
   - `## Scope`：In / **Out（方向级，每条带排除理由；单来源弃用不入此——住 scout
     leads.md"已排除"行）** / 待定；
   - `## Constraints`：语言 / 时间预算 / 地域 / 来源偏好；`User Research Controls` 默认"未提供"。
2. **topics.md**：`must_answer` 从一句话升为**问题列表（2–5 问，每问可判"答了/没答"）**
   ——对齐源头 topic_registry 的 must_answer 数组。
3. **question.md 增 `## Decisions（append-only，最新在上）`**：方向修订/重跑记录，字段对齐
   源头：delta 类型 / 受影响 topics / agent interpretation / 用户原话 verbatim。重跑语义
   （原定 `runs/<slug>-v2/` 新目录，D17 修订 = 同 bundle final/ 版本演进——见 run-bundle
   Note），**记录形状对齐源头**。

## 输掉的方案

- **照搬 rb_* 控制文件全套**（rb_status/rb_queue/rb_trace）：否——那是无状态会话的崩溃
  恢复机制；DSH 会话日志即真相（映射表 §2 已弃用，维持）。
- **Decisions 单独建 decisions.md**：否——question.md 是 lead 的 owner 面，修订历史跟
  问题定稿同家最顺；单独文件 = 多一个家。
- **topic_registry 的 UID/ordinal 机制**：否——markdown 锚点承担（映射表 §1 已简化）；
  must_answer 列表才是本轮要吸收的实质。

## 验收判据

- 三个模板更新后：`verify` 门禁 7 全绿（模板六件在位不变）；映射表 §1 的
  instantiation / seed-topics / **rerun** 三行"本插件载体"列同步（Decisions 记录并入
  rerun 行——原映射只写了"新 run 目录 + 引用前版"）；evaluation-contract 测试绿；
- 同步面（docs 只写 now）：手册目录约定的 question.md 行补"四节 + Decisions"描述；
- 落地面：L0 + L3（映射表审查 + evaluation-contract）——模板是方法论载体、非 preset
  内容，不触发 L1；
- M2 run 实际用上（question.md 四节非空、Decisions 至少一条——HITL1 本身就是第一条
  决策记录；此项由 run-mechanics 的 run 汇总核销）。

## 开放问题（已定，2026-09-24 用户拍板）

1. Out-of-scope 粒度：**方向级进 Scope.Out**（每条带排除理由）；单来源弃用留在 scout 的
   leads.md"已排除"行——已有载体，不重复安家；
2. Purpose **必填**——"为谁决策什么"是对齐质量的最强约束（与源头一致）。

## 实施记录（2026-09-24）

- question.md 模板：四节落地（Purpose 必填 / RQ 分解 3–6 条 / Scope In·Out 方向级带理由·待定 /
  Constraints 含 User Research Controls 默认未提供）+ `## Decisions` append-only（最新在上，
  字段注释对齐源头；HITL1 定稿即第 1 条示例行）；
- topics.md 模板：must_answer 升为缩进问题列表（2–5 问，每问可判"答了/没答"）；
- 同步面：手册目录约定 question/topics 两行；映射表 §1 instantiation / setup-seed-topics /
  rerun 三行（rerun 行并入 Decisions 记录——原映射只写"新 run 目录 + 引用前版"）；
- 跑过的检查：`node scripts/verify.mjs` 9 门全绿 + `node --test tests/*.test.mjs` 10/10
  （含 evaluation-contract）——落地面 L0+L3 按 RFC 判据齐；
- run 内判据（四节非空 + Decisions ≥1 条）由 ④ run-mechanics 的 run 汇总核销，未核销。
