# 开源发布面：许可证、包边界、自包含种子与历史卫生

> 状态：implemented

> 来源：用户 2026-10-25 指令——这个插件最终要开源出去、用户会安装、其他人要继续开发；
> 要求“不惜一切代价把它做对”，并先扫描仓库里不该进 git 的内容。

## 决定

- **许可证 = MIT**（与 vendor DSH 的 MIT 对齐），版权行 = `Copyright (c) 2026 The ai_dsh_deep_research authors`。
  根目录与 pack 各一份 [LICENSE](../../LICENSE)；两处 `package.json` 补 `license` / `repository` /
  `homepage` / `bugs`。
- **分发形态 = npm 优先 + tarball 兜底**：包名 `dsh-deep-research-pack`（发布前 registry 404，可用）；
  pack `private: false`、`publishConfig.access: public`；[安装手册](../../_dist/安装手册.md) 同时给
  npm 与 tarball 两种形态。npm 发布动作归维护者账号执行，本 Note 不声称已发布。
- **pack 发布集只留运行所需**：`package.json` 的 `files` 排除 `lib/types/**/*.js` 与
  `lib/types/**/*.map`，保留 `lib/client.js`、`lib/client.js.map`、`lib/types/**/*.d.ts`。
  实测 179 → 72 files、1.7 MB → 1.1 MB unpacked、496 KB → 340 KB tarball；
  [export-dist](../../scripts/dist/export-dist.mjs) 的 inventory 增加“构建中间产物不得进包”断言。
- **随包文档自包含**：pack README 指向仓库 `docs/`、`notes/`、`_backlog/` 的相对链接改 GitHub
  绝对 URL；workspace `NODES.md` 与 lead skills 里的仓库内部脚本/笔记路径改“开发仓（不随包）”
  表述；preset 注释同步。模型可见文本变更按 [snapshots/README](../../snapshots/README.md) 重录
  四角色（`codeAnchor = 7eb5d25`、`vendor = 687f282e86`），并刷新 lead 渲染金标准。
- **开源门面**：根 README 增用户/贡献者/License 指针；新增 [CONTRIBUTING](../../CONTRIBUTING.md)、
  [SECURITY](../../SECURITY.md)、[.github/workflows/ci.yml](../../.github/workflows/ci.yml)（keyless
  verify + test）；[external-materials](../../docs/external-materials.md) 的作者本地路径去掉主机前缀；
  [alignment-ledger](../../docs/alignment-ledger.json) 的 `.github` 行与
  [discipline-map](../../docs/discipline-map.md) 治理行同步为“最小开源治理”。
- **历史保留、不做 filter-repo**：全历史只发现两处非敏感污染——0.1.0 tarball
  （12,422 B，`166d94e` 进 / `efcf56d` 出）与 `tests/.tmp-evidence-audit/`
  （6 files、2,089 B，`fdc1421` 进 / `c488959` 出）；全历史对象扫描未发现凭据、私钥或真实 key。
  改写会重写 611 个 commit、tag `0.0.1`、snapshot 的 `codeAnchor` 与 notes 里的 SHA 引用，
  收益仅 14.5 KB，且会抹掉“犯错 → 修复”的审计轨迹。故只做前向防复发：
  [.gitignore](../../.gitignore) 加 `.tmp*/`，`secrets-untracked` 扩 `.tmp*` / `_tmp` / pack `lib/`
  模式，并在 [gates-cases](../../scripts/lib/gates-cases.mjs) 加注入案例。

## 输掉的方案

- **私有 / 内部保留**：插件只服务本团队、不对外分发，可回避许可证与发布义务；用户 2026-10-25
  明确要开源给外部安装与继续开发，私有与目标冲突。MIT 与 vendor 同族，兼容性成本最低。
- **`git filter-repo` 改写现有历史**：能让公开历史一尘不染，但 611 个 commit 全部换 SHA，
  `snapshots/replay/research-face/snapshot.json` 的 `codeAnchor`、notes/backlog 的 commit 引用、
  事故记录本身都会悬空；GitHub 侧旧对象也不保证立即彻底清除。对 14.5 KB 非敏感数据，收益
  不抵证据链损失。
- **新开公开仓、干净根提交起步**：能保住私有历史且不 force-push；但会丢掉 611 个 commit 的
  公开演进记录。当前仓库本身已是公开可访问，故不采用；若未来要彻底重置公开面，这是比
  filter-repo 更干净的替代。
- **把 `docs/` / `notes/` / `tests/` 打进 npm 包来修链接**：会让用户安装包膨胀并把开发面塞给
  用户；改为 GitHub 绝对 URL + “开发仓（不随包）”标记。
- **删除所有 sourcemap**：`lib/client.js.map` 是安装后浏览器排障资产，保留；只删 `lib/types/`
  下的编译中间产物与 map（这些不是运行时文件）。
- **一次补齐完整 Issue/PR 治理（weighted approval / stacked PR / release lane）**：当前只落
  keyless CI 骨架；其余触发条件 = 出现外部贡献者分级审批需求、堆叠 PR 或自动化发布需求时。
- **保留 `/Users/...` 绝对路径作为可点击来源链接**：私有参考仓公开不可达，`md-links` 也会拦；
  改成代码文本 + 公开读者提示，保留 commit 身份供复核。

## 实际跑过的验证

- `pnpm verify`：全绿（44 条门禁，含 md-links / align-ledger / pack-workspace-fresh）。
- `pnpm test`：769 pass / 0 fail。
- `node scripts/dist/export-dist.mjs`：`npm pack` + inventory 全绿；72 entries、4 preset 行、
  9 skills、8 templates；产物约 340 KB。
- `source dev/env.sh && node scripts/smoke/release-smoke.mjs --install-only`：ALL PASS
  （pack → 干净 profile → plugin add → scaffold → preflight → 安装域 preset-smoke；端口释放验证）。
- `node scripts/smoke/gates-smoke.mjs`：81 个注入案例均被点名报红，对照组零注入全 PASS。
- 干净 worktree（无 node_modules）：`git worktree` + submodule + `pnpm install --frozen-lockfile`
  + `source dev/env.sh && pnpm verify && pnpm test` 全绿（769 pass）。这一步抓到并修掉了
  `tests/run/node-gate.test.mjs` 两个夹具的 mtime 断代依赖——fresh clone 的 mtime = checkout
  时间会让“契约前不计红”假红；现在显式注入契约日前一天。CI workflow 同时加
  `git -C vendor/dsh fetch --tags --force`，避免 submodule 克隆缺 tag 让 `pin-agreement` 假红。
- `node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --update-expected`：
  4 场景 A 回放通路 + B 组装请求 diff + lead C 渲染金标准 ALL PASS；金标准重写已人审
  （唯一变化 = lead 活动行随新录制文本 `搜了 1 次…抓了 1 个页面…`）。
- GitHub Actions run [40157534955](https://github.com/ethan-jiang-1/ai_dsh_deep_research/actions/runs/40157534955)：
  keyless job 1m6s 全绿（checkout + submodule tags → pnpm install → verify → test）。
- 历史审计：`git log --all --no-renames --diff-filter=A --name-only` + 垃圾路径过滤，
  结果 = 上述 7 个路径；`git rev-list --objects --all` 全对象密钥格式扫描仅命中测试假 key
  `sk-abcdefghijklmnop1234`。

未跑项：`npm publish` 未执行（需要维护者账号与 2FA）；`snapshot-replay-smoke` 为 keyless 回放，
不证明新录制的真实模型回复本身符合 persona。
