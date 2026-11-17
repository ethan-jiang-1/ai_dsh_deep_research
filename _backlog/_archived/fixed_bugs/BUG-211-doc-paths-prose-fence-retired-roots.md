---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-211：doc-paths 的散文/围栏面不认退役根——`scripts/…` 写在散文、表格或路径清单里静默放行

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行门禁触面；围栏路径清单纳入，批 Note 待收口） — 结论：doc-paths 改为形态台账驱动（表格 / 围栏路径行 / HTML href / 退役根），每形态一条注入；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[checks/verify/gates/a-docs.mjs](../../../checks/verify/gates/a-docs.mjs) 的 `doc-paths`
> （反引号分支有退役根判据；散文 `prosePathTokens` 与围栏路径清单没有）。
> 文档承诺 = [docs/evaluation.md](../../../docs/evaluation.md) §L0「退役根名（`scripts/` `dev/` `probes/run/`）
> 残留引用必须点名报红」；探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N2。

## 症状

退役根写在**反引号 / 链接文字**里会红，写在**散文 / 表格 / 围栏路径清单 / HTML href** 里全绿：

| 形态 | 注入 | 期望 | 实际 |
|---|---|---|---|
| 对照（反引号） | `` `scripts/__gone__.mjs` `` | 红 | **红** |
| 散文（带扩展名） | `plain: scripts/__gone__.mjs here` | 红 | 绿 |
| 表格（裸 token） | `| scripts/__gone__.mjs | x |` | 红 | 绿 |
| 围栏路径清单 | ```` ```sh ```` / `scripts/__gone__.mjs` / ```` ``` ```` | 红 | 绿 |
| 围栏 `dev/` | 同上，`dev/__gone__.mjs` | 红 | 绿 |
| HTML href | `<a href="scripts/__gone__.mjs">x</a>` | 红 | 绿 |
| 对照（标签） | `[scripts/__gone__.mjs](#)` | 红 | **红** |
| 对照（裸目录名） | `` `scripts/` `` | 绿 | 绿 |

原始输出与可重放脚本 = `runtime/exploratory-20261117/n2-doc-paths-matrix.txt`（gitignored）。
`md-links` 只在链接目标不可解析时红；散文/围栏/表格里的路径不是链接，所以整链无守卫。

## 分诊与授权

- 严重级：P2 — 门禁假绿；搬家后 agent 会照散文/路径清单去找旧根。
- 表面 / 边界：维护面门禁 / ② 行为（门禁自身，注入 + `--only=doc-paths`）
- DSH 不变量：fail-loud
- 触及面：门禁与验收合同（改 `doc-paths` 判据 + `gates.e2e` 案例）
- 授权：用户 2026-11-17 放行（门禁与验收合同触面 → 修复就绪 = P2 修复授权）
- 批：2026-11-17 命名空间搬家探索（N2）；前序 = [BUG-204](BUG-204-live-doc-prose-stale-paths-ungated.md)（散文面首次落地）

## 复现

复现状态：稳定（脚本自复原）。

```sh
DOC=docs/project-map.md
printf '\nplain: scripts/__gone__.mjs here\n' >> "$DOC"
node checks/verify/verify.mjs --only=doc-paths   # PASS（应 FAIL）
git checkout -- "$DOC"
```

围栏形态同理：插入
````text
```sh
scripts/__gone__.mjs
```
````
后 `--only=doc-paths` 仍 PASS。

## 根因（已证）

- 反引号分支：`ROOTS` 显式含 `dev|scripts`，`RETIRED` 判据在此生效；
- 散文分支：`prosePathTokens` 的根集合只含现行根（`packages|checks|tools|…`），**退役根根本不被枚举**；
- 围栏：散文扫描先剥围栏（examples 不是事实声明），`doc-paths` 不回收；`call-surface` 只认命令词行，
  纯路径清单不是命令；
- 链接文字分支只处理 Markdown 标签，不处理 HTML href。

因此「残留引用必须点名报红」只对反引号/标签成立；其余可读形态静默逃检。

## 牵出的失败类

- 同机制第 2 次：BUG-204（散文路径面）之后只补了*现行根*的散文枚举，退役根没进同一枚举
  ——处置：类修（一个 token 枚举器 + 一个退役根判据，覆盖所有文本形态）。
- M3 非 JS 字面量 / C7 假绿：判据的扫描面窄于文档的「可读路径」面。

## 修法

1. `prosePathTokens` 的根集合加 `dev|scripts|probes/run`，并把 `RETIRED` 判据提到共用层；
2. 围栏策略（用户 2026-11-17 拍板：纳入）：围栏内「纯路径行」纳入 `doc-paths`（命令仍归
   `call-surface`），门禁注释写明两个门禁的分工，evaluation 措辞同步收口；
3. HTML `href` 加入同一 token 枚举；
4. `gates.e2e` 每个形态一条注入案例；负对照 = 裸目录名 + 讨论退役 + vendor/pack shorthand 保持绿。

## 修复判据

- 上表 4 个漏形态逐条红；对照 5 条保持绿；
- `gates.e2e` 案例同 diff 增补，`pnpm verify` / `pnpm test` 绿；
- 防空语料阈值不降；`doc-paths` 头注与 [docs/evaluation.md](../../../docs/evaluation.md) 的承诺措辞一致
  （不留「说全了、做窄了」）。

## 修复关联

与 [BUG-210](BUG-210-call-surface-line-start-command-forms.md) 同批（2026-11-17 探索），
两者是同一「文档路径面」的两个门禁，建议同一修法评审。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/doc-surface.mjs",
    "checks/verify/gates/a-docs.mjs",
    "checks/lib/harness/gates-cases.mjs",
    "docs/evaluation.md"
  ],
  "red": {
    "command": "node checks/smoke/gates.e2e.mjs --case=doc-paths-table-retired-root,doc-paths-fenced-path-line,doc-paths-html-href,doc-paths-live-methods",
    "exit": 1,
    "output": "4 处失败：doc-paths 报了红但非本案例的报因（期望含 \"退役根名 `scripts/__gone__.mjs`\"）"
  },
  "green": {
    "command": "node checks/smoke/gates.e2e.mjs --case=doc-paths-table-retired-root,doc-paths-fenced-path-line,doc-paths-html-href,doc-paths-live-methods",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/gates.e2e.mjs"
  }
}
```
