---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-214：成本基线停在「108 个注入案例 / 86s」——实际 CASES=142，count-free 词表不含「案例」

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行文档与词表触面；计数指正本 + 词表扩容） — 结论：计数名词表扩容（案例），活文档计数改指 CASES 正本，108/248s/86s 清零；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[docs/guides/67-test-strategy.md](../../../docs/guides/67-test-strategy.md) 的成本节；
> 同数在 [_backlog/methods/class-level-guards.md](../../methods/class-level-guards.md) 与同页 `:814`；
> 门禁 = [checks/verify/gates/a-docs.mjs](../../../checks/verify/gates/a-docs.mjs) 的 `count-free`（第 456 行四名词词表）。
> 事实源 = `checks/lib/harness/gates-cases.mjs` 的 `CASES`；探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N8/N9。

## 症状

活文档把 `gates.e2e` 的规模写死为 108 个注入案例（串行 248s → 并行 86s），实际：

```sh
node --input-type=module -e "import {CASES} from './checks/lib/harness/gates-cases.mjs'; console.log(CASES.length)"
# 142
```

`count-free` 声称「live 文件不写硬编码计数」，但它只认四个名词（门禁 / tests / 断言 / 条源面）：

```sh
# 注入 live 文档一行：'142 个注入案例；142×门禁'
node checks/verify/verify.mjs --only=count-free
# 红：写死计数「142×门禁」
# 静默：'142 个注入案例' 不在词表 → 不报
```

「案例」是本仓增长最快的资产计数（2026-11-16 基线 133 → 现 142），也是成本预算
（默认 4 并发 / 墙钟）的输入；它恰好落在词表的缝里。

## 分诊与授权

- 严重级：P2 — 成本/并发决策读到的是过期规模；不是运行期错误，但「计数有正本」这条纪律在关键名词上失效。
- 表面 / 边界：测试策略文档（成本账）/ ② 静态（文档 + 门禁）
- DSH 不变量：fail-loud —— 计数必须要么指正本、要么被门禁咬红
- 触及面：文档合同（guides/67 + methods）+ 门禁与验收合同（count-free 词表）
- 授权：用户 2026-11-17 放行（文档合同 + 门禁词表触面 → 修复就绪 = P2 修复授权）
- 批：2026-11-17 命名空间搬家探索（N8/N9）；前序 = BUG-204 同族的「活文档计数/路径」

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "import {CASES} from './checks/lib/harness/gates-cases.mjs'; console.log(CASES.length)" # 142
grep -n '108 个' docs/guides/67-test-strategy.md _backlog/methods/class-level-guards.md        # 3 处
DOC=docs/project-map.md; printf '\n探针：142 个注入案例\n' >> "$DOC"
node checks/verify/verify.mjs --only=count-free; echo "exit=$?"   # 0（应红）
git checkout -- "$DOC"
```

## 根因（已证）

- `count-free` 的匹配式 = `[0-9]+ ?(门禁|tests|断言|条源面)`；「案例」不在闭集（源码注释自述「只检四个名词」）。
- guides/67 的「同构案例有界并行」把 108 当作当前规模与墙钟基线写入；`gates.e2e` 在 2026-11-17 波次新增案例后到 142。
- 本仓已有 `CASES` / `--list` 正本，但文档没有指向它；`doc-paths`/`count-free` 都不覆盖「案例」计数。

## 牵出的失败类

- C11 文档/规则漂移 + C7 假绿（门禁词表窄于承诺）：同族 = BUG-160/172（提及冒充执行）、
  BUG-198（claim 路径固化）。处置：类修（把「资产计数」收口到正本指针或统一词表，而不是补 108→142）。
- 与 BUG-213 同批（2026-11-17 探索），但不同机制。

## 修法

1. guides/67 与 class-level-guards 的「108 / 248s / 86s」改为指正本（`CASES.length` / `--list` / 实测命令），
   不写数字；
2. `count-free` 词表加 `案例`（或 `注入案例`），同 diff 扫一遍剩余命中；若「案例」在别处是合法计数
   （如研究题数量），给该处显式指正本；
3. `gates.e2e` 的 `--list` 已存在，文档链接它；可选：`gates.e2e` 启动时打印 `cases: N` 供复制。

## 修复判据

- 活文档零「108 / 86s」；`grep -rn '108 个' docs _backlog/methods` 为空；
- 注入「N 个注入案例」到 live 文档 → `count-free` 红；注入「N 门禁」仍红（负控）；
- `pnpm verify` / `pnpm test` 绿；`gates.e2e --list` 可复算案例数。

## 修复关联

与 [BUG-215](BUG-215-ci-tier-nightly-required-semantics.md) 同批（测试制度账），建议同一次评审。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/doc-counts.mjs",
    "checks/verify/gates/a-docs.mjs",
    "tests/checks/doc-counts.test.mjs",
    "checks/lib/harness/gates-cases.mjs",
    "docs/guides/67-test-strategy.md",
    "_backlog/methods/class-level-guards.md",
    "_backlog/triggers.md",
    "checks/smoke/gates.e2e.mjs",
    "tests/checks/smoke-contract.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/doc-counts.test.mjs",
    "exit": 1,
    "output": "not ok 1 - 名词闭集：资产计数名词在场且长词优先（案例/注入案例）"
  },
  "green": {
    "command": "node --test tests/checks/doc-counts.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/doc-counts.test.mjs"
  }
}
```
