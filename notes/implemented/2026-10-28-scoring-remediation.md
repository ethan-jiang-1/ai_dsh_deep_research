# 评分整改：把四个 B 档抬到 A-

> 状态：implemented

六维评分后按 Phase A→E 整改低于 A- 的四个维度（② 代码层次 / ③ 验收结构 / ⑤ 测试资产 /
⑥ 反馈通路）。本 Note 记承载持久决定理由的部分；逐项证据住各 commit 与本文"实际跑过的验证"。

## 决定

- **验收面必须可执行，而不是"写着机器断言"**。evaluation §L4 原写"机器断言四条"，实际 ③④
  没有任何载体——等于最外一面永远"通过"。现在 L4 写成表、逐条标**机器 / 人工走查**：① 绑
  `node-gate` 门A，② 绑 `evidence-audit` 的 exit 与 `CRITICAL=0`；③④ 给走查方法与**记录位**
  （bundle 的 `acceptance.md`「人工走查」节），并写死"没有记录 = 未跑"。记录位选 `acceptance.md`
  而不是新文件，是因为它已由 `run-accept` 生成、随 bundle 交付。
- **五面统一退出语义**：0 绿 / 1 红 / 2 未跑，未跑 ≠ 通过；此前只有 L0 写进了脚本。表格逐面
  写明退出码来源，脚本层正本仍是 scripts/AGENTS §verdict 契约。
- **完成判据的四个作用域**（面级 / 任务级 / goal 级 / 语义级）+ 优先序：面级是下限；语义级可否决
  前三者，但不能替代它们。四套定义此前散在四处各说一段，没人知道冲突时听谁的。
- **L3 判据 1/4 机械化**：盘上每个角色 skill 必须在 design/30 映射表有落点（新 skill 不登记 =
  红）；六个生命周期环节各有落点行；信噪比三机制（A–D 分级 / 交叉验证 / 反例）写在角色 skill
  正文里，而非只写在设计文档。边界如实写进测试头注：只证"表与盘面对得上"，不证语义正确。
- **反查要能在排障时反复跑**：`bundle-sessions` 从"每次全量解压两千个日志"改成两层——扫描面
  默认收窄到 `research-workspace` 组（run 会话必落该组；`--all` 扫整根、`--group` 换词），
  结果按**单日志** `{mtimeMs, size, facts}` 缓存。缓存只跳过解压：绑定谓词仍是 `witnessFactsOfLog`
  （从 node-gate 同一条 helper 导出，不另立语义），mtime/size 变化即重扫该文件。
- **失败现场要能先分流**：client-load 的 `meta.json` 增加 `disconnects` 计数（WebSocket closed /
  Remote stream / ERR_NETWORK_IO_SUSPENDED），并在 stderr 提示"先分流流抖动与产品红"。不改判据。

## 输掉的方案

- **给 L3/L4 造新门禁**：会与既有契约测试重复，且门禁数增长本身有成本；拆成 keyless 契约测试
  （`methodology-mapping` + `evaluation-contract` 扩项）更贴"证据住在被证明的对象旁边"。
- **L4 ③④ 也硬造机器载体**：交互纪律与恢复是模型行为，机器只能测"有没有这段文本"，测不到
  "模型有没有守"——假机器判据比诚实的人工走查更危险。
- **反查缓存整次结果**（键 = slug + 全量 mtime 指纹）：活跃 run 期间日志每秒都在变，整次缓存
  永远失效；单日志粒度的命中率才是真实的。
- **给反查加并行 zstd 解码**：能再快，但要引入并发池与错误聚合；先做"少解压 + 不重复解压"，
  实测重复调用已 0.09s。

## 实际跑过的验证

- **A（L3）**：新契约首跑即红两条——① 映射表里四个生命周期环节用的是 codex 阶段名、没有中文环节名；
  ② `lead/team-assembly` 盘上有、映射表从没登记过。补环节名 + 补"组队（本仓扩展）"行 → 绿。
- **A（L4/退出语义）**：`evaluation-contract` 扩项先红后绿。注意一次**测试自身的假绿**：首版断言
  `row.includes('人工走查')` 会被"通过"列里的「人工走查」节满足（把类型改成「人工检查」仍绿）——
  改为判**类型列**（第二格）后才真咬人，红证 = `L4 判据 ③ 的类型列必须是「人工走查」（实际：人工检查）`。
- **B（遮罩红线活录）**：起一个静态页（含 `sidebarCol` + `Preview Notice` 标题、**故意没有**
  Continue 按钮）→ `cdp-probe` 输出 `overlayPresent=true / overlayCleared=false`、
  `failed=首屏 Preview Notice 遮罩关不掉…`；喂给 `runDriverVerdict` 得 `RED`，reason 点名
  `overlay-clear`。这条红线此前只有单测。
- **B（冷启动红分支）**：占用 3129 端口 → `cold-start-smoke` 红，现场落在
  `runtime/smoke-workspace/cold-start-fail-<ts>/`（`output.log` 全量 + `state/` 空目录——该失败
  模式在出 verdict 前就中止，属正确形态）。
- **B（反查性能）**：组内 767 个日志，首次 24.6s、重复调用 **0.086s**；缓存命中 767 / 解压 0。
  语义与直扫一致（测试对比两者 `sessions` 数组）。红证：关掉命中分支 → 「第二次不应再解压任何日志」红。
- **全量**：`pnpm verify` 全绿、`pnpm test` 921/921。

## Phase C（代码层次）

