# 60 · 开发环：条目生命周期、面选择与操作手册

> 层：指南（怎么操作）。流程纪律的权威在 DSH（vendor 树）与 company 仓
> （`notes/implemented/2026-09-23-dsh-inround-task-surface.md`——"轮内任务面"研究，
> 本指南的条目生命周期直接移植其结论）；本文是本仓落点。

## 0. 条目生命周期（反馈双门）

```
索引行（roadmap §队列）→ RFC（notes/proposed/，一文件一条目）
  → 【反馈门①】Plan Mode 呈批：完整计划经 exit_plan_mode 给用户批/打回（打回=反馈通道）
  → 实施期【反馈门②】todo_write 活清单：开工列全、完成即勾、steer 即重排（不批量勾）
  → 同 diff 收尾（§4）
```

- 两门都是 DSH 自带机制（base bundle，零接线）；**不要发明 tasks.md**（DSH 明文否决计划
  文件："a plan directory creates a second durable home"——会话日志即计划与清单的持久真相）。
- 条目类型三型走同一条流：feature / 卫生小修 / 研究；卫生与研究不装"轮子"。
- steer（用户插话）开启新 turn = 清单重排的信号，看得见反馈被吸收。

## 1. 六步闭环（实施期）

### 1.1 入口链契约（每步：读什么 → 应知道什么 → 卡住怎么办）

入口链的**步骤清单**正本 = 根 [AGENTS.md](../../AGENTS.md) §入口链（5 步）；下表是它的**产出契约**
（每一步给多少、拿到什么才算走完、卡住时的正确动作）：

| 步 | 读什么 | 读完应知道 | 卡住怎么办 |
|---|---|---|---|
| 1 | 根 `AGENTS.md` | 仓库形态、布局、纪律、`notes/` 地位、入口链本身 | 只想问"这仓库是什么" → 到此为止，别再往下读 |
| 2 | `docs/00-index.md` | 有哪些文档、决策 D 号在哪查、术语映射 | **别通读台账**；按需查 D 号 |
| 3 | `roadmap.md` §队列 ▶ | 当前条目是谁 + **它可不可执行**（行内标注"等人 / 可自主"） | ▶ 标"等人" → 正确动作是**向用户取题**，不是开工；队列空（parked 标记）→ 同样取题 |
| 4 | 该条目的 RFC | 问题 / 方案 / 输掉的方案 / **验收** | 验收不可用或与现状矛盾 → 先修 RFC 再动手 |
| 5 | 本页（guides/60） | 开工（§1/§2）与收尾（§4）程序 | 见下"按条目类型分支" |

**按条目类型分支**（第 5 步的实际程序不同，别拿代码程序跑研究条目）：

- **代码 / 卫生型** → 本页 §1.2 六步闭环 + §2 面选择表与任务型路由表 + §4 收尾；
- **研究 run 型** → [guides/61](61-run-playbook.md)（含**硬前置**：`research-workspace` 必须已注册进
  DSH，否则研究手册不进上下文）+ 开发技能 `running-a-research-run`；
- **队列条目毕业** → `graduating-a-queue-item`；**加/改角色** → `adding-a-research-role`；
  **加/改门禁** → `writing-a-gate`。

任务命中 `.agents/skills/` 某条 description（上列四个）时**先读该 `SKILL.md` 全文再动手**，不从
摘要猜流程。

### 1.2 六步闭环

1. 读入口链定位条目（入口链唯一正本 = 根 [AGENTS.md](../../AGENTS.md) §入口链，5 步）+ 该条目 RFC；
2. 列 todo（一 concrete step 一条，开列全量）；
3. 改动（源码/文档/配置同 diff 维护"现在为真"）；
4. 按改动面选跑验证（§2 面选择表 + 任务型路由表）；
5. 修复 → 复跑，只报告**实际跑过的检查**；
6. 收尾（§4）。

## 2. 面选择、任务型路由与全档命令（运行时入口）

| 面 | 什么时候跑 | 命令 |
|---|---|---|
| L0 结构 | 每次收尾必跑；实施期随手 | `pnpm verify` + `pnpm test`（正本 = `package.json` 的 `verify`/`test` 脚本） |
| L1 挂载 | preset 内容/结构改动（其完成定义） | `DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs`（源码域，keyless）；安装域加 `--profile <p> --no-patch` |
| L2 安装 | 包结构/release 相关改动 | `node scripts/release-smoke.mjs`（keyless：pack→干净 profile→plugin add→安装域冒烟；无模型调用） |
| L3 领域 | 方法论/preset 内容改动 | 映射表审查（design/30 对账）+ `node --import tsx/esm --test tests/evaluation-contract.test.mjs` |
| L4 交付 | 里程碑级 | L4-lite 冒烟（需 `DEEPSEEK_API_KEY`）/ 完整 run（队列条目） |

