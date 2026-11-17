---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-210：call-surface 只认行首命令词——env 前缀 / `./` / sudo / `echo &&` 形态的断链静默放行

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行门禁触面；归一面修复，批 Note 待收口） — 结论：命令归一收口到 doc-surface（env 前缀 / ./ / 包装器 / && / require / heredoc / 缩进 / 折叠块）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[checks/verify/gates/f-repo.mjs](../../../checks/verify/gates/f-repo.mjs) 的 `call-surface`
> （`CMD` / `TOKEN` 两个正则 + `runLines`）；文档承诺 = [docs/evaluation.md](../../../docs/evaluation.md) §L0
> 「live 文档围栏命令 / 探针头注 / CI `run:` 里的仓内路径必须存在」。
> 探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N1。

## 症状

向 live 文档围栏注入 7 种「可直接执行」的断链形态，只有行首 `node …` 红，其余全部绿：

| 形态 | 注入（围栏内一行） | 期望 | 实际 |
|---|---|---|---|
| 对照 | `node checks/__nope__.mjs` | 红 | **红** |
| env 前缀 | `FOO=1 node checks/__nope__.mjs` | 红 | 绿 |
| `./` 入口 | `node ./checks/__nope__.mjs` | 红 | 绿 |
| 非命令词行首 | `echo x && node checks/__nope__.mjs` | 红 | 绿 |
| 包装器 | `sudo node checks/__nope__.mjs` | 红 | 绿 |
| 预载 + env | `NODE_OPTIONS=--require=checks/__nope__.cjs node checks/release/release-check.mjs` | 红 | 绿 |
| heredoc + `./` | `bash -s <<'EOF'` / `node ./checks/__nope__.mjs` / `EOF` | 红 | 绿 |
| 缩进块 + `./` | `    node ./checks/__nope__.mjs` | 红 | 绿 |

agent 照这些行敲会得到 `MODULE_NOT_FOUND`；门禁的绿不覆盖它们。原始输出与可重放脚本 =
`runtime/exploratory-20261117/n1-call-surface-matrix.{txt,sh}`（gitignored）。

## 分诊与授权

- 严重级：P2 — 门禁假绿；不阻断主路径，但搬家后的断链正是它承诺要抓的。
- 表面 / 边界：维护面门禁 / ② 行为（门禁自身，注入 + `--only=call-surface`）
- DSH 不变量：fail-loud —— 可执行行里的断链必须红
- 触及面：门禁与验收合同（改 `call-surface` 判据 + `gates.e2e` 案例）
- 授权：用户 2026-11-17 放行（门禁与验收合同触面 → 修复就绪 = P2 修复授权）
- 批：2026-11-17 命名空间搬家探索（N1）

## 复现

复现状态：稳定（脚本自复原；证据见 runtime）。

```sh
runtime/exploratory-20261117/n1-call-surface-matrix.sh
# control exit=1；其余 7 形态 exit=0（见 n1-call-surface-matrix.txt）
```

同一 `CMD` 还用在 CI `run:` 面；`run: FOO=1 node checks/__nope__.mjs` 与 `run: >-` 折叠块
（`runLines` 只认 `|` / `>`，`>-` 整块跳过）同样不在车道——修法需两个面一起收口。

## 根因（已证）

```js
const CMD = /^(?:\$ )?(?:node|bash|sh|source|pnpm|npx|cd)\b/;   // 行首锚定、只认裸命令词
const PATHS = '(?:packages|checks|tools|docs|tests|snapshots|probes|_dist|research-workspace|\\.agents)\\/...';
const TOKEN = new RegExp(`(?:^|[\\s"'\`(=\x60])(${PATHS})`, 'g'); // 路径必须以仓根前缀开头
```

- `CMD` 锚在行首：env 赋值、`sudo`/`time`/`echo … &&`、`$` 之外的前缀全部跳过；
- `TOKEN` 只认 `<根>/…`：`./checks/…` 的 `.` 不匹配根前缀；
- `runLines` 复用同一 `CMD`，且折叠块只认 `>` 不认 `>-`。

因此「能执行」被判成「不是命令」，断链被静默放行；`doc-paths` 也看不见围栏内非反引号形态。

## 牵出的失败类

- 同机制第 N 次：BUG-192/193（非 JS 字面量）、BUG-204（散文路径）、BUG-206（源码子串冒充执行）
  ——处置：类修（命令形态归一器，不逐字符串补丁）。
- M3 非 JS 字面量 / C7 假绿：判据的扫描面窄于「可执行」的语法面。

## 修法

在门禁侧做**命令归一**，而不是给每种前缀加正则分支：

1. 剥行首 env 赋值（`^(\s*[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+`）、可选 `sudo|time|env|command`；
2. 允许路径前缀 `./`（归一为无 `./` 再查）；
3. 对 `bash -c` / heredoc body 逐行递归同一判据；
4. `runLines` 支持 `>-` / `|+` 等折叠块；
5. `gates.e2e` 每个形态一条注入案例 + 负对照（合法 env 前缀 + 新路径应绿）。

## 修复判据

- 上表 7 个形态逐条红；对照与「合法 env 前缀 + 现存路径」绿；
- `run: FOO=1 node checks/__nope__.mjs` 与 `run: >-` 折叠块各红；
- `gates.e2e` 案例数同 diff 增补，`pnpm verify` / `pnpm test` 绿；
- 防空语料阈值不降（`md`/`probe`/`ci` 三条下限）。

## 修复关联

与 [BUG-209](BUG-209-asset-ledger-canonical-libs-stale-helper-names.md) 同批（2026-11-17 探索），
但不同机制；批 Note 待本批收口后写。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/doc-surface.mjs",
    "checks/verify/gates/f-repo.mjs",
    "checks/lib/harness/gates-cases.mjs",
    "tests/checks/doc-surface-shapes.test.mjs"
  ],
  "red": {
    "command": "node checks/smoke/gates.e2e.mjs --case=call-surface-env-prefix,call-surface-wrapper,call-surface-and-chain,call-surface-require-qualifier",
    "exit": 1,
    "output": "4 处失败：call-surface-env-prefix / -wrapper / -and-chain / -require-qualifier：注入回归未被点名报红"
  },
  "green": {
    "command": "node checks/smoke/gates.e2e.mjs --case=call-surface-env-prefix,call-surface-wrapper,call-surface-and-chain,call-surface-require-qualifier",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/gates.e2e.mjs"
  }
}
```
