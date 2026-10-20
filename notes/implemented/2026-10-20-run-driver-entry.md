# run 通道驱动入口：`run-driver up` 作为 agent 启动首动作

> 状态：implemented

## 决定

`node dev/run-driver.mjs up` = agent 发起/复用 run 通道的**单一首动作**：起（或复用）通道 →
用 `cdp-probe` 验浏览器面（含截图）→ 打印呈交块；verdict = exit 0 可呈交 / 1 红 / 2 未跑。
`bash dev/boot-run.sh` 保留为底层前台启动面（自检/组合/漂移门），由 run-driver 内部调用；
直接 `dsh --profile research` 仍禁止（绕过漂移门、静默用旧镜像）。

同次决定把"看见页面"纳入入口：`cdp-probe --screenshot` → `cdp-driver.screenshot`
（`Page.captureScreenshot`，fullPage）；run-driver 把 verdict JSON + `run-driver-status.png`
落 `runtime/smoke-workspace/`，呈交块打印截图与判定文件路径。agent 不再只拿一行 PASS/FAIL。

## 输掉的方案

- **README/操作指南继续以 boot-run 为首动作**：前台起、不验浏览器面、不打印呈交块——
  fresh agent 会直接交未验证 URL（2026-10-20 审计 P0-1 实测两处入口分裂）；且 boot-run
  会占住前台，不适合 agent 托管。
- **run-driver 直起 `dsh --profile research`**：绕过 boot-run 的组合检查与漂移门，静默用旧
  镜像；保留 boot-run 作为唯一底层启动面。
- **只打印 URL、不截图/不落 verdict**：失败时 agent 只有终端 scrollback；无法回看页面，
  也无法把"当时页面"交给下一位。截图 + JSON 是可见证据的最小集。

## 实际跑过的验证

- `tests/run-driver-contract.test.mjs`：入口在位、URL 抽取（最后一条横幅）、verdict 契约、
  boot-run 不绕过、四入口首动作一致；新增首动作断言先红（README 仍指 boot-run）后绿。
- `client-load-smoke`：用主绑定已交付会话 ALL PASS；失败/异常留 `runtime/smoke-workspace/client-load-*`
  四件套（page.png/page.html/console.txt/meta.json），异常注入时实测落盘且 `read_image` 可见页面。
- `cdp-driver.screenshot`：data URL 探针实测输出 900×457 PNG（`runtime/smoke-workspace/cdp-screenshot-probe.png`）。
- `e2e-021rc2`：0.2.1-rc.2 上 ALL PASS（角色 order 成组 / 状态与配置页签真数据 / 插件零故障）。
- `node dev/run-driver.mjs url` 无存活通道时 exit 0 + 提示先 `up`（预期）；真实通道 `up`
  未在本轮重跑（已有通道未起，起通道会占端口/造会话），如实记录为未跑项。
- `pnpm verify` + `pnpm test` 全绿（含 `docs-consistency` 与 `session-events` 新契约）。
