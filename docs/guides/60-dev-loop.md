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

1. 读入口链定位条目（入口链唯一正本 = 根 [AGENTS.md](../../AGENTS.md) §入口链，5 步）+ 该条目 RFC；
2. 列 todo（一 concrete step 一条，开列全量）；
3. 改动（源码/文档/配置同 diff 维护"现在为真"）；
4. 按改动面选跑验证（§2 面选择表）；
5. 修复 → 复跑，只报告**实际跑过的检查**；
6. 收尾（§4）。

## 2. 面选择表（评估五面的运行时入口）

| 面 | 什么时候跑 | 命令 |
|---|---|---|
| L0 结构 | 每次收尾必跑；实施期随手 | `node scripts/verify.mjs` + `node --test tests/*.test.mjs`（或 `pnpm verify` / `pnpm test`） |
| L1 挂载 | preset 内容/结构改动（其完成定义） | `DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs`（源码域，keyless）；安装域加 `--profile <p> --no-patch` |
| L2 安装 | 包结构/release 相关改动 | `node scripts/release-smoke.mjs`（keyless：pack→干净 profile→plugin add→安装域冒烟；无模型调用） |
| L3 领域 | 方法论/preset 内容改动 | 映射表审查（design/30 对账）+ `node --test tests/evaluation-contract.test.mjs` |
| L4 交付 | 里程碑级 | L4-lite 冒烟（需 `DEEPSEEK_API_KEY`）/ 完整 run（队列条目） |

判据与负面判据（什么算"框架不合理"）见 [evaluation.md](../evaluation.md)——面与面不互抵。

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
3. `node scripts/verify.mjs` + `node --test tests/*.test.mjs` 全绿（涉及面按 §2 加跑）；
4. 入口链探针（条目改动面含 docs/AGENTS 时必跑，否则按节奏）——机械版：
   `source dev/env.sh && node scripts/entry-chain-probe.mjs`（真模型档；时不变问法 × 4，
   真值机械抽取 + 软断言，留档 dev/smoke-workspace/ 供人工复核；无凭据时退化为语义版人工）；
5. commit（窄证据切片：只提交本条目相关改动；pre-commit 钩子自动复跑 verify+tests 拦红灯——§3）。

## 5. 密钥

- 仅真模型档需要 `DEEPSEEK_API_KEY`（当前 = l4-lite-smoke 与 team-preflight-smoke；开发 home
  `dev/harness-home/.credentials.yaml` 配一次）；永不提交密钥；
- 其余全档 keyless（`DSH_SMOKE_REAL` 真挂载档、release-smoke：起真 DSH 环境，但无模型调用）；
- web 搜索无需独立 key（D9 实证）：与 chat 同一把 `DEEPSEEK_API_KEY`。

## 6. 新门禁的规矩

每条新机械门禁**带反证**：先注入违规看红 → 还原 → 绿（guard only guards if it fails
the regression）。反证记录进对应 implemented Note。

## 7. 中断恢复（开发通道：上个 Agent 干到一半死了，下一个怎么接）

只认三样东西，**不维护任何"控制/状态文件"**：

1. **`roadmap.md` §队列 ▶**——全仓唯一"当前"指针（干到哪个条目）；
2. **该条目 RFC 的状态行 + 文末实施记录**（`notes/proposed/` 一文件一条目；状态行住
   RFC 自己头部：proposed / approved / …；实施记录随进度追加——干到条目内部哪一步）；
3. **`git log`**——最近提交的窄证据切片（哪些已闭、实际跑过什么验证）。

为什么不是状态文件：本仓**主动否决**过控制文件那套（rb_status / rb_queue / rb_trace
状态文件）——输掉的方案与理由见
[m2-plan-shape RFC §输掉的方案](../../notes/implemented/2026-09-24-m2-plan-shape.md)：
会话日志 / git / RFC 即持久真相，第二份"状态的家"必然漂移。恢复程序 = **读上述三样**，
不是"先更新状态文件再干活"。（研究 run 通道的恢复另有程序：[guides/61 §5](./61-run-playbook.md)，
只认 run bundle（`drt_<slug>/`）的文件事实。）
