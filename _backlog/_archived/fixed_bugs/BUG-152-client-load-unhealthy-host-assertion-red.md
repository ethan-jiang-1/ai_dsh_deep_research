---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-152：client-load 的 host-health 收口只认「连接死亡」——负载升高时的状态页断言失败仍判 FAILURE（疑似负载假红）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — host 不健康 + 任意断言失败即 NOT-RUN，不再要求连接死亡（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/host-health.mjs` 的 `isHostUnhealthyVerdict` 与 `scripts/smoke/client-load-smoke.mjs`
> 的失败收口。关联：[BUG-142](BUG-142-client-load-selects-method-editor-session.md)
> （选择器修复已验：本轮绑定会话已是 lead，但 X8 仍红——142 的归因不完整，本卡补上环境面）。

## 症状

`client-load-smoke` 在**主机已不健康**（load/cpu 1.54 > 1.5）时仍以**断言红**收场：

```
FAIL 重入点描边（outline=none（loopOn=true））
FAIL ↻ rerun 三分图例（loopOn=true labelsVisible=false）
FAIL 停靠点诚实线（盘侧 passed=2）
client-load-smoke: 3 FAILURE(S)          （总 68 PASS / 4 FAIL，exit 1）
失败现场：…/client-load-2026-11-12T20-05-43-758Z/（meta.json reason=assertions）
主机健康=NO（load 15.45 / free 9132MB / 10 CPU：load/cpu 1.54 > 1.5）
浏览器断连 0 次、HTTP 失败 4 条
```

而收口判据是：

```js
export function isHostUnhealthyVerdict({ hasFailures, hostHealth, connectionDeath, pageLost }) {
  return hasFailures === true && hostHealth?.unhealthy === true && (connectionDeath === true || pageLost === true)
}
```

**只有「连接死亡 / chrome-error」** 才把断言红转成 NOT-RUN；本轮是「主机不健康 + 渲染类断言缺失」
（无连接死亡）→ 仍判 FAILURE。即：**负载抖动导致的 DOM 慢/缺**被当成产品回归。

## 复现

```sh
# 在主机 load/cpu > 1.5 时（另一 agent 在跑东西）
source dev/env.sh
node --import tsx/esm scripts/smoke/client-load-smoke.mjs
# → 68 PASS / 4 FAIL；失败现场 meta.json 的 hostHealth=NO、reason=assertions、断连 0 次
```

对照：同一代码在低负载时（`620ff4d3` 时期的 76 PASS / 0 FAIL）绿；本轮绑定会话已经是 **lead**
（marker「处理已写入文件记录，采用」，142 的选择器修复生效），所以红与选择器无关。

## 根因（候选，未完全钉死）

1. `isHostUnhealthyVerdict` 的环境判据只覆盖「连接死亡」（页面 URL 变 chrome-error / 请求 refused），
   不覆盖「无断连但渲染慢」的形态；
2. 三条失败项都是 **DOM 在场/文本** 断言（outline 描边、legend 标签、锚点行），在负载下可能晚渲染或
   不渲染——与产品逻辑无关；
3. `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 只在**启动时**允许，运行中负载升高（本轮 15.45）没有
   「复跑/确认」环节；一次抖动即可产出产品红；
4. 环境与产品在**同一轮**里混判：应「健康主机复跑一次确认」或「不健康即 NOT-RUN」。

## 影响面

- 观察面门禁会在**高负载窗口假红**，掩盖真正的产品回归（红项看起来和 142 的产品症状一模一样）；
- 142/275b8c03 的归因被误导：选择器修复后仍红，若继续追产品会白花时间；
- 「未跑 ≠ 通过」被反过来破坏：这里把「未确定」判成了「产品失败」。

## 修复判据

1. **收口放宽**：`isHostUnhealthyVerdict` 的判据加「主机不健康 + 断言失败（无连接死亡）」→ NOT-RUN
   （或新增「环境不确定」第三态，exit 2），至少不得静默判产品红；
2. **健康主机确认**：断言失败时若 hostHealth=NO，自动在健康窗口重试一次（或把「健康主机复跑」作为
   判红前置）；重试仍红才 exit 1；
3. **断言层**：outline/legend/锚点行这类 DOM 断言加「等元素出现」的显式等待（而非固定 sleep），
   区分「真的没有」与「还没渲染」；
4. 先红后绿：在 load/cpu > 1.5 的窗口跑——当前 exit 1 / 3 FAILURE（红）→ 修复后 exit 2（NOT-RUN）；
   健康窗口跑仍 ALL PASS；真正的健康主机断言红仍 exit 1；
5. `pnpm test` + `pnpm verify` 绿；更新 `tests/run/host-health*` 的判据用例。

## 修复关联

[BUG-142](BUG-142-client-load-selects-method-editor-session.md)
（选择器修复已验；本卡指出其「X8 红 = 选择器」的归因不完整）；[BUG-060](BUG-060-host-health-freemem-macos-underreports.md)
（host-health 判据本身）同族。发现方式 = X8 仍红后读失败现场的健康字段，而不是继续追产品。

## 已落地（2026-11-13）

- 证据 = `tests/run/host-health.test.mjs` BUG-152。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
