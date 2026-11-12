---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-142：client-load 的绑定会话选择未限定 lead——富的 method-editor 会话被选中，状态页断言假红（X8 68 PASS / 4 FAIL）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — client-load 绑定会话只选 lead 根，富 method-editor 会话不再冒充 run 会话（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`scripts/smoke/client-load-reference.mjs:109-116`（`boundSession` 选择器）。
> 上一次绿：`620ff4d3`（76 PASS / 0 FAIL）；本次红：`275b8c03`（**68 PASS / 4 FAIL**）。

## 症状

在 `275b8c03` 上跑 `client-load-smoke`：

```
FAIL 重入点描边（回边落点 = 挖掘；交付审阅非 upcoming 才扫边）（outline=none（loopOn=true））
FAIL ↻ rerun 三分图例 = NODES 合同（…）（loopOn=true labelsVisible=false（anchor-2=passed tailAskPending=false））
FAIL 停靠点诚实线 = 盘侧真值（deriveAnchors 合流……）（盘侧 passed=2）
client-load-smoke: 3 FAILURE(S)   （总 68 PASS）
```

失败现场：`runtime/smoke-workspace/client-load-2026-11-12T19-09-00-886Z/`（page.png/page.html/meta.json）。

`meta.json` 的绑定对象：

```
boundSession: method-coach-0d7456dd-…   title: 方法编辑
boundSlug:    cn-us-ai-perception
```

该会话的 header：**`agentPreset = method-editor`（depth 0）**，但它 **写**过
`research-workspace/drt_cn-us-ai-perception/run.md`（`sessionBindingOf` → `boundBy: write`），事件数 ≥ RICH_FLOOR(60)，标题唯一 —— 于是被选择器当成「真实 run 的绑定会话」。

状态页的「重入点描边 / rerun 图例 / 停靠点诚实线」断言按**lead 的 run 会话**事实（HITL 锚点、
回边、passed 数）判；method-editor 会话的 journal 没有这些锚点 → 页面如实为空 → 4 项断言假红。

## 复现

```sh
source dev/env.sh
node --import tsx/esm scripts/smoke/client-load-smoke.mjs
# → meta.json 的 boundSession.title = 方法编辑；3 条状态页断言失败
# 该会话可独立验证：
#   zstd -dc runtime/harness-home/sessions/*/method-coach-*/session.v4.jsonl.zstd | grep '"agentPreset":"method-editor"'
#   sessionBindingOf(events) → { slug: 'cn-us-ai-perception', boundBy: 'write' }
```

## 根因（已证）

`client-load-reference.mjs` 的 `boundSession` 只按「近窗绑定 + 事件数 ≥ RICH_FLOOR + 标题唯一」选最新，
**不校验会话是不是 lead 根**：

```js
const rich = candidates.filter((c) => c.eventCount >= RICH_FLOOR)
const pool = rich.length > 0 ? rich : candidates
const unique = pool.filter((c) => titleCounts.get(c.title) === 1)
return unique.length > 0 ? unique[0] : …
```

`candidates` 来自 `sessionBundleOf(windowedEvents) !== undefined`（任何**写过/读过** bundle 的顶层会话）。
method-editor 根会话在 profile 级拿到全部工具（见 BUG-143），一旦它写了 `drt_` 文件，就成为「真实 run
的绑定会话」——选择器的意图（渐进面真值）与它的判据（有绑定即可）不一致。

## 影响面

- X8 的 3–4 项状态页断言**假红**，掩盖真实产品回归（对话流/方法库等 68 项仍绿，但红项把整门判红）；
- 观察面的「绑定会话」会随 dev home 里任意富会话漂移（0=方法编辑，下次可能是 method-coach/探针），
  不稳定；
- 与 BUG-143（method-editor 越权）叠加：越权会话越多，选择器越容易选错。

## 修复判据

1. `boundSession` 候选加**角色门**：`agentPreset === 'lead'`（`delegationDepth === 0`；或至少排除
   `method-editor`/`method-coach` 等非研究根角色）；
2. 若产品确实希望 method-editor 也能看 run 状态：把断言改为「按该方法编辑会话自己的锚点真值」，
   而不是 lead 的 anchor/outline/legend 判据（二选一，不能既用 coach 会话又按 lead 期望判）；
3. 先红后绿：当前 dev home（含该 method-editor 会话）跑 X8 → 修复后选择 lead 会话、3 项恢复绿；
   另造一个「只有 method-editor 富会话」的 home → 冒烟应选 lead 或 exit 2（未跑），不得假红；
4. `pnpm test` + `pnpm verify` 绿；`meta.json` 的 boundSession 断言加 preset 记录。

## 修复关联

与 [BUG-143](BUG-143-method-editor-root-has-team-lead-tools.md)（method-editor 越权）
同场景；与 BUG-001 的
「写强读弱」同族：选择器的判据需要比「有绑定」更强（角色 + 写命中 + 非探针）。发现方式 = X8 红后读
失败现场与选中会话的 header。

## 已落地（2026-11-13）

- 证据 = `tests/run/client-load-select.test.mjs` BUG-142。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
