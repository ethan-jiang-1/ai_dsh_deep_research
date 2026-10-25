# FAQ 24 对齐决策：rc.2 开发基线 + rc.2/rc.3 已测安装面

> 状态：implemented

> 来源：用户 2026-10-26「按长期正确性推进 FAQ 24 对齐」；合同 = [guides/65](../../docs/guides/65-run-forms.md)；FAQ 24 = `deepseek-harness/_faq_on_digested/24_plugin-publish-and-agent-data-planes`（外部材料，不随仓）。

## 决定

- **开发基线继续 pin `dsh-v0.2.1-rc.2`，但插件声明并验证 rc.2/rc.3 两个安装面。** `engines.dsh` = `>=0.2.1-rc.2 <0.3.0`；`dsh.compatibility.dshReleases` = `0.2.1-rc.2` + `0.2.1-rc.3`，只作已测基线镜像，宿主权威仍是 `engines.dsh`。
- **不立即升 vendor pin 到 rc.3。** rc.3 的 vendor 干净构建在本仓双层安装下未通过：`packages/llm/llm-pi-ai/src/catalog.ts` TS1360（`supportsMidConvoEffort` 缺失）与 `apps/web/tests` 的 vitest 4.1.12/4.1.11 TS2345；强行升 pin 会把插件交付和 vendor 构建债混在一起。重议触发 = 根/vendor 双层安装合并为单层安装，或 rc.3 构建在同环境干净通过。
- **数据平面以 DSH 6+2 为正本**：定义 / 代码 / workspace / home / session / host state / cache / credentials；P/H/W 只作产品导航。`workspace/` 种子是只读部署资产，落地后归 W；`method-library.md` 是 workspace 用户数据；本包不声明 storage domain（N/A）。
- **分发渠道明确为 npm（发布后）/ tarball / 本地目录。** Git 安装需要自包含 `prepare`，本包未提供；market index 不在范围。二者不在本交付里假装支持。
- **`dsh.compatibility` 不作为权威**：它是已测基线镜像，preflight / release-smoke / gate 都以 `engines.dsh` 判定；移除该字段留到下一次元数据清理，不作为短期“兼容门”。

## 输掉的方案

- **立即升 vendor pin 到 rc.3**：能让 dev 基线与 FAQ 同步，但当前构建红在两层依赖解析（非本插件代码）；先修单层安装再升，避免把 pin bump 变成掩盖构建债。
- **精确 `0.2.1-rc.2`**：钉死用户安装，违背“尽量宽泛”；已由范围替代。
- **把 `dsh.compatibility` 当宿主字段**：DSH 不读它；保留只作人读基线。
- **补 Git `prepare` / market index**：扩大交付面但无对应测试与发布流程，暂不做。
- **把 P/H/W 当排他分区**：会漏 session/host state/cache/credentials 与 `~/.agents`；改用 6+2 正本。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` 785 pass / 0 fail（rc.2 vendor pin）。
- `release-smoke` ALL PASS；`cold-start-smoke` GREEN。
- rc.3 实测：全局 `dsh 0.2.1-rc.3` 在独立 home 安装 tarball、`--dump-config` 见本包行、`scaffold --install-only` preflight 通过、web 启动出横幅、`plugin remove` 后 profile 无插件痕迹。
- rc.3 vendor 构建尝试：`tsc host` 在 `llm-pi-ai` 类型与 apps/web vitest 双层版本处红；作为 defer 证据，不宣称 rc.3 开发基线可用。
- FAQ 对照：`engines.dsh` 范围、只读定义、数据不进包、干净安装/卸载、T0/T1/T3 主路径有资产；T5 六条、T6 可复跑矩阵、T8 供应链仍是后续（不冒充已证）。

## 补记：rc.3 构建阻塞的根因与处置

上节“rc.3 vendor 构建红”经复查不是 rc.3 独有：根 workspace 曾把 `@earendil-works/pi-ai` 解析到 1.3.0、vitest 解析到 4.1.12，而 vendor 树自锁 1.1.0 / 4.1.11；vendor 的 compat gate 与 apps/web 类型因此红。已在 `pnpm-workspace.yaml` 的 overrides 钉回 1.1.0 / 4.1.11；rc.2 干净 vendor 构建与 pack 构建已恢复。

因此本决定不是“rc.3 永远不升”：重议触发更新为「用对齐后的依赖重试 rc.3 构建成功 + 完成快照重录」；在此之前不把 vendor pin 混入插件交付。
