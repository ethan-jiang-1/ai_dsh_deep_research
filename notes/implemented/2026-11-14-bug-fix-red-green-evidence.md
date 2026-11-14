> 状态：implemented

# 修复证据：红→绿 + 同暂存集

> 2026-11-14 ｜ 决定载体：bug 修复流程（`_backlog/AGENTS.md` 的修复证据条）

## 决定

- bug 卡翻 `修复落地` / `已修` 必须有 `## 修复落地`：`改动`（至少一个 `仓内路径`）、`红证`
  （命令 + 实跑失败片段：FAIL/RED/not ok/exit 1）、`绿证`（命令 + 实跑通过片段：PASS/ok/exit 0）。
  红证还须可重放（`node --test` / `pnpm verify` / `gates.e2e`）或 `改动` 含测试/门禁资产。
- 活跃 `修复落地` 由 `backlog-liveness` 查证据；归档到 `_archived/fixed_bugs/` 时，`改动` 声明的
  至少一个非 `_backlog/` 文件必须在同一暂存集；只翻状态、只移动卡 = 假修。归档同暂存集面 =
  `staged-change-pairing` ③（pre-commit；无暂存 = 无对象）。
- 活跃 `修复落地` + 新归档（`R`/`A`）触发；存量已归档卡不追补格式。规则正本 = `_backlog/AGENTS.md`
  的「已结/已修」守卫 + `_backlog/bugs/README.md` 的「缺陷通道」与卡片模板；入口说明 = 根 `AGENTS.md`
  一行、`docs/guides/60-dev-loop.md` 验收门；台账 = `docs/evaluation.md` 的 `backlog-liveness` 与
  `staged-change-pairing` 行。

## 判据形状

- **权威事实**：bug 卡 `## 修复落地` 的 `改动`/`红证`/`绿证` 文本 + pre-commit 的 `git diff --cached` 暂存集；没有第二份清单。
- **读取方**：`backlog-liveness`（活跃 `修复落地` 的证据）；`staged-change-pairing`（活跃 `修复落地` 与
  新归档 `R`/`A` 的同暂存集 + 证据）；`tests/checks/fix-evidence.test.mjs` 与
  `tests/checks/staged-change-pairing.test.mjs` 直测纯函数。
- **坏输入**：缺 `改动`/`红证`/`绿证` → 红；`改动` 无仓内路径 → 红；红证不可重放且无测试/门禁资产
  → 红；声明的非 `_backlog/` 文件不在同一暂存集 → 红（假修）；归档卡 status 非 `已修` → 红。
- **反证**：删掉活跃 `修复落地` 规则 → 1 例红；删掉 backlog 证据检查 → `gates.e2e` 案例红；
  删掉归档规则 ③ → 2 例红；还原 → 全绿。真暂存假卡探针 → `pnpm verify` FAIL。
- **旧形态**：存量已归档卡不追补；活跃 `修复落地` 与新归档（`R`/`A`）触发。

## 输掉的方案

- **只在 AGENTS 写散文**：2026-11-14 批修事故证明状态翻转可以绕过——卡改 `已修` 并移动，repo
  没有其它变更；没有机械面就没有完成定义。不选。
- **只在归档时查**：活跃 `修复落地` 可以先翻状态、不落证据，正好重演「先改状态」的事故面；现在
  活跃 `修复落地` 由 backlog-liveness 查证据，归档再由 staged-change-pairing 查同暂存集。不选「只在归档」。
- **以测试文件存在代替红证**：存在 ≠ 咬人（DSH testing policy：guard only guards if the
  regression fails it）；必须有失败输出与同判据的通过输出。不选。
- **commit hook 重跑所有红证命令**：命令任意、成本不可控（L2/真浏览器）；门禁只校验卡内证据形状
  与同暂存集变更，红证的真实性由「同判据测试/`gates.e2e` 案例」在修复时留下。不选。

## 实际跑过的验证

- `node --test tests/checks/fix-evidence.test.mjs` → **3/3 PASS**；
  `node --test tests/checks/staged-change-pairing.test.mjs` → **12/12 PASS**（新增：假修事故、
  活跃 修复落地、缺红/绿证、声明文件未暂存、目录前缀/文档变更、红证不可重放）。
- 红先：删活跃 `修复落地` 规则 → 1 例红；删 backlog 证据检查 → `gates.e2e` 注入案例不红；
  删归档规则 ③ → 2 例红；还原 → 全绿。
- 真暂存探针：`_archived/fixed_bugs/` 放一张 `已修` 卡（有改动/红/绿但代码未暂存）→ `pnpm verify`
  **FAIL `staged-change-pairing`**「改动没有任何文件在同一暂存集」；活跃 `修复落地` 假卡同判；
  清理后 `git status` 干净。
- `pnpm verify` 全绿；`pnpm test` spec **1347/1347** + checks **126/126**；`gates.e2e` **121 案例全绿**
  （含 `backlog-bug-fix-no-evidence` 注入 + 证据对照）。
