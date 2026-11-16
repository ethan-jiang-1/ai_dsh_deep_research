# 2026-11-16 · CI 平台对齐：真浏览器/回放冒烟跑 macOS 基线（Linux 缺口入 trigger）

> 状态：implemented

## 决定

- `.github/workflows/ci.yml` 的 `client-load` 与 `snapshot-replay` 两个 job 改为 `runs-on: macos-latest`；同步修两处平台命令：chromium 安装去掉 `--with-deps`（apt 侧系统依赖安装，macOS 不适用）、zstd 安装改为 `command -v zstd >/dev/null 2>&1 || brew install zstd`。
- `keyless` 与 `deploy` 两个 job 留在 ubuntu（二者在 ubuntu 上真绿，且 `deploy` 覆盖安装/生命周期/doctor/tarball 的 keyless 面）。
- 依据 = 仓自己声明的平台合同（[`_backlog/triggers.md`](../../_backlog/triggers.md)「Windows 支持」行）：**「macOS 实测、Linux 只跑 keyless 部署 smoke」**。CI 此前把仅在 macOS 基线上验证过的两条重冒烟跑在 ubuntu，与其自身合同不一致，结果长期**常驻红**——按 DSH 纪律「门禁每次都红 = 已被无视」，它不再是守卫。
- 新增 trigger 行「Linux 上的真浏览器/回放冒烟」：登记现状（ubuntu 上红、根因未定）与三种恢复条件（用户要求 / 有人给出根因与修法 / macOS 预算不可用）。

## 输掉的方案

- **继续在 ubuntu 上调**：snapshot 表现是「五回合全 240s 超时」，client-load 是「断言红但日志需 admin 才可读」；docker 复现被证明不忠实（无 lsof 时 client-load 在预收割即 exit 2；容器缺系统库时浏览器起不来），本地无法稳定定位，改一次推一次的成本不可控。放弃盲调。
- **把两条 job 标 `continue-on-error` 或 `if: false`**：这是把红藏起来（禁 `skip 当绿` 纪律）。现在的做法不是跳过——**冒烟照常执行**，只是跑在合同声明的基线平台上。
- **把 Linux 缺口写成「已修」**：不。trigger 行明写「根因未定」，发布就绪栏仍把 Linux 列为未验证面。

## 实际跑过的验证

- **红（真实缺陷，已修）**：`keyless verify + tests` 长期红，根因 = `verify.mjs` 在 `process.exit(1)` 前未排空 stdout，POSIX 管道写异步 → 失败详情被截断（实测 75,522 B → 11,401 B），`gates.e2e` 的中文 expect 判据因此假红。修法见 [verify 截断 Note](2026-11-16-verify-exit-truncation.md)。
- **绿（CI 实测）**：run `43832481285`（commit `34901185`）——`keyless verify + tests` **success**（含 Gate self-tests）、`keyless deploy smokes` **success**。
- **红（CI 实测，本 Note 处理对象）**：同一 run 的 `client-load` 失败（3m25s）、`snapshot-replay` 失败（20m27s）。
- **绿（本地实测，同提交）**：macOS 上 `snapshot-replay.entry --read-only --layers a,b` → **ALL PASS**（5 场景 A/B）；`client-load.entry --seed` → 断言面全 PASS（唯一失败是宿主 sandbox 禁 `ps` 的收尾收割，非产品面）。
- `node dev/record-ci-oracle.mjs --check` → 35 fixtures / 0 mismatches（改 `runs-on` 与两步命令不破坏 CI 执行面 oracle）；`node scripts/verify/verify.mjs` → 全绿（`count-free` 曾抓到我注释里的写死计数，已删）；`pnpm test:checks` → 214/214。
- **未验证**：macOS runner 上的真实 CI 结果（本 Note 推送后由下一次 run 确认）；Linux 上这两条冒烟的可运行性（trigger 行持有）。
