# 基础整治(foundation-remediation)——交接单全条目闭档

> 状态：implemented

> 状态:implemented(2026-09-24)· 依据:《基础整治交接单.md》(临时工单,任务完成即删,
> 本文即其全部内容的归宿)· 提交链:7c32541 → df2569a → 4104b44 → f0402dc →
> c9ccf6f → c3cdeb7 → 8c526d7 → d9cf1ee(+本文终 commit)

## 交接单条目对照(全闭)

| 条目 | 处置 | 落点 |
|---|---|---|
| §1 在飞改动 | 入库(用户指令:除交接单外全提交) | 7c32541 |
| §3.2 角色清单单一事实源(优先级1) | `scripts/lib/roles.mjs` + 六消费点动态化 + 门禁 `role-list-sync` | df2569a |
| C5 门禁登记表(优先级2) | evaluation.md §L0 登记表(正本)+ 门禁 `gate-ledger-sync` 机械对账 | 4104b44 |
| C10 md-links 逃检 | git ls-files 驱动全 tracked .md | 4104b44 |
| §3.1+C7 入口链收敛(优先级3) | README 三段/60 §1/roadmap 条目7 → 指针 | f0402dc |
| C1/C2/C9(优先级4) | 条目1 ≤3 行/Q3 与 evaluation 悬空指针/认证档清零+推翻旧裁决 | c9ccf6f |
| §3.3+§3.6 证据契约 | 五副本机械对账测试 + dashboard 谓词五字段化+写进手册 + 强度诚实记账 | c3cdeb7 |
| C3/C4/C6/C8(优先级6) | 加 skill 程序(双向实证)/尖括号+占位/60 §7 中断恢复/20-roles §2 降级路由 | 8c526d7 |
| §3.4/§3.5(用户拍板) | rejected/ 首条独立成篇;postmortem/ 留(空态诚实) | d9cf1ee |
| §3.7 D 号扫描 | D2 更新(§3.2 同轮)/D7 边界澄清/evaluation 时变措辞去态/D17-D18 系 company 号无漂移 | d9cf1ee |

## 决定

1. **角色清单的事实源 = 盘上 `presets/` 目录**(§3.2):JS 消费点 import
   `scripts/lib/roles.mjs`,bash 用 glob 枚举;tests 数量哨兵(≠4 即红)把"加角色 =
   推翻 D2"变成机械提醒;l4-lite `PROMPTS` 降为覆盖映射 + 双向 fail-loud(盘上无覆盖 /
   覆盖键漂移出盘上都 exit 2)。门禁 `role-list-sync` 检测名从盘上现取(门禁自身零硬编码)。
2. **门禁清单只有一个家**:正本 = evaluation.md §L0 登记表,实现 = verify.mjs gates
   数组,`gate-ledger-sync` 双向对账(表删行/数组加假名都红)。反证列如实记账:5 条
   欠账(r1-scaffold 已登记"下次改该门禁时补")。
3. **md-links 覆盖面 = 全部 tracked .md**(C10):git ls-files 驱动;git 不可用 fail-loud
   (同 secrets-untracked 姿态);反引号裸路径不检(设计,不变)。
4. **入口链 5 处复述 → 1 正本 4 指针**(§3.1+C7):正本 = AGENTS.md §入口链;README
   Start Here/Directory Map/Commands 命令块、60 §1、roadmap 条目 7 全部改指针——README
   自称"不复制"自此为真;Rules In One Screen 保留(稳定原则摘要 = README 自称职责)。
5. **证据契约 = 语义正本(手册)+ 执行者副本 + 机械对账**(§3.3):副本允许存在(字段必须
   物理到达执行者——data-caliber RFC 已确立原则),但 evaluation-contract.test.mjs 断言
   五字段在五副本全部在场,漂移即红;dashboard 有效证据谓词升为五字段全齐且正本写进手册
   (影子契约歼灭);§3.6 的"mandatory 无牙齿"以手册"机械强度诚实记账"节收口(L0 在场
   断言+渲染谓词 / critic 散文执法 / verify 不扫 runs/,如实承认)。
6. **20-roles §2 降级**(C8,方案②):"当前有哪些 skill"= 盘上目录;方法论映射正本 =
   30-mapping(L3 合同);§3 引用去 skill 名——加删 skill 不再需要手工同步 20-roles。
