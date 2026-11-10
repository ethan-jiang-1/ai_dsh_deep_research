# 七维卫生轮：让守卫在 CI 上真的咬人

> 状态：implemented
> 归档：2026-11-10

## 决定

- **终稿版本判据单一正源** = pack `src/lib/final-target.ts` 的 `finalVersionOf` / `readableVersionOf`；
  scripts 只经 `scripts/lib/final-version.mjs` 消费，不再自写 `vN` 正则（机械锁 =
  `tests/run/final-version.test.mjs` 的"scripts 内出现旧正则即红"）。
- **反引号仓内路径 = 合同**：新增门禁 `doc-paths`（live 文档；排除 notes/、_backlog/、
  tests/fixtures/、vendor/；仓根 / 文档所在目录 / `vendor/dsh/` 三处解析；三条带理由外链白名单）。
- **环境相关断言必须自带注入位**：`localDateStr(at, timeZone)` 的 `timeZone` 只服务测试，产品语义不变；
  `scrubbedEnv` / `withModelKey` 的 `env` 参数显式化（旧实现只读 `process.env`）。
- **文档事实以 D40 后的载体为准**：研究手册 = 包内 `content/manual.md` 经 `systemPrompt.context`
  注入每个角色，与会话 cwd 无关；工作区登记决定的是会话 cwd。

## 输掉的方案

- **只修文档、不加机械面**：同一形态（范本路径 / 手册载体）在两处 skill 与三处指南重复出现，
  纯人审修不干净；下一轮还会长出来。
- **把时区测试改成 `TZ=Asia/Shanghai` 环境**：CI 与贡献者机器的时区不可控，守卫仍会随机器失效；
  注入位让判据与宿主无关。
- **给 scripts 再造一份 `final-version.mjs` 正则常量**：那只是第 9 份实现；必须消费 pack 正本
  （`node-gate-contracts` 直引 pack `.ts` 已有先例，plain Node 22.19+ 可运行）。
- **`doc-paths` 扫描全部反引号 token**：会咬示例路径、外部语料与运行区名字；收窄到已知仓根 +
  三处解析 + 带理由白名单，防空语料下限（≥100 条）另判。

## 实际跑过的验证

- `pnpm verify`：51 门全绿（新增 `doc-paths`）；`--only=doc-paths` 注入
  `` `scripts/__missing-probe.mjs` `` → 点名红（file:line + 规则 + 修正入口），还原 → 绿。
- `pnpm test`：980/980 绿（新增 final-version 5 例、env 清洗 4 例；`local-date` 在
  `TZ=UTC` + UTC-slice 实现下红证 → 还原绿）。
- `node scripts/smoke/gates-smoke.mjs --case=doc-paths-dangling`：绿（带 expect 指名注入报因；
  fixture 不复制 submodule，基线非 PASS 是预期）。
- 集成（plain node 直跑真 bundle）：`node-gate` / `schema-scan` / `run-accept --no-write` /
  `run-dashboard` 全 exit 0。
- `pnpm typecheck`：绿。
