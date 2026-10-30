# 上游流畸形事件并入有界重试（`MALFORMED_RESPONSE`）

> 状态：implemented

> 历史注记（2026-10-30）：2026-10-13 复盘把根因改判为上游 CDN/链路（Brotli 丢响应头），
> BUG-022 已归档；本重试配置保留为第二道缓解。见
> [事故复盘快照](../archived/2026-10-13-llm-stream-malformed-storm.md)。

## 决定

在 pack 的 bundle 层（`packages/deep-research-pack/cordis.patch.yml`）**按 id 替换** base 的
`llm-deepseek` 行，把 `MALFORMED_RESPONSE` 并入 `retryPolicy.retryableCodes`（`mode: normal`、
`maxRetries: 5`；退避参数不写 = 出厂默认 500ms→10s、jitter 0.1）。

机制事实（vendor 源码核对，2026-10-11）：`llm-retry` 插件挂在 `agent/request-error` 上，`normal`
模式**只重试** `retryPolicy.retryableCodes` 里的码；出厂集 =
`[EMPTY_RESPONSE, RATE_LIMIT, SERVER, TIMEOUT, TRANSPORT]` —— **`MALFORMED_RESPONSE` 不在内**，
故一次畸形流事件即终结回合、**不重试**。姊妹错误 `TRANSPORT` 在集内，故选中它会有重试；实测
3 天内 TRANSPORT 终局 2 次 vs MALFORMED_RESPONSE 终局 44 次，与机制一致。

这是**本地缓解**，不是修复：上游事件顺序违约（`event precedes message_start`）当时归因于 vendor 只读层
（BUG-022；2026-10-13 已改判上游链路，BUG-022 归档）。要缓解的"症状"不是单次失败、而是 **run 停摆**——一轮回合被终结 → lead 不动 → 一个 wave
的产出可能全废（实测：队员集体失效、evidence 5 卡在盘而 findings 未写）。重试把"一次畸形 = 一次
停摆"变成"一次畸形 = 最多六次尝试"。

落点与形状的三条选择：

- **写进 pack**（随包安装生效）：run 通道的 profile 由 `dev/boot-run.sh` 把**本地包 `npm pack` 后安装**，
  故 pack 层即该通道的组成；研究 run 的长时程特性是该包的运行要求，不是某个部署的偏好。
- **不写 `name` 字段**：按 id 定向即可；写 `name` 会把 `@deepseek-ai/dsh-llm-deepseek-api-key` 引入
  `peerDependencies`（`row-deps` 门禁），平白扩大兼容面。
- **不占模型可见面**：改的是 host 侧 provider 配置，persona/preset/skill 一律不动（无 fixture 影响）。

## 输掉的方案

- **改 vendor**：只读铁律（`vendor-pin`/`vendor-clean` 把守），且上游 seam 随换 tag 重估——修在那里会被覆盖。
- **`mode: always`（无界重试）**：上游持续畸形时会把"故障"变成"卡死"；有界重试的失败信息更值钱
  （"重试尽仍畸形" = 明确的病征，而不是沉默）。
- **加大 `maxRetries`**：畸形流不是拥塞类错误，堆次数不涨成功率；默认 5 已是"有界且足够"。
- **只靠恢复工具（`dev/run-kickoff.mjs --session`）**：那是事后补救，要求有人/agent 在场且及时发现；
  重试是事前拦截——两者互补，不互为替代（BUG-022 的"可数/可恢复/可诊断"三件照旧）。
- **把重试码放进用户设置（`settings` 的 `llm-deepseek:` 段）**：设置是每用户/每部署的旋钮，而这是
  **本包的运行要求**；写在 pack 里仍可被上层设置覆盖，方向正确。
- **顺带把 `EMPTY_RESPONSE` 之外的码也全量重试**：越界的重试会掩盖真实故障类别（如鉴权、请求非法），
  只并这一个已实测的畸形码。

## 实际跑过的验证

- **组合正证据（最强的一条）**：
  `dsh --profile web --patch dev/research.overlay.yml --dump-config` → 组合树里 `llm-deepseek` 行带
  `retryableCodes: [… , MALFORMED_RESPONSE]`，且 `name` 仍为 `@deepseek-ai/dsh-llm-deepseek-api-key`
  —— 同时证明"命中既有行替换"（非误建新行）与"策略已进组合"。
- **L1 真挂载**：`DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` → ALL PASS（四 preset）。
- **L2 安装形状**：`node scripts/smoke/release-smoke.mjs` → **ALL PASS**（pack → 干净 profile →
  plugin add → 安装域 `preset-smoke` 全绿 + 端口 3100 用后无监听残留）。
- **L0**：`pnpm verify` 全绿 / `pnpm test` 399-399。
- **未运行项（如实标注）**：**"畸形流真的被重试"没有现场证据**——要等 provider 再抽风才能观察到。
  可证的到此为止：重试决策的判据（vendor 源码）+ 策略已进组合（dump-config）。别把"配置在位"读成"故障已解"。
- **生效时点**：改动随**下一次通道启动**生效（run 通道的 profile 镜像由 `boot-run.sh` 的漂移检测
  重建；本次未重启通道，故线上通道仍是旧组合）。

判据与分母 = [BUG-022](../../_backlog/_archived/fixed_bugs/BUG-022-provider-stream-malformed-turn-kill.md)（活卡，复发时由
`scripts/run-ops/provider-error-stats.mjs` 重算）。