- **图谱页签数据层抽出**（`useGraphFeed`，211 行）：journal 绑定 / plan.md 与快照读取整块搬出，
  页签体 721 → 559。失败语义原样（绑定失败落 `followError` + 有界重试；缺文件是合法形态）。
- **配置页签的四区回滚面搬出**（`LegacyManagementPane`，112 行）：页签体 601 → 546，只留
  "哪一版在渲染"的判断。**保留不删**——删它属改记录决定（D25），退役条件在 triggers。
- 校正一处记账错误：该回滚块此前被描述成"约 350 行死分支"，实测 **69 行**；页签体主体仍是
  活代码（状态/副作用/弹窗）。triggers 与本节均已改准。
- `COPY_PINS` 静态钉改为同时扫两个模块：文案搬家不该让"面板上还看得到这句防错读话"失效。

### Phase C 完成态（体量账）

| 文件 | 起点 | 现在 | 说明 |
|---|---|---|---|
| ResearchGraphTab.tsx | 721 | **403** | 数据层 → `useGraphFeed`；降级说明 → `state-note`；节点卡 → `NodeCard`；版本轨 → `GraphVersionRail`；提示带 → `GraphNotices`；样式 → `styles`（主函数 ~550 → **304**） |
| ResearchConfigTab.tsx | 601 | **546** | 四区回滚面 → `LegacyManagementPane`（保留不删） |
| client-load-smoke.mjs | 1029 | **967** | pass-5 终稿端到端 → `client-load-final.mjs`；同日补端口生命周期/并发锁/主机快照（另见卫生轮三 Note） |
| dev/hitl-answer.mjs | 717 | **529** | 浏览器内卡片驱动 → `lib/hitl-card-driver.mjs`（纯 DOM、零闭包） |

**体量账更正（2026-10-28 卫生轮）**：本段原写">600 行只剩 3 个、最大 lib 模块 200"是错的——
它漏了 pack `src/lib/plan-graph.ts`（775）与 `scripts/lib/{gates-cases,run-dashboard-core}.mjs`。
按变更面重新分列：**pack 生产面** = 客户端最大 546、`plan-graph` 439 + `plan-index` 347（同日拆分；
拆分理由 = Team 任务图与 plan.md 文件解析是两个变更面，混在 775 行里改解析要在图的上下文里翻）、
最大门禁域 428，均在 600 内。**>600 的支撑/壳/测试** = `gates-cases` 645（注入案例数据表）、`client-load-smoke` 967（冒烟壳）、
`scaffold` 624（部署 CLI 壳）、`node-gate.test` 608（测试电池）——壳与测试不拆的理由不变：拆开只会让
一次改动要开两个文件，阅读量不减。`run-dashboard-core`（626）同日再拆为 core 481 + `run-dashboard-html`
151（解析/模型 vs 渲染薄壳），也不再 >600。上一版把"计划里的 ≤2"与"生产模块 ≤600"混着写、又只扫了
部分目录，才得出"只剩 3 个"。

> 2026-10-30 现状补记：`MethodLibraryView.tsx` 已增至 1282 行（方法库 A′ 工作台），上表“均在 600 内”
> 不再成立；A- 代码层次基线失效，重议入口 = [_backlog/issues/2026-10-29-method-library-workbench-redesign.md](../../_backlog/issues/2026-10-29-method-library-workbench-redesign.md)。

### Phase D（测试资产）

- **覆盖边界契约**（`tests/contracts/test-surface.test.mjs`）：`scripts/lib` 54 个模块要么被至少
  一个 `*.test.mjs` 直接 import，要么在 `SMOKE_ONLY` 登记"为什么只能 smoke"（真浏览器 / zstd 子进程 /
  端口）。首跑抓到的唯一缺口是刚搬出的 `hitl-card-driver`；负例留证 = 删登记 → 红并逐项列出。
- **客户端纯件**：`packages/deep-research-pack/src/lib` 23/23 已被测试引用，无缺口。
- **覆盖率观察面**：`pnpm test:coverage`（Node 内置 `--experimental-test-coverage`），**不进门槛**
  ——百分比门禁会逼出"为覆盖率而覆盖率"的断言。实测 96.56% 行 / 89.12% 分支。

### Phase E（守住 A-）

- **术语映射拆出 00-index** → `docs/terms.md`：入口链第 2 步读集 16.6KB → **11.0KB（-33%）**，
  8 处引用同步改指。
- **「描述即存在」断言族第二条**：design/40 §2 的窄索引表只写主文件名，`cockpit-doc-registry`
  只查完整路径在正本出现过——索引漂了没人发现。新契约逐行核对索引点名的文件名在盘上存在；
  负例留证 = 把 `ResearchStatusTab.tsx` 改成 `ResearchStatusPane.tsx` → 红。

## 环境状态

- 缓存落 `runtime/smoke-workspace/bundle-sessions-cache.json`（gitignored）；`CACHE_VERSION` 在
  判据形态变化时手动 +1（写坏/超版本一律按空缓存处理，不阻塞反查）。
- 冷启动红分支只在"端口被占"这一种失败模式下演练过；"坏 tarball / 组装失败"两族未演练。
- 遮罩红线活录用的是静态靶页，不是真 DSH 首次启动——真实例的 acknowledgement 一落地就不再复现，
  故活红只能这样取。
- 2026-10-28 观察到一次 client-load 双红（「方法库 tab 在场」+「状态页 ⑤ 折叠块」），
  `disconnects=0`——**不是** BUG-045 那条流断连类，签名不同；复跑即绿。现场
  `runtime/smoke-workspace/client-load-2026-10-27T17-15-50-851Z/` 已留，待下次复现再归因。
