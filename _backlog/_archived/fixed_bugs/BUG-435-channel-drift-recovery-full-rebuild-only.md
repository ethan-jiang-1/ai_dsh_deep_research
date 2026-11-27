---
status: 已修
severity: P1
opened: 2026-11-26
---

# BUG-435：通道镜像漂移后的启动恢复只有整包重建一条路（≈2–3 min + 换 token）

> 状态：已修 — 恢复快路径已进树（`16ddd7c6`，`--sync-mirror` + 热载就绪判据），红绿证据与变异反证见 `## 修复落地`；
> 判据（≤10s、页面确为新代码、host 侧仍强制重建、README 类不触发重建）全部实跑（2026-11-26），2026-11-27 归档。

## 症状

2026-11-26 20:23 用户请求"启动一下这个插件"，20:28:56 才交出可用 URL——整条链路 ≈5 min，其中通道侧
≈3.6 min 卡在"漂移 → 重建"：

- 盘上通道活着（pid 9589 听 3083，supervisor 9431 自 2026-11-21T16:08Z 起持有 `channel-start.lock`），
  但 `node tools/channel/run-driver.mjs up` 判 **exit 2 NOT-RUN**：
  `/Users/bowhead/ai_dsh_deep_research/runtime/smoke-workspace/run-verdicts/2026-11-26T12-25-20-359Z-up/verdict.json`
  的 `channel-mirror` = `漂移 9 个文件`，全部是 pack 构建产物（`lib/client.js`、`lib/defaults.js`、
  `lib/fetch-fallback.js` …）——当天有未提交的驾驶舱改造，源更新而 profile 镜像停在 11-21。
- 恢复没有快路径：停 supervisor → `rm -rf runtime/harness-home/profiles/deep-research` → 冷重建
  `up`，20:28:56 才 GREEN（`…/2026-11-26T12-28-56-599Z-up/verdict.json`，四项浏览器面全绿）。
- 代价不只是时间：每次重建都换 token，旧 URL 立即作废、已打开的页面必须重开。
- 无数据损失：`research-workspace/` 下 17 个未归档 bundle 的 mtime 全部 ≤ 2026-11-21，重启不动 bundle。

用户当场判读：「你启动这么慢，显而易见是一个bug」——要求建档（不是当轮修）。

## 分诊与授权

- 严重级：P1 —— 不是阻断（能起，且 fail-loud 诚实），但**每次改 pack 文本 / 客户端源码后的启动都要付
  整包重建 + 换 token**，这是开发环主路径的固定税；冷重建口径 ≈2–3 min（guides/61 §0.1 已登记）。
- 表面 / 边界：startup（`tools/channel/boot-run-body.sh` 漂移门 + `tools/channel/run-driver.mjs`）/
  ② 行为（真入口 `up` 的退出码、耗时与恢复步骤）。
- DSH 不变量：fail-loud 已满足（漂移判 exit 2、显式 NOT-RUN，不冒充绿）。本条不是不变量违反，是
  **恢复能力缺失**：报错文本承诺了两条修法，盘上只有一条。
- 触及面：入口链（`tools/channel/` + guides/61 §0）→ 修法需要用户拍板，不自授权。
- 授权：等人拍板（用户 2026-11-26 明确"回头报一个 bug"= 建档指令）；同日用户直派"这 bug 要修一下，
  你看看怎么回事"= 修复授权，按 P1 直派范围落地，不再回到 `等人拍板`。
- 批：none。

## 复现

复现状态：稳定 — 真入口命令加一次源/镜像不一致。

边界：真入口（`run-driver.mjs up` 的 drift 分支），非单测。

```sh
# 1) 让 pack 源领先于 profile 镜像（改任一 packs 源后 rebuild lib，或直接拿当前工作区）
node tools/channel/run-driver.mjs up          # 修复前：exit 2，channel-mirror 红，列漂移文件
# 2) 恢复（修复后：client/文档漂移自动走快路径）
node tools/channel/run-driver.mjs up          # 纯 client/文档漂移 → 自动同步 + 热载就绪 → 验面
# 3) host 侧漂移仍需原处方
kill -TERM $(cat runtime/smoke-workspace/run-driver.pid)   # 请求 supervisor 停止（勿盲杀：BUG-007）
rm -rf runtime/harness-home/profiles/deep-research
node tools/channel/run-driver.mjs up          # 冷重建，≈2–3 min，新 token
```

