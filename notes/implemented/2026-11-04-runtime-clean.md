# 运行区清理：dry-run + 白名单

> 状态：implemented

## 决定

`runtime/` 是 gitignored 运行态，没有索引义务，也没有自动 GC；2026-11-04 盘点 697M。
新增 [runtime-clean](../../scripts/run-ops/runtime-clean.mjs) 作为唯一清理入口：
**默认 dry-run**，只有 `--yes` 才删除；判据纯函数 = [runtime-clean-core](../../scripts/lib/runtime-clean-core.mjs)。

可删范围是收窄的白名单：

- 容器根 `smoke-workspace/<child>`；
- 独立实验根 `field-sim*`、`probe-*`、`explore-*`、`spike-*`、`research-tmp`、`ab-prompts`、
  `gate-out`、`audit`、`repair-backup`；
- 保留期默认 14 天，按**子树最新 mtime** 判定，防“目录旧但里面刚写了文件”；
- `harness-home`（会话/凭据）、`research-workspace` 的 `drt_*`/`archive`、`_dist`、`vendor`、
  `packages/*/lib`、runtime 根散件、未知名、点文件、symlink 与 `scenes` 永不候选。

`scenes` 不在工具范围：场景包是抓取当时的运行证据，需要清理时人工处理，不给工具加未验证分支。

## 输掉的方案

- **在 `runtime/README` 写一条 `find ... -mtime +14 -exec rm -rf` 配方**：一条命令就能误删活跃
  目录或 symlink 指向的仓外文件；清理工具必须有 dry-run 和逐条复核。
- **自动 GC / 定时删除**：与既有“run bundle 不做自动 GC、删除是用户显式动作”的决定冲突；
  运行产物清理也保留人工确认。
- **把 `scenes` 纳入工具**：场景包不是可再生缓存，删除会丢现场证据；工具不背这个未验证分支，
  需要时人工处理。
- **按目录自身 mtime 判保留期**：目录 mtime 在子项写入后不必然更新；会删掉“目录旧、内容新”
  的现场。改为子树最新 mtime。
- **跟随 symlink 统计/删除**：`field-sim*` 等实验目录含 symlink；跟随会把仓外目标卷进来，
  删除链接也有歧义。整项保留，交人工判断。

## 实际跑过的验证

- `tests/run/runtime-clean.spec.mjs`：4/4 绿（白名单/穿越/symlink/未知 mtime/子树过期/边界当天/
  空输入/非法参数）。
- 反证：把 standalone 白名单放宽成“任意顶层目录” → 两条用例红（`harness-home` / 未知根被当候选）；
  还原后绿。
- dry-run：白名单内 3 个过期条目（`ab-prompts` / `gate-out` / `probe-sessions-2026-10-18`，共 5.4MB）；
  `--yes` 实际删除 3 项，`runtime/` 697M → 691M；第二轮 dry-run 不再列出它们（幂等）。
- 7 天档人工复核后只删两个 smoke 残留（`boot-run-final.log` + `run-accept.e2e-52456`，0.8MB）；
  `repair-backup`（pre-repair bundle 备份）、`research-tmp`（现场截图/脚本）、`spike-embed`（spike 件）
  保留为证据，不因“过保留期”盲删。
- `pnpm test`：1037/1037；`pnpm verify` 绿；`runtime/README` 与
  [`_backlog/triggers.md`](../../_backlog/triggers.md) 的清理触发同 diff。
- **未跑**：`scenes` 的删除（工具明确不覆盖，人工处理）；无未验证 flag 留在壳里。

## 环境状态

- 新脚本 = `scripts/run-ops/runtime-clean.mjs`（keyless）；纯判据 = `scripts/lib/runtime-clean-core.mjs`；
- 触发条件 = `du -sh runtime` > 1GB，或 `smoke-workspace` 下目录 > 30，或磁盘压力持续；
- 既有 `run bundle` 保留期决定不变：只读 `run-inventory`，不自动 GC。
