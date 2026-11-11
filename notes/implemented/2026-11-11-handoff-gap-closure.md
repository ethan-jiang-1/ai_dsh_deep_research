# 交接缺口收口：0.3.1 发布身份、源码取包入口与 dist 制品门禁

> 状态：implemented

## 决定

0.3.0 的 `_dist` tarball 是 2026-11-10 产物；HEAD 17e866d 在其后新增 `content/templates/run/protocol.json` 并改 lead/preset 文本。两者都叫 0.3.0，且没有 0.3.0 tag。下一个本地 tarball 定为 **0.3.1**：root/pack 同 diff 升版，`node scripts/dist/export-dist.mjs` 重导出 tarball、安装手册与 market；0.3.0 制品不重发。D42 的当前安装事实随之更新到 0.3.1，安装形态（本地 tarball / npm staged）不变。

根 README 增加“从源码交付”一行：`git clone --recurse-submodules` → `pnpm install` → `bash dev/vendor-build.sh`（pack 的 tsc 读 vendor 已构建的 `lib/types`）→ `node scripts/dist/export-dist.mjs`；在 `_dist/` 生成 tarball、手册与市场索引，手册正文仍由生成器注入。

新 L0 门禁 `dist-tarball`：制品在场时核对手册 sha256、制品内 `package.json` version、`dsh.bundle.patch` 每个目标与 `content/templates/run/` 源文件逐件在制品内；制品缺席（clean clone）→ note 而非静默。制品 gitignored，gates-smoke 副本无 tarball，故登记 `NO_CASE_GATES`，反证 = 一次性红录。

另修 `scripts/lib/vendor-artifacts.mjs` 的 CLI 入口判定：改用 realpath 归一（macOS `/tmp` → `/private/tmp` 下字面路径比较会让 CLI 块静默不执行，`bootstrap --check` 误报“vendor 构建产物在场”）；新增 symlink 回归。

## 输掉的方案

- **重导 0.3.0**：同一版本号下替换已存在的制品/手册 sha，违反本仓“发布后发现缺件发新 patch”的规则，且 0.3.0 手册已作为 tracked 生成物存在。
- **只打 0.3.0 tag、不改版本**：HEAD 文档已描述 protocol.json，而 0.3.0 制品没有它；tag 会把“旧制品”锚成“含新文档的版本”。
- **只加 README 一行、不加门禁**：手工核 sha 是一次性动作；下一条 bundle/content 改变仍可让制品与 HEAD 漂移而 verify 全绿。
- **门禁只在 CI/发布脚本里跑**：L0 是 pre-commit 必跑面；放进 export-dist 脚本只能保护“重导出”这一步，保护不了“忘了重导出”。

## 实际跑过的验证

- `node scripts/dist/export-dist.mjs` → 全绿：`pnpm build` exit 0；`npm pack` 出 `dsh-deep-research-pack-0.3.1.tgz`；inventory 163 条目、preset 行 5/5、skill 15、模板 11；手册版本 0.3.1 / 2026-11-11；market staged 0 installable。
- `node scripts/verify/verify.mjs --only=dist-tarball` 红证：把 `_dist/安装手册.md` 的 sha256 替换为 64 个 0 → `FAIL dist-tarball ... 手册 sha256 000… ≠ 制品 cc92…`；还原后 → `PASS dist-tarball`。
- `pnpm test` → 1,153 pass / 0 fail / 约 5s（含 `verify-gates` 对账：新增门禁在 `NO_CASE_GATES`，新增 vendor-artifacts symlink 回归）。
- `pnpm verify` → 全绿（含新 `dist-tarball`；`dist-manual-version` 0.3.1；`dist-manual-fresh` 正文与源一致）。
- `node scripts/smoke/lifecycle-smoke.mjs` → ALL PASS：market staged、tarball locale/icon、profile 初始化、装 tarball、dump 10 行、真启动 token URL、remove 后 roster 回 base + web-app。
- `node scripts/smoke/install-shape-smoke.mjs` → ALL PASS：profile init → add pack → add 团队层 → 真启动。
- `node scripts/smoke/product-boot-smoke.mjs` → GREEN：Orca 品牌 / Lead preset / 工作区标题 / 起步卡；session cwd = 工作区、preset = lead。
- `node scripts/smoke/doctor-smoke.mjs` → ALL PASS（含 engines 不匹配、半装、坏设置、不写 profile）。
- `source dev/env.sh && node scripts/smoke/l4-lite-smoke.mjs` → ALL PASS：五个角色（含 method-editor）assistant 响应 + scout `web_search` 真实工具调用。
- `node --import tsx/esm --test tests/run/vendor-artifacts.test.mjs` → 6 pass；symlink 入口调用 `node /tmp/va-cli-link.mjs /tmp/dsh-clean-0.3.1` → 红并打印 `vendor-build.sh` remedy（修前 `/tmp` 字面比较会静默 exit 0）。
- `pnpm typecheck` → exit 0。
- `node --import tsx/esm scripts/smoke/client-load-smoke.mjs --seed tests/fixtures/client-load-home --port 3109` → NOT-RUN 三次（主机健康门；最近 load 28.06 / free 455MB / 10 CPU：free < 512MB 且 load/cpu 2.81 > 1.5）；未跑 ≠ 通过。
- clean-clone 探针：`git worktree` + 本地 submodule init + `pnpm install --frozen-lockfile` → 成功（10.6s）；`bash dev/vendor-build.sh` 的 tsc host 遍在 load 20.26 / free 82MB 下 15 分钟无产物，主动停止并移除 worktree——完整 export-dist 复跑记 U。
- `node scripts/dist/release-check.mjs` → OK version=0.3.1（tag 0.3.1，annotated；未 push、未 npm publish）。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0；全局 DSH 0.2.1-rc.5。0.3.1 是本地 tarball：已打本地 annotated tag `0.3.1`，未 push、未 npm publish；发布锚由该 tag 持有。`_dist/` 只留 0.3.1 制品，0.3.0 tgz 由 `export-dist` 清理。`client-load-smoke` 三次均因主机健康门 NOT-RUN（exit 2），不是通过。clean-clone 探针完成到 `pnpm install`；vendor-build 在低内存/高负载下未完成（U），前置已写进 README 与 Note。