盘上对照：同一个 `up` 在镜像一致时命中缓存/复用 ≈1–25s；差异全在"必须整包重建"这一步。

## 根因（假设 → 已证）

- **已证**：漂移门是**只读比对**（`boot-run-body.sh` 的 `drift_check`：`npm pack --dry-run` 发布集逐
  文件比 profile 镜像），它只报红、不带修；修只有"重建 profile"一条分支，"或逐文件 cp 同步"只出现在
  报错文本里，既无实现也无守卫（修复前 body 无任何 sync 分支；`boot-run.sh --sync-mirror` = unknown mode
  exit 2，e2e 首跑红证实）。
- **已证（推翻卡上"待证②"的悲观面）**：client 产物**可以**就地替换并被运行进程热载——vendor
  `client/hmr` node 半是无 dev 门控的常驻行（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml` 的
  `client-hmr`），每 500ms stat-poll 每个 graph 条目的 client 产物，stat 变即调
  `clientModules.rebuilt(id)` 读新 bytes 并以新 rev 重组 boot graph；浏览器半经 `/plugins/events` SSE
  收 `rebuilt` 帧。实测（隔离通道）：污染镜像 client.js → 1.2s 内 served bytes 随盘更新、rev 变化、
  web pid 与 token 不变。
- **已证（为什么必须分桶）**：host 运行时文件（`lib/defaults.js`、`lib/fetch-fallback.js`、`presets/`、
  `content/`、`cordis.patch.yml` 等）在 boot 时装载并缓存于进程，同步盘上文件不更新加载面——把 host
  漂移也同步 = 门禁绿而页面旧。
- **已证（成本拆解，卡上"待证①"）**：冷重建 63s（隔离实测，npm cache 已热）= 组合准备/安装 ≈38s +
  漂移门 ≈5s + web boot ≈3s + 真探针 ≈13s；卡上 ≈2–3 min 是冷 npm cache 叠加网络拉取的形态。
- **已证（token 面，卡上"待证③"）**：快路径完全不重启，故 token 天然不变——不需要为"复用 token"
  单独评估安全面（方案 C 作废：问题不在 token 生成策略）。
- 非运行时类：README/LICENSE 早已不判红（G-20）；`*.d.ts` 同类却被判红，一并移出判红集。

## 牵出的失败类

- 同机制第 1 次。类特征 = **门/报错文本承诺的恢复路径与盘上实现不一致**（文本给人两条路，只有一条存在）。
  横切排查点：`tools/channel/` 内其他"提示里的手段"（如漂移门的重构提示、锁恢复提示）是否同样只
  存在于文案——本轮只处理本条；其余提示未发现承诺未实现的动作。
- 附带抓到同族的一条：契约测试声称的边界（`channel-start.e2e` 的复制清单）漏掉 BUG-349 新增依赖，
  该 e2e 在本轮之前已因 `ERR_MODULE_NOT_FOUND` 红而无人察觉——已补 `sandbox-capability.mjs` /
  `port.mjs`，e2e 恢复可跑。

## 修法

- **A（选定）**：按产物类分桶的增量同步 + 热载就绪判据。
  - `checks/lib/channel/mirror-sync.mjs`：分类判据纯函数（client 身份取 `exports["./client"]`；未知
    文件默认 host，fail-safe）+ CLI 供 bash 消费；
  - `tools/channel/boot-run-body.sh`：抽出 `shipped_list`（漂移门与同步共用），新增 `sync_mirror`
    （temp + rename 原子替换、host 桶非空即拒绝并逐条点名、复验同一道门），`--sync-mirror` 模式在
    端口检查/安装/web 之前退出；`.d.ts` 进非运行时集；
  - `tools/channel/start-channel.mjs`：注册 `--sync-mirror`，与 `--drift-only` 同为免锁模式；
  - `tools/channel/run-driver.mjs`：复用分支遇漂移先 `--sync-mirror`，成功则复验门 + 轮询 boot graph
    的 rev 达期望值（`checks/lib/channel/run-channel.mjs` 的 `expectedArtifactRev` /
    `bootGraphFromHtml` / `artifactServedVerdict`）再验面；失败保持 NOT-RUN 并给原处方。
- 为什么不是 B（诚实降级）：修法证成后降级就是放弃主路径的税；文本已改为真实存在的两条路。
- 为什么不是 C（token 复用）：快路径不重启，token 问题消失；不引入安全面新决策。
- 持久决定与输掉的方案 = [Note](../../../notes/implemented/2026-11-26-channel-mirror-sync-fast-path.md)。

## 修复判据

- 报告例：造一次纯 client 漂移后 `node tools/channel/run-driver.mjs up` ≤10s（只同步不探针口径）
  且**同一通道同一 token**；页面 served 的 client 产物 rev = 同步后镜像 stat 的期望 rev（= 新代码）。
- host 侧改动（如 `lib/defaults.js`）仍 `exit 2` NOT-RUN，且拒绝时不改动 host 文件。
- 邻接变体：README/`.d.ts` 类非运行时漂移不判红、可被同步；分类器对未知文件默认 host（不放行）。
- 不降低漂移门诚实性：同步后仍跑同一道发布集比对；热载未达期望 rev 时判红，不拿旧页面给绿。

## 修复关联

- 去向：implemented — [2026-11-26-channel-mirror-sync-fast-path](../../../notes/implemented/2026-11-26-channel-mirror-sync-fast-path.md)。
- 文档同变更：`docs/guides/61-run-playbook.md`（§0 三分支 + §0.1 单跑模式）、`tools/README.md`、
  `checks/README.md`（lib 表两行）。
- 守卫：`tests/run/channel/mirror-sync.spec.mjs`（分类/fail-safe/CLI）、
  `tests/run/channel/run-driver-contract.spec.mjs`（rev 公式漂移锁 + 接线）、
  `checks/smoke/channel-start.e2e.mjs` 的 `mirror sync recovery` 案例（真进程）。

## 修复落地（2026-11-26）

```json fix-evidence
{
  "changes": [
    "checks/lib/channel/mirror-sync.mjs",
    "checks/lib/channel/run-channel.mjs",
    "tools/channel/boot-run-body.sh",
    "tools/channel/start-channel.mjs",
    "tools/channel/run-driver.mjs",
    "docs/guides/61-run-playbook.md",
    "tools/README.md",
    "checks/README.md",
    "tests/run/channel/mirror-sync.spec.mjs",
    "tests/run/channel/run-driver-contract.spec.mjs",
    "checks/smoke/channel-start.e2e.mjs"
  ],
  "red": {
    "command": "node checks/smoke/channel-start.e2e.mjs",
    "exit": 1,
    "output": "start-channel: unknown mode; use --prepare-profile, --drift-check or --drift-only — 2 !== 0（修复前 body 无 --sync-mirror 模式；新增的 mirror sync recovery 案例第一断言即红）"
  },
  "green": {
    "command": "node checks/smoke/channel-start.e2e.mjs",
    "exit": 0
  },
  "guard": { "path": "tests/run/channel/run-driver-contract.spec.mjs" }
}
```

- 变异反证（三轮实跑后还原）：分类器"未知文件 → doc"→ `mirror-sync.spec` 3 红；删 bash 的 host
  拒绝 `return 1` → `channel-start.e2e` 红；还原均转绿。
- 真入口计时（隔离 home/state/端口 3183，真进程与真浏览器探针）：造 client 漂移 → `up` 自动同步 →
  热载就绪 → GREEN **15.2s**（含真探针 ≈13s）；只同步不探针 **2.6s**；同 token、同 pid。对照：冷重建 63s。
- 拒绝路径真入口：改镜像 `lib/defaults.js` → `up` exit 2 NOT-RUN、逐条点名 host 漂移、host 文件未被改动。
- 活通道（3083）：`up` 自动同步 → GREEN，token 与重启前逐字相同、web pid 未变；以本变更后的
  `run-driver` 复验 GREEN（14.6s）。
- `pnpm verify` 全绿；`pnpm test` spec 1649 / checks 273 全绿。
