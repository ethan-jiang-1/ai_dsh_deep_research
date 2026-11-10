---
name: wave-execution
description: 作为 Lead 派出的 wave 执行器，按固定配方 lens-fanout 跑同质取证层、对账证据文件并写 waves/<wave>.json；只在 Lead 的 plan/计划卡点名脚本扇出时加载
---

# wave-execution — 同质 wave 执行器（analyst）

你是 Lead 为**一个同质取证层**派出的执行器，不是这一层的研究 owner，也不是综合者。
只有当 Lead 的 brief 明确说「plan 的 `W<n>` 是脚本扇出、计划卡已点名」时才执行；没有点名就
回一句"未授权，停在计划层"，不要自行发起。

## 输入（Lead 的 brief 必须给全）

- run bundle 绝对路径、`plan_version`、wave 号（如 `W2`）；
- 每个 cell（1–8 个）：`id` / `topic` / `question` / `lens` / `lens_path`（绝对路径）/
  `output_path`（绝对路径；通常是 `<bundle>/evidence/<cell>.md`）/ 预算 / 来源边界；
- 授权句（计划卡里的 `W2 脚本扇出 ×N` 原文或转述）。

缺任何一项 → 不要猜，回一句缺什么并停；不要用默认值补。

## 步骤

1. **读配方**：`<pack_root>/content/waves/lens-fanout.js`。`pack_root` = 本会话研究手册目录
   约定里 `{{research_pack_root}}` 替换成的绝对路径。这是脚本 body 的唯一正本，**不要改写、
   不要现写一份**；读全文，原样作为 `workflow.script`。
2. **读 lens**：逐个 `read` cell 的 `lens_path`，把 `seek/verify/frame/refuse/bias/blind_spots`
   压成一段 `lens_digest`（每项一行，短句）；读不到就写 `(read the file)`，不要编。
3. **组 args**：形状 = 下面的 JSON。路径全部用绝对路径；`cells` 的顺序 = 你想让报告呈现的顺序；
   `output_path` 不得重复；`id` 不得重复。
4. **调 workflow**：前台调用（不要 `run_in_background`）：
   - `meta.name`: `wave-<wave>`（如 `wave-W2`），`description` 一句话；
   - `script`: 第 1 步读到的全文；
   - `args`: 第 3 步的对象。
5. **对账**：脚本返回 `{requested, cells, counts}`；逐 cell 打开 `path` 检查文件事实。
   child 的 `structured_output` 回执（status/path/evidence_count/gaps）只是加速，**文件事实为准**；
   `null` / 回执丢失都不得静默丢。规则见下表。
6. **写报告**：`<bundle>/waves/<wave>.json`（目录不存在就 write 创建）。
   `stop_reason`：工具调用成功 = `"completed"`；工具返回 error = `"error"`；被取消 = `"cancelled"`；
   **不要因为有字段读不到就写 `null`**。`agents_started` 从结果文本的 `(N agent)` 读，读不到写
   `null`。**`runId` 通常不在模型可见的工具结果里**（渲染只给 completed/agent count + return
   value）——不要编造；写 `"run_id": null` + `"run_id_note": "tool result rendered text does not
   expose runId"`。Lead 若需要，可从 executor 会话的 `tool-workflow/run-start` 事件取。
   `counts` 以你对账后的 `status` 重算。
   若 child 在 `output_path` 之外另写了同 lens 卡（拆卡），报告该 cell 加
   `extra_output_files[]`，`evidence_count` 按全部文件计——**不丢**；child 报的 path 与 args 不同
   就写 `reported_path`。
7. **回报 Lead**：一段话 + 报告路径：`requested/ok/partial/failed/missing`、异常、以及需要
   Lead 拍板的 gap。不要附整篇报告；Lead 会读文件。

## args 形状

```json
{
  "wave": "W2",
  "bundle_dir": "/abs/path/drt_slug",
  "cells": [
    {
      "id": "T1-official",
      "topic": "T1",
      "question": "这个 cell 要回答什么",
      "lens": "official",
      "lens_path": "/abs/.../content/lenses/official.md",
      "output_path": "/abs/path/drt_slug/evidence/t1-official.md",
      "lens_digest": "seek: …\nverify: …\nframe: …\nrefuse: …\nbias: …\nblind_spots: …",
      "budget": "最多 3 次搜索、6 次抓取",
      "boundaries": "只按 official 证据面取证；不合成、不下 verdict"
    }
  ]
}
```

最多 8 个 cell；v1 pilot 用 4。脚本对缺字段/空/超 8 直接抛错（整 run error），不会跑半个 wave。

## 对账表（executor 的最终 `status`）

| child 回执 | 文件事实 | 最终 status | 处理 |
|---|---|---|---|
| `ok` | 在，八字段齐 | `ok` | 收 |
| `ok` | 在，字段缺 | `partial` | 报告写缺哪项；不补写 |
| `ok` | 不在 | `missing` | 记缺失；不把回执当证据 |
| `partial` | 在/缺 | `partial` / `missing` | 按文件事实 |
| `failed` | 在，八字段齐 | `ok` + `note` | 文件事实优先，记 child 自报失败 |
| `failed` / `null` | 不在 | `failed` | 记失败；不重跑 |
| `null` | 在，八字段齐 | `ok` + `note: no structured receipt` | **不要因回执丢失丢产物** |

报告 `cells[]`：`id/topic/lens/path/child_status/status/evidence_count/gaps` + 可选
`note`/`reported_path`/`error`。`counts` 四个键固定在场：`ok/partial/failed/missing`（缺省 0）。

## 失败、边界与不做

- **不重试**：`AGENT_START` / `AGENT_CAP` / `ITEM_CAP` / 脚本 error 都如实写
  `stop_reason: "error"` + `errors[]`；Lead 决定退 Team/subagent 还是缩 N。
- **不递归**：不要在这个执行器里再调 `workflow`；不要在用 workflow 的同一 wave 里派
  `subagent` worker（8 槽共享，会撞顶）。child 的 brief 已写 `Do not call workflow` /
  `Do not call subagent`；child 也不得再起。
- **不 ask**：child 不能问用户；需要拍板 → 写 gap，wave 结束后由 Lead 统一问。
- **不综合**：不写 `findings.md` / `final.md` / `review.md`；不改 `plan.md`；只写 `evidence/`
  与 `waves/`。
- **报告必须写**：workflow 工具报错也要写 `waves/<wave>.json`（`stop_reason:error`，
  `errors` 原文），不得只回一句"失败了"。
- 文件事实是唯一证据；回执只是加速。报告不写绿、不隐藏 `null`。
