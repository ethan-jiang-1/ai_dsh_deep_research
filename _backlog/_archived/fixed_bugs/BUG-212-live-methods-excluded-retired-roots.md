---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-212：live 方法文档整树被路径门禁豁免——`_backlog/methods` 与 `triggers.md` 仍写 `scripts/`、`dev/` 命令

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行文档与门禁触面；先归位内容再加宽扫描面） — 结论：活指令面（methods + triggers）纳入扫描，15 处旧根命令归位现根；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：门禁排除面 = [checks/verify/gates/a-docs.mjs](../../../checks/verify/gates/a-docs.mjs) 的
> `doc-paths`（`exclude: _backlog/`）与 `call-surface`（同排除）；受影响文档 =
> [methods/validation-evidence.md](../../methods/validation-evidence.md) ·
> [methods/class-level-guards.md](../../methods/class-level-guards.md) ·
> [methods/bug-to-fix.md](../../methods/bug-to-fix.md) · [triggers.md](../../triggers.md)。
> 探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N3。

## 症状

这些文档是 agent 的**当前指令**（`class-level-guards` 被探索/交付技能链接，`triggers` 被根 AGENTS 路由），
但按目录被当成「过程/冻结层」整树排除。搬家后命令仍是旧根：

```text
_backlog/methods/validation-evidence.md:21  node scripts/smoke/gates.e2e.mjs
_backlog/methods/validation-evidence.md:22  DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs
_backlog/methods/validation-evidence.md:23  node scripts/smoke/client-load.entry.mjs / release.entry.mjs
_backlog/methods/validation-evidence.md:24  scripts/run-gates/
_backlog/methods/validation-evidence.md:26  `scripts/smoke/`（旧链接目标随根名统一失效）
_backlog/methods/class-level-guards.md:168  scripts/smoke/gates.e2e.mjs
_backlog/methods/class-level-guards.md:628  scripts/verify/gates/f-repo.mjs:144-184
_backlog/methods/class-level-guards.md:787  scripts/smoke/
_backlog/methods/class-level-guards.md:814  scripts/AGENTS.md
_backlog/methods/class-level-guards.md:829  scripts/verify/gates/f-repo.mjs
_backlog/methods/class-level-guards.md:830  scripts/lib/run-lock.mjs（现 checks/lib/harness/run-lock.mjs）
_backlog/methods/bug-to-fix.md:130          scripts/smoke/
_backlog/triggers.md:17                     dev/llm-socket-isolation.cjs（现 tools/channel/…）
_backlog/triggers.md:36,37                  dev/vendor-build.sh（现 tools/build/…）
_backlog/triggers.md:16                     判据写「scripts/、dev/ 下搜不到」（现 checks/、tools/）
```

实跑其中两条：

```sh
node scripts/smoke/gates.e2e.mjs --list        # exit 1（MODULE_NOT_FOUND）
DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs
# exit 1: Cannot find module '.../scripts/smoke/preset.e2e.mjs'
```

反讽点：第 26 行的**链接** ``scripts/smoke/`（旧链接目标随根名统一失效）` 仍可解析——`md-links` 走
搬家账本落到 `checks/README.md`，所以链接林全绿，读起来像活的；命令本身没有账本。

## 分诊与授权

- 严重级：P2 — agent 按方法文档敲命令会直接失败；不是运行期行为，但属指令面的 fail-open。
- 表面 / 边界：维护面文档（agent 指令）/ ② 静态（文档 + 门禁）
- DSH 不变量：fail-loud —— 当前指令里的旧根必须红，而不是靠「目录是过程层」豁免
- 触及面：文档合同（methods/triggers 是当前指令）+ 门禁与验收合同（排除面）
- 授权：用户 2026-11-17 放行（文档合同 + 门禁与验收合同触面 → 修复就绪 = P2 修复授权）
- 批：2026-11-17 命名空间搬家探索（N3）；M11 指令面/证据面错位

## 复现

复现状态：稳定（静态；命令可直接跑）。

```sh
grep -rn 'scripts/\|dev/' _backlog/methods/*.md _backlog/triggers.md | grep -v _archived
node scripts/smoke/gates.e2e.mjs --list; echo "exit=$?"   # 1
```

## 根因（已证）

- `doc-paths` / `call-surface` 的 `exclude` 以 **目录** 判「冻结/证据」，`_backlog/` 整树被排除；
- 但 `_backlog/methods/` 与 `_backlog/triggers.md` 是**现行指令载体**（被 `.agents/skills`、根 AGENTS、
  guides/60 链接），不是历史证据；
- `md-links` 的账本解析只救 Markdown 链接，不救反引号/围栏里的命令；`doc-paths` 的退役根判据够不到
  被排除的树；
- 结果：同一份文档「链接能点、命令不能跑」，且两类检查都绿。

## 牵出的失败类

- 同机制第 3 次：BUG-204（散文面）→ BUG-211（退役根形态）→ 本卡（目录级豁免把活文档当冻结层）
  ——处置：类修（按「是否被 live 载体链接为当前步骤」划活面，不按目录名）。
- M11 指令面/证据面错位；C11 文档漂移（但这里漂的是**当前命令**，不是历史叙述）。

## 修法

1. 内容：把上列命令/路径改为现行根（`checks/smoke/`、`checks/run-gates/`、`checks/verify/`、
   `checks/AGENTS.md`、`checks/lib/harness/run-lock.mjs`、`tools/channel/llm-socket-isolation.cjs`、
   `tools/build/vendor-build.sh`），`triggers.md:16` 的判据改成「`checks/`、`tools/` 下搜不到」；
2. 结构：把 `_backlog/methods/*.md` 与 `_backlog/triggers.md` 加进 `doc-paths` 的扫描面
   （`_backlog/_archived/`、`issues/`、`bugs/`、`research/` 仍排除），对退役根只判前缀、不判存在性；
   含「退役/旧根/历史」的同一行放行；
3. `gates.e2e` 加一条 `doc-paths-live-methods-retired-root` 注入案例；负对照 = vendor/company 同形路径
   （如 `vendor/dsh/scripts/…`）与历史证据行绿。

## 修复判据

- 上列 15 处旧根全部消失；`pnpm verify` / `pnpm test` 绿；
- 新扫描面对注入的 `scripts/__gone__.mjs` 红、对「退役」讨论行与 `vendor/dsh/scripts/…` 绿；
- `node scripts/smoke/gates.e2e.mjs --list` 的等价命令改为 `node checks/smoke/gates.e2e.mjs --list`
  后 exit 0。

## 修复关联

与 [BUG-211](BUG-211-doc-paths-prose-fence-retired-roots.md) / [BUG-210](BUG-210-call-surface-line-start-command-forms.md)
同批（文档路径面）；建议同一修法评审后一起落地。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/verify/gates/a-docs.mjs",
    "checks/verify/gates/f-repo.mjs",
    "_backlog/methods/validation-evidence.md",
    "_backlog/methods/class-level-guards.md",
    "_backlog/methods/bug-to-fix.md",
    "_backlog/triggers.md",
    "checks/lib/harness/gates-cases.mjs"
  ],
  "red": {
    "command": "node checks/smoke/gates.e2e.mjs --case=doc-paths-live-methods",
    "exit": 1,
    "output": "doc-paths 报了红但非本案例的报因（期望含 \"退役根名 `scripts/__gone__.mjs`\"）——注入未生效或断言被旁路"
  },
  "green": {
    "command": "node checks/smoke/gates.e2e.mjs --case=doc-paths-live-methods",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/gates.e2e.mjs"
  }
}
```
