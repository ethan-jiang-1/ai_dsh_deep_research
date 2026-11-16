---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-203：gates.e2e 的 flag 形状——`--case=` 空值静默跑全量，`--case X` / `--jobs 8` 裸形态被忽略

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — flag 两形状同判 + 空值/未知参数/位置参数 exit 2（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — 旧解析红 / 新解析绿 + CLI 实跑）（2026-11-16）
>
> 位置：[scripts/smoke/gates.e2e.mjs](../../../scripts/smoke/gates.e2e.mjs) 的 `caseArgs`/`caseNames`
> 解析（第 34–37 行）与 [gates-cli.mjs](../../../scripts/lib/harness/gates-cli.mjs) 的 `parseJobsArg`。

## 症状

`--case=`（空值）没有被当成非法输入，而是静默退化为「没有过滤器」——跑全量 130 个案例：

```sh
node scripts/smoke/gates.e2e.mjs --case= --jobs=2
# gates.e2e: 全绿（对照组零注入全 PASS + 130 个注入案例均被点名报红）
```

如果调用方用变量拼 `--case=${VAR}` 而 VAR 为空，会得到一次 90 秒的全量跑 +「全绿」，
极易被读成「我指定的那个案例绿了」。

同族的裸形态也被静默忽略：

- `--case md-links-redirect-stale`（空格分隔）→ `caseArgs` 只认 `--case=` 前缀，等于没传 → 全量；
- `--jobs 8`（空格分隔）→ `parseJobsArg` 只认 `--jobs=` 前缀 → fallback 默认并发。

## 分诊与授权

- 严重级：P2 — 诊断车道输入语义，不影响 `pnpm test`/`pnpm verify`；但它是「改门禁必跑」的自测台，
  空/裸 flag 的静默回退与 BUG-195 的 `--jobs=abc` 是同一类（假绿/误读）。
- 表面 / 边界：研发面（门禁自测）/ ② 行为（CLI 解析）
- DSH 不变量：fail-loud
- 触及面：门禁与验收合同（自测台输入契约）
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十一轮探索（199–208）；前序 = [BUG-195](BUG-195-gates-e2e-adhoc-jobs-value-fake-failures.md)

## 复现

复现状态：稳定。

```sh
node scripts/smoke/gates.e2e.mjs --case= --jobs=2 ; echo $?
# → 全量 130 案例全绿（约 90s），exit 0；本应 exit 2 点名「--case 需要非空 id」
node --input-type=module -e '
import { parseJobsArg } from "./scripts/lib/harness/gates-cli.mjs";
console.log(parseJobsArg(["--jobs","8"], 4));   // → 4（裸形态静默回退）
console.log(parseJobsArg(["--jobs="], 4));     // → throw（=形态有校验，裸形态没有）
'
```

## 根因（已证）

- `caseNames = caseArgs.flatMap(...).map(trim).filter(Boolean)`：空串被 `filter(Boolean)` 丢掉，
  `caseFilter = names.length === 0 ? null : new Set(...)` → `null` = 不过滤。
- 裸 flag 不进 `caseArgs`（前缀 `--case=`）也不进 `parseJobsArg`（前缀 `--jobs=`），没有任何
  「未知/未消费参数」检查兜底。

根因证据：上面两条命令 + 三行解析源码。

## 牵出的失败类

- **C4 边界/解析** + **C7 假绿/误读**；同机制第 2 次（BUG-195 是第 1 次）。
- 类修 = flag 解析统一成「`--name=value` 与 `--name value` 两种形状都认，空值/未知参数 exit 2」。

## 修法

1. `--case`：解析两种形状；值为空或未给出 → `exit 2` 并点名；未知 `--xxx` 参数一律 `exit 2`
   （白名单：`--case`、`--jobs`、`--help`）。
2. `--jobs`：支持空格形态（与 `=` 同判）；空值/非法 → exit 2（现有 `=` 形态逻辑复用）。
3. 在 `gates-cli.spec.mjs` 增裸形态/空值用例。

## 修复判据

- `--case=`、`--case`（无值）、`--case  `（空参数）、未知 flag → exit 2 且消息点名；
- `--case=id`、`--case id` 同判（只跑该案例）；`--jobs=2`、`--jobs 2` 同判；
- 无参数全量跑仍绿（负控）；
- `pnpm verify` + `pnpm test` 绿。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。裸形态实跑 = `--case test-placement-unknown-depth --jobs 2` 绿；
空值/未知参数 exit 2。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/lib/harness/gates-cli.mjs",
    "scripts/smoke/gates.e2e.mjs",
    "tests/run/harness/gates-cli.spec.mjs",
    "scripts/README.md"
  ],
  "red": { "command": "node --import tsx/esm --test tests/run/harness/gates-cli.spec.mjs", "exit": 1, "output": "not ok 3 - parseE2eArgs：--case/--jobs 两种形状同判，空值/缺值/未知参数/位置参数 fail-loud（BUG-203）" },
  "green": { "command": "node --import tsx/esm --test tests/run/harness/gates-cli.spec.mjs", "exit": 0 },
  "guard": { "path": "tests/run/harness/gates-cli.spec.mjs" }
}
```
