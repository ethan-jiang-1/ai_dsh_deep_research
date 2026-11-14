---
topic: 为什么 D54 之后改善没有体感（层转移、自指 oracle、未沉淀旧账）
intent: 为 issue 2026-11-14-verification-oracle 提供 31 张新卡的分层、相邻变体实测、D54 交付/未交付与 41 张旧账的复算证据。
---

# 为什么 D54 之后改善没有体感：层转移、自指 oracle 与未沉淀的旧账

> 证据边界：本页数字 = 2026-11-14 在 HEAD `85b7026f` 上只读复算；探针 = `runtime/smoke-workspace/`
> 下的一次性脚本（gitignored），不改产品。消费者 = [issue 2026-11-14-verification-oracle](../../settled_issues/2026-11-14-verification-oracle.md)。

## 1. 层转移：31 张新卡里 22 张在验证层，不在产品

对 BUG-160..190 逐卡提取 `## 修复落地` 的 `改动` 路径，按落点分层：

| 层 | 张数 | 说明 |
|---|---:|---|
| **验证层**（`scripts/`、`tests/`、`docs/`、`.github/`） | **22** | ci-workflow、note-scan、smoke-registry、fix-evidence、staged-pairing、model-workflow、artifact-freshness 等 |
| 产品（`packages/`） | 5 | 174、178、179、180、185（其中 178/179/185 也同时改验证层） |
| 未提取到路径 | 4 | 168–171（修复段用了非反引号形态），按卡内根因仍属 readiness/present 面 |

按失败类：C7 14、C8 7、C2 3、C4 3、C3 2、C9 2。**与产品期同一批失败类**，只是换了一层发生。

这解释了“体感”问题：D54 把**制度**建起来了，但新制度本身成了新的被测面；每加一层判据，
就多一处“以文本为 oracle”的面。31 张里能指回更早 BUG 的（160→053、167→127/128/138、
168→090/134、169→074/150、171→153、180→138）只是显式引用；按机制看，184→177、185→178/179、
187→177、188→183、190→182 也是同族变体。

## 2. 自指 oracle：修复仍是启发式，测试与实现同源

三个批次 D 修复的实际形态：

- CI：`normalizeExpression` 加“注释→去引号→`${{ }}`”顺序；`flowKeys` 手写 flow mapping；
  `splitCommands` 手写 shell 切段；`isKnownFailure = /^(?:false|!?\s*true|exit\s+[1-9])$/`。
- Markdown：mask 改成 fence-first 行扫描；状态标签认 `**`/`__`/反引号。
- fix-evidence：`NEGATION` 正则看 marker 前 10 字符；`exit` 必须与可重放命令同行；
  `isFileLike` 排除目录/glob；staged 配对改精确文件。

相邻变体实测（当前 HEAD，一次性探针）：

| 输入 | 当前结果 | 性质 |
|---|---|---|
| `(node scripts/smoke/a.e2e.mjs)` | 不计执行 | 子 shell 实际执行——假阴性 |
| `node ... \|\| true` | 不计执行 | 执行了但失败被吞——语义选择 |
| `if false; then node ...; fi` | 不计（靠行首） | 不是语法，是碰巧 |
| `... 并不存在失败` | 红证通过 | 否定词中间有字，`NEGATION` 只看紧邻 |
| `"not ok"` / `"passed"` 引号日志 | 当证据 | 引号/日志无结构 |
| `<strong>状态</strong>：implemented` | 状态行不认 | 装饰面仍开放 |
| 嵌套 blockquote / list 里的 fence | 部分 mask | 容器组合没闭 |

而 `tests/contracts/markdown-mask-conformance.spec.mjs` 的 oracle 是
“note-scan 与 readiness 两份实现给出同一正文面”——**两份实现共享同一个错误子集时，测试照样绿。**
它证明的是“两份实现一致”，不是“符合 CommonMark”。CI 的测试是手写 SYNTHETIC；fix-evidence 的
测试是手写卡片文本。**同一个 agent 写规则、写解析器、写测试，三者共享同一个心智模型。**

## 3. D54 交付了什么、没交付什么

D54 Note 自己列的“未证明”：W2-3 消费者全矩阵（只落 role 窄矩阵）、W2-6/7 全族假绿
oracle/变异证明、W0-6 hook/DOM 行为面、`test:e2e`/`test:entry` 全量未跑。

已交付的偏**制度可见性**：D53 车道、smoke registry 28 条、成本 ratchet、CI 聚合、
guide 67、探索技能、失败类普查、class-level-guards 方法、若干矩阵（heading/lock/path）。

未交付的偏**证据强度**：oracle 独立、变异/负控全覆盖、消费者全矩阵、贵层全量基线。
**上一轮把“能写下来的”做完了，把“能证明的”留着了。** 体感差距就来自这里：
制度更清楚，但已知失败类的守卫没有同比增加。

## 4. 未沉淀的旧账：41 张，且无法一眼对账

普查（2026-11-13）的 §D：41 张“修了但没沉淀”——D-1 24 张无永久 keyless 守卫，D-2 17 张有
守卫但未入 BUG 账/只在贵层。

在 HEAD 上按“测试文本是否含 BUG-<id>”复算：D-1 的 24 张里只有 2 张有带号的测试，
**22 张仍无**；但其中至少 4 张已有同名测试（`brief-fold` / `web-ui-nav` / `stream-failure` /
`port-reclaim`），只是标题不带号。**所以真正的问题不是“没补”，而是“补没补、补到哪，没人能对账”。**
资产账只覆盖 27 条 smoke，194 个 spec/check 没有 uniqueClaim/class/oracleType/sunset——
这正是 D54 “资产账”只做了一半的证据。

## 5. 结论：下一台阶必须是“换 oracle + 沉淀守卫”，不是“再加矩阵”

1. **每个已修 bug 必须沉淀永久 keyless 守卫，或显式“不可机械化 + 理由 + 触发条件”**；
   否则 41 张旧账会继续以邻接变体回来。
2. **验证层的每个 parser 必须有独立 oracle**：结构化字段（structured）、真实工具录制
   （external）、规范形 + 写入侧校验（canonical）。只有 `self-referential` 的守卫算“临时”。
3. **资产账要覆盖 spec/check，记 `oracleType`**；否则“点位绿”永远冒充“面绿”。
4. **停止条件 = 同一探索协议在声明面上找不到新邻接变体**；不是“账本写完了”。

## 6. 复算方式

- 层分布：`runtime/smoke-workspace/layer-audit.mjs`（读 31 张卡的 `## 修复落地` 路径，按前缀分层）；
- 未沉淀：`runtime/smoke-workspace/unsedimented-check.mjs`（读普查 §D-1 的 24 个编号，扫 `tests/`
  是否含 `BUG-<id>`）；
- 相邻变体：`runtime/smoke-workspace/adjacent-probe.mjs`（直接 import 三个 parser，打印结果）。

一次性脚本不进仓；结论进 issue；要复用再升格为 test。