7. **开发通道中断恢复 = 读三样**(C6):roadmap ▶ / RFC 状态行+文末实施记录 / git log;
   明写否决控制文件(指 m2-plan-shape §输掉的方案)。
8. **rejected/ 首条**(§3.4,用户拍板):frontmatter-caliber-gate 独立成篇(近亲重犯现场 =
   §3.3 设计时差点重提);其余 9 处内联不迁(决定的内在组成部分)。**postmortem/ 留**
   (§3.5,用户拍板):空态诚实,下次真发生时落档。

## 输掉的方案 / 取舍

- **C8 保留 30-mapping 引用 skill 名**:它是 L3 合同(方法论→载体映射),删承载性 skill
  本就是合同变更需同 diff——设计内同步,非漂移;真正消灭的是 20-roles §2 的纯清单复述。
- **role-list-sync 检测阈值 = 单行 ≥3 个角色名 token / `[...]` 块 ≥3 个角色名字符串**:
  ≤2 共现合法(team-preflight 探针成员名 probe-scout/probe-analyst、l4-lite PROMPTS 逐行键);
  阈值抓得住全部已知硬编码形态(JS 单行数组/多行数组块/bash for-in),反证三形态全红。
- **boot-run.sh 与 team-preflight-smoke 的组合校验(bundles+presets 在位)仍是两份**:
  bash 无法 import mjs,抽公共层得不偿失;两份均已目录枚举化(角色漂移不再是问题),
  bundles 两行的逻辑漂移风险低——已知复述,登记在此。
- **交接单自身不入 git**:临时工单,内容全部落进 docs/notes(本文对照表),原文件删除。

## 实际跑过的验证

- L0:`node scripts/verify.mjs` 9→11 门禁(每轮 commit 前亲跑,exit 0);`node --test
  tests/*.test.mjs` 18→20 项,全绿。
- 反证(60 §6,全部红→还原→绿):①role-list-sync 三形态注入(JS 单行/多行数组块/
  bash for-in)4 处红;②gate-ledger-sync 双向(表删行红/数组加假名红);③md-links 根目录
  tracked .md 注入死链红;④dashboard 谓词降回三字段 → evaluation-contract 新测试红;
  ⑤C3 程序实证:照程序加空 probe-skill(零 yml/文档改动)→ L1 真挂载 ALL PASS(自动发现)→
  删除 → 复跑 ALL PASS(双向无误伤)。
- L1 真挂载(源码域 3097/3096/3095 三轮)ALL PASS;L2 release-smoke ALL PASS(内嵌安装域
  preset-smoke 同绿,覆盖 presetRoles 消费点);boot-run 枚举循环等效片段 fail=0;五脚本
  `node --check` 绿。
- 真模型档(l4-lite/team-preflight 全跑)未跑:本轮未改 preset 内容,不在 §5 追加范围;
  两个脚本的清单/校验逻辑经 import 复用与等效验证(组合校验 fail=0 + PROMPTS 双向对账
  模拟)。**未核销项:下次真模型冒烟时连带覆盖**。
- L3:evaluation-contract.test.mjs 五副本对账 + 谓词测试绿(20 tests 内)。

### 本轮事故记录(postmortem 候选素材,未落档)

1. **C1 压缩 roadmap 踩 proposal-scheduled**:条目 1 收敛时用简称("plan-shape"等)替代
   RFC 全名,门禁要求 stem 全名在 roadmap 在场 → 红;且首次 commit 的 bash 链中
   `verify | tail` 管道吃掉 exit code,红状态溜进 commit,靠下一轮门禁输出发现后 amend。
   教训:①队列行压缩先想门禁机械耦合;②commit 前必须检查 verify 的 exit code 本身,
   不能经管道。
2. **md-links 假安全感(历史,交接单实证)**:具名目录白名单版对根目录其余 tracked .md
   完全失明,31 条死链同刻全绿——"门禁在但盖不到该防的地方"比没有门禁更危险。C10 已修。

## 环境状态

- 工作树:仅存《基础整治交接单.md》(未 tracked,随本文闭档删除);HEAD = 本文终 commit。
- dev 环境:research profile 在位(boot-run 枚举校验 fail=0);无残留 web/watcher 进程
  (L1 冒烟起停三次,child.kill 收净)。
- 门禁:11 条(新 role-list-sync / gate-ledger-sync,登记表见 evaluation.md §L0)。
- 测试:20 项(新增:角色哨兵对账/五副本字段对账/谓词红绿)。
