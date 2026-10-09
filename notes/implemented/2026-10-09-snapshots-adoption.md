# snapshots 场景证据层落地：research-face 整组迁入 + 组装请求比对面补齐

> 状态：implemented

出处 = 推敲卡 [2026-10-09-snapshots-adoption](../../_backlog/_archive/settled_issues/2026-10-09-snapshots-adoption.md)（§推荐候选 + §关闭条件）
与来源分析 [_backlog/research/2026-10-09-company-snapshots-analysis.md](../../_backlog/_archive/research/2026-10-09-company-snapshots-analysis.md)。
缺陷判决与实测 = [BUG-018](../../_backlog/_archive/fixed_bugs/BUG-018-snapshot-replay-advertised-coverage.md) +
[recorded-session 义务标定](2026-10-08-recorded-session-obligation.md)。
部分取代 [keyless-snapshot-lane](2026-09-24-keyless-snapshot-lane.md)（该篇仍拥有回放通道选型；本文取代其
"声明住 `snapshot.yml`、`tests/fixtures/` 落点"的部分）。

## 决定

**建立仓根 `snapshots/` 场景证据层，并把四角色组装面回放整组迁入 `snapshots/replay/research-face/`**
（分类、保存边界与证据边界正本 = [snapshots/README.md](../../snapshots/README.md)）。

- **场景声明实际驱动回放**：`snapshot.json` 是声明正本，由 [replay-scene](../../scripts/lib/replay-scene.mjs)
  读取校验后交给 [snapshot-replay-smoke](../../scripts/smoke/snapshot-replay-smoke.mjs)。case 集必须与盘上
  `presets/` 精确一致；缺字段、串角色、缺件、路径越界、symlink、重复 fixture 都在加载期 fail-loud。
  旧场景声明 `snapshot.yml` 退役（同一事实不留两份），其 `retired-tools` 钉法与 `sessionFormat` 版本语义
  并入 manifest 字段与 snapshots/README。
- **组装请求比对面补齐**（修 BUG-018 的"声明的覆盖 > 实际的覆盖"）：B 层由单点 `systemTextOf` 改为
  [replay-request](../../scripts/lib/replay-request.mjs) 的逐条判据——persona、**全部** `request/header`
  （provider/model + 完整工具 schema，数组顺序保留）、三处 `user/message` 注入（工作区指令全文 / skill 目录 /
  运行时上下文）；每条独立报告、独立可红。
- **定向归一化只覆盖源机制确实挥发的三处身份**：persona 里 boot 注入的 GUI 回环端口与 harness checkout 路径、
  runtime sandbox 固定句内嵌的 workspaceRoot。其余 SHA、URL、路径、日期与全部正文原样比较；来源
  `metadata`/`id`/`digest` 与事件时间不进正文比较。
- **覆盖面自守（两个方向都响）**：`unjudgedInjectionKinds` 断言基线（人审过的录制）里**没有**比对面
  未覆盖的注入种类——`system/message` 与 `user/message` 两侧同查，重录把新面带进基线即红；
  `unexpectedInjectionKinds` 断言回放里**没有**基线外的种类——新注入器出现即红。两条各有可证伪的测试与
  smoke 步，不存在"重录后静默吸收"的路径。
- **四角色真模型重录**（`recording: live`），录制身份（codeAnchor/vendor/recordedAt）落 manifest 逐 case
  并校验形状（40 位 commit 或如实标记 `unknown-historical`）；录制器不再代写声明，只提示登记 case。
- **工具 schema 由全等比对接管**：旧声明 `retired-tools`（工具退役后旧场景仍可回放）的容忍语义被
  `request/header` 逐字全等取代——退役工具须随重录基线更新；该策略变化记于此。
- **pin-agreement 的录制语料豁免随夹具迁家**：豁免面由 `tests/fixtures/snapshot-` 与
  `tests/fixtures/run-state/` 收拢为 `snapshots/replay/` + `tests/fixtures/run-state/`（只豁免录制证据层，
  `snapshots/` 其余文件仍受检）——录制流的 vendor 构建戳是挥发性身份、manifest 的 codeAnchor
  是历史证据身份，都不是本仓钉声明；豁免随迁移丢失即把迁移本身变成误报源。
- **探针与视觉分类延后**：只在出现持久消费者时建立，不预建空桶；研究 run 归档仍住 `research-workspace/`。

## 输掉的方案

