# claim 级独立复核：typed verdict + 机械覆盖门

> 状态：implemented

## 决定

交付判据从「review.md 的一段 `readiness: PASS` prose」升级为 **claim 级、typed、可机检**的记录：

- **四件工件**（全部在 bundle 内）：`review/claims.json`（Lead 从 `final/vN` 抄 claim，text 逐字；
  `version/finalRef/claims`）、`review/verdicts-r<N>.json`（Lead 逐字抄 child 正文进 `raw` + 同值投影进
  `verdicts`）、`review.md`（critic 团队态写终局块与覆盖表）、`review/verdict-audit-r<N>.md`（门禁 `--write` 落）。
- **派工**：3–5 条/批，一个 child；`subagent(agent_preset=critic)`（不是 `spawn_teammate`——队友 composeFrom Lead，
  没有 critic preset）；child 只回 JSON 数组，四值单值 `supported | partially_supported | unsupported | unverifiable`。
- **门禁**：`scripts/lib/verdict-audit-core.mjs`（纯判据）+ `scripts/run-gates/verdict-audit.mjs`（CLI 壳）；核最新一轮
  critical 覆盖、值域、raw 重解析、child preset/depth/只读、raw 与 child 正文逐字一致；默认只读，`--write` 落报告；
  接入 `run-accept` 第三道预检。退出码 0/1/2 同 evidence-audit。
- **HITL2**：摘要必须带三行数字——独立性层级（L2 上下文独立复核）/ critical 覆盖 x/y + UNVERIFIED 数 /
  本次重抓 URL 数；critical 有 `unverifiable` 或 `unsupported` 时 readiness 只能 FAIL（可交付但标缺口）。
- **epoch**：`2026-11-11` 起、非 quick_factual 的 run 强制；旧 bundle / quick_factual / 契约日前豁免
  （`--require` 可强制）。P4 真 run 的 epoch = 2026-11-11，覆盖强制 = 是，走了强制面。

### 与归档契约 v2 的有意偏差

归档契约（`_backlog/_archived/research/quality-loop/2026-11-10-verdict-contract.md`）写着 `claims.round` 与
`claims-sha-record` 两行；实现**收严**成 `version/finalRef/claims`（未知字段即红，轮次只在 verdicts 侧），
哈希只在门禁报告里算、文件里不接受模型自报哈希。理由：claims 是 final 版级事实源，round 属于裁决侧；
模型没有 bash，哈希归门禁才不假。此偏差由模板键集测试与 core 解析面钉死，卡验收 4 的「§5 全表」按此口径读。

## 输掉的方案

- **新只读 `verifier` preset**：代价 = 推翻 D2 + 新 D 号 + preset-smoke/roster/团队表全链；v1 复用 critic +
  `verifier-wrote` 事后审计，等试点证明「任务形状管不住写盘」再上。
- **运行时 veto**：门禁是事后检测；改盘仍可能发生，但 `raw-reparse`/`not-verbatim` 会抓。
- **语义门禁**：quote 是否真支持 claim、claim 表是否完整、source tier 配不配只能语义判；门禁只证「表内每条都真、
  都被核过」。
- **每 claim 一 child / 一次全量**：前者成本 ×N，后者注意力稀释 + 锚定；取 3–5 条/批。
- **收据扩展（`delivered.json` 带裁决块）**：v1 不做；门禁报告 + `--write` 文件已够复算，交付后复算留给 P6 可选片。
- **改手册去掉 `readiness（终局）` 括号**：手册是四个角色共用 runtime context，改一字要真模型重录四个 snapshot；
  BUG-046 选择在解析器侧窄放宽（判定词后 ≤8 字短括号），模型可见文本不动。
- **放宽最新一轮覆盖成「旧轮充数」**：v1 保持严格最新一轮；P4 的 r2 delta 缺口由 Lead 补一批 child 解决，
  而不是让 r1 旧裁决静默充数。

## 实际跑过的验证

### P0 keyless（2026-11-10，commit 7e77d24）

- `verdict-audit-core` + CLI + 28 例回归；五条红配方在真 CLI 各红一次（`not-verbatim` / `coverage-gap` /
  `verdict-invalid` / `session-preset` / `verifier-wrote`），epoch 豁免 exit 0。
- `run-accept-smoke` 补 claims-绿 / gap-红 / `--require` 强制三例；`docs/evaluation.md` L4 判据 ⑤ 与
  `scripts/README` 两表同步。

### P1 内容面（commit d324240）

- `claim-verdict` skill + critic/lead persona + team-assembly 通道行 + 手册两处；预算下放 12,187 → 12,038。
- `render-overlay` 重生成；`preset-smoke` ALL PASS；snapshot B 先红（两条 persona 被捕获）→ lead/critic 真模型重录
  → replay ALL PASS；`l4-lite-smoke` ALL PASS。

### P3 机制试点（2026-11-10；口径修正）

- `drt_claim-pilot`（2 条 critical）；Lead 派 1 个 `agent_preset=critic` child（`394f8a00…`，depth 1），重抓 2 条 URL、
  做反例搜索，回 `[supported, partially_supported]`；Lead 原文落 `review/verdicts-r1.json`；`verdict-audit --require`
  在真实会话上 PASS（覆盖 2/2；唯一黄警 = `review-missing`，试点故意不写 review.md）。
- **口径修正**：当时运行通道 profile 镜像仍是 P1 前的——child 的 `skill(claim-verdict)` 返回 unknown，它改从 pack
  路径 read `presets/critic/skills/claim-verdict/SKILL.md` 再按契约回话。P3 证的是「prompt + 文件读契约能产出
  typed JSON」，**不证 skill 真挂载**；`boot-run --drift-only` 随后证实 manual / claims 模板 / claim skill / critic
  persona 都不在镜像里。P4 先重建 profile，才在真挂载面上跑。
