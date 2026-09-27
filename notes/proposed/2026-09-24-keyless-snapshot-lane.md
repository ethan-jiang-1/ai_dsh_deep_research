# RFC：keyless 录制快照面（输出快照级回归）

> 状态：proposed

归宿：roadmap §队列 ▶（**2026-09-27 复活**——频率条件实质到达：单日 6+ 次模型可见文本变更
各耗真模型档验证；九场 run 的会话 JSONL 是现成回放料）。原搁置理由与 E1 教训保留于下。

## 问题

模型/用户可见输出（persona 效果、工具卡形态、交付文本样式）目前靠真挂载冒烟（L1/L2）
+ 真模型档（L4-lite）取证——**成本高且无快照级 keyless 回归**：改了 persona 或渲染层，
无法秒级知道"输出形态变了"。

## 方案（定形——先例 = vendor `snapshots/web/web-search-round/`）

**窄带**：只钉研究工具面（spawn_teammate / web_search / team_task_* / ask_user_question /
present）的会话流 + 观察面渲染，不整代快照。四件套（形状照 vendor 先例）：

1. `session.v1.jsonl`——录制料：从第九场（37 卡、含全部研究工具面调用）的会话 JSONL
   **规范化**而来（挥发性身份 → 类型化 token；system prompt / tool schema → token）；
2. `snapshot.yml`——`profile: research` + **`retired-tools` 钉法**（研究工具面独立钉住，
   含当前 format 版本——vendor `snapshots/AGENTS.md` 明载该机制）；
3. `ui.expected.md`——渲染金标准：研究语义卡 + 状态页签在该录制流下的期望输出；
4. **回放冒烟**（scripts/snapshot-replay-smoke.mjs，L1 形态）：spawn `dsh`（研究档 +
   场景 patch）→ 回放录制流 → Playwright 渲染 → 与 `ui.expected.md` 比对。
   **红证**：注入一处输出差异（如卡片标题措辞）→ 回放红；还原 → 绿。

E1 教训仍有效：快照二包**只作 devDependency 解析物**，绝不进 runtime 依赖。

**可行性探针（2026-09-27，开工即有地图）**：二包定位 = `vendor/dsh/packages/test-support/
{session-snapshot,llm-replay}`（test-support 层，与 E1 教训同构）；`main: lib/index.js` 的
**lib 产物缺失**（vendor-build 未覆盖 test-support 层）——**实施第 0 步 = 扩 vendor-build**
（vendor-host 补建配置加这两包）。回放驱动 = `llm-replay`（cordis.snapshot.yml 声明录制响应）；
规范化助手齐全（normalizeSessionLog / tokenizeSessionFixtureCwd / scrubModelRequestBulk 等，
vendor `snapshots/sdk/sdk.snapshot.ts` 是完整用例）。录制料 = **已就位**：`tests/fixtures/snapshot-research-face/session.v1.jsonl`（最小探针会话：
web_search ×3——含上游故障形态，正是渲染回归要钉的样本——+ web_fetch ×1 成功，30KB）+
`snapshot.yml` 骨架。接线模板 = vendor `snapshots/session/web-search-endpoint-guidance/`
（同构场景：禁用真 LLM → 插入 llm-replay（replay-only provider 目录）→ 搜索故障保持真实——
"the failed search remains real; only the conversation model adapter is replaced by replay"）。
**剩余**：第 0 步扩 vendor-build（二包 lib）→ 回放冒烟脚本（L1 形态）→ ui.expected.md 金标准
→ 红绿。

## 输掉的方案

- **E1 时随解析依赖引入**：已否决——正是 E1 事故本身（`cannot resolve active package`）；
- **整代 session 快照**：押后——`retired-tools` 窄带钉法出现前成本过高。

## 验收（= 复活条件现状）

- ~~复活条件：需要「输出快照」级 keyless 回归时~~ → **已满足并复活**（2026-09-27：单日 6+
  次模型可见文本变更、每次 L4-lite 真模型档验证 ~2-3 分钟 + token——频率条件实质到达；
  第九场后维护期该节奏预计延续）；
- 复活后验收：一条录制 → 回放 keyless 绿 + 注入输出差异 → 红（红证）+ 依赖面零污染
  （vendor-links 绿）。
