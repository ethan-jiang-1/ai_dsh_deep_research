# 2026-11-16 · 子进程管道输出统一 setEncoding('utf8')（多字节 chunk 边界假红）

> 状态：implemented

## 决定

- 所有消费子进程管道输出的入口统一先 `child.stdout.setEncoding('utf8')` / `stderr`，再累加字符串；累加式由 `String(chunk)` 改为直接拼 `chunk`。共 11 处：`scripts/smoke/{gates.e2e,cold-start.entry,data.entry,product-boot.entry,release.entry,profile-concurrency.entry,cdp-ask.entry,lifecycle.entry,install-shape.entry}.mjs`、`scripts/lib/shared/web-banner.mjs`、`dev/record-role-fixture.mjs`。
- 新增类级守卫 = `tests/checks/smoke-contract.test.mjs` 的「管道输出消费者必须 setEncoding('utf8')」一测：凡入口（`scripts/` 分组入口 + `probes/` + web-banner + record-role-fixture）出现 `.stdout.on('data'` 即要求同文件有 `.stdout.setEncoding('utf8')`。
- 机制（实证）：管道 chunk 按字节切分，边界落在多字节字符中间时 `String(chunk)` 产生 U+FFFD；随后用含中文的 `expect` / `includes` 判据即假红。`gates.e2e` 的 133 个案例里有 9 个 `expect` 含非 ASCII，正是历史 Linux 运行中随机失败的那一族。
- `tests/checks/boot-timer.test.mjs` 的假流补 `setEncoding` no-op（契约变了；行为判据仍看 timer 清理与监听摘除，未弱化）。

## 输掉的方案

- **只在 `gates.e2e` 修一处**：同一类缺陷在 10 个入口复述（冷启动/安装/发布/产品首屏都拿管道输出做中文断言），单点修 = 留同族隐患；改为「修全部 + 机械守卫」。
- **给 `expect` 做归一化（去 U+FFFD / 模糊匹配）**：那会把真实乱码与真实缺文本一起吞掉，等于把假红换成假绿（守卫哲学不允许）。
- **依赖 pipe 默认 utf8**：`String(buffer)` 确实默认 utf8，但**逐 chunk 解码**无法跨边界拼字符——必须让流本身用 `StringDecoder`（`setEncoding` 做的正是这件事）。

## 实际跑过的验证

- **机制实证（红）**：`node -e` 让子进程输出 65535 个 ASCII 字节 + 「必须给 liveness」→ 父进程 `out += String(chunk)` → `replacementChars=3`、`includes=false`；同一脚本改用 `setEncoding('utf8')` → `replacementChars=0`（Linux 容器与 macOS 同判）。
- **守卫红证**：临时删掉 `release.entry.mjs` 的 `setEncoding` → 守卫点名该文件红（`+ 'scripts/smoke/release.entry.mjs'`）；重放修复 → 绿。
- `pnpm test:checks` → **214/214 绿**；`node scripts/verify/verify.mjs` → 全绿。
- **未解决（如实）**：Linux 容器内 `gates.e2e` 的 9 个非 ASCII-expect 案例**在本次修复后仍失败**，且失败案例在多次运行间轮换；同一提交在 macOS 宿主 `--jobs=1` 全量 133 案例全绿。进一步观察：同一 fixture 连续两次 `verify` 的输出长度不同（10344 vs 11265），期望文本时有时无 → 复现环境（Docker Desktop + macOS bind mount virtiofs + root）**可能不忠实于 GitHub runner**（ext4 本地盘），根因未定。**因此本 Note 只声称「UTF-8 边界加固」，不声称「Linux CI 已绿」**。
