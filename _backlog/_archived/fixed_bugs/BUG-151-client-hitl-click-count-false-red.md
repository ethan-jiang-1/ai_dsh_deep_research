---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-151：147 的修法用「点击计数」判已答，与 hitl-answer 自己的判据矛盾——Recommended 预选卡答案已落地却判红（client-hitl ⑤b 假红）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — client-hitl ⑤b 改用盘侧 answer 批（selected/custom 非空）判已答，点击计数只作诊断（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/smoke/client-hitl-smoke.mjs` 的 ⑤b（147 修复后 `answeredCount >= 1`）。
> 对照正本：`dev/hitl-answer.mjs:417` 自己的裁决注——「成功判据 = 盘侧 answer 批内容（UI 会预选/
> 自动推进选中态，**点击计数不可作判据**——实测点击 0 次而批全 Recommended 的假红形态）」。

## 症状

147 的修法：

```js
const answeredCount = answeredCountOf(answeredRun.stdout ?? '')
const answeredOk = answeredRun.status === 0 && answeredCount !== null && answeredCount >= 1
```

但 HITL 卡会**预选 Recommended**：代理只需点 Submit，`answered` 数组为空（0 题），而**答案批已落地**。
实测（`client-hitl-smoke --port 3143`，真模型）：

```
FAIL ⑤b 挂起卡已答（hitl-answer: 共作答 0 题 / 卡共 1 题 · Submit 已点击）
client-hitl-smoke: 1 FAILURE(S)（10 PASS / 2 FAIL）
```

同一会话的盘侧记录（session-bfcea2eb…）：

```json
tool/result call_00_wh2… = {"answers":[{"id":"archive_check","selected":["要 (Recommended)"]}]}
```

即：**答案成功送达**，但点击计数 0 → ⑤b 判红。上一版（只看 `共作答 \d+`）会假绿，这一版**修成了假红**；
两个版本都不是 hitl-answer 自己声明的判据（盘侧 landed batch）。

## 复现

```sh
source dev/env.sh
node scripts/smoke/client-hitl-smoke.mjs --port <free>
# → ⑤b FAIL（共作答 0 题），但会话日志里该 ask 的 tool/result 有 selected 非空
# 取证：zstd -dc runtime/harness-home/sessions/*/<最新 hitl-smoke 会话>/session.v4.jsonl.zstd \
#       | grep archive_check   → selected:["要 (Recommended)"]
```

## 根因（已证）

1. `answeredCountOf` 读的是 hitl-answer 的**点击计数**，不是**落地答案**；
2. UI 预选 Recommended → 无需点击 → 计数 0，但 Submit 带走了预选项；
3. hitl-answer 的注释与裁决逻辑本来就写明「点击计数不可作判据」，⑤b 的修复没有采用该判据；
4. 结果：147 的「0 题 = 假绿」被换成「0 点击 = 假红」，仍与真实语义脱节。

## 影响面

- client-hitl 这条**真模型关键冒烟**现在在正常预选卡上必红（本机实测 1 FAIL），会掩盖真正的答案回归；
- 与 147 相同：判据选错层（计数/UI 交互 vs 盘侧事实），只是方向相反。

## 修复判据

1. **判据换成盘侧**：读 session log，断言该 ask 的 `tool/result`（同 callId）解析出的
   `answers[].selected` **非空**（或有 `custom` 文本），或 `hitl-answer` 输出的 **landed batch** 判定
   （它已有 `answerBatchOf`/`driveVerdict` 的正本）；
2. 点击计数只作诊断信息，不作通过判据；
3. 先红后绿：预选 Recommended 卡——当前 ⑤b 红（假红）→ 修复后 PASS（且 selected 非空）；
   真·未答（无 tool/result 或 selected 空）→ 仍 FAIL；147 要防的「0 题且无答案」不得回归；
4. `pnpm test` + `pnpm verify` 绿；client-hitl 跑两遍（预选卡 / 需要点击卡）各一次。

## 修复关联

[BUG-147](BUG-147-client-hitl-zero-answers-false-green.md)（已修）的
**过度修正**；与 [BUG-149](BUG-149-hitl2-pending-vocabulary-holes.md)/[BUG-150](BUG-150-readiness-keyword-window-still-hijacked.md)
同族：把「代理指标」当判据（点击计数、关键词、词表），而不是盘侧事实/结构。

## 已落地（2026-11-13）

- 证据 = `tests/run/hitl-provenance.test.mjs` BUG-151 + client-hitl ⑤b 接线。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
