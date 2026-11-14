---
topic: D-1 二十四张旧账的逐张守卫审计（S1 台账）
intent: 为 issue 2026-11-14-verification-oracle 的 S1 提供逐张机制/当前覆盖/判定/最小动作，并标记已沉淀与待补。
---

# D-1 旧账逐张审计（2026-11-14）

> 口径：普查 §D-1 的 24 张（2026-11-13）。路径省略 `tests/` 与 `scripts/`；判定 =
> keyless（永久 keyless 断言）/ smoke-only（只有真进程/浏览器档）/ none（无永久守卫）。
> 状态：✅ 已沉淀（本 issue 补的 keyless 守卫）/ ◐ keyless 已有 / ○ 待补。

| BUG | 要守的机制 | 当前覆盖 | 判定 | 状态 | 最小动作 / 备注 |
|---|---|---|---|---|---|
| 003 | 回边/描边直调 `hitl-fold.deriveAnchors`，禁手抄镜像 | `checks/client-load-same-source` | keyless | ✅ | 源扫 import + 调用 + 禁本地定义 |
| 009 | 文档不得把「重启自动终局化」写成既成机制 | `checks/docs-consistency` | keyless | ✅ | 61 与运行技能同判；已修回潮句 |
| 010 | 回归 import 闭包（含传递引入）零子进程 | `checks/layering:74,85` | keyless | ◐ | 无需新增；入守卫账 |
| 012 | 仪表盘复用 pack 的 HITL/步骤折算，不造第二状态机 | `run/run-dashboard:204,242,276` | keyless | ◐ | 无需新增 |
| 013 | fixture persona 必须等于当前 preset | `snapshot-replay` B1 | smoke-only | ○ | `run/replay-fixtures` 加 persona 段 digest 对账 |
| 018 | B 层声明面 ⊆ 实比对面（注入种类双向） | `run/replay-request:243,264,278` | keyless | ◐ | 无需新增 |
| 022 | 畸形终结回合可数（一回合一次，不双算）+ 死亡可判 | `run/provider-errors:21-57`、`run/stream-failure:14` | keyless | ◐ | 恢复支仍仅 smoke（cdp-ask）；记残余 |
| 024 | LLM 流必走一次性连接，隔离在场可证 | 无（boot-run 自检不入测试） | none | ○ | `run/run-driver-contract` 加 isolationPreloadOf(log) |
| 026 | 长库/长 review 不得被固定行窗静默截断 | `cockpit/workspace-files:25,79`、`run/run-context:150` | keyless | ◐ | 读层守卫是唯一覆盖（12 形态浏览器相位已退役） |
| 027 | 捕获前等夹具 tool/call 全挂（数据面 ≠ 稳定窗） | smoke C0b（`snapshot-replay.entry:407`） | smoke-only | ○ | 提 `captureReadyOf` 入 `replay-request` + 三例 |
| 028 | 隔离回退可数且不静默 | 无 | none | ○ | 新 `checks/isolation-guard`（createRequire 预载） |
| 030 | 落定 = 哨兵只在 assistant 文本 + turn/end completed | `run/replay-request:306-324` | keyless | ◐ | 无需新增 |
| 033 | 摘要读点须等 🎯 水合完成再判 | `smoke/client-load.entry:726`（brief-fold 只钉文案态） | smoke-only | ○ | `cockpit/brief-fold` 补交付三行逐字断言 |
| 034 | 按 id 显式开会话，不赖默认视图 | `checks/client-load-same-source` | keyless | ✅ | 源扫 `openSessionById` + 禁私有定位器 |
| 036 | 旧轮附录不夺权 + review 读到 eof | `run/review-readiness:45,61`、`run/run-context:150` | keyless | ◐ | 无需新增 |
| 045 | 读失败态 ≠ 未绑定态，冒烟等显式状态 | `smoke/client-load:1063` | smoke-only | ○ | `cockpit/graph-model` 加 state-note 两例 |
| 051 | smoke 顶层标识符必须声明（node --check 抓不到） | 无 | none | ○ | 新 `checks/smoke-identifiers`（ts.createProgram，TS2304） |
| 059 | 文案定位器须声明 locale 归属 | smoke 双语定位器 | smoke-only | ○ | 源扫：中文单字面量 getByRole 必须 alternation |
| 061 | 钉 locale 后 chrome 定位器同语言 | 同 059 | smoke-only | ○ | 同上：SMOKE_LOCALE → chrome 正则表每项双语 |
| 063 | chrome 常量双语 + 失配不静默 | `run/web-ui-nav:77-88`、`cockpit/library-fold:364` | keyless | ◐ | 无需新增 |
| 079 | 每个 smoke 入口 import 可解析（死链即红） | `checks/smoke-imports` | keyless | ✅ | 静态相对 import 逐条 existsSync |
| 080 | 回放基线 source 与当前 profile/pin 同代 | `run/replay-fixtures`（仅 MCP/检索面） | smoke-only | ○ | 同 013：codeAnchor=HEAD、vendor=pin、profile 含 team 行 |
| 095 | bootWeb 成功/失败/早退都清 banner timer | 无 | none | ○ | 抽 `lib/boot-timer` + 断言无 Timeout |
| 136 | 端口被占须退避，退出必收进程组 | 无（仅 BUG-104 身份） | none | ○ | 抽 `port-reclaim-policy` 三态 + finally 登记 |

## 统计（2026-11-14）

- ✅ 已沉淀 4：003、009、034、079（本 issue 批 1）。
- ◐ keyless 已有 8：010、012、018、022、026、030、036、063（入守卫账，无需新增）。
- ○ 待补 12：smoke-only 7（013、027、033、045、059、061、080）+ none 5（024、028、051、095、136）。
- 审计结论：**无一张确实不可 keyless**；024/028 是 CJS 预载，可 `createRequire` 直测。

## 两条优先项

1. **009 回潮已修**：`guides/61:251` 的「被通道重启终局化」与卡内实测（重启前后日志一字节不变）相抵；
   已改为「不会终局化」，并由 `checks/docs-consistency` 钉住 61 与运行技能同判。
2. **034 守卫对象已变**：原自测例库 12 形态相位已退役（`client-load.entry:1313`），
   现行守卫 = general by-id 导航（`web-ui-nav.openSessionById`）；源扫已钉。
