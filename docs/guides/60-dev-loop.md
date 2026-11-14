# 60 · 开发环：条目生命周期、面选择与操作手册

> 层：指南（怎么操作）。流程纪律的权威在 DSH（vendor 树）与本仓决策台账
> （D11/D20 = [00-index](../00-index.md)；依据 = [Backlog 方法论吸收
> Note](../../notes/implemented/2026-10-09-backlog-methodology-absorption.md)——仓级队列
> 退役、工作由用户授权 + 会话内 plan/todo 的定调记录）；本文是本仓落点。

## 0. 条目生命周期（反馈双门）

```
用户授权（本轮请求或已有明确授权）→ 按授权范围工作
  → 【验收门】按风险与改动面定义可检查的结果；能机械的先立红
  → 【反馈门①】Plan Mode 呈批：仅当任务复杂、用户要求，或 DSH 软计划有助于降低风险时使用
  → 实施期【反馈门②】todo_write 活清单：多步实施时列可验证步骤、逐项更新；按红→绿推进
  → 【反馈门③】收尾前按风险做对抗自审（开发技能 reviewing-a-delivery：跨面/持久决定/入口链/
    门禁与验收合同/pack 公共行为/P0-P1 必做；局部机械改动可跳并记 `审查：跳过 — 理由`；
    判据 = evaluation §完成判断四分离）
  → 同 diff 收尾（§4）：按适用验收判据对账，报告实际证据与未运行项

可选支路：问题需澄清/查证 → _backlog/issues/ 与按需 methods/research/；
持久决定需显式评审 → notes/proposed/ RFC
```

- 两门都是 DSH 自带机制（base bundle，零接线）；**不要发明 tasks.md**（DSH 明文否决计划
  文件："a plan directory creates a second durable home"——会话日志即计划与清单的持久真相）。
