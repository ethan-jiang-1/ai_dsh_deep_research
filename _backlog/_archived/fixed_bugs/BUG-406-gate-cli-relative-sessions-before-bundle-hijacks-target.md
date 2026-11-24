---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-406：node-gate.mjs 与 evidence-audit.mjs 在参数中先传相对路径 --sessions 时把会话目录当成 bundleDir 审计（甚至把 RED bundle 放行成 exit 0）

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：三壳共用 cliArgsOf：--sessions 的值不进 positional、缺值 exit 2；真 bundle 不再被会话目录顶替；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

调用 `checks/run-gates/node-gate.mjs` 或 `checks/run-gates/evidence-audit.mjs` 时，若把 `--sessions <相对路径>` 写在 `<run-bundle-dir>` 之前（例如 `node checks/run-gates/node-gate.mjs --sessions tmp/sess tmp/drt_red --no-write`）：
1. 脚本把 `<相对路径>` 本身当成了 `bundleArg`，**完全忽略**后面的真实 `<run-bundle-dir>`；
2. 即使真实 bundle 存在明确违例（例如 `node-gate` 门 R `RED`，正常退出 `1`），由于脚本实际去审了 `sess` 目录且全部门落成 `N/A`，最终以 **假 PASS（exit 0）** 退出；若带了 `--write`，更会把 `node-gate.md` / `audit.md` 错写进会话根目录里；
3. 此外若把 `--sessions` 写在末尾且漏了值，`resolve(argv[sessionsIdx + 1])` 会直接抛未捕获的 `TypeError`（exit 1），而不是 clean fail-loud 参数报错（exit 2）。

## 分诊与授权

- 严重级：P2 — CLI 位置参数解析把相对 `--sessions` 值误判成目标 bundle，可导致整条门禁对真红 bundle 静默返回 exit 0 假 PASS。
- 表面 / 边界：run-gate CLI 壳（[node-gate.mjs](../../../checks/run-gates/node-gate.mjs) × [evidence-audit.mjs](../../../checks/run-gates/evidence-audit.mjs)）/ ③ CLI 参数解析边界。
- DSH 不变量：Fail-loud / Exact CLI parsing — 选项参数绝不能漏进 positional `bundleArg`（同仓 `verdict-audit.mjs` 已用 `argv[i - 1] !== '--sessions'` 处理，本两件未跟进）。
- 触及面：none — 两份 gate CLI 壳 + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — 构造含 4 个重复标题（门 R 必红）的 `drt_red/final.md`；把 `--sessions` 放后边时返回 `exit=1`（`门R 标题重复 = RED`），放前边且传相对路径时却输出 `node-gate: sess` 并**假绿退出 `exit=0`**。

```sh
node --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
const tmp = mkdtempSync(join(tmpdir(), "bug406-"));
try {
  const sess = join(tmp, "sess");
  const bundle = join(tmp, "drt_red");
  mkdirSync(sess, { recursive: true });
  mkdirSync(bundle, { recursive: true });
  writeFileSync(join(bundle, "final.md"), "## Dup\na\n## Dup\nb\n## Dup\nc\n## Dup\nd\n", "utf8");
  const relSess = relative(process.cwd(), sess);
  const direct = spawnSync("node", ["checks/run-gates/node-gate.mjs", bundle, "--sessions", relSess, "--no-write"], { encoding: "utf8" });
  const hijacked = spawnSync("node", ["checks/run-gates/node-gate.mjs", "--sessions", relSess, bundle, "--no-write"], { encoding: "utf8" });
  console.log("direct.exit=", direct.status, direct.stdout.split("\n")[0]);
  console.log("hijacked.exit=", hijacked.status, hijacked.stdout.split("\n")[0]);
  assert.equal(hijacked.status, 1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
'
```

## 根因（已证）

[node-gate.mjs](../../../checks/run-gates/node-gate.mjs) 第 79–80 行与 [evidence-audit.mjs](../../../checks/run-gates/evidence-audit.mjs) 第 74–75 行同款实现：
```js
const sessionsRoot = sessionsIdx !== -1 ? resolve(argv[sessionsIdx + 1]) : join(repoHome, 'sessions')
const bundleArg = argv.find((a) => !a.startsWith('--') && a !== sessionsRoot)
```
1. `sessionsRoot` 是经 `resolve()` 绝对化后的路径，而 `argv.find(...)` 拿的是原始 `argv` 字符串比对；只要传入的 `--sessions` 是相对路径，两者永不相等，排在前面的 `--sessions` 值必定被 `argv.find(...)` 抢先当作 `bundleArg`；
2. 同仓后写的 `verdict-audit.mjs` 已按参数下标跳过 `argv[i - 1] !== '--sessions'`，而这两份先写的入口未同步修复，也未校验 `sessionsIdx !== -1` 时 `argv[sessionsIdx + 1]` 必须存在且非 `--` flag。

## 牵出的失败类

- 同机制第 2 次（CLI 壳各自手写 `--sessions` 参数解析；另见 `--sessions` 缺值崩溃、`--write` 污染错目录）｜处置：收口按索引排除值参数 + 缺值显式 exit 2（两壳同步修正，或抽出共享 CLI 参数 helper）。

## 修法方向

- 在 [node-gate.mjs](../../../checks/run-gates/node-gate.mjs) 与 [evidence-audit.mjs](../../../checks/run-gates/evidence-audit.mjs) 中先校验 `--sessions` 后必须跟非 `--` 的目录参数（否则 stderr 报错并 `process.exit(2)`），提取 positional 参数时按索引排除 `i === sessionsIdx + 1`（或统一抽出共享参数解析函数），且对多余 positional 或与 `--latest` 冲突给出明确 exit 2；
- 为两脚本的 `--sessions <relDir> <bundleDir>` 顺序与缺失值补齐校验用例。

## 修复判据

- 复现脚本中无论 `--sessions <relDir>` 在 `<bundle>` 之前还是之后，`node-gate.mjs` 均正确审计 `drt_red` 并返回 `exit=1`；`evidence-audit.mjs` 同理；
- `--sessions` 缺值时干净返回 `exit=2` 而非抛 `TypeError`；`pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 `cliArgsOf` 的值选项分支短路（或把三壳改回 `argv.find(...)`）→ --sessions 的相对路径值变成 bundleArg，门禁审错目录。

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/cli-entry.mjs",
    "checks/run-gates/node-gate.mjs",
    "checks/run-gates/evidence-audit.mjs",
    "checks/run-gates/verdict-audit.mjs",
    "tests/run/gates/gate-cli-args.spec.mjs",
    "checks/README.md"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-406 cliArgsOf：--sessions 的值不吃 positional' tests/run/gates/gate-cli-args.spec.mjs",
    "exit": 1,
    "output": "cliArgsOf positionals 断言失败：expected ['tmp/drt_red'] / actual ['tmp/sess', 'tmp/drt_red']（--sessions 的值漏进 positional）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-406 cliArgsOf：--sessions 的值不吃 positional' tests/run/gates/gate-cli-args.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/gate-cli-args.spec.mjs"
  }
}
```
