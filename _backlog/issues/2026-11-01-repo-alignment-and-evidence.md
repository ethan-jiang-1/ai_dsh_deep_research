---
status: 推敲中
opened: 2026-11-01
---

# 推敲：仓库对齐与证据——dev 工具根解析、会话组、测试迁移与产品 smoke

> 立卡：2026-11-01 ｜ 状态：推敲中（用户 2026-11-01 授权静默自主执行） ｜ 类型：Task ｜ 结论倾向：现在做——对齐面已列，待父卡确认实施顺序 ｜ 可关闭：否
>
> 落地位置：**S1（C1 dev 根解析/projectKey）+ S2（C2 product-boot-smoke）+ S4（硬化）**；见[落地计划](../research/plugin-as-product/2026-11-01-landing-plan.md)。

**问题与期望结果：** 产品启动器让任意目录成为工作区后，仓库调试工具仍会断：`dev/boot-run.sh` 的 `DSH_RUN_WORKSPACE` 只 echo 不使用，`dev/run-kickoff.mjs:184` 与 `dev/hitl-answer.mjs` 写死 `research-workspace`，`scripts/lib/session-log.mjs:38-49` 用 `research-workspace` substring 找会话组。大量测试又把仓内 `research-workspace/` 当随包权威。期望：dev 工具能对任意工作区工作；测试以 pack 种子为随包权威；新增产品 smoke 证明装配 + 首启绑定 + 首屏可用；门禁台账同步。

**当前情况：**

- Pack 运行时已与根解耦；需要对齐的是 `dev/`、`scripts/run-ops`、`scripts/run-gates`、`scripts/verify` 与 `tests/`。
- `dev/boot-run.sh:26` 定义 `WORKSPACE`，`:238` 的 `dsh` 继承调用者 cwd；`:211,220` 的操作文本仍写"cwd 选 research-workspace/"。
- `dev/run-kickoff.mjs:34` 读 `DSH_RUN_WORKSPACE`，但 `:184` 记账写死 `join(ROOT,'research-workspace')`；`dev/hitl-answer.mjs:90,138,429,475` 四处写死。
- `scripts/lib/run-dashboard-core.mjs:20-29` 的 `SCENE_ROOTS`、`scripts/run-ops/watch-run.mjs:47`、`scripts/run-gates/{node-gate,schema-scan,evidence-audit}.mjs` 的 `--latest` 写死仓内工作区。
- `scripts/lib/session-log.mjs:38-49` 的 `findGroup(root,'research-workspace')` 是"工作区任意"的真正阻塞点；四个 run-ops 工具的 `--group` 默认也是这个字符串。
- 测试：`docs-consistency`、`run-bundle-charter`、`rerun-triage-contract`、`evaluation-contract`、`navigability-contract`、`presets.test`、`schema-scan.test`、`data-plane-invariants` 从 `ROOT/research-workspace` 读手册/模板；`hitl1-intake-samples` 读不在种子里的 `drafts/`；`run-driver-contract` 把 boot-run 钉成唯一合法启动。
- `_dist` 生成器 inventory 尚未要求 launcher/workspace-boot；`smoke-contract` 尚未登记产品 smoke。
- 打包 spike 已证 optional peers 可行（[复核](../research/plugin-as-product/2026-11-01-review-findings.md) §2），但真实 `-g` bin 与首启 Web 会话尚未跑。

**下一步：** 父卡拍板后按 §实施 分两批：先接口/测试骨架（与子卡 A 并行），再 dev 工具迁移与 smoke 收口。

## 范围

**做：**

