# 评估框架 — 本 repo 的验收合同

> 性质：**合同**（评估怎么判，只写 now）。改评估标准本身 = 一个 D 号决策，进
> `notes/`，不悄悄改；时变状态（哪个面跑到哪了）不住本文件，唯一"当前"指针 =
> `roadmap.md`（根）§队列 ▶ 条目。

## 0. 血缘与权威

| 原则 | 权威出处 |
|---|---|
| 完成定义 = 该面最小"真检查"通过；发现权在代理一侧 | company repo D15（依据 vendor `docs/testing.md` + postmortem 0001–0003） |
| no-key 测试只证明管道通；with-key 才证明 agent 真的能用 | vendor/dsh `docs/testing.md` "with-key policy" |
| Verify the world, not the self-report（断言重读文件/重跑命令，不信 agent 自述） | vendor/dsh `docs/testing.md` |
| 真入口路径 = 发布产物（npm pack → 干净 profile → plugin add → 真会话） | vendor/dsh `docs/testing.md` + company `docs/release.md` |
| 真模型/真浏览器不进 keyless 回归（layering 守卫防混） | company `tests/layering.spec.ts` 模式 |
| 每条新门禁带反证：先注入回归看红 → 还原 → 绿 | vendor/dsh `docs/testing.md` "A guard only guards if…" |
| 挂载失败只有真会话抓得到（dump/roster 看不见） | company postmortem 0001 → `preset-smoke.mjs` |

## 1. 五个评估面

每面 = 一个可独立判定的检查域。**面与面不互抵**：L4 绿不能补 L0 红。

### L0 结构面（机械门禁，keyless）

- **定义**：仓库结构、文件卫生、preset 三件套完整性、vendor 铁律（如采用 submodule）等机械可查的不变量。
- **最小真检查**：`node scripts/verify.mjs`（或 `pnpm verify`）+ `node --test tests/*.test.mjs`（或 `pnpm test`）——均 keyless、秒级。
- **门禁登记表**（正本在此；与 `scripts/verify.mjs` 的 gates 数组经门禁 `gate-ledger-sync` 机械对账——加门禁须两处同步，漏一处即红）：

| 门禁 | 断言什么 | 反证记录 |
|---|---|---|
| `md-utf8-newline` | 全仓 .md 严格 UTF-8、恰一个结尾换行 | [noise-sweep Note](../notes/implemented/2026-09-24-noise-sweep.md)（清欠账：双尾换行注入红→还原绿） |
| `md-links` | 所有 **tracked** .md 的 Markdown 相对链接（方括号+圆括号语法）可解析（git ls-files 驱动——具名目录白名单版会让根目录其余 tracked .md 逃检，基础整治 C10 改；反引号裸路径不检 = 设计） | 基础整治 Note（根目录 tracked .md 注入死链红→还原绿） |
| `preset-structure` | presets/ 每角色目录：id 规范 + preset.yml 三字段 + agent.cordis.yml + ≥1 skill 且 frontmatter name=目录名 | 同 noise-sweep（清欠账：缺件角色目录注入红→还原绿） |
| `claude-symlink` | CLAUDE.md 是指向 AGENTS.md 的 symlink | [r1-scaffold](../notes/implemented/2026-09-24-r1-scaffold.md)（symlink 创建前红→后绿） |
| `pack-bundle-compat` | pack 的 dsh.bundle.patch 指向真实文件；dsh.compatibility.dshReleases 非空 | 同 noise-sweep（清欠账：patch 指向不存在文件注入红→还原绿） |
| `row-deps` | preset 与 bundle 行引用的 `@deepseek-ai/*` 全在 peerDependencies | [m2-p1-run-channel](../notes/implemented/2026-09-24-m2-p1-run-channel.md)（违规 insert 行被守卫+row-deps 咬红→还原绿） |
| `workspace-contract` | 研究手册 + 六件 run 模板 + runs/ 目录在位 | 同 noise-sweep（清欠账：run 模板暂移注入红→还原绿） |
| `proposal-scheduled` | notes/proposed/ 每提案文件在 roadmap **§队列**有归宿（proposed 不是停车场；搁置池/头注不算归宿） | review-driven-hardening Note（收紧+清欠账：无归宿/仅搁置池双形态注入红→还原绿） |
| `secrets-untracked` | tracked 清单零敏感/残留物（credentials/.env/.pem/.tgz/.log/…） | [入口链审计](../notes/implemented/2026-09-24-entry-chain-fresh-agent-audit.md)（.pem 注入红→还原绿） |
| `role-list-sync` | 角色清单单一事实源 = 盘上 presets/；代码（scripts/tests/dev 的 .mjs/.sh）里角色清单字面量（单行 ≥3 角色名 / `[...]` 块 ≥3 角色名字符串）即红——检测名从盘上现取 | 基础整治 Note（JS 单行数组/多行数组块/bash for-in 三形态注入红→还原绿） |
| `gate-ledger-sync` | 本表门禁名集合 = verify 脚本 gates 数组（登记与实现不漂移） | 基础整治 Note（表删行/数组加假名红→还原绿） |
| `entry-chain` | 入口链存在性投影：成员文件在场（AGENTS/00-index/roadmap/proposed//guides60/evaluation/design10-30/guides61）+ roadmap §队列 恰一个 ▶（D11 唯一"当前"指针；链接解析归 md-links，此处补反引号指针与 ▶ 唯一性两个盲区） | review-driven-hardening Note（成员缺席/▶ 删除/▶ 复制三形态注入红→还原绿） |
| `entry-budget` | 常设入口防膨胀：AGENTS.md ≤145 行、README.md ≤30 行（vendor verify-doc-budgets 裁剪版；台账/指南为生长面不设顶）；超顶处置序 = 下放 > 压缩 > 升顶（须 D 号） | review-driven-hardening Note（两文件各注入超顶红→还原绿） |