判据与负面判据（什么算"框架不合理"）见 [evaluation.md](../evaluation.md)——面与面不互抵。

### 任务型路由表（必改 → 次序 → 必跑面 → 必写 → done）

本表是**执行程序**的唯一 owner（面判据 = [evaluation.md](../evaluation.md)；改 pack 的文件级影响面 =
[guides/62 §改动影响面](62-plugin-authoring.md)——那两处是细节，不在这里复述）：

| 任务型 | 同 diff 必改 | 生成物与检查次序 | 必跑面 | 必写 | done |
|---|---|---|---|---|---|
| 改 preset（角色/skills/工具行） | pack 源 `presets/` | **`render-overlay` 先于 L1**（L1 挂的是 overlay，不是 pack 源） | L0 + L1 | 行为/发布集变才写 Note | 四角色真挂载绿 + 文档同步 |
| 改 persona / skill / 手册文本（模型可见） | pack 源 | `render-overlay` → L1 → **snapshot-replay B 层**（模型可见文本变化的 keyless 秒级信号：有意变更 → 红 = 已捕获，走新一代 fixture + `--update-expected` 重写金标准 + 人审）→ **重启 run 通道**（web 缓存 boot 时文本） | L0 + L1 + L4-lite | 同上 | 真模型档证据 + L1 绿 |
| 改观察面 client 面 | `src/client/` + tsconfig include + `dsh.client.inject` + keyed 字面量进 `keys.ts` | `pnpm build` → `client-load-smoke` | L0 + client-load-smoke | 同上 | 真浏览器断言全绿 |
| 加 / 改机械门禁 | `verify.mjs` gates 数组 + `evaluation.md` §L0 台账 | **注入回归红 → 还原 → 绿** | L0 | 带反证记录 | 红证实跑 + `gate-ledger-sync` 绿 |
| 改工作区手册 / 模板 | `research-workspace/` 正本 → `sync-pack-workspace` | sync → verify | L0 | — | `pack-workspace-fresh` 绿 |
| 改部署面（preflight / scaffold / 发布集） | pack `scripts/` + `package.json` 的 files/bin | — | L0 + L2 | 部署 Note | `release-smoke` ALL PASS |
| 换 vendor pin | `.gitmodules` + pack 兼容矩阵 | `vendor-build.sh`（含 host 半补建 + 前端壳重建）→ 逐条重审 | L0 + L1 + L2 + L4-lite | 升 pin 毕业 Note（重审结论正本） | 全档绿 + 重审入 Note |
| 纯文档 / 卫生 | 文档自身 | — | L0 | 仅持久决定理由才写 | 门禁绿 |
| **用户直派（不在队列）** | 先判路径：决定已作出 → 直接 `notes/implemented/`；重大且未构建 → 先立 RFC + 队列行 | 同对应任务型 | 同对应任务型 | 同对应任务型 | 同对应任务型 |

**值级改动**（只改一个配置**值**，如超时/阈值/开关）：本仓**没有值级断言**——门禁只证结构，L1 只证
"还能挂载"。所以 done 只能证到"仍挂载 + 文档同步"；要可证伪就**同 diff 补一条断言**（进 `tests/` 或
对应冒烟），否则在交付报告里显式写"**值级不可证**"，不许留白。

### 全档命令正本（含前置与档位）

