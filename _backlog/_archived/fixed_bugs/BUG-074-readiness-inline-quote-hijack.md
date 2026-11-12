---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-074：readiness 终局判定被「行内引用的旧判定」劫持——同行的真实 FAIL 读不出来（反向误杀 PASS）

> 严重级别：P1 ｜ 发现：2026-11-12 ｜ 状态：已修 — 同行多判定取「本轮/真实终局」的未包裹判定；引用/表格/空模板仍不夺权；五行 + 边界先红后绿；node-gate 真实 bundle 门③行为不变（2026-11-12，去向：none — 门禁解析修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/review-readiness.ts` 的 `terminalVerdictLine`（readiness 判据
> 单一正本）→ 消费方 `scripts/lib/node-gate-contracts.mjs` 的 `readinessOf` → node-gate 门A/门②③、
> run-accept、HITL2 前置。

## 症状

同一行里先**引用**一个旧判定（反引号/加粗包裹），再写**真实终局**时，解析器会取引用的那个值：

| 输入（review.md 里的一行） | 期望 | 实测 |
|---|---|---|
| `旧轮记录：\`readiness: PASS\`；本轮真实终局：readiness: FAIL` | FAIL | **PASS**（fail-open） |
| `` `readiness: PASS`；本轮 readiness: FAIL ``（行首即引用） | FAIL | **PASS**（fail-open） |
| `备注：**readiness: PASS**；本轮 readiness: FAIL` | FAIL | **PASS**（fail-open） |
| `- **第 1 轮**：\`readiness: FAIL\` 血统；本轮 readiness: PASS` | PASS | **FAIL**（误杀，交付被拦） |
| `- 上轮 \`readiness: PASS\`；本轮 readiness: FAIL` | FAIL | `null`（整行不识别 → 按非 PASS 处理） |

fail-open 方向尤其危险：review 文本里保留旧轮 PASS 的引用、同行写真实 FAIL 时，**门A 会当 PASS**，
交付可越过审查前置。

## 复现

```sh
node --import tsx/esm -e "
import { terminalVerdictLine } from './packages/deep-research-pack/src/lib/review-readiness.ts';
const t = '旧轮记录：\`readiness: PASS\`；本轮真实终局：readiness: FAIL';
console.log(terminalVerdictLine(t));   // → { value: 'PASS', line: … }（应为 FAIL 或 null）
"
```

## 根因（已证）

`stripVerdictDecor` 的「短标签 → 包裹壳 → 行首 readiness」链路会在**去掉前缀后**把行首的
反引号/星号壳剥掉，于是引用内容被当成判定行：

1. `旧轮记录：` 命中「短标签」规则（≤10 字 + 冒号）→ 剥掉；
2. 行首的 `` ` `` 命中包裹壳规则 → 剥掉；
3. 剩下 `readiness: PASS`；… → `VERDICT_LINE` 取**第一个**匹配 → PASS；
4. 同行的真实 `readiness: FAIL` 永远不会被看到（每行只取第一个 match）。

这与源码头注的断言不一致——注释写「行内引用（`- **第 1 轮**：\`readiness: FAIL\` 血统`）两条路径都不认」，
但实测 canonical 路径**会认**，且取的是引用的旧值（上表第 4 行就是注释里那个形态）。

单测现状：`tests/run/review-readiness.test.mjs` 覆盖了「旧轮引用在**独立行**」的形态（附录场景），
**没有覆盖「引用与真实终局在同一行」**——所以绿。

## 牵出的失败类

**「先剥装饰、再匹配」与「引用/引用块不可夺权」的边界没有载体**：剥离规则不知道剥掉的是「行首模板壳」
还是「行内引用的包围符」。同族检查方向：凡是以「去前缀后行首匹配」实现「终局行」的判据（readiness、
门③ 的拍板行、门C 的 canonical 指针），都应补「同一行还有别的判定词时取最后一个」或「引用内容不夺权」。

## 修复判据

1. 同一行出现多个 `readiness:` 判定时，**取最后一个**（或取未包裹在引用壳里的那个）：上表 fail-open
   三行必须判 FAIL/PASS 正确；第 4 行必须判 PASS；
2. `- 上轮 \`readiness: PASS\`；本轮 readiness: FAIL` 这类无标签/带散文的行也要正确解析（不能整行 null）；
3. 先红后绿：把上表五行加进 `tests/run/review-readiness.test.mjs`（当前 1–3、5 行红/错、第 4 行错）；
4. 既有覆盖不回归：附录独立行的旧轮引用仍不夺权；轮次标注（第 N 轮）仲裁不变；空模板不判；
5. `pnpm test` + `pnpm verify` 绿；`node-gate` 在真实 bundle 上行为不变（只有新形态改变）。

## 修复关联

P1 修理型但触及交付门（node-gate 门A/门②③、run-accept），按 [_backlog/AGENTS](../../AGENTS.md) 需评审
后再落地；与 BUG-036/040/046（readiness 解析历史）同源。发现方式 = 解析器变异矩阵（探索协议 §E3）。

## 已落地（2026-11-12）

- 证据 = `tests/run/review-readiness.test.mjs` BUG-074 五形态 + 边界；`pnpm test` 1246 绿、`pnpm verify` 全绿；真实 bundle `node-gate` 门③ PASS 不变。
- 去向 = none（门禁解析修复，不新增契约）。
