# 质量把控证据环（schema-scan + 门决策表实测 + 覆盖面地图）

> 状态：implemented

## 决定

- **schema 保真度扫描工具化**：`scripts/schema-scan.mjs`（keyless 纯 fs，`scanBundle`/`scanAll` 可导入）。断言核心 schema = NODES.md 八节点表「输出（写）」列全行（question.md 含 §Decisions / topics / leads / findings / review 含 readiness / final.md 在 run 根 / evidence/ 非空 / final/final.md 位置漂移形态）；交付尾件（journal / final/v1.md / audit.md / node-gate.md）分档报告不计违约。**断代定红**：交付日（final.md mtime，回退 final/v1.md → question.md）≥ 契约日 2026-09-29（3236e22 NODES.md 落地）且违约 → exit 1；契约前期违约如实报告不计红（run bundle 是交付记录，不改历史）；无日期可断按契约期从严（可定日期而不定 = 逃逸口）。journal 未来日期 = INFO 异常旗（模型时间感不可信），不计违约只显性化。默认扫 archive 全量；点名目录扫指定 bundle（交付时刻用）。定位 = 验收档命令（同 node-gate / evidence-audit 通道），不进 L0。
- **node-gate CLI 夹具区防护**：bundle 位于 tests/ 下 → 跳过报告写入（判定走 stdout）——写报告 = 污染 tracked 区。红证：防护前 CLI 跑夹具矩阵产生 6 个未跟踪 node-gate.md（2026-09-29 实测）；防护后同矩阵跑完 git status 零新文件。
- **覆盖面诚实地图**（机械把守分层，正本表述 = NODES.md 头注）：**在场级**（schema-scan）覆盖八节点全部输出件；**判据级**（node-gate ②③）= 交付两门；**深度审计**（evidence-audit）= 挖掘/综合段；节点 2 组队无文件形态（journal 留痕）。「全部有门」不许说——节点 1/3/6 判据门按证据升格。
- **敲打循环常态化**：每场新 run 交付后 / 每次门变更后跑三步证据（schema-scan 全量 → node-gate 决策表抽查 → evidence-audit）；计数与违约地图进交付记录。用户定调（2026-09-29）：质量把控 = 反复敲打，证据/覆盖面/测试例子齐了才算有——「Goal 完成」宣言不构成证据。
- **登记**：guides/60 §2 补 node-gate（此前漏登记）+ schema-scan 两行命令；NODES.md 机械把守行改两层表述；手册 NODES.md 行同步；pack 种子随 sync-pack-workspace 重同步。

## 输掉的方案

- **schema-scan 进 L0（verify）**：运行区不进 L0 是实测纪律（pre-commit 会被 run 产物拦红）；run 数据完整性由 critic + 仪表盘 + audit 呈现（手册已定）。schema-scan = 验收档命令。
- **回填修复历史 bundle**：run bundle 是交付记录，不改历史；违约地图本身是「为什么需要契约与门」的证据。
- **一次性验收报告**：报告会过期，可复跑命令不会——用户定调反复敲打，一次性宣言不可信。
- **全节点判据门一次上齐**：假牙齿教训（floor 前车之鉴）；节点 1/3/6 判据门等 run 实证再升格，本条目只做在场级全覆盖 + 违约池显性化。

## 验证

（2026-09-29 实跑）

- **schema 全量扫描**：`node scripts/schema-scan.mjs` → 违约地图 = 契约前 6/14（agentic-parity final.md 位置漂移〔2026-09-26 缺陷实例〕；cpu-gap 缺 findings.md；4 场 pricing run 缺 leads.md，deepseek 另缺 review.md），契约期对象 0（「零违约」无对象不得宣称——CLI 尾行原样输出）；另抓 7 本 journal 含未来日期（最远 2026-10-20 > 当日 2026-09-29）。leads.md 模板与手册条目自 R1（ea0d3b7，2026-09-23）即在——一轮初判「schema 在场而无机械把守，角色照漂」；**同日二轮勘误（材料复核推翻该归因，见 [schema 债务清偿](2026-09-29-schema-debt-clearance.md)）**：4 场 pricing 实为 quick_factual 编制合法跳过（类型/记账俱在），属 schema 歧义而非角色越轨；真缺陷 = 位置漂移 ×1（已机械归位）+ findings 契约演进债务 ×1（已显性 backfill）；6/14 地图已收敛至 0 违约 + 5 豁免。
- **断代逻辑反证**：`node --test tests/schema-scan.test.mjs` 6 断言全过（契约前违约不红 / 契约期违约红 / 无日期从严红 / 位置漂移形态 / 断代翻转 / journal 未来日期旗）——夹具在 `tests/fixtures/schema-scan/`（5 mini bundle），断代日期经 `dates` 注入（夹具 mtime 随检出时间漂，不可作断代依据）。
- **门决策表逐格**：node-gate 夹具 6 形态 **CLI exit 矩阵**（hitl2-missing / no-question / present-missing → 1；complete / early / relay → 0）+ 真数据突变 4 形态（改名 slug + 删拍板行 → 双 RED exit 1；真 basename 删拍板行 → 门③ 隔离红 exit 1；readiness→FAIL → 门② N/A exit 0；删 final/ → 门③ N/A exit 0）+ 真实 bundle 2 例（model-ecosystem 双 PASS、open-source 门③ PASS + 门② PASS-RELAY）——与 NODES.md 第 7/8 行判据逐格一致。
- **副作用红绿证**：防护前 6 个未跟踪文件（实证）→ 防护后夹具矩阵 + git status 零新文件。
- **evidence-audit 复跑**（复制件上，不动归档原件）：32 证据 · URL 溯源 155/164 · source_url 真抓 29 · 摘录回溯 320/370 · final 链 103/103 · CRITICAL 0。
- **L0**：`pnpm verify` 全绿；`pnpm test` 109/0（含本条目 6 断言）。

## Consequences

- 节点 1/3/6 判据门升格燃料 = 6 实例违约池 + 未来 run 实证；升格走 writing-a-gate 流程（反证先行）。
- journal 未来日期旗现为 INFO：若契约期后 run 仍出现，日期契约的机械把守成为候选门（先证据后门）。
- 契约期首个交付 run = 「契约期零违约」的第一份可验证对象；pipeline-polish 第一阶段计数同窗起算。
- bash 陷阱两次咬人在案（`$(cmd)` 与 `$?` 同行 echo 时命令替换覆写退出码；管道后 `$?` 取的是尾命令）——exit 断言必须先存变量再引用。
