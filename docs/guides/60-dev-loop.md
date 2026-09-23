# 60 · 开发环：条目生命周期、面选择与操作手册

> 层：指南（怎么操作）。流程纪律的权威在 DSH（vendor 树）与 company 仓
> （`notes/research/2026-09-23-dsh-inround-task-surface.md`——"轮内任务面"研究，
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

1. 读入口链定位条目（AGENTS → 00-index → 队列 ▶）+ 该条目 RFC；
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

## 3. 开发环境

```sh
source dev/env.sh        # DSH_HOME=dev/harness-home（数据面）+ dsh 别名（代码面：钉 tag 源码）
```

- **双 home**：开发数据（会话/凭据/插件安装）全部进 `dev/harness-home/`，日用 `~/.dsh`
  不动——崩溃半径隔离；
- **裸 dsh 拦截**：`PATH` 里的全局 dsh 随升级漂移，不作机制依据；机制核对一律走 env.sh
  定义的 dsh（当前指向 company checkout 的钉 tag 源码，D10 偏离；本仓 vendor 落地后切换）；
- web 观察窗：`dsh web -- --port 3081 --no-open`（3080 是本 GUI 占用）。

## 4. 收尾程序（同 diff，五件）

1. docs 只写 now：改过的语义面同步对应文档（合同随代码同 diff）；
2. 队列行删除 + RFC 毕业到 `notes/implemented/`（日期+主题命名，含：决定/输掉的方案/
   实际跑过的验证/环境状态）；
3. `node scripts/verify.mjs` + `node --test tests/*.test.mjs` 全绿（涉及面按 §2 加跑）；
4. 入口链探针（条目改动面含 docs/AGENTS 时必跑，否则按节奏）；
5. commit（窄证据切片：只提交本条目相关改动）。

## 5. 密钥

- 仅真模型档需要 `DEEPSEEK_API_KEY`（当前 = l4-lite-smoke；开发 home
  `dev/harness-home/.credentials.yaml` 配一次）；永不提交密钥；
- 其余全档 keyless（`DSH_SMOKE_REAL` 真挂载档、release-smoke：起真 DSH 环境，但无模型调用）；
- web 搜索无需独立 key（D9 实证）：与 chat 同一把 `DEEPSEEK_API_KEY`。

## 6. 新门禁的规矩

每条新机械门禁**带反证**：先注入违规看红 → 还原 → 绿（guard only guards if it fails
the regression）。反证记录进对应 implemented Note。
