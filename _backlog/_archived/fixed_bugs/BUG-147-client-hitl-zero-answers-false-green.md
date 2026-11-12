---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-147：client-hitl-smoke ⑤b 把「共作答 0 题」当通过——代理一题未答，却断言「挂起卡已答」

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — client-hitl ⑤b 解析「共作答 N 题」并要求 N≥1，0 题不再冒充已答（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`scripts/smoke/client-hitl-smoke.mjs:223`（⑤b 的通过判据）。

## 症状

`client-hitl-smoke` 全绿（12 PASS），但 ⑤b 的日志明细是：

```
PASS ⑤b 挂起卡已答（hitl-answer 子进程——代理模拟，如实标注）
（hitl-answer: 共作答 0 题 / 卡共 1 题 · Submit 已点击）
```

**0 题作答 / 卡有 1 题**——代理没有选中任何选项，只点了 Submit，却被判「挂起卡已答」并通过。
后续 ⑤c「答后回合闭合」也 PASS——说明这次**空提交**关闭了回合。

## 复现

```sh
source dev/env.sh
node scripts/smoke/client-hitl-smoke.mjs --port <free>
# → ⑤b PASS，明细「共作答 0 题 / 卡共 1 题 · Submit 已点击」
```

## 根因（已证）

```js
const answeredOk = answeredRun.status === 0 && /共作答 \d+ 题/.test(answeredRun.stdout ?? '')
```

1. `\d+` 匹配 **0**——计数为 0 也满足正则；
2. 断言只看「子进程 exit 0 + 输出含计数」，**不校验计数 ≥1**，也不回读会话日志确认
   `user-question-reply` / `tool/result` 里 **selected 非空**；
3. `hitl-answer` 的选择器在该卡片上**没选中任何项**（驱动注释里已记过「驱动静默空转」的形态），
   但 Submit 照点、状态报 0，冒烟仍判绿；
4. 于是「挂起 → 作答 → 回合闭合」这条主线里，**作答环节根本没有被验证**——选择器回归/卡片改版
   会继续绿。

## 影响面

- 该冒烟是「真模型 HITL 活标题 + 挂起显性化」的关键证据；⑤b 假绿让「答案真的送达 lead」这一环
  失去机械判据；
- 更深一层：**空提交关闭了回合**——需要确认产品是否允许「不选就提交」；若允许，冒烟应断言
  「空答案」的语义，而不是声称「已答」；若不允许，这是产品缺陷（卡被空答案关闭）。

## 修复判据

1. **计数判据**：`/共作答 ([1-9]\d*) 题/`（至少 1 题），或解析计数并断言 `count >= 1`；
2. **盘侧对账**：读该 session 日志，断言最近一次 `tool/result`（ask 的 callId）或
   `user-question-reply` 的 `answers[].selected` **非空**，且与所答 ask 的 callId 对应；
3. **定位 0 题的原因**：`hitl-answer` 的选择器为何在该卡片上选不中（卡片结构/可访问性名变化）——
   修驱动或明确「该卡不可代理作答」并 fail；
4. 先红后绿：当前跑出 0 题仍绿（红）→ 修复后 0 题即失败；正常 1 题作答仍绿；
   若产品允许空提交，另立断言（明确「空答案」→ lead 收到空答案）并去掉「已答」措辞；
5. `pnpm test` + `pnpm verify` 绿；截图/日志留档（本次截图
   `runtime/smoke-workspace/client-hitl-2026-11-12T19-19-45-025Z.png`）。

## 修复关联

`hitl-answer` 驱动与 `client-hitl` 的同一证据链；与 [BUG-146](BUG-146-hitl-signatures-chinese-only-bilingual.md)
（HITL 判型的语言面）相邻但不同层：本条是**代理作答的真实性**假绿。发现方式 = 全绿输出里的细节行
（「共作答 0 题」）对账——不只看 PASS。

## 已落地（2026-11-13）

- 证据 = `tests/run/hitl-provenance.test.mjs` BUG-147 + client-hitl 断言接线。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
