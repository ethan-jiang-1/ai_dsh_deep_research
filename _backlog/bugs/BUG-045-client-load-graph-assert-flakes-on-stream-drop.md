---
status: 排查中
severity: P2
opened: 2026-10-27
---

# BUG-045：client-load-smoke 的图谱断言在流断连时红（首跑红、重跑即绿）

> 严重级别：P2｜发现：2026-10-27｜状态：排查中

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

## 下一步（取证，不是修）

1. 用留存现场判断第①还是第②类：重放 `page.html` 的页签选择器状态；比对两次运行的同名断言顺序。
2. 黑盒复现：连跑 5 次 client-load-smoke，记录每次的 console 断连计数与图谱断言结果；若红与
   断连强相关 → 走①；若与断连无关但偶发 → 走②。
3. 定口径后再写 `## 修复判据`（候选：图谱断言改为等"图面已定态"谓词 + 断连时 verdict 记
   `DISCONNECTED` 并在报告里单列，不静默重试）。
