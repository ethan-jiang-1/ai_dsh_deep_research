---
status: 已结
opened: 2026-10-27
---

# 推敲：数据契约复核后的硬化计划

> 立卡：2026-10-27 ｜ 状态：已结（2026-10-27） ｜ 类型：Task ｜ 结论倾向：现在做——P1/P2.3 已落地；P2.4/P2.5/P3 转触发器 ｜ 可关闭：是

**关闭结论（2026-10-27）：** P1.1 `run-accept-smoke` ALL PASS（绝对 present 归一/二次绿/bundle 外红不写/秘密红不写/`--repair` 绿）；P1.2 数据卡形状测试（9 列、P2 保留、凭据秘密、run.md 声明）带注入红证；P2.3 加 `AIza`/`xox[baprs]-` 两类高置信模式 + 负例。P2.4/P2.5 与 P3 转 `triggers.md` 可观察条件。`pnpm verify` 全绿、`pnpm test` 900。去向：implemented — [数据契约 Note](../../../notes/implemented/2026-10-27-release-data-contract.md)。

**问题与期望结果：** 复核 `6b0b16d..9d78641`（数据契约落地 + 两轮 review 修正）后，架构判断没有漂移，
但证据面有强弱差：有的结论只有静态断言或一次性 live 证据，缺少可复跑的回归。期望把「已落地」变成
「可重复证明」，并明确哪些不做。

**当前情况（2026-10-27 复核结论）：**

- **意图对齐**：FAQ 26 的承诺/家/作用域框架已落进 README §Data（可见性/秘密列、run.md 声明行、凭据拆行、
  E2 出网、不使用 attachments/spill/RAG、一通道一工作区）；D1–D4 全采纳。
- **强证据**：回执相对路径 + `--repair`（单测 + 现网 bundle 两次 run-accept 绿 + path-hygiene/secret-scan）；
  种子 schema/`--clean`（单测 + scaffold-smoke 全覆盖）；rc.3 客户端挂载（真浏览器 smoke）；卸载保留团队层
  （release-smoke 断言）；secret-scan 交付物面（单测 + CLI scope smoke + 现网干净）。
- **中等/静态证据**：`apiKey` 移除（源码静态钉子 + typecheck）；无 storageDomain/localStorage（静态不变量 +
  注入红证）；N2 披露（README 存在性 + release-smoke 层保留）。
- **弱/缺失**：`run-accept` 的**全链**（回执写前/写后、repair、secret/path 拒绝路径）没有可复跑的集成 smoke，
  只有单测 + 一次性 live；数据卡只有「列存在」断言，没有形状/语义检查；Windows、CI rc.3 矩阵无证据。
- **运行面**：3083 通道 GREEN（profile 0.1.3，研究状态页签可见）；`pnpm verify` 全绿、`pnpm test` 896。

## 计划

### P1（下次发布前，优先）

1. **`run-accept` 集成 smoke（keyless）**：合成新契约 bundle + 最小 session 日志（HITL1/HITL2/present），
   跑真 `run-accept`：
   - present 为绝对路径 → 回执归一化，`path-hygiene` 干净；
   - present 指向 bundle 外 → 预检红、不写回执；
   - 写入 `sk-…` 到 final → secret-scan 红、不写回执；
   - 连续两次绿（幂等）；`--repair` 修旧回执后仍绿。
   证据 = 新 `scripts/smoke/run-accept-smoke.mjs`（或扩展现有 run smoke），纳入发布前清单。
2. **数据卡形状测试**：表头含「谁看得见/秘密」；每行 9 列；P2 行带「保留」；凭据行标「是」；run.md 行
   标「声明（非权威）」。只钉形状，不冒充语义正确。

### P2（发布后硬化，按需）

3. **secret-scan 模式扩展评估**：是否加 `AIza`/`xox[baprs]-` 等高置信族；每加一族必须带误伤负例
   （安全题材示例）与 CLI scope 证据；不加泛化 `token=`。
4. **保留期只读报告**：`run-inventory`（bundle 数量/大小/最老日期）供用户决定删，不做自动 GC。
5. **Windows 边界**：本包不承诺 Windows；若要支持，先补 `portableBundlePath` 的 win32 单测与
   `scaffold` 路径守卫测试，再改 README 支持矩阵。

### P3（触发器，不排期）

6. `compat-client-smoke` 进 CI：需 runner 具备全局 rc.3+chromium；在此之前保持发布前本地必跑
   （guides/64 已写），缺环境 exit 2 不算通过。
7. 多工作区需求出现时：各起通道；不引入 per-workspace domain/home 账本。
8. 方法库增长纪律需要计数时：用 storage domain，不往 `method-library.md` 塞机器状态。
9. 上游 agent-team 毕业/改名/移除：按 `triggers.md` 重议。

## 落地结果（2026-10-27）

| 项 | 结果 | 证据 |
|---|---|---|
| P1.1 `run-accept` 集成 smoke | 已落地 | [run-accept-smoke](../../../scripts/smoke/run-accept-smoke.mjs) ALL PASS（5 条路径） |
| P1.2 数据卡形状测试 | 已落地 | `tests/pack/data-plane-invariants` 4 例；删「谁看得见」列 → 红（已录） |
| P2.3 秘密模式扩展 | 已落地 | `AIza` / `xox[baprs]-` + 正反例；`pnpm test` 900 |
| P2.4 保留期只读报告 | 已落地 | [run-inventory](../../../scripts/run-ops/run-inventory.mjs) + lib 单测；现网实跑 56 场/26.2 MiB |
| P2.5 Windows | 以后做 | 触发器「Windows 支持」 |
| P3 | 触发器 | `triggers.md`（CI rc.3 / 多工作区 / 方法库计数 / 团队层毕业） |

## 验收标准

- P1.1：smoke 能在干净 clone 上复跑；红路径（bundle 外 present / secret 命中）真的红，绿路径连续两次绿；
  `pnpm verify` + `pnpm test` 不因新 smoke 破 layering（子进程只住 `scripts/smoke/`）。
- P1.2：删任一列/改行宽/删「保留」→ 测试红（注入反证记录在测试头注）。
- P2 每项：要么带可复跑证据落地，要么写入 `triggers.md` 的可观察条件。
- 全程不改变「无 storageDomain / 无 home 账本 / 不自动 GC」的架构判断。

## 关闭条件

P1 两项落地且证据在树内；P2 各项有结论（做/不做 + 条件）；P3 触发器在 `triggers.md` 或本卡记录；
结论去向按 implemented Note 或 deferred 触发器记录后归档。
