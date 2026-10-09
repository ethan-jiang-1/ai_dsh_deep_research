# guard-red-record：tests 面反证义务机械化

> 状态：implemented

同轮关闭的推敲卡：[_backlog/_archived/settled_issues/2026-10-09-guard-red-record.md](../../_backlog/_archived/settled_issues/2026-10-09-guard-red-record.md)（存量盘点与逐件处置记录在卡上）。

## 决定

把 tests/AGENTS 的散文义务「新契约测试带反证——只交付绿 = 不知道测试会不会咬人」机械化：`test/it` **标题串**带 BUG-nnn = 守卫声明，声明触发两件义务（company checks/run-gates.mjs guard-red-record@5c050ea 移植 + 本仓三处适配）：

1. **事故卡双址可解析**：`_backlog/bugs/`（活跃）∪ `_backlog/_archived/fixed_bugs/`（已修）并查——company 只认归档址，本仓双址是现实（活跃区现为空，机制为未来活跃卡备好）。悬空编号 = 红。
2. **逐编号留证块**：`// 负例留证 YYYY-MM-DD：…BUG-nnn…`（散文红配方）**或** `// 夹具留证 YYYY-MM-DD：…BUG-nnn…`（指名永久负例夹具——本仓「夹具语义由消费它的契约测试钉住」惯例，node-gate 的 BUG-006 即此形态）。一篇文件声明 N 个事故就要 N 条块。
3. **防空语料**：零声明被扫到即红（company 无此判——本仓 scripts/AGENTS 纪律；已知 ask-drive 等多处声明，扫到 0 = 判据源失效）。

**诚实边界**（company 同款自认）：门禁不制造回归不跑测试——它不证明留证是真的（写了但假看不出来，那靠人复现）；它证明的是"声称守卫具体事故的测试必须把红法写在守卫旁边"，把"没人知道能不能红"变成"红法可复核"。

存量处置（卡未决 4 的答案）：盘点 = 7 文件 14 条标题声明（BUG-002/004/005/006/007/008/014/015/017），**全部逐件补真留证、零豁免**——每条红配方都从对应测试正文反推（判据弱化/夹具场景名），不糊弄；清单与逐件内容在卡上。

## 输掉的方案

- **grandfather 豁免存量只管增量**：14 条声明每条都能写出真实配方（测试正文就在那）——豁免是偷懒不是必要，否。
- **真注入级红证**（对每条历史 BUG 真注入一次看红）：成本过高且重复——静态对账够用，真注入义务留给新门禁自身的反证与 gates-smoke 常驻案例（同卡原取舍）。
- **留证行内关键词宽松匹配**（任意注释提 BUG 号即算）：company 判据明写"标题是声明、注释只是解释"——宽松匹配会让解释性注释冒充留证，空转。
- **把留证块判法放进 layering.test 而非 verify**：这是结构合同不是分层合同；verify 台账 + gates-smoke 案例的既有轨道更合身。

## 实际跑过的验证

反证（先红后绿，全部实跑）：

- 标题声明无留证：local-date 追加 `test('…BUG-004…')` 探针 → `[guard-red-record] 没有留证块` 红 → 还原绿。
- 悬空编号：追加 BUG-999 标题 → `悬空事故号` 红 → 还原绿。
- 删留证块：删 local-date 的 BUG-017 留证（标题保留）→ 红 → 还原绿。
- 双址正向：手工造活跃卡 `_backlog/bugs/BUG-991-probe.md` + 带留证标题声明 → 门禁照常 PASS（活跃址解析）→ 清理。
- **门禁咬自己的交付**（两例，均真实咬合证据）：① hitl-provenance 首版留证把「（补记）」插在日期与冒号之间——不合判据形态，首跑即红（修格式后绿）；② 红证脚本误用 `git checkout --` 还原未提交文件，抹掉 local-date 留证块——门禁立刻点名该文件缺留证（重补后绿）。格式错和内容丢都被抓住。
- gates-smoke 常驻：`guard-red-record-no-record` / `guard-red-record-dangling` 两注入案例 + `guard-red-record-active-bug` 双址正向对照（CONTROLS）。

绿灯面（全部实跑）：`pnpm verify` 全绿（含新台账行两处同步）；`pnpm test` 全绿（留证块是注释，零行为面改动）；`gates-smoke` 全绿（含新案例）。

未跑项：L1/L2/真模型档（零 pack/preset/模型可见/驱动面改动——本轮只动 tests 注释、verify 门禁、文档）。

## 环境状态

dev home = `runtime/harness-home`；红证探针与活跃卡均即时清理，工作树只含交付 diff。