- **通过判据**：全绿；`verify` 的门禁清单与 `tests/` 守卫一一登记在案，每条带反证记录（上表）。
- **何时跑**：每轮 goal 续驶必跑。

### L1 挂载面（真挂载 = preset 类改动的完成定义）

- **定义**：每个研究角色 preset 在**真 DSH 会话**里挂载成功——persona 生效、skills 可见、工具面齐全。dump/roster 可见不算（company postmortem 0001 实证：挂载失败只有真会话抓得到）。
- **最小真检查**：`node scripts/preset-smoke.mjs`——keyless 预检（环境/安装形状断言）+ 真会话档（`DSH_SMOKE_REAL=1`：boot 真 web/headless 逐角色建会话，机器断言工具/skill 面在场；落地证据 = [L1/L2 绿灯 Note](../notes/implemented/2026-09-24-l1-l2-green.md)）。
- **通过判据**：全部角色真挂载绿；失败角色即里程碑未完成，无例外。
- **何时跑**：preset 内容/结构改动时；框架里程碑必跑。

### L2 安装面（真实安装形状）

- **定义**：插件以用户实际获得的方式可用——`npm pack` 产物完整，装进**干净 profile** 成功，起会话可用。
- **最小真检查**：`release-smoke`：`npm pack` → 全新 `DSH_HOME` profile → `dsh plugin add` → 起会话断言（落地证据 = [L1/L2 绿灯 Note](../notes/implemented/2026-09-24-l1-l2-green.md)）。
- **通过判据**：pack 清单与 `files` 声明一致、安装零缺失警告、干净 profile 会话能列出研究角色。
- **何时跑**：包结构/release 相关改动时；框架里程碑必跑。

### L3 领域面（Deep Research 方法论完整性 — 本项目独有）

