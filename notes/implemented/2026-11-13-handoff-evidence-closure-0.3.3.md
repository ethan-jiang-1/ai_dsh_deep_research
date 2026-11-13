# 交接证据收口：0.3.3 的 L1/L4/client-load、常驻面 byte/token 预算与源码移交

> 状态：implemented
> 历史注记：0.3.3 发布锚；现行发布身份 = [2026-11-13-manual-version-and-install-copies-0.3.4](2026-11-13-manual-version-and-install-copies-0.3.4.md)。

## 决定

0.3.2 的发布身份、L0/L2 与源码首跑路径已收口；剩下的承重证据是 L1 真挂载、L4-lite 真模型与 client 面真浏览器。0.3.3 把这四件事做成可复查的交付面：

- **L1**：`DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` → 5 角色 + 2 worker profile 全部真挂载，skills 隔离断言通过。
- **client-load**：正常健康门在本机 exit 2 NOT-RUN（load 20.36 / 10 CPU = 2.04 > 1.5，来自既有 dsh 进程）；按文档逃生口 `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 强制跑 → ALL PASS。正常门仍按环境判，不把强制跑写成常绿。
- **L4-lite**：`node scripts/smoke/l4-lite-smoke.mjs` → 五个角色 assistant 响应 + scout `web_search` 真实工具调用，ALL PASS。
- **常驻面预算**：在 char 之外补 byte 与 DSH fixed-density token 估计——2026-11-13 实测 persona 10,750 B / 1,444 tok，T0 16,991 B / 2,502 tok，合计 27,741 B / 3,946 tok；上限 11,500/29,000 B、1,550/4,150 tok。`estimateFixedDensity` 与 vendor `token-meter/estimate.ts` 同式（CHARS_PER_TOKEN=4 + BLOCK_OVERHEAD=4）；CJK 会低估，byte 是硬 payload，token 是比较口径。
- **源码移交**：现有 `scripts/dist/export-handoff.mjs` + `scripts/smoke/handoff-smoke.mjs` 就是可执行的移交卫生（只打包 HEAD tracked 源 + `HANDOFF.md`，排除 runtime/凭据/run 数据/依赖/.git/导出包）。CONTRIBUTING 记录入口；不再新增平行 check 脚本。版本升 **0.3.3**，tag 指向本变更 commit；0.3.2 制品不重发。

## 输掉的方案

- **停在 0.3.2**：HEAD 会再次领先 tag，发布身份回到“同名不同树”；证据变更也必须发新 patch。
- **新增 `scripts/dist/handoff-check.mjs`**：与既有 `export-handoff`/`handoff-smoke` 重复，且只检查目录、不产出可接收的移交包。发现既有机制后删除该草稿，改文档化现有入口。
- **只保留 char 上限**：CJK 下 byte/token 与字符数不等价；只测 char 会让“常驻面没长”与“payload 没长”混为一谈。
- **因健康门 NOT-RUN 跳过 client-load**：那会把 client 面留成 U；按既有逃生口强制跑并如实标注正常门未通过，才是分层证据。

## 实际跑过的验证

- `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` → `preset-smoke: ALL PASS（5 个角色 + 2 个 worker profile 全部真挂载绿）`。
- `node scripts/smoke/client-load-smoke.mjs --seed tests/fixtures/client-load-home --port 3109` → 正常门 `NOT-RUN — 主机不健康（load 20.36 / free 6732MB / 10 CPU）`；`DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 强制跑 → `client-load-smoke: ALL PASS（观察面 client 面真浏览器加载绿）`。
- `node scripts/smoke/l4-lite-smoke.mjs` → `l4-lite-smoke: ALL PASS（全角色（含 method-editor）assistant 响应 + scout web_search 工具调用）`。
- `node scripts/smoke/handoff-smoke.mjs` → ALL PASS：边界判据、export-handoff 退出 0、无运行态/凭据/run 数据/依赖/.git/导出包、HANDOFF 接收命令齐全。
- 常驻预算红证：byte 上限改 1 → `lead persona 10750 B > 预算 1 B`；token 上限改 1 → `lead persona 1444 tok > 预算 1 tok`；还原 → 8/8 绿。
- `node scripts/dist/export-dist.mjs` → 0.3.3 全绿：185 条目、5/5 preset 行、15 skill、11 模板；手册 0.3.3 / 2026-11-13。
- `pnpm verify` → 全绿；`pnpm test` → 1,406 pass / 0 fail / 0 skipped / 约 5.6s；`pnpm typecheck` → exit 0。
- L2 对 0.3.3 制品：`lifecycle-smoke` ALL PASS、`install-shape-smoke` ALL PASS、`product-boot-smoke` GREEN（Orca / Lead / 工作区 / 起步卡 / session cwd / preset）。
- `node scripts/dist/release-check.mjs` → 打 tag 前 OK `version=0.3.3`（HEAD 未打 tag）；打 tag 后结果见交付报告。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0；全局 DSH 0.2.1-rc.5。0.3.3 tarball 本地生成；annotated tag `0.3.3` 本地创建，未 push、未 npm publish。client-load 正常健康门仍为环境相关 NOT-RUN；强制跑已留证据。工作区 `git status` 的提交面 = 本变更文件集。