```sh
bash dev/vendor-build.sh              # vendor 树构建（换 pin 后必做：--clean 清陈旧产物；tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳重建——0.1.7 起启动依赖构建产物）
pnpm verify                           # L0 结构门禁（keyless，收尾必跑）
pnpm test                             # L0 keyless 回归（= node --import tsx/esm --test tests/*.test.mjs；唯一登记的测试命令）
node dev/render-overlay.mjs            # 生成物：从 pack 渲染 dev/research.overlay.yml（改 pack 后必跑，且**必须先于 L1**）
node dev/sync-pack-workspace.mjs       # 生成物：把 research-workspace 正本同步进 pack 的 workspace/ 种子（改手册/模板后必跑）
node dev/hitl-answer.mjs --port 3081 --token <t>   # HITL 代答（代理模拟；默认逐题选推荐项）——answerer 只在浏览器客户端，故用真浏览器
source dev/env.sh                     # ⚠ 双 home + 裸 dsh 拦截（DSH_HOME=dev/harness-home）；下列 L1/L2 必须先 source，否则脚本自拒 exit 2
node scripts/preset-smoke.mjs         # L1 预检（keyless）；DSH_SMOKE_REAL=1 真挂载档（keyless：roster+逐角色建会话+skills 隔离；--profile <p> --no-patch 切安装域通道）
cd packages/deep-research-pack && pnpm build   # pack 双半构建（tsc -b . + tsdown → lib/index.js + lib/client.js——观察面 client 面，D18）
node scripts/client-load-smoke.mjs    # 观察面 client 面真浏览器加载（keyless：boot web + headless chromium——插件零失败 + 页签与渐进面硬断言）
node scripts/release-smoke.mjs        # L2 真实安装形状（keyless：pack→干净 profile→plugin add→安装域冒烟；起真 DSH 环境，无模型调用）
node scripts/l4-lite-smoke.mjs        # L4-lite 真模型冒烟（真模型档，需凭据：四角色响应 + scout web_search 调用）
node scripts/team-preflight-smoke.mjs # team 机制预检（真模型档，需凭据：spawn_teammate 组队 + 成员组合画像 + company D18 one-shot worker 探针）
bash dev/boot-run.sh                  # run 通道开跑（幂等：组合校验/漂移检测/补装 → boot web 3081 → 仪表盘）；用法 = 61
node scripts/run-dashboard.mjs --latest --out <html>   # run 只读投影（多场扫描 + 步骤条 + HITL 等待横幅；--watch 持续再生成）
node dev/run-kickoff.mjs --port 3081 --token <横幅 token> --prompt-file <file>        # run 会话驱动（建会话+发 kickoff）
node --import tsx/esm scripts/watch-run.mjs <session-id>   # run 盯场（谓词化状态判定：事件形状，非字符串 grep——HITL-PENDING/RUN-SETTLED 时退出自报；grep 会误报 request/header 工具 schema）
node --import tsx/esm dev/hitl-answer.mjs --port 3081 --token <t>   # HITL 代答（代理模拟；默认逐题选推荐项——先盘侧谓词自拒：无真挂起不开浏览器；answerer 只在浏览器客户端）
pnpm dsh <args…>                      # 机制基线 CLI（vendor/dsh 钉 tag 源码；等价 dev/env.sh 的 dsh 函数）
node --import tsx/esm scripts/client-hitl-smoke.mjs   # 观察面活标题触发验证（真模型档：RPC followup 造挂起态 + 盘侧谓词 + 浏览器观察点）
node scripts/snapshot-replay-smoke.mjs    # keyless 回放冒烟（须先 source dev/env.sh，端口 3103：三层判据——A 零真模型回放收尾逐字命中 / B 组装请求 diff（persona+工具 schema）/ C 渲染金标准比对；`--update-expected` 从真实回放重写金标准）
node scripts/evidence-audit.mjs <bundle>|--latest  # 证据溯源审计（**须先 source dev/env.sh**：它锚定本仓 dev home，DSH_HOME 指向别处即自拒）（keyless：URL/摘录/final 链对会话日志机械对账 → audit.md；CRITICAL 即 exit 1）
node scripts/entry-chain-probe.mjs    # 入口链探针（真模型档：时不变四问，答案对 ▶ 真值软断言，留档人工复核）
node packages/deep-research-pack/scripts/preflight.mjs --workspace <dir>   # 部署前置检查（pack 自带 bin：DSH 版本/peer 包/团队层/工作区手册/构建产物/密钥；fail-loud 带补救命令）
node packages/deep-research-pack/scripts/scaffold.mjs --workspace <dir>    # 部署准备（pack 自带 bin：铺工作区种子 + 补团队层 + 复跑 preflight；幂等）
```

档位词汇（keyless / 真模型档）与密钥定义 = [AGENTS.md §密钥](../../AGENTS.md)；脚本头注各带设计依据
与 RFC 出处。

三条与面选择同级的纪律（`_agent_ready_development` 吸纳，2026-09-25）：

- **先加载匹配的开发技能**：任务命中 `.agents/skills/` 某条 description（毕业条目 / 加角色 /
  写门禁 / 跑 run）→ 先读该 `SKILL.md` 全文再动手，不从摘要猜流程；
- **查询实际配置树，别从源码猜部署**：`pnpm dsh --profile research --dump-config` 是
  profile/bundle/patch 叠加后的官方查询（"会加载什么"）；`boot-run.sh` 的漂移检测管另一问
  ——"镜像是否等于 pack 源"；
- **未运行项如实分开**：交付报告里"未跑"与"通过"分列（例：无凭据自动跳过的 e2e 不算验过
  真实 provider，mock 测试不能替代真实入口证据）。

## 3. 开发环境

```sh
source dev/env.sh        # DSH_HOME=dev/harness-home（数据面）+ dsh 别名（代码面：钉 tag 源码）
```

- **双 home**：开发数据（会话/凭据/插件安装）全部进 `dev/harness-home/`，日用 `~/.dsh`
  不动——崩溃半径隔离；
- **裸 dsh 拦截**：`PATH` 里的全局 dsh 随升级漂移，不作机制依据；机制核对一律走 env.sh
  定义的 dsh（当前指向**本仓 `vendor/dsh` 钉 tag 源码**——升 pin 见根 AGENTS §DSH 源码表）；
