# 六维卫生轮·三：让"绿"说真话（镜像门 / 端口生命周期 / 覆盖契约）

> 状态：implemented
>
> 用户 2026-10-28 六维复审（持续跟进）的落地轮。前两轮把结构、验收与测试面抬到 A-；
> 本轮处理"反馈通路说的是不是当前事实"——三条实测假绿/互相踩踏，以及三处账本与结构债。

## 决定

- **复用已在飞的通道必须先证明镜像 = 当前 pack 源**。`run-driver up/probe` 原先只看
  `web.log` 横幅 + 端口监听，复用分支完全跳过 boot-run 的漂移门；2026-10-28 实测通道
  web.log 18:47 起、pack `lib/client.js` 02:50 重建，probe 仍判 GREEN——验的是五天前的页面。
  处置：`dev/boot-run.sh` 增 `--drift-only`（只读：不碰端口/不安装/不写 MCP patch/不起 web），
  `run-driver` 复用分支与 `probe` 先跑它；`runDriverVerdict` 把 `channel-mirror` 作为第一条硬检查，
  漂移或未取证 = **exit 2 / NOT-RUN**，不是红也不是绿。`composing:false` 这个从未被计算过的
  幻影参数随之删除（旧注释承诺"组合在写 → 2"，实际没有任何调用方传 true）。
- **client-load 的端口生命周期是判据的一部分**。非组长模式下 `child.kill('SIGTERM')` 够不着 web
  孙进程；一次异常退出后 3109 仍被监听，下一次直接 EADDRINUSE。处置：boot 前 `reclaimPort`
  清陈旧监听、boot 失败兜底、收尾把"端口真的静默"做成失败项（不止发信号）。同一次实测还暴露
  两路 client-load 并发时双方互相 reclaim：新增 `runtime/smoke-workspace/client-load.lock`
  （pid 属主；属主已死则接管），第二个实例 exit 2，不动第一个。
- **覆盖边界从"散文承诺"变成可失败的契约**。`tests/contracts/test-surface.test.mjs` 扩到
  pack `src/lib/*.ts`（此前只有"23/23 已覆盖"一句话，新增纯件不写测试不会被发现）；
  `tests/contracts/docs-consistency.test.mjs` 新增 00-index §文档地图对 `docs/**/*.md` 的全覆盖
  （新文档只放目录里 = fresh agent 按需加载不到）。
- **`plan-graph.ts` 拆成图与文件解析两件**：775 行里 Team 任务图（levels/waves/attention/counts/
  worker chips）与 `plan.md` 节点表解析/结构提示是两个变更面，改解析规则要在图的上下文里翻。
  拆后 `plan-graph.ts` 439 行（图）、`plan-index.ts` 347 行（解析）；消费者与测试按家 import，
  design/40 构成索引补 `plan-index` 行。用例体逐字保留，只改 import 家与文件头。
- **`run-dashboard-core` 拆成"折模型"与"画 HTML"**：626 行里解析/场景/模型与渲染薄壳同住；
  渲染只依赖模型、矩阵与 gap 统计，拆分后 core 481 行、`run-dashboard-html` 151 行。CLI 与测试
  按家 import；scripts/README 的消费列按 import 图同步（navigability 门禁对账）。
- **fresh-agent 入口探针找到的六处摩擦按合同修**：00-index「开跑前置」补 vendor 构建 +
  `research-workspace` 注册（原清单会让 fresh clone 在 boot 自检/手册注入处失败）；guides/60
  「纯文档」行补 `entry-chain-probe` 条件（原 §4 有、路由表没有）；AGENTS 最小集指向第 4 步；
  evaluation 统一 `pnpm verify` 正本；两处 `0.1.7 起` 历史标记改为形态描述。
  `docs-consistency` 增导航合同（三处关键义务；措辞可改，义务不可丢）。
- **体量账按事实重写**：原 Note 的">600 只剩 3 个 / 最大 lib 200"漏算了 `plan-graph` 与
  `scripts/lib` 的两件；更正落在 [评分整改 Note](2026-10-28-scoring-remediation.md) §Phase C。