- **只建 `snapshots/` 目录或复制 company 五桶**：没有对应消费者，等于第二份状态与治理负担；探针/视觉/归档
  桶留待真实消费者。
- **保留旧录制、只 keyless 刷新注入文本**（company `--refresh` 形态）：声明是 `recording: live`，把旧
  canned 输出与新注入正文拼在一起会让夹具自称的完整场景失真；重录是唯一与声明一致的路径。
- **保留 `snapshot.yml` 与 `snapshot.json` 双份**：两份场景身份 = 必漂移；manifest 已是 consumer 输入。
- **把新判据做成可开关/可削减的清单**：BUG-018 的教训正是"能少比就少比"，故 judge 集由 consumer 固定为
  全集，声明只能确认不能缩减。
- **为比对面写用例级哈希/清单登记表**：判据对象是请求正文本身，另立清单只增一层会腐烂的复述。
- **引入 YAML 解析或 vendor vitest 快照套件**：本仓约定 Node 标准库 + node:test；声明改 JSON 即可被
  现有约定直接消费。
- **给比对面加路径型义务门禁**（"改某文件强制重录"）：标定实测假阳率高，已在
  [recorded-session 义务标定](2026-10-08-recorded-session-obligation.md) 否决；本轮的机械面是"比对面自身"。

## 实际跑过的验证

- **先红（证明新判据真咬）**：迁移后仅换消费者、未补比对面时跑全量回放 → 四角色 `agent-instructions` 全红
  （旧基线手册与当前手册差异），persona/headers/skill-catalog/runtime-context 绿——正是 BUG-018 记录的
  静默盲区被点亮。
- **重录后绿**：`node --import tsx/esm dev/record-role-fixture.mjs --role <scout|analyst|critic|lead>`
  四角色真模型重录，随后 `source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs` 全场景
  A 回放 + 五条 B 判据 + coverage 自守通过。
- **覆盖自守反证**：守卫测试先跑红（模块未导出）→ 实现后绿；含"基线外注入种类被点名"、"新 system/message
  注入种类同样被点名"、"四角色基线注入种类均在比对面内"与"未登记种类确实会被报出"（防空对照）四条——
  对抗自审抓获首版只查 `user/message` 且"恰好覆盖"断言是集合与自身比较（恒真），本版已改为可证伪不变量。
- **来源形状反证**：垃圾锚点（非 hex 的 codeAnchor/vendor、不可解析的 recordedAt）先红 → 形状校验与
  `unknown-historical` 合法标记并存 → 绿。
- **比对面单测反证**（实现期实录，住 [replay-request.test.mjs](../../tests/replay-request.test.mjs)）：
  后续 header 改 model、定向归一化缺失、缺席/空 content/缺 provider-model-tools 各形态先红后绿。
- **pin-agreement 扩围反证**：夹具迁入 `snapshots/` 未带豁免 → 逐个录制流点名 ≠ submodule HEAD → 红；
  豁免收拢到 `snapshots/replay/` + `run-state` → 绿。
- **声明消费者反证**（住 [replay-scene.test.mjs](../../tests/replay-scene.test.mjs)）：模块缺失、ONLY 未知、
  schema 版本、绝对/穿越/symlink 路径、重复 fixture 各形态先红后绿。
- **L0**：`pnpm verify` 全绿 + `pnpm test` 全绿；`node scripts/smoke/gates-smoke.mjs` 全绿（对照组零注入 + 各注入案例均被点名报红）。
- **默认入口复现**：`source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs` 连跑两次（含一次
  `--update-expected` 重写金标准之后）均 ALL PASS——四场景 A + 五条 B + coverage 自守 + lead C 金标准。

## 未跑与边界

- C 层渲染金标准只在声明了 `renderExpected` 的场景跑；其重写仍须 `--update-expected` + 人审。
- **C0a 工作区选择态的恢复点击路径未被独立强制复现**：该态（reload 后停在 "Choose a workspace
  to start"，侧栏会话行不出现）修前实测出现两次导致 C0 误红；加恢复分支后连跑未再复现，故分支本身
  没有被单独触发验证。失效时的表现 = C0a 红并附工作区状态诊断——失败方向安全，不会假绿。
- 回放证明的是固定转录下的装配/循环/日志与已声明效果，**不**证明真实模型会遵守新 persona/skill；后者归
  真模型档证据。
- 场景不进默认 `pnpm test` 与 pre-commit 链：义务靠开发环任务型路由表与重录程序，不是机械门。