- **定义**：从 codex Deep Research harness（`/Users/bowhead/ai_tool_deepresearch`）提炼的方法论在本插件上有完整落点，且**用 DSH 原生载体**实现。
- **最小真检查**：`docs/design/30-methodology-mapping.md`（映射表）审查 + `tests/evaluation-contract.test.mjs` 的 keyless 断言。
- **通过判据**（四条全要）：
  1. **生命周期映射完整**：研究生命周期每一环节（立项对齐 / 广度侦察 / 深度挖掘 / 综合写作 / 质量把关 / 审阅交付）在映射表有 DSH 落点（preset persona / skill / agent-team / todo / present…），或带证据的显式弃用理由；
  2. **角色分工单一职责**：每角色一个 owner 列（职责、产出物、验收判据）；任何两类事实不得双 owner 或无 owner；
  3. **证据可追溯载体存在**：最终报告的关键结论 → 来源的追溯链有明确文件载体与格式约定（verify the world 的领域版：结论抽查必须能落到来源文件）；
  4. **信噪比策略显式**：对"搜索结果信噪比差"的处置有显式机制（来源质量分级 / 多源交叉 / 弃用判据），写进角色方法论，不能只靠模型自觉。
- **何时跑**：方法论/preset 内容改动时；框架里程碑必跑。

### L4 交付面（真模型端到端 — 唯一证明"研究做得好"）

- **定义**：真模型、真实研究问题、完整研究 run，产出可核查报告。
- **最小真检查**：
  - **L4-lite（框架里程碑档）**：每角色一条消息的真模型冒烟（验证模型响应 + 工具调用真实发生，类比 company presence-e2e ~$1 档）；
  - **L4 全量（方法论里程碑档）**：一个真实问题的完整 run，机器断言四条——① 报告存在且含来源清单；② 抽查 N 条结论能回溯到来源文件；③ 两点交互纪律（HITL 之间静默自主，不中途问人）；④ 中断后从 run 工作区状态恢复，不依赖 chat memory。
- **通过判据**：按档位全绿；L4 全量**不进常规回归**（成本），只在里程碑跑。
- **何时跑**：里程碑级。

## 2. 负面判据（任一出现 = 框架不合理，触发重构而非继续堆功能）

1. 自建机制与 DSH 现成载体重复（如自建 markdown 任务队列 vs agent-team 任务板），且拿不出"DSH 载体不可用"的证据——**不发明纪律**（company D13/D15 否决依据同源）；
2. 角色职责重叠或漂移，某类事实出现双 owner / 无 owner；
3. 挂载假绿：preset 在 dump/roster 可见但真会话缺工具/skill；
4. 生命周期环节在 DSH 上无落点且无弃用登记；
5. keyless 回归里混入真模型/真浏览器依赖（layering 违例）；
6. 评估面互抵尝试（拿 L4 绿掩盖 L0 红）。

## 3. 里程碑 × 面 矩阵

| 里程碑 | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| M1 框架搭建 | ✓ | ✓ | ✓ | ✓ | lite |
| M2 首次完整研究 run | ✓ | 改动则跑 | 改动则跑 | ✓ | **全量** |
| M3+ 打磨/回归固化 | ✓ | 改动则跑 | 改动则跑 | 改动则跑 | 按需 |

当前处于哪个里程碑 = `roadmap.md`（根）§队列的 ▶ 条目（唯一"当前"指针；本表只定义
里程碑的验收形状，不携带时变状态——status rots）。

## 4. 每轮 goal 续驶的判定程序

1. 每轮必跑 L0；本轮改动涉及哪些面，就加跑哪些面（判定权在代理，跑过什么报什么，只报告实际跑过的检查）；
2. goal 标 `complete` 的唯一条件：当前里程碑矩阵全绿；
3. 同一面连续 3 轮无法转绿且阻塞条件明确 → goal 标 `blocked`，报告具体条件（区分"缺上游能力"与"设计缺陷"：前者找 DSH seam 或提议上游，后者触发负面判据重构）；
4. 评估标准本身的变更 = D 号决策登记，禁止静默放宽。

## 5. 已知边界（诚实记账）

- L1/L2/L4 需要真 DSH 环境与（L4）`DEEPSEEK_API_KEY`；环境未就绪时该面标"未跑"，**不等同通过**（已 green 面的证据 = 各面定义里的毕业 Note 引用；未闭面的当前状态 = roadmap ▶，"未跑"≠"通过"）。