- **`tests/run` 的 56 文件重估：维持单域**。触发条件（某域 >20 文件）早已满足，但拆分要改
  118 处历史链接（notes/_backlog 冻结层不重写），而"文件名 = 被测模块名"让 mechanism-name
  检索仍然直接命中；拆分的可读性收益抵不过链接改写与双份域的维护成本。触发词收窄为
  "机制名检索失败"——单看文件数不再是重估理由（登记 = [_backlog/triggers.md](../../_backlog/triggers.md)
  的 tests 行）。

## 输掉的方案

- **漂移只打警告、仍给绿**：警告不改变呈交判断；agent 读的是红绿与 exit code。2026-10-27
  遮罩事故已经证明"只提示不拦绿"会被后续复跑抹掉。
- **发现漂移就自动重启通道**：在飞 run 的会话日志尾部会丢（BUG-007 教训），重启必须由人先确认
  没有在飞 run；run-driver 只给 exit 2 与修复入口。
- **用 mtime 猜新鲜度**：`touch`/checkout 会制造假红；内容比对的正本已经是 boot-run 的
  pack 发布集逐文件 diff，直接复用同一道门。
- **不带锁直接 reclaim 端口**：两路 client-load 会互相杀 web，症状看起来像产品红（本次实测）。

## 实际跑过的验证

- **镜像门两态**：旧页面通道上 `run-driver probe` exit 2 / NOT-RUN，`channel-mirror` 点名
  "漂移 23 个文件"（含 `README.md`、`lib/client.js`、`lib/client.js.map`），现场落
  `run-verdicts/<ts>-probe/verdict.json`；另造 `DSH_DEV_HOME` 临时 home，按 npm pack 发布清单
  复制镜像后 `bash dev/boot-run.sh --drift-only` exit 0 / "pack 漂移检测绿"——红绿两态都实跑。
  `--drift-only` 在活跃 3083 上单跑也不报端口占用（只读模式在端口检查之前退出）。
- **client-load 端口/并发**：A 全量 ALL PASS、exit 0，收尾 `listenersOn(3109) = []`、锁目录已释放；
  B 在 A 运行中启动，exit 2 并打印属主 pid。此前同一命令因遗留监听直接 EADDRINUSE。
- **拆分**：`pnpm typecheck` 绿；`plan-graph` / `plan-index` / `graph-model` / `plan-diff` /
  `run-driver-contract` 五文件 44 例全绿；`run-dashboard` + `evaluation-contract` + `test-surface`
  + `navigability-contract` 四文件 35 例全绿。用例体未删改。
- **新契约先红后绿**：临时新增 `packages/deep-research-pack/src/lib/__probe-untested.ts` →
  test-surface 红并点名该件，删除后绿；临时 `docs/__probe.md` → 文档地图契约红，删除后绿；
  删掉 00-index 的 `vendor-build.sh` 与 guides/60 的 `entry-chain-probe` → 导航合同红，还原后绿。
- **fresh-agent 只读探针**：七个问题全答对（repo 形态 / 启动命令与前置 / 文档改动的验收 /
  run-state 测试位置 / 决定记录载体 / 读了哪些文件 / 摩擦点）；实际读约 1,300 行，首个正确动作
  ~2 分钟。它报的 6 处摩擦里 2 高（前置缺口、纯文档探针矛盾）、2 中（最小集/命令拼写）、
  2 低（0.1.7 历史标记、env source 语义）——本轮按合同修了前五处与版本标记，env 语义已在
  AGENTS 命令行改为"仅 L1/L2 与档位列需要，boot-run 自 source"。
- **全量**：`pnpm verify` 全绿、`pnpm test` 全绿（例数见当次输出，不写进本页）；
  `pnpm --filter dsh-deep-research-pack build` 后 client-load 复跑 ALL PASS。

## 环境状态

- 3083 的活动通道仍是旧镜像（`client.js` 为 2026-10-23 的构建）。本轮**没有**停它：在飞 run
  可能持有会话；修复入口 = 确认无在飞 run 后按 boot-run 处方重建并重启。新 probe 在重启前
  会持续给 NOT-RUN，这是有意的 fail-closed。
- `runtime/smoke-workspace/` 新增的 client-load 失败现场与锁都是 gitignored；锁在当前进程正常
  退出时已删。两路并发的失败现场保留（2026-10-27T19-18/19-20），作为"看起来像产品红"的样本。
