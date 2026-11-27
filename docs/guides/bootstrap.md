# 首次启动（Fresh-Clone Bootstrap）

> 层：指南（tutorial）。回答「刚 clone 完本仓，按什么顺序把 L0 回归、vendor 产物、开发通道与提交钩子全部跑通」。
> 日常开发闭环与按改动面选测试见 [dev-loop.md](./dev-loop.md)；启动研究 run 与排障见 [run-ops.md](./run-ops.md)。

## 1. 最小 L0 路径（keyless，无需 vendor 构建与 API Key）

```sh
git clone --recurse-submodules <repo-url>
# 若克隆时漏了子模块：
git submodule update --init vendor/dsh

pnpm install
source tools/env.sh
pnpm verify && pnpm test
```

- `pnpm install` 以 `link:vendor/dsh/...` 解析工作区依赖（受 `vendor-links` 门禁校验）。
- `source tools/env.sh` 幂等完成三件事：① 将 `DSH_HOME` 指向 `runtime/harness-home`（数据面隔离，不动日用 `~/.dsh`）；② 拦截裸 `dsh` 指向本仓 `vendor/dsh` 源码（代码面隔离）；③ 激活 `tools/hooks/pre-commit`（`hooks-active` 门禁校验）。
- **一键预检**：`bash tools/build/bootstrap.sh --check` 检查 Node/pnpm/git、submodule、依赖、vendor 与本包构建产物、`node-addon-require-builtin` 原生插件、env 与凭据状态；不带 `--check` 时幂等补齐缺件。

## 2. 构建 vendor 与插件包产物（L1 / L2 / `pnpm typecheck` / `pnpm dsh` / run 通道前置）

DSH 0.1.7+ 启动与双半类型检查依赖 vendor 构建产物（逐包 `lib/types`、`lib/typert.<face>.js`、`lib/client.js` 与前端壳），浏览器与打包冒烟另依赖本包 `packages/deep-research-pack/lib/`。fresh clone 首次跑 L1/L2/typecheck/run 通道，或每次换 `vendor/dsh` pin 后，执行：

```sh
bash tools/build/vendor-build.sh          # 首次构建 vendor（换 pin 后加 --clean 清旧产物）
pnpm build                                # 构建 packages/deep-research-pack/lib/（host + client + types）
pnpm typecheck && pnpm lint               # 验证 pack 双半 TS 类型与脚本 checkJs/oxlint
```

构建细节与换 pin 全流程由 [bumping-vendor-pin 技能](../../.agents/skills/bumping-vendor-pin/SKILL.md) 拥有。

## 3. 配置模型凭据与启动研究通道（按需）

L0 / L1（`preset.e2e`）/ L2（`release.entry`、`install-shape.entry`、`product-boot.entry`）均无需模型凭据；L4-lite 与真实研究 run 需要 `DEEPSEEK_API_KEY`（与 web 搜索共用同一把钥匙，[D9](../decisions.md#d9)）：

1. 在 `runtime/harness-home/.credentials.yaml` 配置 `DEEPSEEK_API_KEY`（gitignored，永不提交）。
2. 启动开发通道并验收浏览器面：

```sh
node tools/channel/run-driver.mjs up
```

该入口自 `source tools/env.sh`，自动完成环境自检、profile 组合检查/补装、漂移门与浏览器面探针验收，全绿后输出可打开的 Web URL（详规见 [run-ops.md](./run-ops.md)）。

## 4. 环境隔离与端口约定

| 项目 | 本仓约定 | 原因 |
|---|---|---|
| 开发 home | `runtime/harness-home/`（可用 `DSH_DEV_HOME` 覆盖） | 与日用 `~/.dsh` 彻底隔离崩溃半径 |
| 机制基线 CLI | `pnpm dsh` 或 `source tools/env.sh` 后的 `dsh` | 钉住 `vendor/dsh` 源码，全局 `which dsh` 不作依据 |
| 端口分配 | `3080` 开发 GUI · `3081` 让渡外部项目（勿占） · `3083` run 通道缺省 · `3084` 观察窗 | 防止本地并发撞口（冒烟端口由 `port-exclusive` 把守） |
| 提交门禁 | `tools/hooks/pre-commit`（`git diff --cached --check` + `pnpm verify` + `pnpm test`） | 红灯拦 commit；应急 `--no-verify` 须在 commit message 写明理由 |