- **验收门（TDD 式，[D23](../decisions.md#d23)）**：对已授权工作，在实施前把可判定的验收判据绑定检查方式；可机械者先立红，人工判据明确记录走查证据。验收尚不明确时，澄清是当前任务需要，不会自动阻断已授权且可独立推进的工作；证据设计复用本仓现有 owner，不另造队列。四条硬边界：①**改断言迁就实现不是修法**——断言只在行为/合同真实变化时同 diff 改（[tests/AGENTS](../../tests/AGENTS.md)）；②**未验项不得写 implemented**，被阻断检查如实注明；③**复发升格**——implemented 缺真实验证证据复发时，才考虑升为机械门禁并配负例；④证据和结论不得超出检查实际证明的范围（依据见 [external-materials.md](../external-materials.md) 与 [item-lifecycle-tdd Note](../../notes/archived/2026-10-05-item-lifecycle-tdd.md)）。
- **修复卡证据（红→绿）**：bug 翻 `修复落地/已修` 必须写 `## 修复落地` 的 改动/红证/绿证（红证可重放或改动含测试/门禁资产），且归档与代码/测试同暂存集；只翻状态/移卡 = 假修（机械面 = `staged-change-pairing`；规则 = [_backlog/AGENTS.md](../../_backlog/AGENTS.md)）。
- 多步实施按可独立验收结果拆解；小问题不强行拆成子任务。一次需要多个相互独立的人类判断时，分别记录问题与依赖，不把它们伪装成执行步骤。
- steer（用户插话）开启新 turn = 清单重排的信号，看得见反馈被吸收。

## 1. 六步闭环（实施期）

### 1.1 入口链契约（按需查阅）

根 [AGENTS.md](../../AGENTS.md) §入口链拥有仓级路由。收到工作后先确定用户本轮授权和目标；仅在需要澄清、查证或跨轮留存时，才按 [意图载体总图](../design/60-intent-carriers.md) 使用 backlog。

| 情况 | 读什么 | 读完应知道 | 卡住怎么办 |
|---|---|---|---|
| 所有改仓工作 | 根 `AGENTS.md`、`docs/00-index.md` | 仓库形态、相关 owner、现行决策 | 只问仓库概况时，到此为止 |
| 改文档 / 审文档 | [docs/AGENTS.md](../AGENTS.md) | 层级归属、写作规则、slop 清单、预算处置序 | 规则与当前文档冲突时先修规则，再改文档 |
| 需澄清或查证 | 对应 [_backlog/issues/](../../_backlog/issues/README.md)、按需 methods/research | 目标、范围、已知事实、未决问题、下一步；卡到 `待落地` = 准备进开发（不是授权） | 暂停依赖未决点的判断；独立且已授权的工作照常继续 |
| 持久决定需显式评审 | 对应 [notes/proposed/](../../notes/proposed/) RFC | 被评审的决定、备选与验收 | 不需显式评审时无需创建 RFC |
| 任何实施工作 | 本页 §1/§2 与 §4 | 与改动面相称的证据和收尾动作 | 按任务类型路由验证 |

**按工作类型分支**（证据和操作不同，不意味着必须先建卡或 RFC）：

- **代码 / 卫生型** → 本页 §1.2 六步闭环 + §2 面选择表与任务型路由表 + §4 收尾；
- **研究 run 型** → [guides/61](61-run-playbook.md)（含**硬前置**：`research-workspace` 必须已注册进
  DSH，会话 cwd 才落在研究工作区）+ 开发技能 `running-a-research-run`；
- **交付收尾** → `reviewing-a-delivery`；**加/改角色** → `adding-a-research-role`；
  **加/改门禁** → `writing-a-gate`；**加/调节点轨道** → `changing-node-topology`；
  **归档/删除/合并 Note** → `archiving-a-note`；
  **换 vendor pin** → `bumping-vendor-pin`；**间歇/环境依赖缺陷** → `reproducing-a-failure`；
  **真实边界单点证据** → `using-a-probe`；**回归绿但输入空间没枚举** → `exploratory-verification`。

任务命中 `.agents/skills/` 某条 description（上列项）时**先读该 `SKILL.md` 全文再动手**，不从
摘要猜流程。

### 1.2 六步闭环

1. 读取本轮授权与对应 owner；存在 backlog 问题时读卡片及其直接证据；存在 RFC 时按其范围执行；
2. 复杂的多步实施列 todo（一 concrete step 一条，完成即更新）；
3. 改动（源码/文档/配置同 diff 维护"现在为真"）；
4. 按改动面选跑验证（§2 面选择表 + 任务型路由表）；
5. 修复 → 复跑，只报告**实际跑过的检查**；
6. 收尾（§4）。

## 2. 面选择、任务型路由与全档命令（运行时入口）

> 选测试证据（失败类 → 最低可见层；五关/四账）= [guides/67](67-test-strategy.md)。

| 面 | 什么时候跑 | 命令 |
|---|---|---|
| L0 结构 | 每次收尾必跑；实施期随手 | `pnpm verify` + `pnpm test`（= `test:spec` + `test:checks`；正本 = `package.json`；fresh clone 首次先 source，见下） |
| L1 挂载 | preset 内容/结构改动（其完成定义） | `source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs`（源码域，keyless；未 source 自拒）；安装域加 `--profile <p> --no-patch` |
| L2 安装 | 包结构/release 相关改动 | `source dev/env.sh && node scripts/smoke/release.entry.mjs`（pack→干净 profile→plugin add→安装域冒烟；无模型调用，安装验收使用 `--install-only`，默认 doctor 仍检查凭据；未 source 自拒） |
| L2 冷启动 | 独立环境/bootstrap 改动 | `source dev/env.sh && node scripts/smoke/cold-start.entry.mjs`（独立 home/profile/端口/state；MCP 关闭；团队层需 registry/缓存） |
| L2 发布面/显示面 | 清单字段、locale/icon、市场索引、安装文档取向 | `node scripts/smoke/lifecycle.entry.mjs`（market.json 过 DSH 校验器 → 装 tarball → 本包行 dump → 真启动 → `readPluginMeta` 四行显示面 → remove 回落；缺 `_dist` 产物 exit 2） |
| L2 安装形状 | profile/安装形状/工作区相关改动 | `node scripts/smoke/install-shape.entry.mjs`（原样执行手册的 CLI 装包分支：profile init → plugin add → 真启动；断言 roster 三状态、无 `did not activate`；缺前置 exit 2） |
| L2 首启 | startup/client 恢复/首屏/StartCard 改动 | `node scripts/smoke/product-boot.entry.mjs`（纯 `dsh --profile deep-research` + 真 Web + 浏览器；工作区会话、首屏、目录按钮；无模型；缺前置 exit 2） |
| L3 领域 | 方法论/preset 内容改动 | 映射表审查（design/30 对账）+ `node --import tsx/esm --test tests/checks/evaluation-contract.test.mjs` |
| L4 交付 | 里程碑级 | `source dev/env.sh && node scripts/smoke/l4-lite.e2e.mjs`（真模型档：需 `DEEPSEEK_API_KEY`，未 source 自拒）/ 完整 run（授权范围） |

**source 口径**：fresh clone 首次跑 L0 前先 `source dev/env.sh`（激活 pre-commit；此后幂等）。表中标 source 的命令必须 source；`lifecycle.entry` / `install-shape.entry` / `product-boot.entry` 自行设定 home、不依赖 source；run-ops 的 `evidence-audit` / `run-accept` / `plan-card-stats` / `provider-error-stats` 需要 source（见命令块注记）。

判据与负面判据（什么算"框架不合理"）见 [evaluation.md](../evaluation.md)——面与面不互抵。

### 任务型路由表（必改 → 次序 → 必跑面 → 必写 → done）

本表是**执行程序**的唯一 owner（面判据 = [evaluation.md](../evaluation.md)；改 pack 的文件级影响面 =
[guides/62 §改动影响面](62-plugin-authoring.md)——那两处是细节，不在这里复述）：

| 任务型 | 同 diff 必改 | 生成物与检查次序 | 必跑面 | 必写 | done |
|---|---|---|---|---|---|
| 改 preset 结构（角色/工具行/roster 接线；新增 skill 文件按下行） | pack 源 `presets/` | **`render-overlay` 先于 L1**（L1 挂的是 overlay，不是 pack 源） | L0 + L1 | 行为/发布集变才写 Note | 全部 preset 真挂载绿 + 文档同步 |
| 改 persona / skill / 手册文本（模型可见） | pack 源 + `research-workspace/` 正本 | `render-overlay` 先于 L1 → L1 → snapshot-replay B 层（CI `snapshot-replay` job 自动跑；本地 `--layers a,b` 定向；细则 = 表后脚注①）→ 重启 run 通道（web 缓存 boot 时文本） | L0 + L1 + L4-lite | 同上 | 真模型档证据 + L1 绿 + CI B 绿 |
| **改驾驶舱**（观察面 client 面——`src/client/` 套件，[构成正本](../design/40-research-cockpit.md)） | `src/client/` + tsconfig include + `dsh.client.inject` + keyed 字面量进 `keys.ts` + **可见文案 zh/en 键**（任何界面文本 day-one 双语，步骤 = [changing-ui-copy](../../.agents/skills/changing-ui-copy/SKILL.md)） | `pnpm build` → `client-load.entry`（改挂起显性化再跑 `client-hitl.entry`） | L0 + client-load.entry | 同上 | 真浏览器断言全绿 |
| 改 `src/lib/` 纯函数 / 类型面（pack 两半的编译面） | 对应 `src/lib` / `src/client` 类型位 | `pnpm typecheck` → `pnpm test`（typecheck 前置 = vendor 构建产物在场） | L0 + typecheck | 同上 | typecheck + 对应测试绿 |
| **新增/修改机器判据**（门禁/审计/交付决定从散文里判值） | 设计卡 `## 判据形状` + 判据测试（不变量+矩阵） | 先写变异矩阵（红）→ 实现 → L0 | L0 + 判据测试 | 判据形状 + 反证 | 歧义会红 + 矩阵绿 |
| 加 / 改机械门禁 | `context.mjs` gates 数组 + 该域 `verify/gates/<域>.mjs` + `evaluation.md` §L0 台账（案例表有增删再动 `gates.e2e.mjs`） | **注入回归红 → 还原 → 绿** → gates.e2e | L0 + gates.e2e | 带反证记录 | 红证实跑 + `gate-ledger-sync` 绿 + gates.e2e 绿 |
| 改 run 通道工具 / 审计门（run-driver / boot-run / watch-run / hitl-answer / run-dashboard / evidence-audit / node-gate / schema-scan / snapshot-replay） | 对应 `scripts/` / `dev/` 脚本 | — | L0 + 对应 `tests/<domain>/*.spec.mjs` 契约测试必跑（用例即其反证记录） | 判据变更才写 Note | 对应契约测试绿 |
| 改 scripts/lib 支撑模块 / dev 基建本体（`lib/*.mjs`、env.sh、render-overlay） | 支撑模块 + 其**全部消费方**（消费面 grep：roles.mjs 的角色枚举消费方、render-overlay → `overlay-fresh`、run-state → watch-run/hitl-answer/run-dashboard） | 消费方门禁在同 diff 复跑 | L0 + lib 对应契约测试 | 判据变更才写 Note | 消费方门禁与契约测试绿 |
| 查/加探针（真实边界单点证据） | `probes/` 头注 + `probes/INDEX.generated.md` | `node probes/_index.mjs --write` → 跑探针本体 | L0 + 目标探针（真模型档需凭据） | 头注/索引变更才写 | 索引门绿 + 探针红→绿 |
| 改研究工作区手册 / 模板（结构性调整：模板增删 / 路径与格式修正；**手册正文文本 = 模型可见，走上行〔改 persona / skill / 手册文本〕**） | `packages/deep-research-pack/content/` | 无生成器 | L0 + `content-shape` | — | `content-shape` 绿 |
| 改部署面（doctor / 发布集） | pack `scripts/` + `package.json` 的 files/bin | — | L0 + L2 | 部署 Note | `release.entry` ALL PASS |
| 换 vendor pin | `.gitmodules` + 运行中 dsh 的 exact 版本（兼容矩阵字段已删，见 D41） | `vendor-build.sh`（含 host 半补建 + 前端壳重建）→ 逐条重审（含 agent-team 合同 diff 与货架增量对账——正本 = [discipline-map §重审触发路径](../discipline-map.md)） | L0 + L1 + L2 + client-load.entry + L4-lite（0.2.0 轮实证：漏跑观察面 = client bundle 的 build-time externals 漂移漏网） | 升 pin 毕业 Note（重审结论正本） | 全档绿 + 重审入 Note |
| 纯文档 / 卫生 | 文档自身 | — | L0；改动面含 AGENTS/入口链时加跑 `entry-chain-probe`（真模型档；无凭据退化为语义版人工） | 仅持久决定理由才写 | 门禁绿 |
| **用户直派** | 按本轮授权直接执行；如需跨步排序使用会话内 todo；仅需显式评审的持久决定才建立 RFC；交付后按 notes 规则决定是否记录决定理由 | 同对应任务型 | 同对应任务型 | 同对应任务型 | 同对应任务型 |

> ① snapshot-replay B 层（模型可见文本变化的 keyless 秒级信号）：比对面 = persona 全文 + 全部
> request/header + 四处 `user/message` 注入（工作区手册全文 / skill 目录 description / 运行时上下文 / 时钟序列）；
> skill 正文不进组装请求，其证据 = L1 可见面 + L4-lite 行为。有意变更 → 红 = 已捕获：走重录场景
> （真模型档，同 diff 更新 `snapshot.json` 的 source 身份）或 `--update-expected` 重写金标准 + 人审
> ——金标准只许重写，不许放宽比对或归一化凑绿（fix fixtures, not normalizers）。

**值级改动**（只改一个配置**值**，如超时/阈值/开关）：本仓**没有值级断言**——门禁只证结构，L1 只证
"还能挂载"。所以 done 只能证到"仍挂载 + 文档同步"；要可证伪就**同 diff 补一条断言**（进 `tests/` 或
对应冒烟），否则在交付报告里显式写"**值级不可证**"，不许留白。

**新增常驻工具/门禁/选项**：同变更写明它替代的手工步骤、当前消费者、sunset 或重估条件；
没有消费者的 option 不落地。

### 全档命令正本（含前置与档位）

```sh
bash dev/bootstrap.sh --check          # 独立环境前置预检（不安装/不构建；Node/pnpm/git → submodule → install → vendor 构建 → env → 凭据/端口工具）
bash dev/bootstrap.sh                  # 同上，缺件时执行 submodule/install/vendor 构建（幂等）
bash dev/vendor-build.sh              # vendor 树构建（换 pin 后必做：--clean 清陈旧产物；tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳重建——0.1.7 起启动依赖构建产物）
pnpm verify                           # L0 结构门禁（keyless，收尾必跑）
pnpm test                             # L0 keyless 聚合 = test:spec + test:checks（layering ④ 钉形状）
pnpm test:spec                        # 进程内 spec（tests/{run,cockpit,pack,contracts}/**/*.spec.mjs）
pnpm test:checks                      # 门禁自身（tests/checks/*.test.mjs）
pnpm test:e2e                         # 真进程车道（registry lane=e2e，默认 tier=ci；--all 带 dev-only）
pnpm test:entry                       # 真浏览器/profile/tarball 车道（lane=entry）
pnpm test:vendor                      # vendor 源码契约（组合层 + 设置 schema；根 tsconfig 的源映射，无需 vendor 构建）
pnpm typecheck                        # pack 双半 TS 类型检查（tsc -b；CI deploy job 必跑——keyless job 不装 vendor 产物；本地前置 = vendor 构建产物在场，fresh clone 的 L0 不跑）
node scripts/smoke/gates.e2e.mjs    # 门禁自测（keyless：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组；改门禁逻辑必跑；迭代可用 --case=<id>）
node dev/render-overlay.mjs            # 生成物：从 pack 渲染 dev/research.overlay.yml（改 pack 后必跑，且**必须先于 L1**）
source dev/env.sh                     # ⚠ 双 home + 裸 dsh 拦截（DSH_HOME=runtime/harness-home）；下列 L1/L2 必须先 source，否则脚本自拒 exit 2
node scripts/smoke/preset.e2e.mjs         # L1 预检（keyless）；DSH_SMOKE_REAL=1 真挂载档（keyless：roster+逐角色建会话+skills 隔离；--profile <p> --no-patch 切安装域通道）
cd packages/deep-research-pack && pnpm build   # pack 双半构建（tsc -b . + tsdown → lib/index.js + lib/client.js——观察面 client 面，D18）
node --import tsx/esm scripts/smoke/client-load.entry.mjs    # 观察面 client 面真浏览器加载（keyless：boot web + headless chromium——插件零失败 + 页签与渐进面硬断言；渐进面断言 = 磁盘侧绑定会话的真值对账；失败留 png/html/console/meta 现场；无窗口内交付目标 = exit 2 SKIP；主机不健康 = exit 2 NOT-RUN（预检；失败时连接死亡同判，判据 = lib/host-health））
node --import tsx/esm scripts/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home --port 3109   # 干净机器/CI：用种子夹具自建 home（会话 + 已交付 bundle；不依赖 dev home/凭据），CI job `client-load` 跑的就是这条
node probes/browser/cdp-probe.mjs '<gui-url>' --open-session '<标题>' --open-status --expect-face '<文本>' [--expect-no-leak '<文本>'] [--ask '<消息>'] [--screenshot <path>]   # 交互探针（裸 CDP，借鉴 ai_dsh_loop_advisor）：Playwright actionability 被 DSH UI 挡死时的交互驱动工具——JS 派发点击/输入，JSON 判决；--ask = 完整交互环（输入→发送→等回复）。老会话可能要先在 GUI 里让它进侧栏近列表
node scripts/smoke/release.entry.mjs        # L2 真实安装形状：pack→干净 profile→plugin add→安装域冒烟；无模型调用，安装模式跳过模型就绪检查
node scripts/smoke/cold-start.entry.mjs     # L2 冷启动：独立 DSH_DEV_HOME/profile/端口/state；MCP 关闭；到浏览器面 GREEN
node probes/behavior/method-library-probe.mjs  # 偏好库可发现性三问（真模型档；BUG-042 修复判据）
node scripts/smoke/l4-lite.e2e.mjs        # L4-lite 真模型冒烟（真模型档，需凭据：全角色响应 + scout web_search 调用）
node scripts/smoke/team-preflight.e2e.mjs # team 机制预检（真模型档，需凭据：spawn_teammate 组队 + 成员组合画像 + company D18 one-shot worker 探针）
node dev/run-driver.mjs up          # **run 通道驱动入口（常用）**：起/复用通道（复用先验安装镜像=当前 pack 源）+ 验浏览器面 + 呈交块（exit 0 可呈交/1 红/2 未跑；镜像漂移/未取证 = 2）；--bootstrap 先跑冷启动前置；--profile/DSH_RUN_STATE_DIR 支持多实例；probe = 只验已起通道（同样先验镜像）；url = 打印当前 URL
bash dev/boot-run.sh                  # run 通道底层启动面：自检→组合检查/必要补装→漂移门；仪表盘后台观察、web 前台 3083；用法 = 61（驱动入口内部调它）
node scripts/run-ops/stream-diagnostics.mjs --recent N   # 流失败归因诊断（尝试时间线/失败密度/provider 实名；出问题第一步）
node --import tsx/esm scripts/run-ops/run-dashboard.mjs --latest --out <html>   # run 只读投影（多场扫描 + 步骤条 + HITL 等待横幅；--watch 持续再生成）
node scripts/run-ops/plan-card-stats.mjs   # 计划确认卡字数跨场分布（keyless，须先 source；升硬门前置 = 连续多场 ≤200 字达标）
node scripts/run-ops/provider-error-stats.mjs   # 上游流错误（回合被终结）跨场分布——BUG-022 的"可数"面（keyless，须先 source）
node dev/run-kickoff.mjs --port 3083 --token <横幅 token> --prompt-file <file>        # run 会话驱动（建会话+发 kickoff）
node --import tsx/esm scripts/run-ops/watch-run.mjs <session-id>   # run 盯场（谓词化状态判定：事件形状，非字符串 grep——HITL-PENDING/RUN-SETTLED 时退出自报；grep 会误报 request/header 工具 schema）
node scripts/run-ops/scene-capture.mjs '<gui-url>' --out runtime/scenes/<name>   # 场景包：page.png/html/body/console/meta（看见当时页面；token 脱敏）；事后读取 = --list / --show <name>（agent 看历史现场，纯读盘）
node scripts/run-ops/session-replay.mjs <session-id|标题子串> [--group <子串>] [--open-status|--open-graph]   # **任意历史会话**在真实 UI 里重开并抓场景包（keyless；起一次性通道 + 登记该会话 cwd 工作区 + 按 id 打开）；判读含日志/工作区/场景包路径；边界 = 现在的客户端代码 + 当年的数据（不是像素级复现）
node --import tsx/esm scripts/run-ops/session-events.mjs <session-id|标题> --tail 30   # 会话事件尾部（agent 看"刚才发生了什么"：tool/call、tool/result、turn/end 摘要；--type/--grep/--json）
node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <t>   # HITL 代答（代理模拟；默认逐题选推荐项——先盘侧谓词自拒：无真挂起不开浏览器；answerer 只在浏览器客户端，故用真浏览器）
pnpm dsh <args…>                      # 机制基线 CLI（vendor/dsh 钉 tag 源码；等价 dev/env.sh 的 dsh 函数）
node --import tsx/esm scripts/smoke/client-hitl.entry.mjs   # 观察面活标题触发验证（真模型档：RPC followup 造挂起态 + 盘侧谓词 + 浏览器观察点）
node --import tsx/esm scripts/smoke/cdp-ask.entry.mjs    # 交互探针端到端（真模型档：一次性通道跑 --ask，断言发出 + journal 落盘；空闲态与在飞态两阶段）
`research` 手工 profile 已弃用：回放/录制/团队预检统一用 `deep-research`（`dev/boot-run.sh` 维护版本面）；残留的 `research` 档不要再扩用。

node scripts/smoke/snapshot-replay.entry.mjs --read-only --layers a,b   # keyless 回放冒烟（须先 source dev/env.sh，端口 3103）：CI job `snapshot-replay` 跑同一条 A/B；场景集由 snapshots/replay/research-face/snapshot.json 声明（研究角色集与盘上 presets/ 对账；方法编辑不属 run 生命周期）——逐场景 A 回放收尾逐字命中 + B 组装请求 diff（persona 全文 + 全部 request/header + 四处 user/message 注入（含时钟序列））；`--layers c` + 声明了 renderExpected 的场景做 C 渲染金标准比对（C 本地/里程碑）；`--scenario <id>` 单场景、`--update-expected --why <载体>` 重写金标准
node --import tsx/esm dev/record-role-fixture.mjs --role <scout|analyst|critic|lead>   # 角色组装面 fixture 录制（真模型档一次性：`deep-research` profile（与回放同域，boot-run 维护版本面）+ 哨兵「探针完成」收尾 + 日志静默判定；录制品人审后入库 + 在场景声明登记 source 身份，此后 keyless 永久回放）
node scripts/run-ops/run-accept.mjs <bundle>   # 交付验收原子动作：门 A + 证据审计 + 未来日期 sanity → acceptance.md；--archive 才归档
node scripts/run-ops/runtime-clean.mjs [--older-than 14] [--yes]   # 运行区清理：默认 dry-run，只列白名单内过期条目；--yes 才删；黑名单/symlink/scenes/保留期 = runtime/README
node scripts/run-gates/evidence-audit.mjs <bundle>|--latest  # 证据溯源审计（**须先 source dev/env.sh**：它锚定本仓 dev home，DSH_HOME 指向别处即自拒）（keyless：URL/摘录/final 链对会话日志机械对账 → audit.md；CRITICAL 即 exit 1）
node scripts/run-gates/node-gate.mjs <bundle>|--latest [--sessions <dir>] [--write]  # 节点交接契约门（keyless：交付两门 = §Decisions 拍板行 + present 声明；RED = exit 1 / UNATTESTED = exit 2；默认只读，--write 才落 bundle node-gate.md）
node scripts/run-gates/schema-scan.mjs [<bundle-dir>…]     # schema 保真度扫描（keyless：八节点输出件在场断言；断代定红——新 run 按 `schema` 整数（低/高版本都判红），旧场按 contract 日期（契约日 2026-09-29）；现行形态违约 = exit 1，契约前/旧场如实报告不计红；默认扫 archive 全量）
node probes/behavior/entry-chain-probe.mjs    # 入口链探针（真模型档：授权范围、RFC 条件、开发环路径三问；词面断言与原文留档人工复核）
node probes/behavior/discipline-probe.mjs     # 纪律行为探针（真模型档：A2 超界 / B1 差集 / 收活缺件·UNVERIFIED / 计划确认卡·quick_factual 免发互补对五场景标记断言——先读技能正本再作答；--scenario <id> 定向；留档人工复核）
node packages/deep-research-pack/scripts/doctor.mjs --workspace <dir>   # 只读诊断（pack 自带 bin：DSH 版本/profile roster/安装副本/团队层/工作区/凭据；不安装、不启动、不写 profile）
```

CI 另跑 `run-accept.e2e` / `pack.e2e` / `doctor.e2e`；逐件命令索引 = [scripts/README](../../scripts/README.md)（本块是操作入口，不是全量清单）。

档位词汇（keyless / 真模型档）与密钥定义 = [AGENTS.md §密钥](../../AGENTS.md)；脚本头注各带设计依据
与 RFC 出处。

五条与面选择同级的纪律（前三条 = `_agent_ready_development` 吸纳，2026-09-25；后两条 = 姊妹仓
`ai_dsh_assitant` 借入，2026-10-05，钉版见 [external-materials.md](../external-materials.md)）：

- **先加载匹配的开发技能**：任务命中 `.agents/skills/` 某条 description（换 pin / 加角色 /
  写门禁 / 跑 run / 改轨道 / 交付自审 / 复现间歇缺陷 / 用探针——清单 = 盘上 `.agents/skills/`）→ 先读该 `SKILL.md` 全文再动手，不从摘要猜流程；
- **查询实际配置树，别从源码猜部署**：`pnpm dsh --profile deep-research --dump-config` 是
  profile/bundle/patch 叠加后的官方查询（"会加载什么"）；`boot-run.sh` 的漂移检测管另一问
  ——"镜像是否等于 pack 源"；
- **未运行项如实分开**：交付报告里"未跑"与"通过"分列（例：无凭据自动跳过的 e2e 不算验过
  真实 provider，mock 测试不能替代真实入口证据）。
- **互补案例规则**：断言是条件命题（"仅当 X"）时，证据必须含非 X 的互补案例——只覆盖单一
  状态的证据集抓不到状态 bug（姊妹仓实案：首屏证据全是空会话，"仅空会话渲染"看似证毕，
  实则全状态渲染）；
- **仪器对准目标，不对准跑者**：检查脚本扫描的对象必须显式锚定目标 home / 目录——扫错
  对象会拿无关残留凑绿（本仓 evidence-audit 锚定 dev home 自拒是同精神实例）。

## 3. 开发环境

### 3.0 fresh clone 一次性准备（改仓 L0 的前置）

```sh
git clone --recurse-submodules <本仓 URL>   # 或 clone 后补：git submodule update --init vendor/dsh
pnpm install                                # 根 workspace（devDeps 以 link:vendor/dsh 解析——vendor-links 门禁）
source dev/env.sh && pnpm verify && pnpm test   # L0 应全绿（source 激活 pre-commit；无需 vendor 构建产物）
```

vendor 构建产物（`bash dev/vendor-build.sh`）是 L1/L2/run 通道/`pnpm dsh` 的前置（0.1.7 起启动依赖构建产物），L0 不需要；run 通道凭据前置见 [00-index §先分流](../00-index.md)。

```sh
source dev/env.sh        # DSH_HOME=runtime/harness-home（数据面）+ dsh 别名（代码面：钉 tag 源码）
```

- **双 home**：开发数据（会话/凭据/插件安装）全部进 `runtime/harness-home/`，日用 `~/.dsh`
  不动——崩溃半径隔离；
- **裸 dsh 拦截**：`PATH` 里的全局 dsh 随升级漂移，不作机制依据；机制核对一律走 env.sh
  定义的 dsh（当前指向**本仓 `vendor/dsh` 钉 tag 源码**——升 pin 见根 AGENTS §DSH 源码表）；
- **换 pin 后先构建**（0.1.7 起启动依赖构建产物）：`bash dev/vendor-build.sh --clean`——
  产出逐包 `lib/types`、`lib/typert.<face>.js`（`typert-loader` 启动要求）与 client 面
  `lib/client.js`（client-modules 组合要求）；vendor 自带 `pnpm run build` 在干净树上红在
  tsdown 根单元，故由本仓驱动（历次固定动作与产物细节 =
  [bumping-vendor-pin 技能](../../.agents/skills/bumping-vendor-pin/SKILL.md) §2/§4；0.2.0 轮新增的
  node_modules 刷新 / typert emit 过滤 / typecheck 金丝雀 / host 半补建均已固化进该技能）；
- web 观察窗：`dsh web -- --port 3084 --no-open`（3080 = 本 GUI；3081 = 已让渡外部项目，勿占；3083 = run 通道缺省）；
- run 通道（研究 run 的正式启动面，安装域）：`bash dev/boot-run.sh`（幂等：组合校验/补装
  → boot web 3083 → 入口步骤打印）——用法全文见 [61-run-playbook](./61-run-playbook.md)。
- 提交门禁：`source dev/env.sh` 幂等启用 pre-commit 钩子（`dev/hooks/pre-commit`：verify +
  tests 红灯即拦 commit——"收尾必跑"的机器化，红 commit 溜进历史的教训见
  [agent-friendly-polish Note 教训 4](../../notes/archived/2026-09-24-agent-friendly-polish.md)）；
  应急 `--no-verify` 须在 commit message 说明跳过的面与理由。

## 4. 收尾程序（同 diff，五件）

收尾前置（§0 验收门 + 反馈门③）：按本轮授权与已有验收判据逐项核对；适用判据全部有实际证据，未运行或受阻项明确列出。存在 RFC 时同时确认实现没有偏离获批内容。存在 `_backlog` 卡时，收尾与卡的去向/载体同变更：`待落地` 只选去向（不写 Note）；`implemented` 与交付同变更写 Note 并归档；`proposed` 与 RFC 成立同变更归档，RFC 毕业才写 implemented。

1. docs 只写 now：改过的语义面同步对应文档（合同随代码同 diff）；
2. 若有 proposed RFC 且决定理由需长期保留，将正文改写为已交付事实后迁 `notes/implemented/`。该 Note 含状态行/决定/输掉的方案/实际跑过的验证/环境状态；正文改写与状态格式见 [notes/AGENTS](../../notes/AGENTS.md)，并非每项交付都要求 Note；
3. `pnpm verify` + `pnpm test` 全绿（涉及面按 §2 加跑）；
4. 入口链探针（条目改动面含根/子树 AGENTS 或入口链时必跑，否则按节奏）——机械版：`source dev/env.sh && node probes/behavior/entry-chain-probe.mjs`（真模型档；真值机械抽取 + 软断言；无凭据时退化为语义版人工）；
5. commit（窄证据切片：只提交本条目相关改动；pre-commit 钩子自动复跑 verify+tests 拦红灯——§3）。

## 5. 密钥

- 独立真模型档 = `tests/checks/smoke-contract.test.mjs` 的 REAL_MODEL 闭集（成员以测试为准；`dev/record-role-fixture.mjs` 是单独录制工具，完整 run 属 L4）；手动 CI 通道 = `.github/workflows/model-smoke.yml`（`workflow_dispatch`；缺 secret 由脚本 preflight exit 2 硬失败；不进 PR）。
  调用凭据可在开发 home 配置（根 [AGENTS §密钥](../../AGENTS.md)）。CDP `--ask` 按当前会话档位；
  永不提交密钥；
- L1 真挂载无模型调用、无凭据可跑；L2 安装验收无模型调用并使用 `--install-only`，默认 doctor 仍检查凭据在场；
- web 搜索无需独立 key（D9 实证）：与 chat 同一把 `DEEPSEEK_API_KEY`。

## 6. 中断恢复（开发通道：上个 Agent 干到一半死了，下一个怎么接）

按本轮授权与真实工作痕迹恢复，不维护第二份控制状态：

1. 用户当前请求及仍有效的授权范围；
2. 若适用，读取问题卡、已批准 RFC 或工作记录，不假定每项工作都有这些载体；
3. `git log`、`git status` 与工作树，确认已提交和未提交的实际进度，先解决记录与现场不一致再继续。

研究 run 通道的恢复另有程序：[guides/61 §5](./61-run-playbook.md)，以 run bundle（`drt_<slug>/`）文件事实为准。
