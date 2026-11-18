---
status: 等人拍板
opened: 2026-11-18
---

# 推敲：提交前门禁耗时——gates.e2e 的 333s 与“每案例全量 verify”的范围错配

> 立卡：2026-11-18 ｜ 状态：等人拍板 ｜ 类型：Task（性能/证据基础设施） ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：pre-commit 本身只有 ~24s；长杆是收尾跑的 `gates.e2e`（157 案例，默认 4 并发，333s）。
> 成本不在门禁逻辑，而在**每个案例都整仓克隆 + 跑完整 verify**；这是范围错配，不只是并发问题。

## 问题与期望结果

用户观察“commit 前的 end to end gate 很慢”。实测要区分两条链：

| 链 | 组成 | 实测（10 核 macOS，2026-11-18） |
|---|---|---|
| **pre-commit**（每次 commit 必跑） | `git diff --check` + `pnpm verify` + `pnpm test`（spec + checks 串行） | **~24s**（verify 13.2s + spec 5.4s + checks 5.5s） |
| **收尾/交付**（本轮收口手动跑） | pack.e2e + 三个干净室入口 + gates.e2e | **~6.7min**，其中 **gates.e2e 333s（82%）** |

所以“慢”的主体不是 commit hook，而是**交付前门禁自测**。期望：完整 157 案例仍全跑时，墙钟降到
**≤60s**（目标），且 pre-commit 保持 ≤30s；失败仍能点名到案例；不允许用抽样/静默跳过换速度。

## 当前情况（实测与代码事实）

### 1. 总账

| 件 | 墙钟 | 备注 |
|---|---|---|
| `pnpm verify` | 13.2s | 59 门禁，keyless |
| `pnpm test:spec` | 5.4s | node --test 并行 |
| `pnpm test:checks` | 5.5s | 131 文件?（按当前树） |
| `pack.e2e` | 7.9s | 真 tarball |
| `cold-start` | 6.5s | 干净室 |
| `lifecycle` | 10.1s | 干净室 |
| `release` | 22.4s | 干净室 + preset.e2e |
| **`gates.e2e`（jobs=4 默认）** | **332.9s** | user 214.7s / sys 260.0s |
| `gates.e2e --jobs=10` | 234.4s | user 195.7s / sys 230.0s；**4→10 并发只快 1.42×** |

### 2. 为什么 10 并发不灵

- `gates.e2e` 的每个案例：`cloneFixture()`（**同步 `cpSync`** 复制 tracked 全树，1796 文件）→
  `git add -A`（**同步 `spawnSync`**）→ `runVerify()`（异步 spawn）。
- `boundedMap` 只让 **verify** 重叠；克隆与 `git add` 是**驱动进程里的同步调用**，会阻塞事件循环，
  所以 `--jobs` 增大时拷贝仍串行。sys 230–260s 基本是这 157 次整仓拷贝 + git 扫描。
- 单案例（`--case=… --jobs=1`，含 fixture 构建）实测 6.9s；即 ~157 × 6.9s 的工作量。

### 3. 每个案例都跑完整 verify（范围错配）

- 案例断言只有一条：**目标门禁**在注入后 `FAIL <gate>`（有 `expect` 时再核对报因）。
- 对照组（零注入）已经跑过一次**完整 verify**，证明基线全 PASS。
- 但每个案例仍重跑全部 59 门禁。实测单门禁 `--only` 的成本（59 门禁逐个跑，总 146s）：
  **启动地板 ~1.8–2.0s**；最贵的 `guard-red-record` 5.2s、`doc-now-only` 4.2s、`md-links` 3.0s
  （负载高时曾 9.1s）。整仓 verify 在 fixture 内约 5–7s。
- 即：案例真正需要的判据成本 ~2–3s，其余 3–5s 是“与本案无关的 58 个门禁”。

### 4. 案例分布（157 案例 / 53 门禁）

