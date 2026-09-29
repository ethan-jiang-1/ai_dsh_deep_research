# 质量把控证据环（schema-scan 工具化 + 门决策表实测 + 覆盖面诚实地图）

> 状态：proposed

## 问题

- 用户挑战（2026-09-29，node-io-schema 毕业当日）：「有证明嘛？我怎么知道你每一步的 schema 有很好的定义？你有很好的质量门来约束呢？」——上一程的「Goal 完成」是宣言不是证据；证据散在 handoff 与会话里，不可复跑。用户定调：**质量把控 = 反复敲打（ongoing），证据/覆盖面/测试例子齐了才算有。**
- 质量把控是会话行为不是仓内合同：schema 保真度从未对全部归档 bundle 系统性扫描；门决策表只有夹具单测（纯函数直调）+ 两例真实 bundle，缺真数据突变矩阵；node-gate 的 **CLI 入口无覆盖**（2026-09-29 实测抓到副作用缺陷：报告写入污染 tracked 夹具区 6 个文件）。
- 首次全量扫描（2026-09-29，14 个归档 bundle）实锤 schema 漂移史：**6/14 核心违约**——4 场 pricing run 缺 `leads.md`（deepseek 另缺 `review.md`）、cpu-gap 缺 `findings.md`、agentic-parity final.md 位置漂移（2026-09-26 已知缺陷实例）。`leads.md` 模板与手册条目自 R1（ea0d3b7，2026-09-23）即在——**schema 在场而无机械把守，角色照漂**：散文契约不拦角色的又一实证（与 G8 同因）。
- 断代口径：全部 14 个 bundle 交付落盘（final mtime）≤ 2026-09-28，先于契约落地（3236e22，2026-09-29）——违约全部属于契约前期；**契约期后尚无交付对象，「契约期零违约」目前无对象，不得宣称**。另：journal 含模型幻觉未来日期（7 本，最远 2026-10-20 > 今日 2026-09-29）——日期契约违例线索，须显性化而不是无视。

## 方案

- **schema 保真度扫描工具化**：`scripts/schema-scan.mjs`（keyless 纯 fs，核心可导入）——对 bundle 断言**核心 schema**（question.md 含 §Decisions / topics / leads / findings / review 含 readiness / final.md 在 run 根 / evidence/ 非空 / 位置漂移形态），交付尾件（journal / final/vN / audit.md / node-gate.md）分档报告；**断代定红**：交付日 ≥ 契约日（2026-09-29）且违约 → exit 1；契约前期违约 → 如实报告不计红（run bundle 是交付记录，不改历史）；无日期可断 → 按契约期从严（可定日期而不定 = 逃逸口）；journal 未来日期 → INFO 异常旗。默认扫 archive 全量；点名目录扫指定 bundle（交付时刻用）。
- **门决策表补齐真数据突变矩阵**：在已验的「抽拍板行 → 双 RED」外补三形态——readiness→FAIL（门② N/A 隔离）、删 final/（门③ N/A 隔离）、真 basename 隔离（仅门③红）——决策表与 NODES.md 第 7/8 行判据逐格对齐。
- **node-gate 夹具区副作用修复（先红后绿）**：CLI 报告写入加防护——bundle 在 tests/ 下 → 跳过写报告（判定走 stdout）。红证已在（6 个未跟踪文件实锤）；修复后夹具矩阵跑完 git status 干净。
- **覆盖面诚实地图固化**（数字见验收）：八节点机械把守分层——**在场级**（schema-scan）全节点输出件覆盖；**判据级**（node-gate ②③）交付两门；**深度审计**（evidence-audit）挖掘/综合段；节点 2 组队无文件形态（journal 留痕）。「全部有门」不许说——1/3/6 判据门按证据升格，燃料 = 6 实例违约池 + 未来 run。
- **敲打循环常态化**：每场新 run 交付后 / 每次门变更后，跑三步证据（schema-scan 全量 → node-gate 决策表抽查 → evidence-audit）；计数与违约地图进交付记录，不宣称一次性闭环。

## 输掉的方案

- **schema-scan 进 L0（verify）**：运行区不进 L0 是实测纪律（pre-commit 会被 run 产物拦红）；run 数据完整性由 critic + 仪表盘 + audit 呈现（手册已定）。schema-scan = 验收档命令，同 node-gate / evidence-audit 通道。
- **回填修复历史 bundle**：run bundle 是交付记录，不改历史；违约地图本身就是「为什么需要契约与门」的证据。
- **一次性验收报告**：报告会过期，可复跑命令不会——用户定调反复敲打，一次性宣言不可信。
- **全节点判据门一次上齐**：假牙齿教训（floor 前车之鉴）——节点 1/3/6 判据门等 run 实证再升格；本条目只做「在场级全覆盖 + 违约池显性化」。

## 验收

1. `node scripts/schema-scan.mjs` 全量跑通：违约地图 = 6/14 全契约前期（mtime 断代），契约期对象 0 如实呈现（不宣称零违约）；exit 0。
2. `tests/schema-scan.test.mjs`（node --test）：断代逻辑反证——契约前违约不红 / 契约期违约红 / 无日期从严红 / 位置漂移形态 / journal 未来日期异常旗。
3. node-gate 决策表逐格：夹具 6 形态 **CLI exit 矩阵** + 真数据突变 4 形态（双红 / 隔离红 / 门② N/A / 门③ N/A）+ 真实 bundle 2 例（双 PASS / PASS-RELAY）。
4. 副作用修复红绿证：修复前 6 污染文件（已实证）→ 修复后夹具矩阵 + git status 干净。
5. evidence-audit 复跑（复制件上，不动归档原件）CRITICAL=0。
6. `pnpm verify` 全绿 + `pnpm test` 全绿；node-gate 与 schema-scan 双双入 guides/60 §2 命令正本（node-gate 此前漏登记）；NODES.md 机械把守行补在场级一层（pack 种子同步）。
