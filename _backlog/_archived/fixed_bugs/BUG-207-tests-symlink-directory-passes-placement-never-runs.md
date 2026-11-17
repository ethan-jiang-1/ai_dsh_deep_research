---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-207：tests/ 下的符号链接目录穿过所有位置门禁——node --test 又不跟它，等于一个永不运行的「测试目录」

> 严重级别：P2 ｜ 发现：2026-11-16 ｜ 状态：已修 — tests 下 symlink 条目（git mode 120000）红 + 盘上枚举红 + gates.e2e 案例（去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)，审查：agent — symlink 探针红 / 还原绿）（2026-11-16）
>
> 位置：[scripts/lib/repo/test-placement.mjs](../../../scripts/lib/repo/test-placement.mjs)（盘上 walk 与
> `git ls-files` 两路判据）、[tests/checks/pack-mirror.test.mjs](../../../tests/checks/pack-mirror.test.mjs)
> 的「落点全集」walk；类先例 = [BUG-176](BUG-176-smoke-symlink-invisible-to-registry.md)
> （smoke registry 的 symlink 不可见）。

## 症状

在 `tests/cockpit/misc` 放一个**指向仓库外目录的符号链接**（内含 `.spec.mjs`），把它加进 git 索引：

- `node scripts/verify/verify.mjs --only=test-placement` → **PASS**；
- `tests/checks/pack-mirror.test.mjs` → **8/8 绿**（新加的「落点全集」同样没看见）；
- `node --import tsx/esm --test 'tests/cockpit/**/zz-sym.spec.mjs'` → `1..0`、**零个测试被选中**。

即：一棵被 git 跟踪的「测试目录」通过了全部位置判据，但文件永远不会被执行；如果链接目标在仓外，
它还会把「测试」指向仓外路径。两个方向都静默。

## 分诊与授权

- 严重级：P2 — 无当前实例（本轮由探针构造），但它是 BUG-176 同一失败类在新位置门禁上的复发：
  枚举用 `Dirent.isDirectory()` 判类型，symlink 两边都不算。
- 表面 / 边界：研发面（门禁）/ ② 行为（目录分类）
- DSH 不变量：fail-loud（不可执行的「测试目录」必须红/显式豁免）
- 触及面：门禁与验收合同
- 授权：用户 2026-11-16 放行（「修复所有的bug」，预算充足）——原「等人拍板（门禁与验收合同触面）」解除
- 批：第十一轮探索（199–208）；类先例 = BUG-176

## 复现

复现状态：稳定（探针会临时加索引，脚本末尾复原）。

```sh
rm -rf /tmp/symprobe && mkdir -p /tmp/symprobe
printf "import { test } from 'node:test'\ntest('p', () => {})\n" > /tmp/symprobe/zz-sym.spec.mjs
ln -s /tmp/symprobe tests/cockpit/misc
git add tests/cockpit/misc
node scripts/verify/verify.mjs --only=test-placement        # PASS（没看见）
node --import tsx/esm --test tests/checks/pack-mirror.test.mjs  # 8/8（没看见）
node --import tsx/esm --test 'tests/cockpit/**/zz-sym.spec.mjs' # 1..0，零个测试被选中
rm tests/cockpit/misc && git rm --cached tests/cockpit/misc >/dev/null
```

## 根因（已证）

- `verify` 的 `test-placement` 用 `git ls-files tests`：符号链接本身作为一个路径条目出现
  （`tests/cockpit/misc`），不以 `.spec.mjs` 结尾 → `isTestFile` 判 false，直接跳过；
- `pack-mirror` 的盘上 walk 用 `readdirSync(..., { withFileTypes: true })` + `ent.isDirectory()`：
  symlink 的 `isDirectory()` 为 false（BUG-176 的同一形态），目录内容不可见；
- Node 的测试运行器不跟随该链接（`1..0`），所以不是「跑起来了」，而是**从不跑**。

根因证据：上面四条命令的输出 + `test-placement.mjs` 的 `isTestFile` + `pack-mirror` walk 的
`isDirectory()` 分支。

## 牵出的失败类

- **C2/C7 枚举面盲区**（symlink 在 Dirent 二分里不可见）+ 位置门禁的「全集」承诺被链接绕过。
- 同机制第 2 次（BUG-176 是第 1 次）；类修 = 所有测试目录枚举统一用 `lstat` 分类，
  symlink 目录要么显式跟（并红掉仓外目标），要么显式红，不许静默跳过。

## 修法

1. `pack-mirror` / `test-placement` 的盘上 walk 改用 `lstat` 分类：symlink → 红（「tests 下不得用
   符号链接目录」）或按 `realpath` 判仓内后跟随，二选一并写进 tests/AGENTS。
2. `verify` 的 `test-placement` 对 `git ls-files` 中 mode 120000 的条目做同样的拒绝。
3. 若确需 symlink（当前无），走显式登记表，不靠静默。

## 修复判据

- 上面探针在修后红并点名 `tests/cockpit/misc`（symlink 目录）与目标路径；
- 普通目录/文件布局零影响（现网全绿，负控）；
- `pnpm verify` + `pnpm test` 绿；`gates.e2e` 增一条 symlink 注入案例（先红后绿）。

## 修复关联

去向：implemented — [批 F Note](../../../notes/implemented/2026-11-16-guard-contract-hardening.md)。
修复已进树；本卡同变更归档。`test-placement` 门禁按 `git ls-files -s` 的 mode 120000 判红并
点名目标；`pack-mirror` 盘上枚举用 `isSymbolicLink()`（含目录链接）；gates.e2e 案例 =
`test-placement-symlink-dir`。

## 修复落地（2026-11-16）

```json fix-evidence
{
  "changes": [
    "scripts/verify/gates/f-repo.mjs",
    "tests/checks/pack-mirror.test.mjs",
    "scripts/lib/harness/gates-cases.mjs",
    "tests/checks/verify-gates.test.mjs",
    "docs/evaluation.md"
  ],
  "red": { "command": "node --import tsx/esm --test tests/checks/pack-mirror.test.mjs", "exit": 1, "output": "not ok 2 - tests 下零符号链接目录/文件（BUG-207）；tests 下不得有符号链接：tests/run/ops/linked" },
  "green": { "command": "node --import tsx/esm --test tests/checks/pack-mirror.test.mjs", "exit": 0 },
  "guard": { "path": "tests/checks/shared/pack-mirror.test.mjs" }
}
```
