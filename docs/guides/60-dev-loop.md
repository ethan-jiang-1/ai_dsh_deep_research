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
  → 【反馈门③】收尾前对抗自审（开发技能 reviewing-a-delivery：重读当前 diff，对齐意图/
    文档/证据选型——交付判断四角色中 agent 可自主承担的语义判断层，判据 = evaluation
    §完成判断四分离）
  → 同 diff 收尾（§4）：按适用验收判据对账，报告实际证据与未运行项

可选支路：问题需澄清/查证 → _backlog/issues/ 与按需 methods/research/；
持久决定需显式评审 → notes/proposed/ RFC
```

- 两门都是 DSH 自带机制（base bundle，零接线）；**不要发明 tasks.md**（DSH 明文否决计划
  文件："a plan directory creates a second durable home"——会话日志即计划与清单的持久真相）。
- **验收门（TDD 式，[D23](../00-index.md)）**：对已授权工作，在实施前把可判定的验收判据绑定检查方式；可机械者先立红，人工判据明确记录走查证据。验收尚不明确时，澄清是当前任务需要，不会自动阻断已授权且可独立推进的工作；证据设计复用本仓现有 owner，不另造队列。四条硬边界：①**改断言迁就实现不是修法**——断言只在行为/合同真实变化时同 diff 改（[tests/AGENTS](../../tests/AGENTS.md)）；②**未验项不得写 implemented**，被阻断检查如实注明；③**复发升格**——implemented 缺真实验证证据复发时，才考虑升为机械门禁并配负例；④证据和结论不得超出检查实际证明的范围（依据见 [00-index §外部研究材料](../00-index.md) 与 [item-lifecycle-tdd Note](../../notes/implemented/2026-10-05-item-lifecycle-tdd.md)）。
- 多步实施按可独立验收结果拆解；小问题不强行拆成子任务。一次需要多个相互独立的人类判断时，分别记录问题与依赖，不把它们伪装成执行步骤。
- steer（用户插话）开启新 turn = 清单重排的信号，看得见反馈被吸收。

## 1. 六步闭环（实施期）

### 1.1 入口链契约（按需查阅）

根 [AGENTS.md](../../AGENTS.md) §入口链拥有仓级路由。收到工作后先确定用户本轮授权和目标；仅在需要澄清、查证或跨轮留存时，才按 [意图载体总图](../design/60-intent-carriers.md) 使用 backlog。

| 情况 | 读什么 | 读完应知道 | 卡住怎么办 |
|---|---|---|---|
| 所有改仓工作 | 根 `AGENTS.md`、`docs/00-index.md` | 仓库形态、相关 owner、现行决策 | 只问仓库概况时，到此为止 |
| 需澄清或查证 | 对应 [_backlog/issues/](../../_backlog/issues/README.md)、按需 methods/research | 目标、范围、已知事实、未决问题和下一步 | 暂停依赖未决点的判断；独立且已授权的工作照常继续 |
| 持久决定需显式评审 | 对应 [notes/proposed/](../../notes/proposed/) RFC | 被评审的决定、备选与验收 | 不需显式评审时无需创建 RFC |
| 任何实施工作 | 本页 §1/§2 与 §4 | 与改动面相称的证据和收尾动作 | 按任务类型路由验证 |

**按工作类型分支**（证据和操作不同，不意味着必须先建卡或 RFC）：

- **代码 / 卫生型** → 本页 §1.2 六步闭环 + §2 面选择表与任务型路由表 + §4 收尾；
- **研究 run 型** → [guides/61](61-run-playbook.md)（含**硬前置**：`research-workspace` 必须已注册进
  DSH，否则研究手册不进上下文）+ 开发技能 `running-a-research-run`；
- **交付收尾** → `reviewing-a-delivery`；**加/改角色** → `adding-a-research-role`；
  **加/改门禁** → `writing-a-gate`；**加/调节点轨道** → `changing-node-topology`；
  **换 vendor pin** → `bumping-vendor-pin`。

任务命中 `.agents/skills/` 某条 description（上列六个）时**先读该 `SKILL.md` 全文再动手**，不从
摘要猜流程。

### 1.2 六步闭环

1. 读取本轮授权与对应 owner；存在 backlog 问题时读卡片及其直接证据；存在 RFC 时按其范围执行；
2. 复杂的多步实施列 todo（一 concrete step 一条，完成即更新）；
3. 改动（源码/文档/配置同 diff 维护"现在为真"）；
4. 按改动面选跑验证（§2 面选择表 + 任务型路由表）；
5. 修复 → 复跑，只报告**实际跑过的检查**；
6. 收尾（§4）。

## 2. 面选择、任务型路由与全档命令（运行时入口）

| 面 | 什么时候跑 | 命令 |
|---|---|---|
| L0 结构 | 每次收尾必跑；实施期随手 | `pnpm verify` + `pnpm test`（正本 = `package.json` 的 `verify`/`test` 脚本） |
| L1 挂载 | preset 内容/结构改动（其完成定义） | `source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`（源码域，keyless；未 source 自拒）；安装域加 `--profile <p> --no-patch` |
| L2 安装 | 包结构/release 相关改动 | `source dev/env.sh && node scripts/smoke/release-smoke.mjs`（pack→干净 profile→plugin add→安装域冒烟；无模型调用，安装验收使用 `--install-only`，默认 preflight 仍检查凭据；未 source 自拒） |
| L3 领域 | 方法论/preset 内容改动 | 映射表审查（design/30 对账）+ `node --import tsx/esm --test tests/evaluation-contract.test.mjs` |
| L4 交付 | 里程碑级 | `source dev/env.sh && node scripts/smoke/l4-lite-smoke.mjs`（真模型档：需 `DEEPSEEK_API_KEY`，未 source 自拒）/ 完整 run（授权范围） |

判据与负面判据（什么算"框架不合理"）见 [evaluation.md](../evaluation.md)——面与面不互抵。

### 任务型路由表（必改 → 次序 → 必跑面 → 必写 → done）

本表是**执行程序**的唯一 owner（面判据 = [evaluation.md](../evaluation.md)；改 pack 的文件级影响面 =
[guides/62 §改动影响面](62-plugin-authoring.md)——那两处是细节，不在这里复述）：

| 任务型 | 同 diff 必改 | 生成物与检查次序 | 必跑面 | 必写 | done |
|---|---|---|---|---|---|
| 改 preset 结构（角色/工具行/roster 接线；新增 skill 文件按下行） | pack 源 `presets/` | **`render-overlay` 先于 L1**（L1 挂的是 overlay，不是 pack 源） | L0 + L1 | 行为/发布集变才写 Note | 四角色真挂载绿 + 文档同步 |
| 改 persona / skill / 手册文本（模型可见） | pack 源 + `research-workspace/` 正本 | `render-overlay` 先于 L1（L1 挂的是 overlay，不是 pack 源）→ L1 → **snapshot-replay B 层**（模型可见文本变化的 keyless 秒级信号；比对面 = persona 全文 + 全部 request/header + 三处 `user/message` 注入〔工作区手册全文 / skill 目录 description / 运行时上下文〕——**skill 正文不进组装请求**，其证据 = L1 可见面 + L4-lite 行为；有意变更 → 红 = 已捕获，走重录场景[真模型档，同 diff 更新 `snapshot.json` 的 source 身份]或 `--update-expected` 重写金标准 + 人审）→ **重启 run 通道**（web 缓存 boot 时文本）。金标准只许重写，不许放宽比对或归一化凑绿——fix fixtures, not normalizers | L0 + L1 + L4-lite | 同上 | 真模型档证据 + L1 绿 |
| **改驾驶舱**（观察面 client 面——`src/client/` 套件，[构成正本](../design/40-research-cockpit.md)） | `src/client/` + tsconfig include + `dsh.client.inject` + keyed 字面量进 `keys.ts` | `pnpm build` → `client-load-smoke`（改挂起显性化再跑 `client-hitl-smoke`） | L0 + client-load-smoke | 同上 | 真浏览器断言全绿 |
| 加 / 改机械门禁 | `verify.mjs` gates 数组 + `evaluation.md` §L0 台账（案例表有增删再动 `gates-smoke.mjs`） | **注入回归红 → 还原 → 绿** → gates-smoke | L0 + gates-smoke | 带反证记录 | 红证实跑 + `gate-ledger-sync` 绿 + gates-smoke 绿 |
| 改 run 通道工具 / 审计门（run-driver / boot-run / watch-run / hitl-answer / run-dashboard / evidence-audit / node-gate / schema-scan / snapshot-replay） | 对应 `scripts/` / `dev/` 脚本 | — | L0 + 对应 `tests/*.test.mjs` 契约测试必跑（用例即其反证记录） | 判据变更才写 Note | 对应契约测试绿 |
| 改 scripts/lib 支撑模块 / dev 基建本体（`lib/*.mjs`、env.sh、render-overlay、sync-pack-workspace） | 支撑模块 + 其**全部消费方**（消费面 grep：roles.mjs 的角色枚举消费方、render-overlay → `overlay-fresh`、sync → `pack-workspace-fresh`、run-state → watch-run/hitl-answer/run-dashboard） | 消费方门禁在同 diff 复跑 | L0 + lib 对应契约测试 | 判据变更才写 Note | 消费方门禁与契约测试绿 |
| 改工作区手册 / 模板（结构性调整：模板增删 / 路径与格式修正；**手册正文文本 = 模型可见，走上行〔改 persona / skill / 手册文本〕**） | `research-workspace/` 正本 → `sync-pack-workspace` | sync → verify | L0 | — | `pack-workspace-fresh` 绿 |
| 改部署面（preflight / scaffold / 发布集） | pack `scripts/` + `package.json` 的 files/bin | — | L0 + L2 | 部署 Note | `release-smoke` ALL PASS |
| 换 vendor pin | `.gitmodules` + pack 兼容矩阵 | `vendor-build.sh`（含 host 半补建 + 前端壳重建）→ 逐条重审（含 agent-team 合同 diff 与货架增量对账——正本 = [discipline-map §重审触发路径](../discipline-map.md)） | L0 + L1 + L2 + client-load-smoke + L4-lite（0.2.0 轮实证：漏跑观察面 = client bundle 的 build-time externals 漂移漏网） | 升 pin 毕业 Note（重审结论正本） | 全档绿 + 重审入 Note |
| 纯文档 / 卫生 | 文档自身 | — | L0 | 仅持久决定理由才写 | 门禁绿 |
| **用户直派** | 按本轮授权直接执行；如需跨步排序使用会话内 todo；仅需显式评审的持久决定才建立 RFC；交付后按 notes 规则决定是否记录决定理由 | 同对应任务型 | 同对应任务型 | 同对应任务型 | 同对应任务型 |

**值级改动**（只改一个配置**值**，如超时/阈值/开关）：本仓**没有值级断言**——门禁只证结构，L1 只证
"还能挂载"。所以 done 只能证到"仍挂载 + 文档同步"；要可证伪就**同 diff 补一条断言**（进 `tests/` 或
对应冒烟），否则在交付报告里显式写"**值级不可证**"，不许留白。

### 全档命令正本（含前置与档位）

```sh
bash dev/vendor-build.sh              # vendor 树构建（换 pin 后必做：--clean 清陈旧产物；tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳重建——0.1.7 起启动依赖构建产物）
pnpm verify                           # L0 结构门禁（keyless，收尾必跑）
pnpm test                             # L0 keyless 回归（= node --import tsx/esm --test tests/*.test.mjs；唯一登记的测试命令）
node scripts/smoke/gates-smoke.mjs    # 门禁自测（keyless：临时副本注入回归经真实 verify 入口点名报红 + 零注入对照组；改 verify.mjs 门禁逻辑必跑）
node dev/render-overlay.mjs            # 生成物：从 pack 渲染 dev/research.overlay.yml（改 pack 后必跑，且**必须先于 L1**）
node dev/sync-pack-workspace.mjs       # 生成物：把 research-workspace 正本同步进 pack 的 workspace/ 种子（改手册/模板后必跑）
source dev/env.sh                     # ⚠ 双 home + 裸 dsh 拦截（DSH_HOME=runtime/harness-home）；下列 L1/L2 必须先 source，否则脚本自拒 exit 2
node scripts/smoke/preset-smoke.mjs         # L1 预检（keyless）；DSH_SMOKE_REAL=1 真挂载档（keyless：roster+逐角色建会话+skills 隔离；--profile <p> --no-patch 切安装域通道）
cd packages/deep-research-pack && pnpm build   # pack 双半构建（tsc -b . + tsdown → lib/index.js + lib/client.js——观察面 client 面，D18）
node --import tsx/esm scripts/smoke/client-load-smoke.mjs    # 观察面 client 面真浏览器加载（keyless：boot web + headless chromium——插件零失败 + 页签与渐进面硬断言；渐进面断言 = 磁盘侧绑定会话的真值对账）
node scripts/probe/cdp-probe.mjs '<gui-url>' --open-session '<标题>' --open-status --expect-face '<文本>' [--expect-no-leak '<文本>'] [--ask '<消息>']   # 交互探针（裸 CDP，借鉴 ai_dsh_loop_advisor）：Playwright actionability 被 DSH UI 挡死时的交互驱动工具——JS 派发点击/输入，JSON 判决；--ask = 完整产品环（输入→发送→等回复）。老会话可能要先在 GUI 里让它进侧栏近列表
node scripts/smoke/release-smoke.mjs        # L2 真实安装形状：pack→干净 profile→plugin add→安装域冒烟；无模型调用，安装模式跳过模型就绪检查
node scripts/smoke/l4-lite-smoke.mjs        # L4-lite 真模型冒烟（真模型档，需凭据：四角色响应 + scout web_search 调用）
node scripts/smoke/team-preflight-smoke.mjs # team 机制预检（真模型档，需凭据：spawn_teammate 组队 + 成员组合画像 + company D18 one-shot worker 探针）
node dev/run-driver.mjs up          # **run 通道驱动入口（常用）**：起/复用通道 + 验浏览器面 + 呈交块（exit 0 可呈交/1 红/2 未跑）；probe = 只验已起通道；url = 打印当前 URL
bash dev/boot-run.sh                  # run 通道底层启动面：自检→组合检查/必要补装→漂移门；仪表盘后台观察、web 前台 3083；用法 = 61（驱动入口内部调它）
node --import tsx/esm scripts/run-ops/run-dashboard.mjs --latest --out <html>   # run 只读投影（多场扫描 + 步骤条 + HITL 等待横幅；--watch 持续再生成）
node scripts/run-ops/plan-card-stats.mjs   # 计划确认卡字数跨场分布（keyless，须先 source；判 ①-c 升硬门前置「连续 ≥3 场 ≤200 字达标」）
node scripts/run-ops/provider-error-stats.mjs   # 上游流错误（回合被终结）跨场分布——BUG-022 的"可数"面（keyless，须先 source）
node dev/run-kickoff.mjs --port 3083 --token <横幅 token> --prompt-file <file>        # run 会话驱动（建会话+发 kickoff）
node --import tsx/esm scripts/run-ops/watch-run.mjs <session-id>   # run 盯场（谓词化状态判定：事件形状，非字符串 grep——HITL-PENDING/RUN-SETTLED 时退出自报；grep 会误报 request/header 工具 schema）
node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <t>   # HITL 代答（代理模拟；默认逐题选推荐项——先盘侧谓词自拒：无真挂起不开浏览器；answerer 只在浏览器客户端，故用真浏览器）
pnpm dsh <args…>                      # 机制基线 CLI（vendor/dsh 钉 tag 源码；等价 dev/env.sh 的 dsh 函数）
node --import tsx/esm scripts/smoke/client-hitl-smoke.mjs   # 观察面活标题触发验证（真模型档：RPC followup 造挂起态 + 盘侧谓词 + 浏览器观察点）
node --import tsx/esm scripts/smoke/cdp-ask-smoke.mjs    # 交互探针端到端（真模型档：一次性通道跑 --ask，断言发出 + journal 落盘；空闲态与在飞态两阶段）
node scripts/smoke/snapshot-replay-smoke.mjs    # keyless 回放冒烟（须先 source dev/env.sh，端口 3103）：场景集由 snapshots/replay/research-face/snapshot.json 声明（角色集仍与盘上 presets/ 对账）——逐场景 A 回放收尾逐字命中 + B 组装请求 diff（persona 全文 + 全部 request/header + 三处 user/message 注入）+ 声明了 renderExpected 的场景做 C 渲染金标准比对；`--scenario <id>` 单场景、`--update-expected` 重写金标准
node --import tsx/esm dev/record-role-fixture.mjs --role <scout|analyst|critic|lead>   # 角色组装面 fixture 录制（真模型档一次性：research 档短会话 + 哨兵「探针完成」收尾 + 日志静默判定；录制品人审后入库 + 在场景声明登记 source 身份，此后 keyless 永久回放）
node scripts/run-gates/evidence-audit.mjs <bundle>|--latest  # 证据溯源审计（**须先 source dev/env.sh**：它锚定本仓 dev home，DSH_HOME 指向别处即自拒）（keyless：URL/摘录/final 链对会话日志机械对账 → audit.md；CRITICAL 即 exit 1）
node scripts/run-gates/node-gate.mjs <bundle>|--latest [--sessions <dir>]  # 节点交接契约门（keyless：交付两门 = §Decisions 拍板行 + present 声明；RED = exit 1，报告落 bundle node-gate.md；tests/ 夹具区只出 stdout 不写文件）
node scripts/run-gates/schema-scan.mjs [<bundle-dir>…]     # schema 保真度扫描（keyless：八节点输出件在场断言；断代定红——契约日 2026-09-29 后交付且违约 = exit 1，契约前期如实报告不计红；默认扫 archive 全量）
node scripts/probe/entry-chain-probe.mjs    # 入口链探针（真模型档：授权范围、RFC 条件、开发环路径三问；词面断言与原文留档人工复核）
node scripts/probe/discipline-probe.mjs     # 纪律行为探针（真模型档：A2 超界 / B1 差集 / 收活缺件·UNVERIFIED / 计划确认卡·quick_factual 免发互补对五场景标记断言——先读技能正本再作答；--scenario <id> 定向；留档人工复核）
node packages/deep-research-pack/scripts/preflight.mjs --workspace <dir>   # 部署前置检查（pack 自带 bin：DSH 版本/peer 包/团队层/工作区手册/构建产物/密钥；fail-loud 带补救命令）
node packages/deep-research-pack/scripts/scaffold.mjs --workspace <dir>    # 部署准备（pack 自带 bin：铺工作区种子 + 补团队层 + 复跑 preflight；幂等）
```

档位词汇（keyless / 真模型档）与密钥定义 = [AGENTS.md §密钥](../../AGENTS.md)；脚本头注各带设计依据
与 RFC 出处。

五条与面选择同级的纪律（前三条 = `_agent_ready_development` 吸纳，2026-09-25；后两条 = 姊妹仓
`ai_dsh_assitant` 借入，2026-10-05，钉版见 [00-index §外部研究材料](../00-index.md)）：

- **先加载匹配的开发技能**：任务命中 `.agents/skills/` 某条 description（换 pin / 加角色 /
  写门禁 / 跑 run / 改轨道 / 交付自审——清单 = 盘上 `.agents/skills/`）→ 先读该 `SKILL.md` 全文再动手，不从摘要猜流程；
- **查询实际配置树，别从源码猜部署**：`pnpm dsh --profile research --dump-config` 是
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
pnpm verify && pnpm test                    # L0 应全绿（无需 vendor 构建产物）
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
  tsdown 根单元，故由本仓驱动（0.1.7 轮三条产物细节见
  [升 pin 复核结论](../../notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md#升-pin-复核结论2026-09-25-毕业)；
  0.2.0 轮新增固定动作 = vendor 内部 node_modules 刷新 + typert emit 按面过滤 +
  聚合 typecheck 红的金丝雀守门 + host 半补建扫 `vendor`，见
  [020rc2 升 pin Note](../../notes/implemented/2026-09-30-vendor-pin-bump-020rc2.md)）；
- web 观察窗：`dsh web -- --port 3084 --no-open`（3080 = 本 GUI；3081 = 已让渡外部项目，勿占；3083 = run 通道缺省）；
- run 通道（研究 run 的正式启动面，安装域）：`bash dev/boot-run.sh`（幂等：组合校验/补装
  → boot web 3083 → 入口步骤打印）——用法全文见 [61-run-playbook](./61-run-playbook.md)。
- 提交门禁：`source dev/env.sh` 幂等启用 pre-commit 钩子（`dev/hooks/pre-commit`：verify +
  tests 红灯即拦 commit——"收尾必跑"的机器化，红 commit 溜进历史的教训见
  [agent-friendly-polish Note 教训 4](../../notes/implemented/2026-09-24-agent-friendly-polish.md)）；
  应急 `--no-verify` 须在 commit message 说明跳过的面与理由。

## 4. 收尾程序（同 diff，五件）

收尾前置（§0 验收门 + 反馈门③）：按本轮授权与已有验收判据逐项核对；适用判据全部有实际证据，未运行或受阻项明确列出。存在 RFC 时同时确认实现没有偏离获批内容。

1. docs 只写 now：改过的语义面同步对应文档（合同随代码同 diff）；
2. 若有 proposed RFC 且决定理由需长期保留，将正文改写为已交付事实后迁 `notes/implemented/`。该 Note 含状态行/决定/输掉的方案/实际跑过的验证/环境状态；正文改写与状态格式见 [notes/AGENTS](../../notes/AGENTS.md)，并非每项交付都要求 Note；
3. `pnpm verify` + `pnpm test` 全绿（涉及面按 §2 加跑）；
4. 入口链探针（条目改动面含 docs/AGENTS 时必跑，否则按节奏）——机械版：`source dev/env.sh && node scripts/probe/entry-chain-probe.mjs`（真模型档；真值机械抽取 + 软断言；无凭据时退化为语义版人工）；
5. commit（窄证据切片：只提交本条目相关改动；pre-commit 钩子自动复跑 verify+tests 拦红灯——§3）。

## 5. 密钥

- 独立真模型档 = l4-lite-smoke、team-preflight-smoke、entry-chain-probe、discipline-probe、client-hitl-smoke、cdp-ask-smoke 与 dev/record-role-fixture（fixture 录制）；
  调用凭据可在开发 home 配置（根 [AGENTS §密钥](../../AGENTS.md)）。CDP `--ask` 按当前会话档位；
  永不提交密钥；
- L1 真挂载无模型调用、无凭据可跑；L2 安装验收无模型调用并使用 `--install-only`，默认 preflight 仍检查凭据在场；
- web 搜索无需独立 key（D9 实证）：与 chat 同一把 `DEEPSEEK_API_KEY`。

## 6. 新门禁的规矩

每条新机械门禁**带反证**：先注入违规看红 → 还原 → 绿（guard only guards if it fails
the regression）。反证记录进对应 implemented Note。

## 7. 中断恢复（开发通道：上个 Agent 干到一半死了，下一个怎么接）

按本轮授权与真实工作痕迹恢复，不维护第二份控制状态：

1. 用户当前请求及仍有效的授权范围；
2. 若适用，读取问题卡、已批准 RFC 或工作记录，不假定每项工作都有这些载体；
3. `git log`、`git status` 与工作树，确认已提交和未提交的实际进度，先解决记录与现场不一致再继续。

研究 run 通道的恢复另有程序：[guides/61 §5](./61-run-playbook.md)，以 run bundle（`drt_<slug>/`）文件事实为准。
