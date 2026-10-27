---
status: 已修
severity: P2
opened: 2026-10-27
---

# BUG-045：client-load-smoke 的图谱断言在流断连时红（首跑红、重跑即绿）

> 严重级别：P2｜发现：2026-10-27｜状态：已修（2026-10-28）

## 症状

同一天、同一构建、同一条命令连跑两次 `node --import tsx/esm scripts/smoke/client-load-smoke.mjs`：

- 第 1 次：`client-load-smoke: 1 FAILURE(S)`，唯一红行 =
  **`研究图谱覆盖率行在场（已映射 K / 未映射 N-K）`**；现场自动留存（见下）。
- 第 2 次：**ALL PASS**（同一 lib/client.js，未改任何文件）。

即断言结果不可复现：红的不是产品面确定行为，而是"这一次页面里没有覆盖率行"。

## 现场（已留存）

`runtime/smoke-workspace/client-load-2026-10-27T15-56-30-540Z/`（page.png / page.html /
console.txt / meta.json）。

- `meta.json.failures` 只有上面一条；`consoleErrors` 里同一时段密集出现
  `api gateway: Remote stream WebSocket closed`（`[research-final] 交付监听流失败`、
  `[ResearchStatusTab] 活标题流失败`、`[research-graph] journal follow 失败`）与多条 404。
- `page.html` 里页签条有「研究图谱」，但图面**没有**覆盖率行、也没有 `研究依赖图` SVG；
  无 React 错误边界、无 `TypeError`。
- 断言时段的另一种可能：图页签根本没被点开（body 里只剩研究状态页签的内容）。

## 根因假设（未证实）

`[research-graph] journal follow 失败` → `bindingTrust` 停在未定态 → 图面走"未绑定/加载中"
空态 → 覆盖率行不渲染；而断言只等固定时长就判"覆盖率行不在场"。

两条待分辨的成因：

1. **流断连是环境瞬态**（本机 web 进程的上游 WebSocket 抖动），复跑即恢复——那么问题是
   **冒烟把瞬态当确定性红**（等待谓词不足 / 失败现场不区分"断连"与"没有数据"）；
2. **冒烟自身的时序**（图页签点开与数据填充的竞态），与流无关——那么问题是**断言缺显式等待**。

## 牵出的失败类

- 同类"红在环境瞬态、重跑即绿"的冒烟（client-load 的流相关断言）此前没有统一处置口径：
  `scripts/AGENTS §冒烟脚本可靠性纪律` 允许"外部边界 + 带理由"的重试，但没说**断连**算不算
  外部边界、以及重试要不要在 verdict 里留痕。
- 失败现场只存了 console 与 DOM，没有存"断言时刻的图页签是否打开"这一事实——**现场不自解释**
  的老问题（2026-10-27 卫生轮 维度6 已修 run-driver / cold-start 两处，冒烟侧仍在）。

## 修复落地（2026-10-28）

- 图面：`followError` 状态 + 有界重试（3 次 / 2s）；失败态独立文案「绑定状态读取失败」，
  不再落回「本会话尚未绑定 run」（`ResearchGraphTab.tsx`）。
- 冒烟：覆盖率断言改轮询（12s 上限），仍缺席时把图面的失败标记带进判据说明；「不炸」断言
  接受该失败态（`client-load-smoke.mjs`）。
- 原则落正本：design/40 §6 加「失败态与空态必须可分」。

## 取证结论

回读 `ResearchGraphTab.tsx` 的 follow 效果：`catch` 只 `console.error`，`boundSlug` 保持 null，
于是图面落到「本会话尚未绑定 run」空态——**与真实未绑定同形**。冒烟侧的断言读一次
`paneTextOf` 就判，没有等"图面定态"。两者相加 = 一次瞬断就变成一条"产品合同违约"的红。

即第①类成立，且根因不止是冒烟时序：**图面把"读失败"渲染成"没有 run"**，这才是让红无法自解释
的地方。第②类（纯时序竞态）被排除——同一断连窗口里状态页/终稿页均正常，只有依赖 journal
绑定的图面缺内容。

## 修复判据

1. 图面区分两态：`boundSlug === null && followError !== null` → 标题「绑定状态读取失败」，
   正文说明"读不到 ≠ 没有 run"，并与「本会话尚未绑定 run」分开渲染；
2. 瞬时断连自愈：follow 失败后有界重试（3 次 / 2s 间隔），成功后自动补上，不要求用户重开页签；
3. 冒烟等显式状态：覆盖率断言改为**轮询上限 12s**；仍缺席时把图面的「绑定状态读取失败」标记
   带进判据说明（现场自解释，不再只说"没这一行"）；
4. 稳定性证据：修复后连跑 4 次 client-load-smoke 无同族红（修复前 3 次里红 1 次）。
