# 2026-11-16 · CI 快慢分层：分钟级重冒烟移出 push 门禁

> 状态：implemented

## 决定

- **push 门禁 = verify + test 两件事**：`.github/workflows/ci.yml` 只剩 checkout/装依赖 + `pnpm verify` + `pnpm test`；coverage、vendor 源码契约、门禁自测（gates.e2e）、handoff、run-accept 与全部安装/浏览器/回放冒烟进 `nightly.yml`。实测 push 轮次 ~2 分钟（checkout + Node/pnpm + install ≈ 75s，verify 3s，test 35s）。
- **慢证据进 `nightly.yml`**（每日 02:17 + `workflow_dispatch`）：`deploy`（vendor 构建 / typecheck / preset / export-dist / lifecycle / doctor / tarball）+ `client-load`（真浏览器）+ `snapshot-replay`（回放 A/B），自带聚合器。失败不阻塞 push，但以独立工作流红呈现。
- **vendor 构建按 pin 缓存**：构建产物是 gitignored 的（fresh checkout 没有），但产物只由子模块 pin 决定——nightly 三个 job 都先 `git rev-parse HEAD:vendor/dsh` 取 pin，用 `actions/cache` 以 `vendor-<pin>` 为键缓存 `packages/*/*/lib`、`vendor/*/lib`、`apps/web/dist`；命中即跳过约 3.5 分钟的构建。
- **CI 执行面 = ci.yml ∪ nightly.yml**：契约测试（smoke-registry / ci-jobs / ci-workflow）按并集判定「某个 smoke 是否在 CI 执行」，既允许频率分层，又不许任何冒烟无声消失。
- 缺口登记在 [`_backlog/triggers.md`](../../_backlog/triggers.md)「Linux/GitHub runner 上的真浏览器/回放冒烟」行：现状与三种恢复条件（用户要求恢复 push 门禁 / 有人给出根因与可复现修法 / 需要覆盖时先补可读证据通道）。
- 依据：反馈环成本本身是判据的一部分（「问跑一次多久」）。20 分钟的重冒烟挡在每次 push 上，把 CI 从「守卫」变成「等待」；而它当前是红的、且日志要 admin 才能读——先分层，再在有证据时修。

## 输掉的方案

- **改跑 macOS runner**（同日先试）：`client-load` 在 macOS runner 上仍失败（3m22s，与 ubuntu 3m25s 同阶段）→ 不是平台差异；`snapshot` 在 macOS 上 18 分钟仍未出结果（被并发取消）。平台迁移既没修好，又让每次 push 更慢更贵。放弃。
- **继续在 push 路径上盲调**：单次反馈 10–25 分钟、失败详情需 admin 读日志，投入产出比不成立。放弃；改为有证据时再修。
- **`continue-on-error` / `if: false` 藏红**：那是把红藏起来；现在是把慢冒烟**移出快档**并显式登记为 dev-only，红的事实仍写在 trigger 与本 Note 里。
- **删掉这两条冒烟**：它们是装配面/回放面唯一证据，删了等于弃证据。保留资产、只移出门禁。

## 实际跑过的验证

- **红→绿（真实缺陷，已修）**：`keyless verify + tests` 长期红，根因 = `verify.mjs` 在 `process.exit(1)` 前未排空 stdout（POSIX 管道写异步）→ 失败详情被截断（实测同一棵树 75,522 B → 11,401 B），`gates.e2e` 的中文 expect 判据因此假红。修法 = `process.exitCode = 1` 自然退出，见 [verify 截断 Note](2026-11-16-verify-exit-truncation.md)。
- **CI 实测**：run `43832481285`（commit `34901185`）——`keyless verify + tests` **success**（含 Gate self-tests）、`keyless deploy smokes` **success**；run `43837186113` 的 keyless 亦 success。
- **重冒烟证据**：同提交本地 macOS `snapshot-replay.entry --read-only --layers a,b` → **ALL PASS**（5 场景 A/B）；`client-load.entry --seed` 断言面全 PASS（唯一失败是沙箱禁 `ps` 的收尾收割）。runner 上则红（client-load 3m2x 两次、snapshot 五回合 240s 超时）。
- `node scripts/verify/verify.mjs` → 全绿；`pnpm test` → 1365 + 214 全绿；`node dev/record-ci-oracle.mjs --check` → 35 fixtures / 0 mismatch。
- **未验证（如实）**：两条重冒烟在 GitHub runner 上的根因；恢复条件写在 trigger 行。
