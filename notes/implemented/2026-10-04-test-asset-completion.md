# 测试资产补全——四角色组装面 / 部署 bin 契约 / BUG-003 修复

> 状态：implemented

## 决定

按证据缺口盘点（方法承袭 [test-strategy 采纳 Note](2026-10-04-test-strategy-adoption.md)），
补齐三处测试资产；载体全部沿用既有机制（node:test / 场景化回放冒烟 / lib 折算层），零新框架。

1. **部署 bin 契约测试**（`tests/deploy-bin.test.mjs`）：静态钉 `preflight` 的六面检查清单
   （版本/peer/团队层/手册+模板/构建产物/密钥——**record 调用点级**断言，注释字样不算数）+
   fail-loud verdict + 失败补救命令 + `scaffold` 幂等形状与**零密钥面**安全边界 + bin 映射。
   运行时真实路径归 L2 release-smoke（tests/ 层禁子进程，静态契约与 L2 分工闭合该面）。
2. **BUG-003 修复**（观察面回边双源错位）：诊断结论反转了建档时的假设——UI 侧本就是对的
   （`hitl-fold.deriveAnchors` 早已按 ask 内容判型，BUG-002 修复），错的是 client-load-smoke
   的盘侧镜像公式，停留在 BUG-002 前的旧启发式。修复 = smoke 删手抄公式、**直调 lib 同一
   函数**（零镜像可漂移），描边/回边两断言随合流谓词；附带修复绑定富度（最新会话可能是
   收尾判终态短会话——BUG-001 同族第三例，改近窗内取事件最多者）。缺陷卡已迁
   [_fixed_bugs](../../_backlog/_done/_fixed_bugs/README.md)。
3. **四角色组装面 keyless 钉住**：`dev/record-role-fixture.mjs` 录制工具（真模型档一次性：
   research 档短会话 + 哨兵「探针完成」收尾 + 日志静默判定——team-preflight 时序教训的
   同款应用）+ 三角色 fixture 入库（scout/analyst/critic，各 persona 全文与角色差异化工具
   面随 fixture 冻结）+ snapshot-replay-smoke **场景化**：场景集 = 盘上 `presets/` 派生
   （`presetRoles()`——role-list-sync 同源，加角色 + 录 fixture 即自动纳入），每场景独立
   boot + A 回放收尾逐字命中 + B 组装请求 diff（persona 全文 + 工具 schema）；C 渲染金
   标准归属 lead 场景。`--scenario <id>` 单场景跑（红证定向/迭代用）。模型可见面的 keyless
   信号从 lead 单角色扩到全部角色。

## 输掉的方案

1. **preflight/scaffold 运行时冒烟**（新增 smoke 起 fake workspace 跑 bin）：运行时路径已由
   L2 真实覆盖，再建是第二条真入口证据——静态契约 + L2 分工已闭合该面。
2. **四角色录制走 vendor session-snapshot record 机制**：vendor 的 record 载体是 vitest 侧
   harness（import vitest，本仓 node:test 不可用）——本仓录制 = run 通道真会话 + 日志落盘，
   机制与 lead fixture 同源。
3. **C 层渲染金标准全角色化**：渲染面（研究状态页签/工具卡）与角色无绑定，逐角色金标准是
   重复证据；渲染钉子由 client-load-smoke 断言清单与 lead 场景 C 层承担。
4. **不补的资产（盘点结论，防重开讼）**：watch-run 谓词（已走 `lib/run-state` 折算并被
   run-state 测试覆盖）、evidence-audit 更多分支（现有用例已密）、性能/bench 面（无规模压力）。

## 实际跑过的验证

- L0：`pnpm verify` 全绿；`pnpm test` pass 150 / fail 0（原 145 + deploy-bin 新增 5）。
- 反证实录（注入回归 → 红 → 还原 → 绿）：
  ⑨ deploy-bin：preflight record 名突变（注释保留）→ fail 1 → 还原 pass 5/fail 0——**首版
  断言被注释字样满足而假绿**（includes 子串级），收紧为 record 调用点级后才咬得住；
  ⑩ deploy-bin：scaffold 注入 `DEEPSEEK_API_KEY` → 安全边界断言红 → 还原绿；
  ⑪ snapshot-replay B 层：scout fixture persona 一词突变（解码态 content 块内）→ B1 红
  （首个差异 @75）→ 还原绿。**两次脱靶教训入档**：fixture 原始行中文为转义/跨块存储，raw
  行替换不进比较文本——突变必须落在解码态 content。
- BUG-003 live 证据：client-load-smoke 原 2 红转绿、断言面全绿；隔离法承袭
  （test-strategy 条目实证的同款归因程序）。
- snapshot-replay 全场景 ALL PASS（A/B 全角色 + lead C 层；B1 报告各场景 persona 长度
  与工具面差异即角色分形的直接呈现）。
- role-list-sync / count-free 两门禁在本条目内各咬实一次（SCENARIOS 硬编码角色清单 →
  改 presetRoles 派生；卡片散文计数 → 改指跑批正本）——门禁在写作用途上的实效记录。
- 2026-10-04 收尾增补（BUG-003 卡"牵出的失败类"横切收口）：停靠点诚实线断言合流
  deriveAnchors（旧 `hasQuestion + delivered` 镜像不知道 pending 覆盖 passed 的 re-open
  语义——本族最后一块手抄镜像）；断言块头注标注四类取态源（deriveSteps / deriveAnchors /
  盘侧文件事实 / 页面 DOM）。绑定策略二次修正：富度地板（事件数阈值）之上取最新——
  最富策略会把侧栏可见窗口外的旧会话绑进来（实红）；录制探针会话按标题前缀清理
  （16 个一次性残骸，用户 run 会话未动），录制助手头注补副作用自知条目。

## 后续核对

[目录与入口治理 Note](2026-10-05-project-navigability.md) 补充本篇证据范围：
L2 安装验收使用 `--install-only`，默认 preflight 仍检查凭据；run-state 日志读取使用原生解码并在坏帧时 fail-soft。
这组边界不改变本篇已交付的角色回放、部署形状断言与 BUG-003 修复。

## 环境状态

- with-key 消耗：录制助手实跑四次（首轮 scout 因缺 mkdir 失败一次，修后三角色各一小回合
  成功）——一次性成本，此后全场景 keyless。
- 工作区根在飞 bundle 三场（用户侧并行验收中）；绑定会话随"近窗最富"策略自适应。
- 未跑项（如实分列，均非本条目改动面）：L1 preset-smoke / L2 release-smoke / L4-lite
  （无 preset、包结构、persona 源文本改动——fixture 录制不改模型可见源）；entry-chain
  探针按节奏。
- 录制产物已人审（三角色 persona 关键词与长度抽查 + 行数形态）后入库。
