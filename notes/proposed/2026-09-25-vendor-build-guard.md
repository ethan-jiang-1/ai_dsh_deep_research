# RFC：vendor 构建产物自检（换 pin 后的第一道护栏）

> 状态：proposed

归宿：roadmap §队列「vendor 构建产物自检」（卫生，小）。

## 问题

0.1.7 起启动依赖 vendor 构建产物（`lib/typert.<face>.js` / client 面 `lib/client.js` /
逐包 `lib/types`），但产物缺失时报错**极其隐晦**——升 pin 当天实测两种：
`Plugin client-hmr — Missing services: clientModules`、`typert-loader: N contributors
failed to register`。下一个 agent（或未来的自己）换 pin 后若忘了跑
`bash dev/vendor-build.sh --clean`，会在启动深处撞一头雾水。

## 方案

`dev/boot-run.sh`（及 preset-smoke 真挂载档的 boot 前）加**前置自检**：抽一个代表包
（如 `packages/goal/goal/lib/typert.host.js` 与任一 client 包的 `lib/client.js`），
缺失即 fail-loud 一行 remedy：`vendor 构建产物缺失——先跑 bash dev/vendor-build.sh
--clean（升 pin 固定动作，见 guides/60 §3）`。可选：verify.mjs 加同款门禁
（`vendor-build-artifacts`，代价 = 门禁依赖构建状态，需斟酌是否只在 boot 面检——
**倾向只进 boot 面**，L0 门禁保持秒级、不依赖构建产物）。

## 输掉的方案

- **verify.mjs 全量门禁**：否决（倾向）——L0 门禁会开始依赖构建产物存在，新 clone /
  CI 上未构建时全红，信号噪音化；boot 面检在"真正需要产物"的时刻拦，报错即 remedy；
- **自动触发构建**（检测缺失即自己跑 vendor-build）：否决——构建耗时分钟级，静默长等
  不如一行指令明确告诉操作者；fail-loud 教义。

## 验收

- 手工删一个代表产物 → `bash dev/boot-run.sh` 在组合校验阶段即红且消息含 remedy（红证）；
- 产物在位 → boot 正常起（不引入误报）；红证记录进本 RFC 毕业时的验证节。