1. **统一 dev 根解析**：新增 `scripts/lib/workspace-root.mjs`（或扩 `scripts/lib/env.mjs`）：`--workspace` 参数 → `DSH_RUN_WORKSPACE` → 仓内 `research-workspace/`；提供 `workspaceRoot()`、`bundleRoot()` 等纯函数。`dev/boot-run.sh` 真正 `cd "$WORKSPACE"` 并设置 `DEEP_RESEARCH_WORKSPACE`（如产品 Host 在同一 profile 里）；操作文本改成 `<workspace>`。
2. **修写死点**：`dev/run-kickoff.mjs:184`、`dev/hitl-answer.mjs`、`scripts/run-ops/*`、`scripts/run-gates/*` 改用解析器；保留缺省仓内路径作为 dev 默认。
3. **会话组解析**：`session-log` 实现 vendor 同形 `projectKey(cwd)`（`packages/session/session-persistence-jsonl/src/format.ts:207-245`：分隔符→`-`、非安全字符→`~XXXX`、去前导 `-`、`--<slug.slice(0,251)>--`）与 `projectGroupDir`；不再扫 header。`findGroup` 保留为 legacy；`web-ui-nav` 的候选列表不再把 `research-workspace` 当唯一组；四个 `--group` 默认值改为"projectKey 计算，找不到再 legacy"。
   - spike 实测：`/private/tmp/dsh-product-boot/ws` → `--private-tmp-dsh-product-boot-ws--`；单测用这个路径 + 空格/非 ASCII/长路径/连续分隔符。
4. **测试迁移**：手册/模板读取改 `packages/deep-research-pack/workspace/`（`pack-workspace-fresh` 已保证两份一致）；`hitl1-intake-samples` 移 `tests/fixtures/`；`replay-scene` 允许外部/绝对工作区；`run-driver-contract` 允许产品 launcher 存在，只保留"dev 通道不得绕过漂移门"。
5. **产品 smoke（两层）**：
   - launcher 逻辑单测用 fake `dsh`（无网络）：参数解析、profile 装配命令序列、半装读回、设置读写、工作区模式、`--home`、危险目录。
   - `scripts/smoke/product-smoke.mjs`（L2，真装）：干净临时 home/工作区 + 真 `dsh`/pnpm；装配 profile、铺种子、写设置、幂等、半装 fail-loud、包目录零写入。**缺前置（pnpm/registry/缓存）exit 2，不报绿。**
   - `scripts/smoke/product-boot-smoke.mjs`（真 Web + 浏览器，无模型）：认证、`workspace/list` 含工作区、`session/list` blank Session `header.cwd` = 工作区、**首屏断言**（产品品牌/工作区/起步指引/Lead preset/composer 可用）、saved-session 打开在别的工作区时有可见提示/切换。
   - 登记 `smoke-contract`、`docs/evaluation.md`、`scripts/verify/context.mjs`（如新增门禁）。
