---
topic: 判据加工环路的实体检查缺口（三次独立审计）
intent: 为 issue 2026-11-13-workflow-substance-gates 提供 fresh-agent 路径、真实链路违规与五类失败对照的原始证据。
---

# 三次独立审计：加工环路哪里只查形式、不查实体

> 证据边界：三次审计均为只读（未改仓库）；两个 false-green 的复现命令与输出见 §1.4；链路违规的
> 引文见 §2。消费者 = [_backlog/_archived/settled_issues/2026-11-13-workflow-substance-gates.md](../../_archived/settled_issues/2026-11-13-workflow-substance-gates.md)。

## 1. 冷启动 fresh agent：路径、摩擦、两个假绿

### 1.1 实际路径（5 份显式文档 + 4 份自动注入的子树 AGENTS）

| 步 | 文档 | 得到的决定 |
|---|---|---|
| 1 | 根 `AGENTS.md` | 入口链 1–4；新门禁带反证 |
| 2 | `docs/00-index.md` | 门禁改动走 guides/60；evaluation = 验收合同 |
| 3 | `docs/guides/60-dev-loop.md` | 「加/改机械门禁」→ verify/gates + §L0 台账；先读 writing-a-gate |
| 4 | `.agents/skills/writing-a-gate/SKILL.md` | 先想红、防空语料、`CASES` + gates-smoke |
| 5 | `docs/evaluation.md` | 读到 §判据形状：结构化事实、歧义=红、不变量+矩阵、不造 grep 门禁——**推翻第 3/4 步** |

### 1.2 三个摩擦

1. **找不到**：§判据形状 在本仓没有指针；门禁任务行只指 §L0 表，技能只讲 verify gate。
2. **说法冲突**：`evaluation.md` 头「改标准 = D 号决策」vs §L0「加门禁 = 同 diff 台账同步」；
   「新增判据不变量算不算改标准」无裁定。
3. **不知信哪份**：「交付门禁」无定义——L4 五门 / `run-accept` / 门A、门② / `acceptance-check`
   都沾边，范围靠读代码。

### 1.3 关键问题

> 仅凭文档，会不会自然得出「判据读结构化事实、歧义必须红、测试是不变量+变异矩阵」？

**不会。** 在读到 §判据形状 之前，它会去 `scripts/verify/gates/f-repo.mjs` 加源码扫描（找关键词 /
取最后）+ `gates-cases` 注入——**恰是 §判据形状 明文禁止的 grep 门禁**。缺的指针应加在
guides/60 §2 的门禁行（技能 §1 同步）。

### 1.4 两个 false-green（实测，均已修复并留负例）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { readinessOfSources, parseReadinessDeclaration } from './packages/deep-research-pack/src/lib/review-readiness.ts';
console.log(readinessOfSources({ reviewText: 'readiness: PASS；readiness: FAIL', declarationText: '{\"version\":1,\"readiness\":\"PASS\"}', hasReviewDir: true }));
console.log(parseReadinessDeclaration('{\"version\":1,\"readiness\":\"FAIL\",\"readiness\":\"PASS\"}'));
"
```

- **互斥散文**：`readiness: PASS；readiness: FAIL` → `terminalVerdictLine` 返回 `null`，旧实现把
  「互斥」当「缺席」，声明 PASS 直接放行（`pass=true`）。
- **重复键**：`JSON.parse` 静默取末值 → `FAIL, PASS` 读成 PASS。

修复：`verdictAnalysisOf` 显式暴露 `ambiguous`；`readinessOfSources` 对互斥判红；声明重复键
fail-closed。负例 = `tests/run/readiness-declaration.test.mjs` 末两例。

## 2. D51 真实链路审计：6 处违反自己的规则

| 环 | 规则要求 | 实际 | 判 |
|---|---|---|---|
| 卡 I 立项 | `待落地` = 结论倾向 + 验收标准 + 去向 | 四项齐 | ✅ |
| Note | `待落地` 不写 implemented Note；与交付同变更 | 立项提交即建 `implemented` Note，验证节自承「是要拆的残余」，提交自认「未落代码」 | ❌ |
| 决策/合同 | 合同不复述进度 | `evaluation.md` 写「卡 I 已归档、其余面 = 卡 II」 | ⚠ |
| 实现 | 声明件权威、不设兼容分支 | 代码仍「无 `review/` 回退散文」，D51 未记 | ❌ |
| 卡 I 关闭 | 删清单已执行或为空 | 8 个归档件判「无法判定」，未删、未登 triggers（现已补 trigger） | ❌ |
| 归档/索引 | `git mv`、保表形 | 归档行插在表头之上，表格割裂（已修） | ❌ |
| 卡 II 关闭 | 公共行为须用户验收或记跳过 | 只有机械 + 自审，无用户验收、无跳过（待用户补） | ❌ |
| 收尾 | 最终基线只记实际证据 | 归档后仍改行为（回执兜底），1386→1388→1390 无卡验收 | ❌ |

**结论**：六条全是散文规则；`backlog-liveness` 查非空、`note-format` 查骨架、
`guard-red-record` 查标题——一句合格的话即可满足。收口是自觉制，不是判据制。

## 3. 五类失败 × 流程拦点

| 失败类 | 现有拦点（成文） | 为什么拦不住 | 最小改动 |
|---|---|---|---|
| A 散文当协议 | `evaluation §判据形状` + `verdict-conformance` | 只覆盖少数面；开发环的「验收标准/修复判据」只查非空 | 两节改为五列非空（行为/类别/信号/负例/owner） |
| B 判不出就放行 | `五面退出：未跑 ≠ 通过`；`writing-a-gate` 防空语料 | exit 2 是合法退出；「未跑」只靠报告自述 | 改动面 → 必跑面的对账门（重，暂缓） |
| C 双副本 | `docs/AGENTS 一事实一家`；`count-free`；`role-list-sync` | 原则是散文；机械只覆盖逐例枚举的清单 | 卡加 `## 事实家`（唯一正本 + 在本次 diff） |
| D 例子测试 | `tests/AGENTS 反证义务`；`guard-red-record` | 反证只由「标题带 BUG 号」触发 | 扩到显式声明的判据测试 |
| E 金标准自证 | `guides/60` 脚注①；`snapshots/README 人审` | 「人审」无字段；`--update-expected` 一条命令重写 | `--update-expected --why <载体>` + 门 |

## 4. 综合：三条结论

1. **五类都不缺成文规则**（判据形状、五面退出、一事实一家、反证义务、脚注①都已写好）；
   缺的是规则之后的「字段/门」——现有机械面只查在场、非空与形态。
2. A、B、D 共用一个放大器：`backlog-liveness` 查非空、`note-format` 查节名、
   `guard-red-record` 查标题——**一句合格散文即可满足**。C、E 各缺一个「正本/理由」字段。
3. 五个最小改动都在既有门上加列或加对账，不新建体系；先做「设计字段 + 收口门」，
   面面对账（B）最重、最后做。