- **换 pin 后先构建**（0.1.7 起启动依赖构建产物）：`bash dev/vendor-build.sh --clean`——
  产出逐包 `lib/types`、`lib/typert.<face>.js`（`typert-loader` 启动要求）与 client 面
  `lib/client.js`（client-modules 组合要求）；vendor 自带 `pnpm run build` 在干净树上红在
  tsdown 根单元，故由本仓驱动（坑与三条产物细节见
  [升 pin 复核结论](../../notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md#升-pin-复核结论2026-09-25-毕业)）；
- web 观察窗：`dsh web -- --port 3081 --no-open`（3080 是本 GUI 占用）；
- run 通道（研究 run 的正式启动面，安装域）：`bash dev/boot-run.sh`（幂等：组合校验/补装
  → boot web 3081 → 入口步骤打印）——用法全文见 [61-run-playbook](./61-run-playbook.md)。
- 提交门禁：`source dev/env.sh` 幂等启用 pre-commit 钩子（`dev/hooks/pre-commit`：verify +
  tests 红灯即拦 commit——"收尾必跑"的机器化，红 commit 溜进历史的教训见
  [agent-friendly-polish Note 教训 4](../../notes/implemented/2026-09-24-agent-friendly-polish.md)）；
  应急 `--no-verify` 须在 commit message 说明跳过的面与理由。

## 4. 收尾程序（同 diff，五件）

1. docs 只写 now：改过的语义面同步对应文档（合同随代码同 diff）；
2. 队列行删除 + RFC 毕业到 `notes/implemented/`（日期 = 主题首提日期，含：状态行/决定/
   输掉的方案/实际跑过的验证/环境状态——note-format 门禁断言；**状态行是裸值**
   `> 状态：implemented`，不带日期括号，目录↔状态互验，其余 provenance 落正文）；**毕业 =
   正文改写**：计划体→已交付事实体，未来时态/迁移计划删除——只改路径不改正文 = 未来计划
   伪装成当前事实；
3. `pnpm verify` + `pnpm test` 全绿（涉及面按 §2 加跑）；
4. 入口链探针（条目改动面含 docs/AGENTS 时必跑，否则按节奏）——机械版：
   `source dev/env.sh && node scripts/entry-chain-probe.mjs`（真模型档；时不变问法 × 4，
   真值机械抽取 + 软断言，留档 dev/smoke-workspace/ 供人工复核；无凭据时退化为语义版人工）；
5. commit（窄证据切片：只提交本条目相关改动；pre-commit 钩子自动复跑 verify+tests 拦红灯——§3）。

## 5. 密钥

- 仅真模型档需要 `DEEPSEEK_API_KEY`（当前 = l4-lite-smoke、team-preflight-smoke、
  entry-chain-probe 与 client-hitl-smoke；开发 home
  `dev/harness-home/.credentials.yaml` 配一次）；永不提交密钥；
- 其余全档 keyless（`DSH_SMOKE_REAL` 真挂载档、release-smoke：起真 DSH 环境，但无模型调用）；
- web 搜索无需独立 key（D9 实证）：与 chat 同一把 `DEEPSEEK_API_KEY`。

## 6. 新门禁的规矩

每条新机械门禁**带反证**：先注入违规看红 → 还原 → 绿（guard only guards if it fails
the regression）。反证记录进对应 implemented Note。

## 7. 中断恢复（开发通道：上个 Agent 干到一半死了，下一个怎么接）

只认四样东西，**不维护任何"控制/状态文件"**：

1. **`roadmap.md` §队列 ▶**——全仓唯一"当前"指针（干到哪个条目）；
2. **该条目 RFC 的状态行 + 文末实施记录**（`notes/proposed/` 一文件一条目；状态行住
   RFC 自己头部：proposed / approved / …；实施记录随进度追加——干到条目内部哪一步）；
3. **`git log`**——最近提交的窄证据切片（哪些已闭、实际跑过什么验证）；
4. **`git status` + 工作树**——**在飞**（未提交）的那一步只能从这里看：前两源都落后于工作树时
   （复验实测：RFC 实施记录停在 S2 而 S3/S4 已提交），先补记实施记录再继续，别靠猜。

为什么不是状态文件：本仓**主动否决**过控制文件那套（rb_status / rb_queue / rb_trace
状态文件）——输掉的方案与理由见
[m2-plan-shape RFC §输掉的方案](../../notes/implemented/2026-09-24-m2-plan-shape.md)：
会话日志 / git / RFC 即持久真相，第二份"状态的家"必然漂移。恢复程序 = **读上述三样**，
不是"先更新状态文件再干活"。（研究 run 通道的恢复另有程序：[guides/61 §5](./61-run-playbook.md)，
只认 run bundle（`drt_<slug>/`）的文件事实。）