- **真实线形夹具**（2026-11-11 补）：Pilot A 的 child 日志脱敏切面 + 真实 bundle 三件 →
  `tests/fixtures/verdict-audit/pilot-a/`（约 92 KB）；`parseSessionFacts` 从 CLI 抽到 core；消费测试
  `tests/run/verdict-audit-fixture.test.mjs` 走 `findSessionDir → resolveSessionLog → parseSessionFacts →
  auditClaimVerdicts`（绿 + 三条派生红：改 header preset / 追加 write / 改 child 正文）。红先：把 core 的 `preset`
  读取改坏 → 2 红，还原 → 5/5 绿。

### P4 真 run（2026-11-11 01:10，`drt_api-context-caching-ds-openai`）

- 题目 = DeepSeek vs OpenAI 上下文缓存的计费/命中条件/共享与可观测性；非 quick_factual；epoch 2026-11-11 →
  **覆盖强制 = 是**。15 条 claims（14 critical）。
- r1 = 4 批 / 15 裁决（critic child `35c5ad48` / `970ace67` / `00e94a8c` / `a7ccaa83`）；r2 = 5 批 / 16 裁决
  （`5d715513` / `6a660701` / `25da6b4e` / `fec5c8ff` / `dd7cd101`），覆盖 14/14 critical。
- 报告级审查：R1 FAIL（3 CRITICAL / 12 MAJOR）→ R2 PASS（但 r2 只覆盖 10/14，作废）→ R3 FAIL
  （1 CRITICAL：`final.md:86` 绝对否定「官方没有一句存储免费」被 DeepSeek 2024-08-02 官方页反证）→ R4 PASS
  （仅验修复）。终局 `readiness: PASS`。
- HITL2 三行数字：L2；critical 14/14（supported 6 / partial 8，UNVERIFIED 0）；重抓 44 条 / 去重 17 URL。
  HITL2 由操作侧代理代答「定稿」，`question.md §Decisions` + `hitl-answer` provenance 均标「代理模拟」。
- `run-accept`：node-gate / evidence-audit（CRITICAL 0 / MAJOR 4）/ verdict-audit / path-hygiene / secret-scan 全 PASS；
  `delivered.json` + `acceptance.md` 落盘；final v1 sha256 = `afd29aee745a1314466981898363163469a4e6d5c173599ea749df57058cf6e5`；
  未归档（保留 `research-workspace/drt_api-context-caching-ds-openai`）。
- **中段门禁当场抓到并修复的四件事**（这就是「先证红」的价值）：
  1. C3/C5 claim text 不是 final 逐字原句（bold/拼句）→ Lead 改回逐字子串；
  2. Lead 改写 critic 的 `raw`/`reason` 并丢 C4 → 按 child 原文重抄（四批全部逐字）；
  3. 两批 child 输出带 ```json 围栏，门禁 `JSON.parse(raw)` 误红 → `parseRawVerdicts` 只剥一层围栏解析，
     `not-verbatim` 仍按原文比对（commit `b33ef1e`；红先：4 条新用例，修复前 2 红，修复后 32/32）；
  4. r2 只覆盖 10/14 critical（旧轮不能充数）→ 补 1 批 C1/C3/C7/C9；HITL2 摘要曾写「14/14」空话 →
     打回「改说法」后才重发，最终摘要带三行真实数字。

### 测试资产与探针

- keyless：`tests/run/verdict-audit.test.mjs`（32 例，含围栏四例、模板键集钉）、
  `tests/run/verdict-audit-fixture.test.mjs`（5 例，真实 child 日志线形）。
- 真模型档：本轮没有新增常驻 claim-verdict 探针；P4 本身是整链证据，中段用 `verdict-audit --no-write`
  当检查点（正是这次抓到 raw 改写/围栏/覆盖缺口的层）。若后续 claim 段再漂移，优先补
  `probes/behavior/claim-verdict-probe.mjs`（1 lead + 1 critic child；不替代 P4 的 HITL2/交付面）。
- L0：`pnpm verify` 全绿；`pnpm test` 1111/1111（P0 时 1083；围栏四例后 1111）；`run-accept-smoke` ALL PASS。

## 残余风险与未决

- **soft 只读**：critic child 有 fs 写能力，v1 靠任务形状 + `verifier-wrote` 事后核；堵法 = staging cwd（只放
  claims + evidence），试点证明管不住再上。
- **claim 表完整性不由门禁保证**：门禁只证「表内每条都真、都被核过」，不证「表没漏」；漏判靠团队态 critic + 用户。
- **同轮补批的 duplicate 裁决**：P4 的 C13/C14 在 r2 有两条（batch 2 + batch 4）；门禁按并集判覆盖并告警，
  第一条用于 pass 检查。本次两条都结论性、无 unsupported/unverifiable，未影响 readiness；若将来出现
  supported/unsupported 冲突，需语义审或显式 supersede 语义。
- **团队角色隔离是名义的**：`spawn_teammate` 的队友 composeFrom Lead（P4 的 scout/analyst/critic-1 实际是 Lead 克隆）；
  真正带 preset 的只有 `subagent(agent_preset=…)`。claim 段用的是真 critic child；报告级审查员的角色隔离仍是
  已知边界（与 D45 同源）。
- **独立性只到 L2**：同模异上下文；本仓无第二家 provider 凭据，L3 不做，不许写「第二双眼睛」。
- **typed 输出仍是 prompt-only**：P3/P4 都真出了 JSON，但 `subagent` 仍不暴露 `outputSchema`；长尾/弱模型需探针复测。
- **epoch 与 quick_factual**：2026-11-11 前的 bundle 与 quick_factual 仍豁免；要「交付后复算」再加收据扩展。
