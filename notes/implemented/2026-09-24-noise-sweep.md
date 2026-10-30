# 基石降噪清扫（用户 steer，非队列条目）

> 状态：implemented

> 指令边界：只扫基础层——应用内容（proposed/ 全部 RFC、roadmap 队列条目、run 通道、
> research-workspace）一律不动；过期/过时/无意义可丢弃的尽量丢弃，信噪比优先。
> 处置序 = 删 > 并 > 修 > 记（卫生铁律）。落库 = ec185d9（删/并/修 + 本地残留清扫）+
> 本 commit（四条门禁欠账清偿 + 台账同步 + Note）。

## 决定（删 6 / 并 1 / 修 4 / 欠账清偿 4）

**删（6）**：

1. **evaluation.md §5 机制血缘表**（7 行）——与 §0 原则表、L1–L4 各面内联引用、台账
   D4/D5 三重重复（同一规则多处陈述 = slop）；codex 工具名（validate-bundle 等）的
   正本 = [harness 考古报告](../implemented/2026-09-24-deep-research-harness-analysis.md)。
2. **evaluation.md §2 的 M1 完成定义表与"（当前里程碑）"头注**——M1 已收（证据 =
   [m1-done Note](../archived/2026-09-24-l4-lite-m1-done.md)），完成定义归 §1 各面 + §3 矩阵 +
   §4 goal 程序；"当前里程碑"已失真（当前 = M2）= status rot 活体。负面判据保留
   （时效无关合同，evaluation-contract 测试锚点原样在场）。
3. **evaluation.md 旧 §6 第二条 bullet**——"门禁/预检脚本存在且可跑计入 M1 判据 1"
   （已兑现）+"真会话/发布档脚本化随队列条目落地"（preset-smoke 真会话档与
   release-smoke 均已存在）——两半句皆 spent。§6→§5 重编。
4. **00-index 待定表 Q3 行**——D15 定案 = 已闭问题占位待定表；Q1 先例 = 删行 + 底部
   销账注记，本轮回位（注记补 web-tool-rows / l1-l2-green 两链）。
5. **design/10 "web 工具行双层声明（D9）"行**——D9 终态前的旧措辞，与同节 §2 表格行
   （"web 行不进 bundle——D9"）直接矛盾；实质由 §2 表格 + §4 承接。终扫修正的漏网
   之鱼：修了表格没修行间叙述。
6. **notes/implemented/ledger-d11-d13-backfill.md**——行政记录：活文档 grep 零入链、
   零前向指导（D11–D13 跳号已随补行自愈）；活内容两笔并入本 Note（见下），原文 git
   历史保全。l1-l2-green §21 的散文指针"原词见 ledger-backfill Note 裁决"按时间层
   纪律不追改——本 Note 即其新的检索落点。

**并（backfill 活内容的归宿）**：跳号考古结论已自愈无需追溯；"墓碑注记 vs 行式登记"
裁决 = 行式登记胜（台账实践已证）；认证档误用改写裁决链的正本 =
[foundation-remediation](../archived/2026-09-24-foundation-remediation.md)（backfill 内为指针非家）。

**修（4）**：evaluation §5（原 §6）"已 green 面证据"路由从"00-index 待定表 Q 行指向"
改为"各面定义里的毕业 Note 引用"（Q3 销账后原路由死亡）；L0 通过判据删"欠账"定义
括注；台账反证记录列 4 行更新（欠账 → 本轮红绿记录）；AGENTS.md 与 guides/60 未动。

**欠账清偿（4，红绿在案）**：md-utf8-newline（双尾换行注入红）/ preset-structure
（缺 preset.yml 角色目录注入红）/ pack-bundle-compat（patch 指向不存在文件注入红）/
workspace-contract（run 模板暂移注入红）——r1-scaffold 立门禁时的欠账全部清偿，
登记表自此每行带反证、"欠账"概念退场。

## 本地残留清扫（untracked，纯工作区，31 项）

dev/smoke-workspace/ 清：tap 输出 ×11、日志 ×8（boot/probe/smoke-real/release-smoke/
l4-lite）、输出物 ×5（profile-dump/roster×2/neg.json/dashboard.html）、stop-adhoc.mjs
（一次性收队脚本，内嵌过期 token；技法由 dev/run-kickoff.mjs 正式承接）、p1/ 实验输出
堆、陈旧 tgz ×2（release-pack/run-pack 是脚本的活跃工作区，保留目录）。保留：
kickoff-chip.md（run-mechanics RFC 暂停点的活引用）、pre-commit-test.out（钩子活跃
输出）、npm-cache（工具态重定向缓存）。

## 考虑过而保留（判定记录，防误伤）

| 对象 | 保留理由 |
|---|---|
| notes/research/ 四份 | 仓规"仍在被引用"：harness 考古/插件解剖 ← 00-index D4 与 design/10-30；market-scout ← 外部材料表且用户定节奏；ui-observability ← 队列条目 3/4 |
| notes/rejected/ 唯一条目（frontmatter-caliber-gate） | 复活条件存活（随 Q6 实测重提），仍在防近亲重犯 |
| l4-lite-m1-done Note | 非冗余：会话日志事件词汇表（"写给后续脚本"）+ M1 证据链 session id 为其独有，未被 rerun 覆盖 |
| l4-lite-rerun Note | zstd 守卫优先级 / env.sh 数据面合同两个真 bug 的根因记录——代码只携带修复，不携带"为什么" |
| evaluation §0 血缘与权威表 | 合同的权威锚；AGENTS 纪律表自称首版子集（将整表替换），合同层不能依赖临时子集 |
| roadmap 队列/搁置池/proposed RFC | 用户指令明确不动（应用层） |

## 输掉的方案

- **secrets-untracked 扩"dev/smoke-workspace tracked 集合 = {.gitkeep}"专规**：本轮
  实证 tap 全部从未被 tracked（首查误读 glob 全量输出为 git ls-files，git rm 的
  fail-loud 精确纠正）——.gitignore ①段 + secrets-untracked 已覆盖实际类（tgz 事故），
  为 `git add -f` 薄路径发明门禁 = 过度守卫，弃。
- **追改 l1-l2-green §21 的悬空散文指针**：时间层不追改纪律；本 Note 记录归宿即为
  新检索落点。
- **进一步压缩 evaluation/00-index**：合同按需密度已到（负面判据/台账/待定表各承载
  不同职责），再压 = 伤信号。

## 实际跑过的验证

- 基线（改动前）：verify 13 门禁 + 20 tests 绿；
- 欠账清偿红绿（guides/60 §6，注入→红→还原→绿，全部亲跑）：四形态各红一次（见
  决定节），终态复绿；
- A（amend 修残留计数笔误 22→31）/B 两 commit 均经 pre-commit 钩子把关；
- 最终提交前：verify 13 门禁 + 20 tests 全绿亲跑。

## 环境状态

- 纯 docs/门禁/残留物层，未动 preset 与包内容 → 不触发 L1/L2/L3 加跑；
- 本轮改动面不含 AGENTS.md 与 guides/60 → 入口链探针按节奏未跑（guides/60 §4），
  下轮 docs 面改动时跑；
- 当轮快照：▶ 条目「首个完整研究 run」已闭环（第 12 场全流程）；队列已由 D20 退役；
  上轮遗留两项均不再开放。
