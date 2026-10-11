# _fixed_bugs/ · 已修复缺陷卡

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入；文件名不变、内容不重写。
> **Next BUG ID = 已分配最大号 + 1（本目录 ∪ 活跃 bugs/ 一起算）**——权威值看
> [`../README.md`](../README.md)，本表逐行登记。

| Bug | 标题 | 修复 commit | 日期 |
|---|---|---|---|
| [BUG-001](BUG-001-new-session-stale-run-face.md) | 新会话立项窗口期，「研究状态」页签错呈上一次 run 的渐进面 | （kickoffSeen 立项轨道信号 + 抑制条件扩展 + 🌱 状态行） | 2026-09-30 |
| [BUG-002](BUG-002-pending-ask-anchor-misattribution.md) | 立项后未答的 ask 被锚点折算误标为「交付审阅 ⏳」 | （deriveAnchors 按 ask 内容判型：HITL1/HITL2 签名 + 契约外第三锚扩窗） | 2026-09-30 |
| [BUG-003](BUG-003-client-load-smoke-loop-edge-mismatch.md) | 盘侧 tailAskPending=true 的绑定会话，观察面不渲染 ↻ rerun 回边 | （smoke 删手抄镜像直调 deriveAnchors + 绑定富度修正——近窗取事件最多会话） | 2026-10-04 |
| [BUG-004](BUG-004-hitl-answer-submit-not-landing.md) | hitl-answer 点击提交不落地——"卡头消"与盘侧 answer 事件脱钩 | （ask-drive 策略库：UI 形状永不判完成 + 盘侧裁决升格 exit 1 + 进程组收割；活体确认 = 确认 run 四问卡 4/4 落盘） | 2026-10-05 |
| [BUG-005](BUG-005-hitl1-indefinite-wait-no-floor.md) | HITL1 ask 带 wait:-1 无限期等待——timed 护栏被绕过 + 活等待无断连地板 | （persona ask 硬约束行 + run-state askIndefiniteOf + 61 §3/§4 应答通道二分；活体确认 = 两次 ask 零 wait 字段） | 2026-10-05 |
| [BUG-006](BUG-006-quick-path-skips-hitl-anchors.md) | quick_factual 题型下 lead 自我豁免 HITL1、HITL2 未拍板即 present | （persona HITL1 零例外 + node-gate 门① HITL 锚点门——写 question.md 会话的 HITL1 签名 ask 判据；活体确认 = 同族快题复测照发卡 + 门①③②全 PASS） | 2026-10-05 |
| [BUG-010](BUG-010-regression-indirect-subprocess.md) | 回归经导入模块启动子进程 | （原生日志解码；执行路径探针 0 次子进程） | 2026-10-05 |
| [BUG-011](BUG-011-release-smoke-keyless-mismatch.md) | L2 keyless 与部署凭据检查冲突 | （显式安装模式；真实 L2 全绿；默认缺凭据拒绝） | 2026-10-05 |
| [BUG-012](BUG-012-dashboard-state-divergence.md) | 仪表盘日志/HITL/步骤折算分叉 | （canonical 日志与共享折算；真实浏览器通过） | 2026-10-05 |
| [BUG-014](BUG-014-hitl-answer-provenance-not-written.md) | hitl-answer 的"代理模拟记录"只打印不写盘——代答 provenance 静默丢失，拍板行误归因用户 | （scripts/lib/hitl-provenance 纯函数+写盘器 + 驱动裁决通过后接线 + 契约测试红先立；活体确认挂账 = 下一次代答写盘日志 + bundle grep 双证） | 2026-10-05 |
| [BUG-007](BUG-007-channel-death-loses-log-tail.md) | 通道死亡丢会话日志尾部——settled run 回变"挂起未答"假态，盘侧谓词地基晃动 | （watch-run 回退检测 fail-loud + hitl-answer 读窗重试 + 61 §5 限定句 + 仪表盘显式非目标判定；vendor seam = 逐帧 flush + SIGTERM finalizer，随换 tag 重估） | 2026-10-05 |
| [BUG-009](BUG-009-no-finalization-on-restart.md) | 挂起回合通道重启后没有被"终局化"——文档承诺的机制实测不存在 | （文档改写实测行为 + 读窗重试 + 横切盘点"自动X"句式三处逐条验证 + 自动续轮句加通道死亡限定；vendor seam = boot 中断回合对账，随换 tag 重估） | 2026-10-05 |
| [BUG-013](BUG-013-lead-replay-persona-stale.md) | Lead 回放 persona 金标准未包含既有 HITL1 零例外规则——语料一代过期 | （录制器补 lead 支持[探针原文复用] + 真模型重录 + C 金标准 --update-expected 人审[窄带保持、比较器未动] + snapshot-replay 4 场景 ALL PASS——B1 站立红转绿） | 2026-10-05 |
| [BUG-008](BUG-008-leads-term-drift-past-delivery.md) | leads.md 状态词漂移（建议深挖≠建议挖深）穿透交付——critic 未狩猎、门L 只能事后 | （critic 狩猎第 4 线 + 61 §4 拍板前机械门；实测确认 = drt_mcp-hosts-governance：门L PASS 22/22 零漂移 + critic 狩猎线在场工作） | 2026-10-06 |
| [BUG-015](BUG-015-hitl-answer-pick-unimplemented.md) | hitl-answer 的 --pick 非默认选项被静默顶替——UI 预选短路点击侧 pick 逻辑，意图与落地脱节无检测 | （根因精修：pick 定位逻辑本就在，劫持 = 预选使 Submit 提前可用短路决策层；决策层 selectionMatchesIntent 改选 + intentReconcile 逐题对账不符即 exit 1 + pickTargetLabel/parseAskQuestions 纯函数；TDD 八断言先红后绿 23/23；活体挂账 = 下一次非默认 pick 代答双形态） | 2026-10-06 |
| [BUG-016](BUG-016-fresh-clone-mdlinks-runtime-links.md) | fresh clone 上 `pnpm verify` 红——tracked md 链接运行区归档件，门禁绿依赖机器状态而非仓库状态 | （md-links 加宽"目标未被 git 跟踪 → 红"+ quotepath=false 修非 ASCII 假红/漏扫 + 存量 18+1 条链接转反引号路径 + gates-smoke 案例与拆补拷对冲——对照组 tracked-only 副本绿 = fresh clone 等价证；真仓 22 处命中红实录） | 2026-10-07 |
| [BUG-017](BUG-017-provenance-utc-date-mismatch.md) | 代答 provenance 行日期用 UTC——与本地拍板行错位、破坏 §Decisions append-only 次序；空题面 Q1「」 | （scripts/lib/local-date.mjs 本地口径接管两处 UTC slice + batchToAnswered questions 富集〔header>id>prompt>（题面缺席）诚实标记〕+ parseAskQuestions 补 header；三测试文件先红后绿 30/30；横切清扫全仓恰两处全改） | 2026-10-07 |
| [BUG-018](BUG-018-snapshot-replay-advertised-coverage.md) | snapshot-replay B 层广告覆盖 skill 与工具行，实际对三处 `user/message` 注入全不覆盖 | （B 层改逐条判据：persona + 全部 request/header + 三处注入；新增"基线外注入种类即红"覆盖面自守；四角色真模型重录后回放全绿；判决 = snapshots 采纳 Note） | 2026-10-09 |
| [BUG-019](BUG-019-recorder-mcp-race.md) | 录制器不等 MCP server 就绪即发探针——fixture 工具表随机缺 MCP 组，回放对账才现形 | （写盘前 MCP 组谓词 + MAX_ATTEMPTS=3 有界重试 + 连续落败 fail-loud；无就绪信号实证后走产出件谓词；守卫 tests/replay-fixtures.test.mjs 负例留证；验收 3/3 连续重录全含 MCP 组） | 2026-10-10 |
| [BUG-020](BUG-020-hitl-answer-provenance-misattribution.md) | hitl-answer 代答 provenance 误归给无关在飞 bundle——落账目标 = drt_* 字典序，无会话↔bundle 归属判定 | （归属谓词化：attributionBundleOf 仅写命中归属、仅读一律延迟——误归代价 ≫ 延迟代价；字典序启发式全废；hitl-answer 落账改现读 journal；反证 = tests/hitl-provenance.test.mjs 五用例先红后绿 + 旧字典序同 fixtures 演算留痕） | 2026-10-11 |
