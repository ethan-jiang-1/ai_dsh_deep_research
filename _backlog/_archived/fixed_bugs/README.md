# _fixed_bugs/ · 已修复缺陷卡

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入；文件名不变、内容不重写。
> 编号规则唯一权威 = [../../bugs/README](../../bugs/README.md)（新号 =
> 活跃 bugs/ ∪ 全部归档池〔fixed + suspended〕的最大号 + 1）；本表逐行登记已修卡。

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
| [BUG-019](BUG-019-recorder-mcp-race.md) | 录制器不等 MCP server 就绪即发探针——fixture 工具表随机缺 MCP 组，回放对账才现形 | （写盘前 MCP 组谓词 + MAX_ATTEMPTS=3 有界重试 + 连续落败 fail-loud；无就绪信号实证后走产出件谓词；守卫 tests/run/replay-fixtures.test.mjs 负例留证；验收 3/3 连续重录全含 MCP 组） | 2026-10-10 |
| [BUG-020](BUG-020-hitl-answer-provenance-misattribution.md) | hitl-answer 代答 provenance 误归给无关在飞 bundle——落账目标 = drt_* 字典序，无会话↔bundle 归属判定 | （归属谓词化：attributionBundleOf 仅写命中归属、仅读一律延迟——误归代价 ≫ 延迟代价；字典序启发式全废；hitl-answer 落账改现读 journal；反证 = tests/run/hitl-provenance.test.mjs 五用例先红后绿 + 旧字典序同 fixtures 演算留痕） | 2026-10-11 |
| [BUG-021](BUG-021-cdp-probe-ask-send-fail.md) | cdp-probe `--ask` 发送系统性失败——asked:false 三连、消息不落盘，操作侧自由消息干预面失效 | （根因 = 提交按钮 aria-label 是状态机〔空闲 Send／在飞 Queue／插话 Steer＋中文三态〕，旧选择器只找 "Send" 故在飞时构造性零命中，且失败信息一律冒充「未见模型回复」；修复 = 新增 lib/inject-reconcile.mjs 落盘对账纯函数 + 探针 send 家族匹配与 stop 家族拒绝 + 页面自动探测会话 id + fail-loud 四态；反证 = tests/run/inject-reconcile.test.mjs 7 用例先红后绿 + 四路弱化各看红一次；真模型两阶段 E2E 全绿，含生产现场 Queue message 形态与 Stop 陷阱拒点） | 2026-10-11 |
| [BUG-022](BUG-022-provider-stream-malformed-turn-kill.md) | 上游流畸形事件当场终结回合——根因假设（上游事件顺序违约）撤回；由 BUG-024 socket 隔离修复 | BUG-024 + `dev/llm-socket-isolation.cjs` | 2026-10-20 |
| [BUG-023-provider-malformed-storm-exhausts-retry](BUG-023-provider-malformed-storm-exhausts-retry.md) | 上游流畸形持续窗口击穿有界重试（BUG-022 残留）：恢复指引落地 = stream-failure 折算 + 状态面板人话横幅；真实死亡会话浏览器验证（盘侧对账）；重试策略升级转 triggers.md 重议条件 | e670ded | 2026-10-12 |
| [BUG-025-legacy-detail-modal-and-edit-drop](BUG-025-legacy-detail-modal-and-edit-drop.md) | 旧格式偏好条目详情 Modal 不渲染「自定义要求」单块、编辑流丢 legacyText 发空载荷清空指令（12 形态例电池发现） | （修复 = legacyText 贯穿 DetailState：单块/混居双块/旧正文预填/摘要分区优先；反证 = 旧组件三轮实红 + 电池注入回归 5 红；证据 = smoke 自测工作区断言 + test 424/424 + verify 全绿） | 2026-10-13 |
| [BUG-026-library-read-40-line-truncation](BUG-026-library-read-40-line-truncation.md) | 偏好库面板读取写死 40 行——超长库静默截断、尾条目消失 + 截断编辑指令风险 | （修复 = readFile limit 参数化、库读 1000 行；反证 = 12 形态例库〔55 行〕尾两条缺席两轮实红 + DOM dump 14 钮；证据 = smoke 12 例名按钮齐 + 既有断言零回归） | 2026-10-13 |
| [BUG-027-snapshot-replay-c5-activity-row-flicker](BUG-027-snapshot-replay-c5-activity-row-flicker.md) | snapshot-replay C5 间歇性红——捕获时会话历史仍在流式加载（失败场 chat 调用锚 1/4 + 活动行 1 行） | （修复 = C0b 客户端历史就绪谓词：期望值取录制夹具 `tool/call` callId 集合，30s 死线；断言与比对器零改动；证据 = 连续 5 次 ALL PASS〔挂载 4/4〕+ 负例留证 = `runtime/smoke-workspace/bug-027-evidence/`） | 2026-10-15 |
| [BUG-024-direct-path-malformed-storm-recurrence](BUG-024-direct-path-malformed-storm-recurrence.md) | 直连路径再现「event precedes message_start」畸形风暴——大会话重试全灭（BUG-023 判据②触发条件成立） | （修复 = socket 隔离每请求一次性连接〔`dev/llm-socket-isolation.cjs`〕+ research profile 重试窗口拉长 + 处置序入 triggers；收卡证据 = 2026-10-15 用户拍板走 A：预载自证行 + 监听 pid 绑定后三场大会话探针〔163–187 事件/20–21 次 search〕`turn/end` 全 completed、终局错误与 MALFORMED 重试均 0；原始件 = `runtime/smoke-workspace/bug-024-evidence/iso-probe-2026-10-15.md`） | 2026-10-15 |
| [BUG-028-llm-socket-isolation-silent-fallback](BUG-028-llm-socket-isolation-silent-fallback.md) | 隔离守卫自身异常时静默透传原始 fetch——"隔离下"判读可能名不副实 | （修复两部分：失败回落由并行工作流 `a778d17` 修〔必关 Agent + 原样抛出、绝不回落共享池〕；初始化失败的缓存式静默 fail-open 由本次改为逐次计数。证据 = 两个强制故障 harness：`ORIG-CALLS=0`〔不回落〕+ 逐次 `未隔离请求 #N`〔可数〕；正常路径零噪音；现场 = 三场探针 61 次检索骑一次性连接） | 2026-10-15 |
| [BUG-029](BUG-029-evidence-audit-url-extraction-encoded-forms.md) | evidence-audit 溯源语料漏两类真实取证路径（编码/协议相对形态 · 非 web 工具抓取）——搜索列表里见过的 URL 被误判「伪造链接」CRITICAL，把 MAJOR 升格并打红门A（假红率 3/5） | （`urlsOf` 逐 `%XX` 容错解码副本 + 协议相对 `//host` 归一 + `hostsOf` 裸域名只喂域名档；`buildCorpus` 纳 MCP **结果**、MCP 调用参数不入；`fetchedOk` 仍只认 `web_fetch`（档位不升格）；措辞限定"本 run"；证据 = 契约测试先红后绿 16/16 + 两路注入反证 + 52 场对账〔CRITICAL 79→73、按 URL 身份新增 0、`source_url 未抓取` 72→72〕+ nvidia 场真入口复跑 exit 1→0、门A RED→PASS） | 2026-10-16 |
| [BUG-030](BUG-030-snapshot-replay-c5-activity-row-flicker-recurrence.md) | snapshot-replay C5 渲染金标准间歇性红——活动行只渲染 1/2（BUG-027 复发形态） | （根因 = A 层"回合完成"用全文 includes 找哨兵，而哨兵写在 prompt 里 → 提前放行；修法 = 判据收进 `lib/replay-request`：哨兵只认 assistant 文本 + `turn/end` completed，冒烟与录制器共用；证据 = 单元三例先红后绿 + 确定性反证〔旧判据「回合已完成=false」即放行，同跑 C0b 3/4 红〕+ **连续 5 次 ALL PASS** + L0 471/471） | 2026-10-16 |
| [BUG-033](BUG-033-cockpit-brief-layer-intermittent-missing-delivered-lines.md) | 驾驶舱「业务摘要层」间歇缺"已交付态"三行——机制 = 读点部分水化（芯片先到、摘要块后到）；修法 = 断言侧有界等摘要块就绪 + 刷新同一快照（合成注入 12s 延迟下红→绿） | 2026-10-17 |
| [BUG-031](BUG-031-hitl-answer-sidebar-session-rows-unrendered.md) | hitl-answer 在长跑通道实例上侧栏零 session 行（组能展开但行不渲染）——`sidebarMissVerdict` 错因判据（aging/absent/cap）+ 接线红注入（顺带修掉失败路径 ReferenceError） | 2026-10-17 |
| [BUG-032](BUG-032-hitl-answer-custom-text-dropped-from-answer-batch.md) | hitl-answer `--custom` 文本未进答复批（修法静默丢失、回合空转）——纵深防御：文本按意图胜出 + 硬进批复核；另修零 radio 提交钮查找 | 2026-10-17 |
| [BUG-034](BUG-034-client-load-smoke-selftest-capsule-intermittent.md) | 自测例库块偶发打不开配置胶囊：改为按 id 显式打开（不再依赖"默认视图＝最新会话"）＋打不开如实报红；注入红证 + 绿跑，口径订正后 0/4 复现 | 2026-10-18 |
| [BUG-035](BUG-035-hitl-answer-sidebar-session-invisible.md) | 侧栏懒渲染下"扫不到会话"被误判成实例老化：加搜索兜底 + 策略纯函数 + 负例留证；强制注入绿证通过 | 2026-10-18 |
| [BUG-037](BUG-037-hitl-answer-aging-verdict-misleading.md) | 兜底已试搜索仍不命中 → 判据改 not-in-scope（处置改为核对标题/续跑，文案不再提重启）；keyless 反证 + 强制端到端反证 | 2026-10-18 |
| [BUG-036](BUG-036-cockpit-brief-layer-pending-review-line-missing.md) | 摘要层缺行：终局判据加轮次路径+仲裁（附录旧轮不夺权）＋ UI 读 review 足额 limit；单测先红后绿 + 冒烟 ALL PASS | 2026-10-18 |
| [BUG-038](BUG-038-node-gate-leads-grade-markdown-intolerance.md) | 门L 分级判据不容忍 `**A**` 加粗 → 17 条假红；改为剥强调后认「括号/逗号 + 独立 A–D」，真问题仍红 | 2026-10-18 |
| [BUG-039](BUG-039-node-gate-proxy-answer-and-escalation-path.md) | 门③ 认代理代答 provenance 行（RED→PASS）；门A 机械认「未决项升级到用户裁决」路径（收窄：须两件同时在场）；同场那处门A 红经查是对的（运行纪律） | 2026-10-18 |
| [BUG-040](BUG-040-terminal-readiness-two-copies-drift.md) | 终局 readiness 收归单一正本：pack 导出 `terminalVerdictLine`、门的 `readinessOf` 委托（只留附条件语义）、三份副本删除；跨实现一致契约测试先红后绿 | 2026-10-18 |
| [BUG-042](BUG-042-method-library-seed-absent-no-pointer.md) | 偏好库 `method-library.md` 从不播种、手册不指路：加空架子种子（`scaffold` 自动收集，10→11）+ 手册三态指路 + skill/preset 同钉 + `sync-pack-workspace` 独立种子守卫（反证两条）；新真模型档探针 ALL PASS 3/3 | 2026-10-19 |
| [BUG-041](BUG-041-recovery-path-leaves-no-hitl-provenance.md) | 官方恢复路径（`run-kickoff --session` 自由文本关挂起）不落 HITL 记账：补 `closingProvenanceRow`+双写，接线到续跑分支，交付卡识别加文本级兜底；判据#3 端到端达成（行/备注/`isHitl2Row` 三真） | 2026-10-19 |
| [BUG-043](BUG-043-graph-unmapped-task-shows-unexecuted.md) | 图谱把「未映射 task_id」误报成「未执行」：映射折算抽 `graph-model`（五态含 stale/duplicate/plan-only）+ 覆盖率行 + 投影未就绪门；判据修正（client-load 负例不可达 → 覆盖率行 + 盘侧节点数对账） | 2026-10-23 |
| [BUG-045](BUG-045-client-load-graph-assert-flakes-on-stream-drop.md) | client-load 图谱断言在 journal 流瞬断时红（图面把读失败渲染成未绑定） | （`followError` 独立文案 + 有界重试 3×2s；冒烟覆盖率断言改 12s 轮询并带失败标记；design/40 §6 立「失败态与空态必须可分」） | 2026-10-28 |
| [BUG-044](BUG-044-delivery-receipts-leak-absolute-paths.md) | 交付回执写入本机绝对路径（path-hygiene 在写回执之前跑） | （`portableBundlePath` 归一 present + 写前文本校验 + 落盘后复检 + `--repair`；现网真 bundle 两次 `run-accept` 绿、`path-hygiene` 干净） | 2026-10-27 |
| [BUG-046](BUG-046-readiness-parenthetical-unparsed.md) | 手册的 `## readiness（终局）` 形态门禁读不出，终局 PASS 被读成未判定 | （`VERDICT_LINE`/`EMPTY_TEMPLATE` 增判定词后短括号段 ≤8 字；红先 2 例 → 18/18；未动手册/snapshot） | 2026-11-10 |
| [BUG-047](BUG-047-method-library-selection-invisible.md) | 方法库选中条目无任何视觉标记——`var()` 后拼十六进制 alpha 的声明被浏览器整条丢弃 | （`LibraryRow` + `libraryRowStyle` color-mix 选中态〔tint/边线/accent bar/名字加重〕+ 焦点环分离 + 源码扫描契约测试；真机隔离档 computed 值 + 截图双证） | 2026-11-11 |
| [BUG-048](BUG-048-protocol-depth-projection-first-pair-only.md) | 协议审计深度投影只解析首对深度——deep 档官方投影假红、单深度漏检 | （`depthsTextOf` / `depthsOfText` 单一编解码；生成器与检查器共用；先红后绿 26/26） | 2026-11-11 |
| [BUG-049](BUG-049-protocol-projection-lines-absent-silent.md) | §Protocol 的来源/投入/输出行缺席时审计零 finding | （`projectionLineOf` + 三条缺席 warning；完整投影仍绿；v1 不整片变红） | 2026-11-11 |
| [BUG-050](BUG-050-strategy-channel-absent-and-workflow-null-workers.md) | 策略行通道缺席无提示；workflow 无 Wave 时 worker 对账被跳过 | （通道缺席 warning + `strategy-workflow-without-wave` red；worker 不再被 null 哨兵跳过） | 2026-11-11 |
| [BUG-052](BUG-052-protocol-epoch-day-granularity-retro-red.md) | 交付早于 D46 落地 9 小时的 bundle 被追溯判红——epoch 只到日粒度 | （`PROTOCOL_CONTRACT_AT` + `delivered.json.acceptedAt` 优先；同日早场 legacy，晚场/无回执仍红） | 2026-11-11 |
| [BUG-053](BUG-053-plan-header-claims-first-match-anywhere.md) | 「plan 头」判据用全文首匹配——正文提及可冒充头 | （`headerBlockOf`；plan-ref 与策略行只认头；正文提及 → red / strategy-missing） | 2026-11-11 |
| [BUG-054](BUG-054-cells-cap-count-only-canonical-bullet.md) | cells 计数只认 `- lenses:` 一种写法——变体静默计 0，预算闸门失效 | （`lensScanOf` 单一解析；`-`/`*`/`+`/缩进/大小写/简写；读不出 = `cells-unparseable` red） | 2026-11-11 |
| [BUG-056](BUG-056-protocol-projection-unreadable-values-silent.md) | §Protocol 行在场但数值/分节读不出仍静默 | （宽容单位解析 + `projection-number-unparseable` / `projection-output-unparseable`；投入按上限语义） | 2026-11-11 |
| [BUG-057](BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md) | acceptance-check 的 FAIL/UNVERIFIED/noCriteria 都是 exit 0 | （`acceptanceExitCode`：仅全 PASS 且至少一条 exit 0；其余 1；头注/README/测试同步） | 2026-11-11 |
| [BUG-058](BUG-058-plan-cycle-has-no-mechanical-check.md) | plan 图成环无任何机械判据——null 被静默跳过 | （有环 → red `plan-cycle`；`planIssuesOf` 增 cycle 并抑制误导性 wave-prefix） | 2026-11-11 |
| [BUG-060](BUG-060-host-health-freemem-macos-underreports.md) | host-health 的 free 判据在 macOS 系统性误报（只算 free pages）→ client-load 常态 NOT-RUN | （`availableMemoryMBFromVmStat` / `FromMeminfo`；client-load 真跑：free 7134MB / 主机健康=yes；产品断言失败另计） | 2026-11-11 |
| [BUG-062](BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md) | acceptance.md 兼作生成物与 L4 人工走查唯一载体——重跑验收/`--repair` 抹掉人工证据 | （`manualEvidenceOf` / `withManualEvidence`；repair 只保留人工节，re-accept 拼回；空节不算证据） | 2026-11-11 |
| [BUG-063](BUG-063-web-ui-nav-chrome-copy-english-only.md) | web-ui-nav 的 chrome 文案常量英文单语：zh UI 下「展开更多/预览版说明」静默失效 | （三条常量改双语；cdp-probe `expand=not-found`；preview 标题认不出但 Continue 在场 → `unknown` 不猜点） | 2026-11-11 |
| [BUG-055](BUG-055-mixed-language-ui-half-i18n.md) | 插件 UI 只做了半套中英文——标签/按钮/提示大量硬编码中文，英文界面中英混排 | （字典 521 键 zh/en 对齐；组件 + 数据面 fold 全部走 `t()`；en 值/渲染零 CJK；`cjk-source` 源码守卫 + `i18n` 折层守卫） | 2026-11-11 |
| [BUG-051](BUG-051-replay-smoke-panerows-undeclared.md) | 回放冒烟 C3/C5 引用被删的 `paneRows`，渲染金标准断言永远抛 ReferenceError | （恢复采集块 + 稳定窗；C0–C5 真机全 PASS，C5 金标准经 `--update-expected` 重写；B·persona 快照红另计） | 2026-11-12 |
| [BUG-059](BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) | 回放冒烟页签定位器写死中文——UI 文案随 locale 后 en-US 环境 C2→C3/C5 必红 | （`SMOKE_LOCALE='zh-CN'` 显式钉住 + 双语定位；场景 `source.locale` 与金标准头注；lead C2/C3/C5 PASS） | 2026-11-12 |
| [BUG-061](BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md) | 钉 zh 后右栏展开按钮仍用英文 `Open right sidebar` → C2/C3/C5 连锁 | （展开/收起/新标签 chrome 双语；C2 诊断补 `role=tab` 与 guide 容器；C2 PASS） | 2026-11-12 |
| [BUG-065](BUG-065-run-driver-cache-key-omits-dev-overlay.md) | run-driver 的 GREEN 缓存键只有 pack+runtime——dev 通道自身的改动（overlay / boot-run）不失效 | （`probeCacheKey` 增 `extra`；run-driver `devShellFingerprint()` 三文件内容哈希；命中 reason 写清身份） | 2026-11-12 |
| [BUG-064](BUG-064-replay-a-layer-not-self-contained-tool-stall.md) | 回放的 A 层不自包含：真实工具调用会挂住、240s 静默超时且归因误导 | （`replay-network-offline.cjs` preload 离线闸 + run lock + 超时归因；真机 A PASS、C0–C5 全 PASS） | 2026-11-12 |
| [BUG-066](BUG-066-research-profile-team-version-drift-banner-timeout.md) | `research` profile 团队层停在 rc.2 且无版本校验 → 回放/团队冒烟只报「等待启动横幅超时」 | （消费方统一 deep-research profile；`profile-health` boot 前版本预检；`startup-hint` banner 归因） | 2026-11-12 |
| [BUG-067](BUG-067-offline-gate-dns-resolve-bypass.md) | 回放离线闸的 DNS 面不完整：`dns.resolve*` 实测绕过 | （补齐 resolve*/promises/Resolver.prototype；头注声明子进程边界；运行时探针） | 2026-11-12 |
| [BUG-068](BUG-068-brand-name-not-localized.md) | 产品名 Orca 未做双语 | （`brandName` zh/en；`OrcaName` 走 `PropsLocale`；品牌槽 locale；startTitle/meta.title 对齐） | 2026-11-12 |
| [BUG-070](BUG-070-bug066-mechanism-refuted-and-residual-profile-wiring.md) | BUG-066 机制被证伪 + 残留：team-preflight 仍钉 research、profile-health 指令是死路 | （team-preflight 切 deep-research + profile-health 预检；profile-health 按档给指令；guides/60 标 research 弃用） | 2026-11-12 |
| [BUG-071](BUG-071-root-scout-injected-team-lead-identity.md) | 根 scout 被注入 Team Lead 身份与 8 个 Team 工具 | （方案 C：三份非 lead persona 显式纠偏 + design/10 §4/design/20 记录根会话身份事实） | 2026-11-12 |
| [BUG-069](BUG-069-product-content-single-language-and-stale-session-title.md) | 英文界面仍混中文：内置打法内容单语 + 方法编辑历史标题不随 locale | （`builtin-display` 显示投影 40 键；canonical/模型面不动；coach 标题迁移 + locale 订阅；真实数据 en 渲染零 CJK） | 2026-11-12 |
| [BUG-072](BUG-072-release-vocab-substring-false-positive-product-content.md) | release-vocab 的「产品内」子串误伤「产品内容」 | （词表 `产品内` → `产品内(?!容)`；裸子串 + 复合词豁免写进头注） | 2026-11-12 |
| [BUG-073](BUG-073-run-lock-creation-window-race.md) | run-lock 的建锁不是原子的——目录先于 owner.json 可见，并发者会接管并覆盖属主 | （候选目录先写 owner.json 再 rename；3×50ms 宽限；rename 后复核；释放只动自己的锁；client-load 共用） | 2026-11-12 |
| [BUG-074](BUG-074-readiness-inline-quote-hijack.md) | readiness 终局被同行引用的旧 PASS 劫持 → 真实 FAIL 读成 PASS | （同行多判定取本轮/真实终局的未包裹判定；引用/表格/空模板不夺权；五形态测试） | 2026-11-12 |
| [BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md) | 门③把「HITL2 未拍板」当拍板行，旧答复即可放行 | （决策形判据 + 最新 HITL2 行未决即 RED + 最新 ask callId 答复见证） | 2026-11-12 |
| [BUG-076](BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md) | schema-scan 白名单漏协议/复核/wave 新件 → 新契约 run 必红 | （补 protocol.json/protocol-audit.md/protocol/review/waves；真违约仍红测试） | 2026-11-12 |
| [BUG-077](BUG-077-protocol-audit-write-reference-error.md) | protocol-audit `--write` 缺 import → ReferenceError | （补 PROTOCOL_CONTRACT_DATE import；--write 落盘 + run-accept-smoke ALL PASS；源码契约测试） | 2026-11-12 |
| [BUG-078](BUG-078-portable-bundle-path-relative-escape.md) | portableBundlePath 把相对 `..` 当可移植 → 门②接受 bundle 外 present | （相对路径 resolve + 包含性检查，含 `..` 一律 null；repair null+unportable） | 2026-11-12 |
| [BUG-079](BUG-079-user-env-smoke-dead-import-seed-core.md) | user-env-smoke 引用已删 seed-core → 启动即 ERR_MODULE_NOT_FOUND | （sha256 改 node:crypto；真跑 13/13 ALL PASS） | 2026-11-12 |
| [BUG-080](BUG-080-snapshot-research-face-stale-team-baseline.md) | snapshot-replay research-face B 层缺 Team Lead/Team 工具 baseline | （4 角色真模型重录 + source 身份 + C 金标准 --update-expected 人审；mcp:false 场景声明 + replay-fixtures 条件守卫；snapshot-replay ALL PASS；无产品代码） | 2026-11-12 |
| [BUG-081](BUG-081-method-name-parenthesis-provenance-collision.md) | BUG-081：方法库条目名含全角「（」时被 fold 当作 provenance——保存 claim 永不成立，用户按占位符示例起名即失败 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-082](BUG-082-default-marker-substring-false-positive.md) | BUG-082：方法库默认判定用裸子串「默认偏好」——provenance 含该词即误判默认；写后回读与写前 expected 自相矛盾 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-083](BUG-083-tab-heading-default-inconsistency.md) | BUG-083：方法库 heading 空白口径不一致——fold 认 `##\t`，clear/set/defaultCount 只认 `## `，默认操作静 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-084](BUG-084-source-phase-bullet-mismatch.md) | BUG-084：方法库来源完成判据要求行首 `phase:`，run 模板写 `- phase:`——按模板交付的 run 永远不可选 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-085](BUG-085-marker-provenance-order-duplicate.md) | BUG-085：方法库 heading 的〔默认偏好〕与（provenance）顺序——fold 认反序，upsert 只认正序，同名条目被复制 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-086](BUG-086-config-feed-session-race.md) | BUG-086：useConfigFeed 切换会话时旧 reload 不取消/不校验 sessionId——慢读覆盖新会话的方法库 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-087](BUG-087-status-feed-session-stale.md) | BUG-087：useStatusFeed 切换会话不重置 journalEvents/rows/journalSeen——旧会话活动在新会话页签里残留 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-088](BUG-088-config-library-1000-line-truncation.md) | BUG-088：配置页签读库固定 1000 行——>1000 行库被静默截断却仍标 `ok`（readText 丢掉 eof） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-089](BUG-089-list-runs-partial-unreadable.md) | BUG-089：listRuns 部分桶 unreadable 仍返回 ok——归档/停放桶的 run 被静默漏枚举 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-090](BUG-090-bundle-bind-content-false-positive.md) | BUG-090：sessionBindingOf 把工具参数正文里的 `drt_<slug>/` 当路径——写 notes.md 提到别的 bundle 即强绑 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-091](BUG-091-turn-completed-any-turn.md) | BUG-091：turnCompleted 对整份日志任一 `turn/end completed` 返回 true——后续 failed/open turn  | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-092](BUG-092-defaults-double-read-failure-auto.md) | BUG-092：defaultsStore 双读失败被当成 auto——listDir + readText 都 null 时按钮显示「自动」且无 proble | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-093](BUG-093-library-section-bullet-variants.md) | BUG-093：方法库四字段只认行首 `- 找来源:`——`*`/`+`/缩进/全角冒号写法被读成空段 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-094](BUG-094-hitl2-anchor-final-vs-present.md) | BUG-094：HITL2 锚点把 final.md 当交付拍板——综合步落盘即显示「交付审阅 passed」，present 仍空 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-095](BUG-095-boot-web-timer-leak.md) | BUG-095：web-harness.bootWeb 成功路径不清理 banner timeout——库式消费者被长 timer 多留 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-096](BUG-096-hitl2-counts-as-kickoff.md) | BUG-096：isKickoffCall 把任何 ask_user_question（含 HITL2）当新 run 开工——恢复会话交付审阅后 read 绑定 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-097](BUG-097-method-library-lost-update.md) | BUG-097：method-library 写工具读-改-写无锁——两个 method-editor 会话并发保存会 lost update | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-098](BUG-098-method-library-non-atomic-write.md) | BUG-098：方法库三写工具直接 writeFileSync 覆盖，无 temp+rename——中途失败/崩溃会截断 method-library.md | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-099](BUG-099-run-source-list-error-as-empty.md) | BUG-099：run source picker 把 listDir null 当空列表——final 目录读失败显示「无 final」，不是读取失败 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-100](BUG-100-final-md-directory-as-delivered.md) | BUG-100：final.md 只按名字在场判定，不校验 entry.type=file——同名目录会被当交付 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-101](BUG-101-present-version-non-bundle.md) | BUG-101：latestPresentedFinalVersion 不校验终稿族——`notes/final/v9.md` 被当交付版本，版本面 label | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-102](BUG-102-plan-version-body-overrides-header.md) | BUG-102：planVersionsOf 取全文最后一条「图版本：vN」——正文/历史引用覆盖头部声明 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-103](BUG-103-present-version-max-vs-last.md) | BUG-103：latestPresentedFinalVersion 取所有 present 的 max，不是最后一条——re-present 旧版后交付版本 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-104](BUG-104-port-reclaim-kills-any-listener.md) | BUG-104：port-reclaim 对端口上的任意 listener SIGKILL，无进程身份校验——无关服务被冒烟脚本杀掉 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-105](BUG-105-rerun-kind-suffix-match.md) | BUG-105：rerun kind 正则用 `\b`——`polish-extra` / `structural-extra` 被截成合法 kind | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-106](BUG-106-sentinel-any-history.md) | BUG-106：sentinelInAssistantText 扫全部 assistant 消息——早期回合的哨兵会让当前 open/failed 回放被当完成 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-107](BUG-107-defaults-pending-drop.md) | BUG-107：defaultsStore pending 期间第二次写静默丢弃——不排队、无回执；快速跨轴编辑丢改动 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-108](BUG-108-config-feed-interaction-state-stale.md) | BUG-108：useConfigFeed 切换会话不重置交互态——旧会话回执/删除确认/发送中留在新会话 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-109](BUG-109-run-source-delivered-dir-eligible.md) | BUG-109：run source picker 的 delivered.json/acceptance.md 只查名字——同名目录让 run 被当已交付、e | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-110](BUG-110-run-source-symlink-escape.md) | BUG-110：nodeRunSource 跟随 symlink run bundle——drt_x 可指向工作区外，run-context/status 读取 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-111](BUG-111-method-library-symlink-write-escape.md) | BUG-111：method-library 写工具跟随 method-library.md symlink——可把库写到工作区外 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-112](BUG-112-plan-recorded-slash-false-positive.md) | BUG-112：planVersionsOf 的 recorded 斜杠字段无上下文——正文 bullet `- 参考 / v1 /` 被当重写记录，制造 ve | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-113](BUG-113-port-own-listener-overmatch.md) | BUG-113：port-reclaim 身份判定按仓库路径子串——仓库里启动的无关进程仍会被 SIGKILL | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-114](BUG-114-method-lock-release-stale-owner.md) | BUG-114：withMethodLibraryLock 释放无 owner token——陈旧锁被接管后，旧 owner 会删掉新 owner 的锁 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-115](BUG-115-name-placeholder-invalid-after-fix.md) | BUG-115：BUG-081 修复后 zh `namePlaceholder` 仍建议全角括号名称——照示例输入立刻被拒 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-116](BUG-116-present-version-last-unversioned.md) | BUG-116：latestPresentedFinalVersion 最后一条 present 不含版本时保留旧版本——与 latestFinalDelive | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-117](BUG-117-status-feed-trust-stale.md) | BUG-117：useStatusFeed 切会话只清 journal/rows，trust/face/unbound 仍保留旧值——旧绑定继续驱动新会话扫描 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-118](BUG-118-status-leads-findings-directory.md) | BUG-118：useStatusFeed 的 leads.md/findings.md 仍用 names.has——同名目录被当步骤文件 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-119](BUG-119-config-feed-adoption-stale.md) | BUG-119：useConfigFeed 切会话清 receipt 但不清 events/adoption——旧绑定继续驱动新会话的「本次研究」 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-120](BUG-120-method-library-hardlink-read-escape.md) | BUG-120：method-library 安全路径只拒 symlink——hardlink 是普通文件，读可越界读工作区外内容 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-121](BUG-121-source-phase-trailing-comment.md) | BUG-121：isCompletedMethodSourceRun 的 phase 行不接受尾部注释——模板带 `#` 注释，accepted 被读成未完成 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-122](BUG-122-final-path-nested-non-bundle.md) | BUG-122：finalPathOf 后缀匹配接受 `notes/drt_x/final.md`——非 bundle 路径被当终稿族 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-123](BUG-123-default-marker-in-provenance.md) | BUG-123：isDefault 精确标记仍看整条 title——provenance 里含〔默认偏好〕被误判默认（render 可生成） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-124](BUG-124-heading-whitespace-between-segments.md) | BUG-124：heading 段间空白——fold 接受 `## 方法 （来源）` / `（来源） 〔默认偏好〕`，upsert 只认无空白段，同名被复制 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-125](BUG-125-plan-no-heading-version-last.md) | BUG-125：无 `##` 的 plan：headerBlock=全文，版本取 last——注释说退化首个，正文旧版本仍覆盖 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-126](BUG-126-method-lock-stale-live-pid.md) | BUG-126：withMethodLibraryLock 陈旧判定只看 mtime——活 pid 持锁 >30s 被另一个写者接管 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-127](BUG-127-library-halfwidth-parens-provenance-default.md) | BUG-127：library-fold 只识全角括号——半角 `(来源〔默认偏好〕)` 的标记被当默认，且名称含 provenance | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-128](BUG-128-method-heading-ideographic-space-duplicate.md) | BUG-128：method 写路径的标题正则不认全角空格（U+3000）——编辑一次就多出一条同名方法 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-129](BUG-129-final-path-drops-absolute-root-alias.md) | BUG-129：finalPathOf 丢弃绝对路径的根——跨 workspace 的同 slug 交付被别名成当前 cwd 的 bundle | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-130](BUG-130-method-lock-live-pid-reuse-permanent-block.md) | BUG-130：方法库锁遇「活 pid」永久卡死（pid 复用/挂起属主），且错误文案不给恢复入口 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-131](BUG-131-defaults-unknown-key-warnings-unsurfaced.md) | BUG-131：research-defaults 的 unknown-key warning 无人消费——打错关键字静默失效，下一次写入静默删除 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-132](BUG-132-defaults-expected-revision-race-lost-update.md) | BUG-132：/research-defaults 的 expectedRevision 不是原子 CAS——并发写入双双成功，丢一次更新 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-133](BUG-133-sanitize-patch-nested-unknown-keys-silent.md) | BUG-133：sanitizePatch 对 output/source 的未知子键「静默忽略」——与头注「未知子键拒绝」相反，拼错即丢 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-134](BUG-134-gate-witness-bound-slugs-scans-content.md) | BUG-134：门③见证绑定扫描整段 args 文本——content 里提到 `drt_<别的>/` 就把会话绑到别的 bundle，拍板见证可被借用 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-135](BUG-135-slug-charset-unwritten-binding-silent.md) | BUG-135：slug 字符集未成文，绑定只认 `[a-z0-9-]`——`drt_my_topic/` 静默不绑定（状态页签/归因/见证全失效） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-136](BUG-136-defaults-probe-port-self-lock.md) | BUG-136：defaults-probe 自锁——泄漏的 3124 宿主 + 身份检查 → 拒绝收割、探针永远「未跑」 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-137](BUG-137-defaults-probe-language-merged-into-defaults-option.md) | BUG-137：D50 真模型探针 C5 红——语言被写进「沿用项目默认」选项名（语言冒充项目默认） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-138](BUG-138-method-heading-unrecognized-suffix-ghost-entry.md) | BUG-138：标题带未识别后缀的方法条目——编辑会新建同名条目，旧条目成为「删不掉、改不动」的幽灵 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-139](BUG-139-defaults-bom-parse-failure.md) | BUG-139：research-defaults.json 带 UTF-8 BOM 即被判「parse 错」——整份设置失效，Windows 编辑器常规产出 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md) | BUG-140：isHitl2Row 的词表双向误判——「待用户确认」仍算拍板（门③ fail-open 复发），「无异议/OK/approved/采纳」不算（ | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-141](BUG-141-readiness-inline-context-keyword-gap.md) | BUG-141：readiness 行内引用的修复只认上下文关键词——旧引用带关键词、真实判定不带 → 仍被旧值劫持（双向） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-142](BUG-142-client-load-selects-method-editor-session.md) | BUG-142：client-load 的绑定会话选择未限定 lead——富的 method-editor 会话被选中，状态页断言假红（X8 68 PASS / | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-143](BUG-143-method-editor-root-has-team-lead-tools.md) | BUG-143：method-editor 根会话仍拿到 Team Lead 工具与身份——实测在 method-editor 会话里 spawn_teamma | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-144](BUG-144-kickoff-provenance-rows-not-counted-as-hitl2.md) | BUG-144：run-kickoff 的代理记账行被 075 的词表修复打哑——「OK/继续/就按这个吧」的合法代理拍板不再算 HITL2 行 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-145](BUG-145-manual-evidence-subheading-truncation.md) | BUG-145：manualEvidenceOf 以任意 `##` 为节尾——人工走查里出现二级标题，整节/尾部在重跑验收时静默丢弃（062 复发） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-146](BUG-146-hitl-signatures-chinese-only-bilingual.md) | BUG-146：HITL 判型/答复识别只认中文文案——英语卡让门③必红、UI 停靠点误判（id 本已语言无关） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-147](BUG-147-client-hitl-zero-answers-false-green.md) | BUG-147：client-hitl-smoke ⑤b 把「共作答 0 题」当通过——代理一题未答，却断言「挂起卡已答」 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-148](BUG-148-evidence-short-quotes-not-audited.md) | BUG-148：evidence-audit 只回溯 ≥16 字的引文——短伪造摘录完全不进审计（无 finding） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-149](BUG-149-hitl2-pending-vocabulary-holes.md) | BUG-149：isHitl2Row 的 pending 词表仍有洞——「等回复/未最终裁决/挂起/推迟/未决/on hold」都被当拍板（140 修复的默认放 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-150](BUG-150-readiness-keyword-window-still-hijacked.md) | BUG-150：readiness 行内仲裁仍以「关键词窗口」区分真实判定——`随后/复核后/结论/本 run` 的裸写 FAIL 仍被旧 PASS 劫持 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-151](BUG-151-client-hitl-click-count-false-red.md) | BUG-151：147 的修法用「点击计数」判已答，与 hitl-answer 自己的判据矛盾——Recommended 预选卡答案已落地却判红（client- | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-152](BUG-152-client-load-unhealthy-host-assertion-red.md) | BUG-152：client-load 的 host-health 收口只认「连接死亡」——负载升高时的状态页断言失败仍判 FAILURE（疑似负载假红） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-153](BUG-153-protocol-snapshot-presence-only-not-content.md) | BUG-153：protocol-audit 的版本快照只查「文件在场」——`protocol/v1.json = {}` 也 PASS，历史链内容未校验 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-154](BUG-154-manifest-roles-missing-new-artifacts.md) | BUG-154：manifest 的 FILE_ROLES 未登记新契约件——protocol.json/protocol-audit.md 角色 unknow | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-155](BUG-155-manual-evidence-known-titles-are-table-labels.md) | BUG-155：manualEvidenceOf 的「已知回执节」来自表格行标签，而生成的 acceptance 没有 `##` 节——人工写 `## 检查/# | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-156](BUG-156-hitl2-gate-no-version-pairing-pending-filtered.md) | BUG-156：门③过滤掉 pending 行后，旧拍板行 + 旧答复仍放行新版本——没有「最新版本必须已拍板」的仲裁 | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-157](BUG-157-verdicts-missing-session-only-warning.md) | BUG-157：verdicts 的 batch.session 缺失只 warning——伪造裁决可引用不存在的 child 会话通过（身份/原文未核） | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-158](BUG-158-verdict-audit-review-missing-only-warning.md) | BUG-158：verdict-audit 在 review.md 整缺时只 warning——「critical unverifiable + 无 readi | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-159](BUG-159-claims-evidence-topics-not-validated.md) | BUG-159：claims 的 evidence/topics 从未与盘上对账——可引用不存在的证据文件或绝对路径，audit 无红；schema-scan  | （2026-11-13 修复；证据见卡内「已落地」） | 2026-11-13 |
| [BUG-160](BUG-160-smoke-registry-mention-not-execution.md) | BUG-160：smoke-registry 的 CI 归属只看文件名出现——注释掉 run 行仍绿 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-161](BUG-161-ci-jobs-job-id-regex-skips-underscore.md) | BUG-161：ci-jobs 的 job 名正则漏下划线/大写——新 job 可不在 needs 里 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-162](BUG-162-nested-smoke-invisible-to-registry-and-lane.md) | BUG-162：scripts/smoke 只扫顶层——嵌套 smoke 永不登记、永不运行 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-163](BUG-163-model-workflow-pull-request-target-trigger.md) | BUG-163：model-smoke 只禁 pull_request/push——pull_request_target 仍绿 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-164](BUG-164-snapshot-why-accepts-flag-as-carrier.md) | BUG-164：snapshot 的 --why 接受下一个 flag 当载体（--why --port） | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-165](BUG-165-note-format-quoted-status-and-negated-evidence.md) | BUG-165：note-format 全文正则把引用状态行/否定节当权威——合法 Note 误杀 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-166](BUG-166-note-tree-hidden-directory-bypass.md) | BUG-166：note-tree 先跳过点目录再判嵌套——隐藏嵌套 Note 绕过树深/闭集 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
| [BUG-167](BUG-167-method-heading-invisible-format-chars-duplicate.md) | BUG-167：方法标题不归一 Unicode 格式字符——ZWSP/软连字符造同名幽灵条目 | （2026-11-14 修复；证据见卡内「修复落地」） | 2026-11-14 |