6. **项目模式/`.gitignore` 测试**：非空项目默认 `<project>/research`；`--in-place` 用项目根；已有 `.gitignore` 不被静默改写；建议规则可见/`--gitignore-append` 行为有测试。
7. **门禁/生成物**：`package-contract` 加 launcher/bin/**所有 peer optional**；`data-plane-invariants` 加启动器设置行；`export-dist` inventory 加 launcher/workspace-boot；`dist-manual-version`/`release-version` 随版本 bump 重跑。
8. **版本与重导出**：pack/root 0.1.3 → 至少 0.2.0；`release-check`；`node scripts/dist/export-dist.mjs`；`_dist` 手册与 tarball 一致。
9. **spike 记录**：把真实 `-g` bin 与 Host boot/Web 首屏 spike 的结果写进研究材料；失败则回父卡 Q4/方案取舍，不静默改结论。

**不做：**

- 不改 pack 运行时根解析（已经正确，别加第二套 resolver）。
- 不做 Web 内完整 onboarding（P1；首屏卡片归子卡 D）。
- 不重写历史归档/旧 run bundle 的绝对路径（按 epoch 豁免）。
- 不把 dev 工具搬进包内；它们仍是开发仓工具。
- 不在 smoke 里调用模型；真实研究质量仍归 L4。

## 方案与取舍

| 方案 | 选择 | 理由 |
|---|---|---|
| 根解析 | 单个 `scripts/lib/workspace-root.mjs` | 现在三种 idiom（路径默认/会话组/夹具）各写一套；收一处 |
| 会话组 | `projectKey(cwd)` 确定性编码，legacy substring 兜底 | 不依赖目录名；O(1)，不扫会话；旧场仍可读 |
| 测试权威 | pack 种子优先 | 随包权威；`pack-workspace-fresh` 已保证与仓内一致 |
| 产品 smoke | 独立脚本，不复用 release-smoke | release-smoke 绑 dev home/source；产品 smoke 要独立 home/工作区 |
| 启动器接口 | `--check`/`--dry-run` 先定 | 让 smoke 与 launcher 可并行开发 |
| smoke 档位 | launcher 单测 keyless；product-smoke L2 真装；boot-smoke 真 Web | 不把"需要网络/安装"的 smoke 报成 keyless 绿 |

## 验收标准

1. `DSH_RUN_WORKSPACE=/tmp/any-ws` 时，`dev/boot-run.sh` 的 `dsh` cwd = 该目录；`run-kickoff`、`hitl-answer`、`watch-run`、`node-gate --latest` 都读同一根。
2. 工作区名为任意 kebab/路径（非 `research-workspace`）时，`projectKey` 计算出的会话组存在；旧仓内组仍可读（legacy 用例）；`projectKey` 单测覆盖 spike 路径、空格、非 ASCII、长路径、连续分隔符。
3. launcher 单测（fake dsh）：参数/工作区模式/`--home`/设置/半装/危险目录/项目 `.gitignore` 行为全绿。
4. `product-smoke`（L2）：干净 home/工作区 → 装配 profile、铺种子、写设置、幂等、危险目录拒绝、半装 fail-loud、包目录零写入；缺前置 exit 2；有前置时 exit 0。
5. `product-boot-smoke`：起 Web、认证、`workspace/list` 含工作区、`session/list` 有 blank Session 且 `header.cwd` = 工作区；首屏品牌/工作区/起步指引/Lead preset/composer 可见；saved-session 在别的工作区时有可见提示/切换；端口回收；无 Documents 默认目录副作用。
6. 测试迁移：`pnpm test` 绿；手册/模板测试读 pack 种子；`hitl1-intake-samples` 不再依赖 `research-workspace/drafts/`；`run-driver-contract` 不再把 boot-run 钉成唯一启动。
7. `smoke-contract`/`evaluation`/`context.mjs` 台账同步；新增 smoke 有档位与凭据申报（keyless/L2）。
8. `package-contract` 钉住所有 peer optional；`export-dist` inventory 含 launcher/workspace-boot。
9. `pnpm verify` 绿；版本 bump 后 `_dist` 重导出、`dist-manual-version`/`release-version` 绿。
10. dev 工具的行为变化有反证/回归：至少一个"任意工作区"用例先红后绿；会话组 legacy 用例保留。
11. spike 结果记录在案；未通过项回父卡，不冒充已证。

## 依赖与风险

- 依赖子卡 A 的 launcher 接口（`--check`/`--workspace`/设置文件路径/`--home`）；产品 smoke 可按接口先写，实现后转绿。
- 依赖子卡 D 的首屏文案/slot；boot-smoke 的 UI 断言与 D 同步。
- 依赖子卡 B 的文档路径措辞；测试迁移可与文档并行。
- 风险：`projectKey` 是 vendor 内部编码（`session-persistence-jsonl/src/format.ts`），换 pin 可能变；用 spike 路径 + 多形态单测钉住，升 pin 时重校。`product-boot-smoke` 的 URL/token 解析可能脆，优先复用 `client-load-smoke` 的工具；saved-session 用例需要干净浏览器上下文。
- 本卡不授予实施授权；父卡拍板后开工。
