---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-394：parseReadinessDeclaration 的重复键正则检查可被 Unicode 转义绕过

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：重复键判定改零依赖 JSON key scanner（解码 \uXXXX / \" ，任意层级 fail-closed）；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`review/readiness.json` 中的键名若使用 JSON 合法 Unicode 转义（例如 `"\u0072eadiness": "PASS"` 与 `"readiness": "FAIL"` 并存），`parseReadinessDeclaration` 无法检出重复键，会由 `JSON.parse` 静默取最后一个值放行（`ok: true`），违反重复键 fail-closed 契约。

## 分诊与授权

- 严重级：P2 — 结构化声明解析器存在明确的 fail-open 绕过通道。
- 表面 / 边界：pack lib（[review-readiness.ts](../../../packages/deep-research-pack/src/lib/review/review-readiness.ts)）/ ② 行为（纯函数）。
- DSH 不变量：fail-loud — 同一声明对重复键不得静默取末值。
- 触及面：none — pack lib + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 直接调用 `parseReadinessDeclaration` 传入 Unicode 转义重复键 JSON 即可复现。

```sh
node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { parseReadinessDeclaration } from "./packages/deep-research-pack/src/lib/review/review-readiness.ts";
const dup = "{\"version\":2,\"\\u0072eadiness\":\"PASS\",\"readiness\":\"FAIL\",\"conditional\":false,\"counts\":{\"critical\":0,\"major\":0,\"minor\":0,\"unverified\":0,\"rechecked_urls\":0}}";
assert.equal(parseReadinessDeclaration(dup).ok, false);
'
```

## 根因（已证）

[review-readiness.ts](../../../packages/deep-research-pack/src/lib/review/review-readiness.ts)（第 226 行）用正则 `"(version|readiness|...)"\s*:` 在原始文本上匹配字面键名，既不解码 `\uXXXX` 转义，也无法在语法树层准确识别 JSON 对象成员键。

## 牵出的失败类

- 同机制第 1 次｜处置：实例修（把重复键检查改为对对象键逐个解码检查或轻量 JSON key scanner，不依赖字面正则）。

## 修法方向

- 用小型零依赖 JSON key scanner（支持解码 `\"` 与 `\uXXXX`）在每一层对象边界检测重复 decoded key，或在进入 `JSON.parse` 前按 token 扫描成员键。

## 修复判据

- 任意位置（含顶层与 `counts` 子对象）通过字面量或 `\uXXXX` 转义构造的重复键均返回 `{ ok: false }`。
- 字符串值内部偶然出现的 `"version":` 或合法含转义非重复键仍可正常解析（负控）。

## 修复落地（2026-11-24）

红证配方：把重复键判定退回已知键字面正则（不解码 `\uXXXX`）→ 转义重复键静默取末值。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/review/review-readiness.ts",
    "tests/run/gates/readiness-declaration.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-394 负例' tests/run/gates/readiness-declaration.spec.mjs",
    "exit": 1,
    "output": "expected false / actual true"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/readiness-declaration.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/readiness-declaration.spec.mjs"
  }
}
```
