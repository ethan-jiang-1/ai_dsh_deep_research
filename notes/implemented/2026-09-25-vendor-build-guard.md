# RFC：vendor 构建产物自检（换 pin 后的第一道护栏）

> 状态：implemented

归宿：roadmap §队列「vendor 构建产物自检」（2026-09-25 马拉松条目 1，已毕业离队）。

## 决定

0.1.7 起启动依赖 vendor 构建产物，缺失时报错**隐晦**（实测两类：`typert-loader: N
contributors failed to register` / `client-modules: client bundle not found`、`client-hmr 缺
clientModules`）。决定做 **boot 面护栏**——fail-loud + 一行 remedy，而**不是** L0 门禁：
新 clone / CI 未构建时 verify 必须仍秒级绿，L0 依赖构建产物会把信号噪音化（升 pin 当天
RFC 讨论的拍板）。护栏 = 共享模块 `scripts/lib/vendor-artifacts.mjs`（两类代表产物 +
纯 fs 断言 + CLI 模式），接线**全部五个 boot 入口**：`dev/boot-run.sh` ⓪（`set -e` 早退）
+ preset-smoke / l4-lite / team-preflight / entry-chain-probe 四脚本真 boot 前
（exit 2 = 环境前置缺失，与"未 source env"同档）。

## 实施记录

- **代表产物两类**：`packages/goal/goal/lib/typert.host.js`（typert 面，24 贡献包之一）+
  `packages/client/ui-sidebar-right/lib/client.js`（client 面，右栏页签宿主——观察面依赖，
  一石二鸟）。换 pin 后上游包改名则随升 pin 重校更新这两处（模块注释已记）。
- **接线范围比 RFC 原定宽**：RFC 只列 boot-run + preset-smoke；实施时核实 l4-lite /
  team-preflight / entry-chain-probe 同样真 boot（都 spawn `bin.ts --port`）——同一共享
  模块每处三行，全接（scripts 纪律："一个只在单独运行时通过的脚本是脚本的缺陷"）。
- **测试**：`tests/vendor-artifacts.test.mjs` 五断言（ok 不误报 / 缺 client 红证形态 /
  typert 面 / vendor 整缺席边界不崩 / remedy 在场）+ 静态夹具两形态
  （`tests/fixtures/vendor-artifacts/{ok,missing-client}/`）；夹具放置遵 tests/AGENTS.md
  （构造样本住 fixtures/；初版运行时临时树方案废弃）。
- 顺手修 boot-run 头部陈旧示例注释（0.1.5-rc.2 → 0.1.7-rc.2）。

## 实际跑过的验证

| 层 | 结果 |
|---|---|
| CLI（`node scripts/lib/vendor-artifacts.mjs`） | 挪走 client bundle → **exit 1 + remedy** → 还原 → 绿 |
| boot-run ⓪ | 缺失 → **exit 1 早退，不碰在跑的 web**（主线 3081 进程全程存活） |
| preset-smoke 真挂载档 | 缺失 → **exit 2 + remedy**（boot 前，不 spawn） |
| keyless tests | 5/5 绿（含新 clone 边界形态：vendor 整缺席不崩、全量代表产物报缺） |
| 全链 | 24 门禁 + 28 tests 全绿 |

## 输掉的方案

- **verify.mjs 全量门禁**：否决——L0 门禁会开始依赖构建产物存在，新 clone / CI 上未构建
  时全红，信号噪音化；boot 面检在"真正需要产物"的时刻拦，报错即 remedy；
- **自动触发构建**（检测缺失即自己跑 vendor-build）：否决——构建耗时分钟级，静默长等
  不如一行指令明确告诉操作者；fail-loud 教义。

（毕业记录 2026-09-25：马拉松条目 1 收口——见上"实施记录/实际跑过的验证"；真人档无涉本条目。）