| 门禁 | 案例数 |
|---|---|
| backlog-liveness | 24 |
| call-surface | 11 |
| readme-shape / note-format | 各 10 |
| doc-paths | 8 |
| md-links / note-tree / cockpit-doc-registry | 各 6 |
| test-placement / secrets-untracked / align-ledger | 各 5 |
| guard-red-record | 4 |
| 其余 40 门禁 | 1–3 |

多数案例集中在少数门禁；它们各自守一个真实回归，不能删，但**可以按门禁批处理**（见方案 C）。

### 5. 结构事实

- 案例表正本 = `checks/lib/harness/gates-cases.mjs`（1115 行）；驱动 = `checks/smoke/gates.e2e.mjs`。
- fixture = `git ls-files` 的 tracked 全树（1796 文件，不含 vendor submodule 内容）；每个案例
  `cpSync` 克隆一份 + `git init/add`。
- 默认 `--jobs = min(4, cpus)`；本机 10 核。
- `gates.e2e` **不在 pre-commit hook**；hook 只跑 verify + tests。

## 方案与取舍

### A. 让拷贝/`git add` 真正并行（低风险，先做）

把 `cloneFixture` 换成 `fs.promises.cp`（或 macOS `cp -c` 克隆、Linux `--reflink=auto`），
`git add` 换异步 spawn；默认 jobs = `availableParallelism()`。语义不变，只改调度。
预期：现有 234s（jobs=10）→ **60–90s**；若 clonefile 命中，拷贝近零。
风险：跨平台 cp 差异（需 fallback）；失败现场保留逻辑不变。

### B. 案例只跑目标门禁（范围纠正）

`runVerify(dir, gate)` 传 `--only=<gate>`；对照组保持完整 verify（一次）。案例断言不变。
预期：单案例 6.9s → **3–4s**（2s 启动 + 目标门禁）；配合 A 约 **30–60s**。
风险：现有契约未断言“其他门禁不受影响”；若认为需要，保留每门禁一个 full-verify 代表案例。
需要验证：157 案例在 `--only` 下全绿且仍抓到注入（一次性 A/B）。

### C. 按门禁批处理（范围再进一步）

同一门禁的多个案例若 mutation 不冲突，合并进一份 fixture：注入 A/B/C… → `--only=<gate>` 一次
→ 断言目标门禁对所有注入报红（逐条 `expect` 可在输出里核）。157 次 verify → 53 次（或更少）。
风险：mutation 冲突/遮蔽（需静态检查）；失败时定位需二分（保留现场 + 单案例 `--case` 复跑）。
预期：~53 × (2–3s) / jobs + 1 次对照 ≈ **20–40s**。

### D. 变更门禁子集（工作流层）

按改动文件 → 门禁 import 闭包 → 只跑受影响门禁的案例；完整 157 案例留 nightly。
收益最大（日常只跑 1–5 个门禁的案例），但需要可靠的 file→gate 映射与“未覆盖门禁”的显式提示；
风险是映射漂移导致漏跑。可作为**交付快车道**，nightly 仍全量。

### E. 分层（不做代码改动也能立刻减感知）

pre-commit 保持 24s；`gates.e2e` 只在交付/nightly 跑（现状），并在 guides/60 写明“哪个阶段跑哪条”。
如果用户实际是在等交付，不是等 commit，这一条先把预期校准。

### F. 缓存（不推荐做主方案）

按 (gate 源 hash, case id, fixture hash) 缓存 PASS；命中跳过。风险：源依赖闭包算漏 = 假绿；
只适合本地快循环，不能替代 CI。

**推荐顺序（按“日常轻、发布重”修正）**：E（分层入口/文档）→ A（并行/克隆，发布门）→ B（目标门禁）→
D（改门禁时的快子集）。C 不进默认路线，只作容量后备。目标：日常 hook ≤30s（现状 24s）；发布门
`gates.e2e` 全量 157 ≤90s（可接受分钟级）。F 不做。

## 拍板记录（2026-11-18）

