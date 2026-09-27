# 复盘：技术债收口 + 渐进面接通（2026-09-26）

> 状态：implemented
> 归档：2026-09-27

归宿：goal「技术债收口 + 继续推进」复盘；各项的持久决定理由住各自的 Note（链接见下）。

## 决定

用户问"该打扫卫生还是继续往前"——实测六项欠账后**先收口再往前**：欠账不是洁癖问题，
而是**指针说谎与纪律表失真**（读 roadmap 会做已完成的事；纪律表说我们没有的东西我们有了）。

## 六项欠账的处置（逐项一提交）

| # | 欠账 | 处置 | 证据 |
|---|---|---|---|
| 1 | ▶ 指针指向已完成条目（生态研究） | 补完毕业三件：RFC 迁 `implemented/`（改写为事实体）+ roadmap 行删 + 已毕业补记；▶ 移交「研究类型覆盖」 | `proposal-scheduled` / `note-status` 绿 |
| 2 | commit message 声称的改动不在 diff（我的失误） | 事故复盘 [postmortem](../postmortem/2026-09-26-roadmap-graduation-drift.md) + 新门禁 `queue-pointer-live`（▶ 引用的 RFC 必须在 `proposed/`） | 红证成立（改指已迁走 RFC → 红 → 还原绿） |
| 3 | 部署工程无 Note | [deployment-engineering](../implemented/2026-09-26-deployment-engineering.md)（五条决定 + 四条输掉的方案） | 门禁全绿 |
| 4 | preflight/scaffold 零证据 | `release-smoke` 扩 ④b **真部署链**（dry-run 不落盘 / 真铺种子 / preflight 六项机检）；顺带修 scaffold dry-run 的假红 | L2 ALL PASS |
| 5 | discipline-map 三行失真（"无 ctx 调用面"） | 逐行重审：`Plugins, not loop changes` → 带证据适配；`Registrations are effects` → **照搬**（client 面真在 `scoped.effect` + `slots.register`）；包级约定补部署义务 | `align-ledger` 绿 |
| 6 | 根 README 过时 + web 生命周期无记 | README 去"纯配置"；guides/61 补 web 生命周期与**白屏判别序**三条 | `md-links` / `doc-budgets` 绿 |

## 往前跑：(g) 渐进面接通

根因链四条（空路径 / 会话工作区根 / **工作区从未注册** / profile 镜像）与修复 =
[bundle-face-wiring](../implemented/2026-09-26-bundle-face-wiring.md)。**附带重大发现**：首场 run 因 cwd 错，
**一份手册都没注入**——这是 31 份证据无 frontmatter 的直接原因（已补记进证据可靠性毕业记录）。

## 收尾证据链（全绿）

| 面 | 结果 |
|---|---|
| L0 | 27 门禁 + 53 tests |
| L1 真挂载 | ALL PASS（四角色） |
| L2 安装形状 | ALL PASS（含部署链 ④b 三断言） |
| client-load-smoke | **13 断言 ALL PASS**（渐进面硬断言：步骤条七步 / 证据 31 份 / ✅ 已交付 / 问题行 + 活动流 15 行 / 零噪音） |
| L4-lite | ALL PASS |

## 残留与下一步

- **研究工作区注册**已在本机完成（workspaceId `eb5792d8`），但**部署方需自己注册**——
  guides/61 与 pack README 已写前置；`run-kickoff.mjs` 默认走 workspaceId 形态；
- 侧栏"只列有回合的会话 / 只展开 active 组"是 DSH 现有行为，已入档（smoke 自动展开组）；
- 队列只剩「研究类型覆盖」（需用户带题），搁置池五条不动。

## 输掉的方案

- **先往前跑、欠账留着**：否决——▶ 说谎会让人做已完成的事，纪律表失真会让审计得出错误结论；
- **重写历史修 commit message**：否决——历史已推进多笔，改写风险大于收益；改用复盘 + 门禁
  （让同类失误**下次机械可见**）；
- **大扫除**（重排文档/重构）：否决——系统本身健康（门禁/测试/证据链全绿），坏的是账不是骨。
