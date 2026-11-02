---
status: 待落地
opened: 2026-11-03
---

# 推敲：模型可见措辞——把退役词从 presets/content 里清掉

> 立卡：2026-11-03 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-03-model-visible-vocabulary.md`（交付时写）；业务验收：用户。

**问题与期望结果：** D41 退役了 `插件即产品` / `产品 profile` / `产品面` 等复合词，现行合同文档已清干净，
但**模型可见**的 preset persona 与内容手册仍写着「产品」。模型读着它，就会用退役词回用户——这是退役语汇
唯一会**直接说给用户听**的出口：文档里的词只有维护者看，prompt 里的词每个会话都在说。

期望：这些位置改用 DSH 对象指称（`deep-research` profile / 本次安装 / 工作区），并交出一个模型可见面
改动应有的证据（snapshot B 重录 + 真模型档），而不是只改字面。

**当前情况：**

命中（2026-11-03 `grep -rn 产品` 于 `presets/` + `content/`，逐条看过语境）：

| 位置 | 原文片段 | 性质 |
|---|---|---|
| `presets/{lead,analyst,scout,critic}.patch.yml` 各 1 处 | 研究手册（**产品**以 runtime context 注入）已在本会话 | 退役词（指本包） |
| `content/manual.md:3` | （**产品**启动时选定/询问的那个目录）…本手册由**产品**以 runtime context 注入 | 退役词（指本包） |
| `content/manual.md:60` | **产品**安装态没有预置 | 退役词（指本包） |
| `presets/lead/skills/question-patterns/SKILL.md:123` | 这家公司/项目/**产品**靠不靠谱 | **不是**退役词——研究对象本身，保留 |

**未决问题：** 无。要跑的是录制轮与证据，不是判断。

**下一步：** 按 `## 验收标准` 改文本 → 重录 research-face → 全量验收 → 与 Note 同变更关闭。

## 已知与未决

**已知**

- 这些文本进模型请求（persona + runtime context 注入），是 snapshot `replay/research-face` 的比对
  面；改一个字节回放即红，这是**预期信号**，不是故障（[snapshots/README](../../snapshots/README.md)
  「模型可见输入有意变更后，重录该场景并更新 source 身份」）。
- 证据阶梯与重启要求 = [pack AGENTS §模型可见文本](../../packages/deep-research-pack/AGENTS.md)；
  角色改动的完整程序 = [adding-a-research-role](../../.agents/skills/adding-a-research-role/SKILL.md)。
- 消费面：`scripts/smoke/snapshot-replay-smoke.mjs`（判据）+ `snapshots/replay/research-face/snapshot.json`
  （场景声明，含 `source.codeAnchor` = 录制时本仓 HEAD，必须同变更更新）。
- 本机 dev home 凭据在场（`DEEPSEEK_API_KEY`），录制可跑。

**未决**

- 无设计未决。唯一的执行前提 = 一个能连续跑真模型的窗口（录制中途失败会留下半新半旧的基线，
  必须整轮重跑，不能拼接）。

## 首次尝试（2026-11-03，未成交）

文本改动本身一次过：4 个 preset + `content/manual.md` 两处换成 DSH 对象指称，
`grep -rn 产品 presets/ content/` 只剩 question-patterns 那处研究对象用法；`pnpm verify` 绿、`pnpm test`
971/0；`dev/render-overlay.yml` 重渲染后 `overlay-fresh` 绿。

**卡在录制通道**：`dev/record-role-fixture.mjs --role scout` 两次都 `等待启动横幅超时`（120s；端口已换
3105 → 3106，均无占用）。同刻 `dsh --profile research --dump-config` 正常输出 205 行，说明 profile
组合本身是好的——是录制器的 boot 等待与真启动对不上，不是包或文本的问题。

处置：改动整轮回退（`git reset --hard`），不留半条基线；`research` profile 依赖指回
`runtime/smoke-workspace/run-pack/` 的规范 tarball。下次从「先修录制器 boot 等待」开始，不要重复
这条弯路——诊断入口 = 录制器 `banner` Promise 与 `--no-open` 的启动参数，先手工跑一次
`dsh --profile research -- --port <p> --no-open` 看横幅到底出不出、出在哪条流。


## 方案与取舍

**采用：换指称 + 同变更重录。** 只换指称，不换语义——手册讲的是工作区与目录约定，措辞变了意思不变：

- `产品以 runtime context 注入` → `deep-research-pack 以 runtime context 注入`
- `产品启动时选定/询问的那个目录` → `启动时选定/询问的那个目录`
- `产品安装态没有预置` → `安装态没有预置`

**输掉：不改，等下次一起重录。** 退役词每个会话都在模型嘴里出现，越晚越像现行合同；而且它现在是
唯一没有 owner 的悬空项——要么做，要么进 `triggers.md`，不能既不做也不登记。

**输掉：只改字面、不重录。** 回放会红，等于交付一个红基线；快照的用处就是"改了就红，红了就重录"。

**输掉：顺手把 persona 一起重写。** 措辞清扫不是 persona 改版；语义改动要另开卡，否则证据面混在一起
说不清是哪个改动引起的漂移。

## 验收标准

1. **指称清零**：`grep -rn 产品 packages/deep-research-pack/presets packages/deep-research-pack/content`
   只剩 `question-patterns/SKILL.md` 那处研究对象用法（该行保留并说明是研究对象）。
2. **回放绿**：`node scripts/smoke/snapshot-replay-smoke.mjs --face research-face` 全绿；
   `snapshot.json` 的 `source.codeAnchor` / `recordedAt` 更新为本次录制。
3. **真模型证据**：录制轮本身即证据（`recording: live`）；另跑 `l4-lite-smoke` 或等价真模型冒烟并记
   实际结果（缺凭据时如实 NOT-RUN，不冒充绿）。
4. **回归**：`pnpm verify` + `pnpm test` 绿。
5. **产物**：`node scripts/dist/export-dist.mjs` 重导出，tarball 内 `content/manual.md` 与
   `presets/*.patch.yml` 含新文本。

## 关闭条件

AC1–AC5 有证据；Note 与卡关闭同变更；去向 `implemented`（Note 记决定、输掉的方案、实际跑过的验证）。