- **B 案例范围 = 目标门禁 only**：案例只断言目标门禁；对照组保留一次完整 verify。
- **预算 = 完整 157 案例全跑 ≤60s**。
- **用户补充（同日）**：日常是快速迭代，**平时不应该跑这套重的门禁自测**；只有**真正发布前**
  才认真做完整验证。重的措施属于发布门，不属于 commit/日常。
- 因此：**D 的快车道不是“更快的全量”，而是日常默认根本不跑全量**；完整 157 留在发布/nightly。

## 长期架构（修正：两层，发布重、日常轻）

**结论：长期最合理 = 两层门禁，而不是把全量压到 40s 的批处理。**

| 层 | 何时 | 跑什么 | 预算 |
|---|---|---|---|
| **日常/commit** | 每次 commit | `git diff --check` + `pnpm verify` + `pnpm test`（现状） | **≤30s（现 24s）** |
| **日常/改门禁时**（可选 pre-push） | 改了 `checks/verify/gates/**` 或 `checks/lib/**` | 只跑受影响门禁的案例（`--gate` 子集） | ≤60s |
| **发布门** | 版本发布前 / nightly | **完整 157 案例 + pack.e2e + 三干净室入口 + release-check** | 全量一次，允许分钟级；目标 ≤90s（gates.e2e） |
| **发布门（严格档）** | 发布候选 | 完整 157 + 独立复跑关键案例 + 证据归档 | 允许更久，不优化掉隔离 |

**为什么不是 C（按门禁批处理）作为长期形态**：

1. 发布门最重要的是**隔离与可诊断性**：一案例一 fixture 时，任何失败都能直接归因；批处理把
   多个 mutation 塞进一个 fixture，冲突/遮蔽的风险正好落在最需要可信的地方。
2. 日常根本不跑全量，333s 的痛点从“每次交付”变成“每次发布”；发布时 1–2 分钟是可接受的，
   不值得用隔离换几十秒。
3. 案例数增长时，先扩**发布机的并发/克隆**（A），再考虑按门禁拆 shard（多进程分片，仍一案例一
   fixture），而不是合并 fixture（C）。分片保留隔离，只是把批次分到不同进程/机器。
4. C 只在“发布门全量仍显著超过预算，且 shard 已用尽”时作为最后手段，并必须带冲突检测 +
   单案例回退 + 红集合对账；不作为默认设计。

**实施顺序（长期路线）**：

1. **E 分层先行（零代码/文档 + 脚本入口）**：明确 pre-commit 只跑 verify+test；gates.e2e 只在
   发布/nightly；加一个显式的 `pnpm gate:release`（或等价入口）并在 guides/60 写清“哪层跑什么”。
   这是最符合“日常别拖泥带水”的一步。
2. **A 发布门提速（不降隔离）**：异步/CoW 克隆 + `git add` 异步 + 默认 `availableParallelism`；
   157 次一案例一 fixture 不变。预期 333→60–90s。
3. **B 案例目标门禁 only**：对照组全量一次；案例 `--only=<gate>`。进一步降发布门时间，语义不变。
4. **D 改门禁时的快子集**（可选）：只跑受影响门禁的案例；发布/nightly 仍全量。
5. **C 仅作容量后备**：若未来案例数使发布门超预算，先 shard（多进程/多机，仍隔离），最后才考虑
   批处理；必须带上述护栏。

**什么情况下这套不成立**：如果团队要求“每次 commit 都证明全量门禁绿”，那日常就不可能轻——
需要显式改这个合同，而不是把重活藏进 hook。当前 hook 本来就没跑 gates.e2e，所以分层是
**把现状说清并固化**，不是新增负担。

## 未决问题（只剩 1 个）

1. **是否按“两层 + A/B + 发布门”落卡并开工？** C 默认不做（仅容量后备）。

## 下一步

- 用户确认后：先落 E（入口/文档，半天内可验证），再做 A→B；每步在发布门用同一 157 案例
  全量计时 + 红集合对账，证明“抓到的红不变 + 时间下降”。
- 日常 hook 保持现状（verify + tests），不新增 gates.e2e；发布检查单引用 `pnpm gate:release`。
- 本卡在确认前保持研究/方案态，不改代码。
