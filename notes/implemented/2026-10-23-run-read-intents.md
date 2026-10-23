# run bundle 按意图读：五问、停止条件与旧场版本规则（已落地）

> 状态：implemented
>
> 首提 2026-10-23 ｜ 合同 [研究手册 §状态头、读序与恢复](../../research-workspace/AGENTS.md) ·
> [NODES §审查](../../research-workspace/NODES.md) ｜
> 代码 [run-receipt](../../scripts/lib/run-receipt.mjs) · [run-bundle-charter.test](../../tests/contracts/run-bundle-charter.test.mjs) ｜
> 相关 [run bundle 宪章](./2026-10-23-run-bundle-charter.md)

## 决定

- **读序从一条线性清单改成按意图的四条路由**：继续 / 交付 / 查证 / 旧场；每行给“先读、停在哪、
  不读”，并统一以 **五问**（阶段 / 最近拍板 / 最大未闭合 / 下一步 / 交付态）作为停止判据。
  线性全量读序只保留文件顺序，不再冒充“每次都要走完”。
- **旧场不再靠猜**：`run.md` 缺席走旧表；旧表按“最高 `final/vN` + §Decisions 对应拍板 + present
  指向同一 vN 或 `acceptance.md` 在场”判 accepted；present 指旧 vN 且无 acceptance = delivery。
  旧场 `final/v1.md` 可兼作版本索引（修复回填可加索引行、正文不改）；新契约 `final/vN` 不可变。
- **交付口径写死**：`final/` 取最高 vN；`final.md` 是当前稿，不是交付副本；新契约看
  `delivered.json`，旧场只有 `acceptance.md`（二选一）；`acceptance.md` 只记硬门（CRITICAL 0），
  MAJOR 看 `audit.md`；旧场 receipt 无哈希，交付后改 review/plan 要重跑 `run-accept`。
- **review 只认当前终局块**：文件头声明方向（当前实现最新在上）；`readiness: PASS|FAIL` 是判据，
  末尾/历史轮的 PASS 不算；NODES 的“末尾固定”改为“当前块（最新在上）”。
- **冲突/过期有优先级**：最新 journal + §Decisions + final 事实 > plan 剩余工作 > review 历史轮；
  `> rerun:` 不是必需，rerun 以 §Decisions 的 vN 行 + `final/vN` 为准；查证行优先于旧场恢复。
- **合同有机械锁**：`run-receipt.READ_INTENTS` 与手册表逐项由 `run-bundle-charter.test` 锁定；
  `READ_ORDER` 仍锁全量顺序。**不新增 per-run `AGENTS.md`/静态 map**：地图是手册读表 +
  交付后生成的 `manifest.json`，不是 bundle 里的第二个指令通道。
- **手册注入预算 16KB → 18.5KB**（四个 preset `maxBytes` 同改）：新增的是停止条件与旧场版本
  判据，不是教程；`handbook-budget` 仍以 1KB 余量防静默截断。

## 输掉的方案

- **保留一条线性读序，只加注释**：fresh-agent 实测会把它走成“全读”；continue 任务读了
  plan/最终稿/审查，仍不知道何时停。按意图路由 + 五问才把“读什么”变成“答什么”。
- **给每 run 一个 AGENTS.md 或静态 KNOWLEDGE_MAP.md**：第二指令通道、静态图必腐、旧指令赢；
  宪章 §7/§11.4 已禁，schema-scan 新 run 机械拦。
- **只靠交付后的 manifest 当知识地图**：manifest 是回执，交付后才生成；运行中仍需要读表。
- **只加文字不加机械锁**：手册表与 `READ_INTENTS` 会漂移；用测试锁住才叫合同。

## 实际跑过的验证

- 7 个 fresh-agent 只读探针（第一轮 3：继续 / 交付 / 查证；第二轮 4：继续 / 交付 / 查证 /
  文件地图）：
  - 读表注入可见；继续任务从 `run.md`（旧场则 journal/§Decisions）起，停在五问，不读全部
    evidence；交付任务停在 `final/vN + HITL2 + review 终局 + 回执`；查证停在 F# + 对应 evidence；
    文件地图能从名字 + 手册 + 文件头推出，不需要读正文。
  - 第一轮暴露并修掉：交付行漏 `final/vN`/§Decisions/回执；review 终局“末尾 vs 最新在上”；
    旧场 v1 兼索引；plan 剩余工作过期；review H1 仍写 v1；`plan/` 与 ops 输出未进目录树。
  - 最终未阻塞的发现：AA “53 vs 45 = 8 分”在 final §0.3 把 45 腿标成等级 A/as-of 09-07，
    卡片实为 B/10-21 且单域 `单源——待破`；这是**研究内容的口径问题**，不是读序问题，未改
    已交付报告（要改须出新版本）。
- `pnpm verify` **44 门全绿**（含 `handbook-budget`：17,461B + 1,024B ≤ 18,944B）；
  `pnpm test` **747/747**；`preset-smoke` 真挂载 **ALL PASS**；`overlay-fresh` /
  `pack-workspace-fresh` 绿（overlay 与 pack 种子已重生成）。
- 旧 bundle 数据对齐：review H1/文末注、plan 剩余工作、acceptance 重跑；`run-accept` 绿，
  CRITICAL 0 / MAJOR 42；旧场无 v2 present / 无 delivered.json，按 epoch 豁免。

## 边界

- 旧场 receipt 没有文件哈希；review/plan 的交付后修改只能靠 journal + 重跑 acceptance 记录，
  不能从 receipt 复算。
- `evidence-audit` 的 MAJOR 42 不阻断门 A（硬判 CRITICAL=0），acceptance 不列出；要清零是
  另一轮证据复核。
- 本次只改“怎么读/怎么判状态”，没有改研究结论；AA 8 分那条若用户要修，需要 v3/新版本。
