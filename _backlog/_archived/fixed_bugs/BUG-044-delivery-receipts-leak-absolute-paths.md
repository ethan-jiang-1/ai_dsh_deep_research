---
status: 已修
severity: P1
opened: 2026-10-27
---

# BUG-044：交付回执写入本机绝对路径（path-hygiene 在写回执之前跑）

> 严重级别：P1｜发现：2026-10-27｜状态：已修（2026-10-27）

## 症状

新契约 run bundle 的 `delivered.json` / `acceptance.md` / `node-gate.md` 可以写入本机绝对路径
（`/Users/<name>/...`），与「新 run 不写本机 home 绝对路径、run bundle 可单独移交」的合同冲突。
现网实例（新契约，`run.md` 有 `contract:`）：

```text
research-workspace/drt_cn-open-vs-us-closed-agentic/
  delivered.json:23   present.path = "/Users/bowhead/.../final/v1.md"
  acceptance.md:11    回执行里同一路径
  node-gate.md:9      门② present 声明里同一路径
```

后果有三层：① 移交 bundle 即泄漏本机用户名/目录；② 接收方打开回执得到断链；③ 同一 bundle
再次 `run-accept` 时，预检会读到旧回执里的绝对路径而 exit 1——成功过的 bundle 反而不能再验收。

## 复现

1. 在一个新契约 bundle 里由 Lead `present` 一份终稿（`deliverables/presented` 的 `files[].path`
   是绝对路径，这是 DSH 的现有语义）。
2. `node scripts/run-ops/run-accept.mjs <bundle>` → 绿，写出 `delivered.json` / `acceptance.md`。
3. `node scripts/run-gates/path-hygiene.mjs <bundle>` → exit 1（回执里有本机路径）。
4. 再跑一次 `run-accept` → 预检 `path-hygiene` 先扫旧回执 → 红，不再写。
   （现网 bundle 即此态。）

## 根因（已确认，不是假设）

顺序错误：`run-accept` 在 `scripts/run-ops/run-accept.mjs:75` 先跑 `path-hygiene` 预检，
在 `:125`/`:128`/`:142` 才写 `delivered.json` / `manifest.json` / `acceptance.md`。预检扫描的是
**上一次**的回执（`path-hygiene.mjs` 的文件清单含 `delivered.json`/`manifest.json`/`acceptance.md`），
首次验收时它们不存在，写完也不再复查。

值的来源：`scripts/lib/run-receipt.mjs:167` 把 `present.path` 原样写入；`present` 记录的是 DSH
`deliverables/presented` 事件里的绝对路径（vendor 语义：`present` 记绝对路径，不复制）。因此不能
只怪回执生成器——需要在写回执时把路径归一化/拒收，而不是假设上游给相对路径。

## 牵出的失败类

- **写后不复检**：凡是「预检 + 写回执」的两段式流程，都应把预检对象扩展到待写文件（先写临时文件、
  校验、再原子 rename），否则门禁只看历史，不看产物。
- **同一事实两个表示**：`present` 事件（绝对路径，权威）与回执（试图可移植）之间缺少明确的投影规则。
  回执要么存可复算标签（如 `<workspace>/drt_x/final/v1.md`），要么显式标「本机路径，不可移交」。

## 修法（已落地）

- **归一化**：`scripts/lib/path-hygiene.mjs` 新增 `portableBundlePath`——bundle 内绝对路径 →
  `drt_<slug>/final/vN` 相对标签；bundle 外 → `null`。`buildDelivered` 用它写 `present.path`，
  同时给 `presentGate` 的门② detail 归一（否则 `node-gate.md` 仍带本机路径）。
- **写前校验**：`run-accept` 先在内存生成 `delivered.json`/`manifest.json`/`acceptance.md` 文本，
  用同一 `scanHomePaths` 校验，红则不落盘；`manifest` 通过 `extra` 在落盘前登记 delivered（先文本
  sha256，避免「先写才能被看见」的时序依赖）。
- **写后复检**：node-gate/audit 的 `--write` 产物落盘后，再跑一次 `path-hygiene`（预检只看历史文件）。
- **历史回执**：`run-accept --repair` 只动可再生产物——归一化 `delivered.json` 的 present、
  删除 `acceptance.md`/`node-gate.md`（验收时重建）；bundle 外路径记 `path:null` + `unportable:true`，
  由交付侧拒收。

## 修复判据

- 新跑 `run-accept` 的 bundle：`delivered.json` / `acceptance.md` / `manifest.json` 零本机绝对路径
  （含 `/Users/`、`/home/`、`$HOME` 形态）；`present` 仍可回查到具体事件。
- 同一 bundle 连续两次 `run-accept` 均绿（幂等），不再出现「成功过就不能再验收」。
- 旧 bundle 按 D28 epoch 豁免，行为不变；`guides/65 §5` 与新行为一致。
- 红测先证：构造一个 `present` 为绝对路径的 fixture，修前 `run-accept` 写出绝对路径（红），修后
  相对化且干净（绿）。

## 修复证据（2026-10-27）

- 红测：`tests/run/run-receipt.test.mjs` 新增「绝对 present → 相对标签」「bundle 外 → null+unportable」
  两条，实现前 2 条红；`tests/run/node-gate-witness.test.mjs` 新增 presentGate 绝对/外部两条；
  `tests/run/path-hygiene.test.mjs` 新增 `portableBundlePath` 五条。全绿。
- 合成 bundle 实跑：`run-accept <tmp> --repair` → 三条 REPAIR（delivered 归一 + 删 acceptance/node-gate），
  预检 `path-hygiene` 干净。
- 现网真 bundle 实跑：`research-workspace/drt_cn-open-vs-us-closed-agentic`（新契约）`--repair` 后
  run-accept **绿**；`path-hygiene` 干净（69 文件）；同一 bundle 第二次 run-accept 仍绿（幂等）；
  `delivered.json present.path = drt_cn-open-vs-us-closed-agentic/final/v1.md`，
  `acceptance.md` / `node-gate.md` 的 present 行均为相对标签。
- 回归：`pnpm test` 879 → 见收尾轮实际计数；`pnpm verify` 全绿。
