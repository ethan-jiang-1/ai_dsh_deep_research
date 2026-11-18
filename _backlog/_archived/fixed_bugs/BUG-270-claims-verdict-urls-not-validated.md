---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-270：claims.urls / verdicts.rechecked_urls 只验“字符串数组”——`javascript:`、非 URL、重复都过

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：URL 只认 http(s)+去重
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`checks/lib/gates/verdict-audit-core.mjs:84–86`（claims 只 `isStringArray`）、
> `:144`（rechecked_urls 只 `isStringArray`）、`:373–375`（只判非空）；模板 =
> `content/templates/run/claims.json` / `verdicts.json`。
> 探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

claims 的 `urls` 和 verdicts 的 `rechecked_urls` 是仲裁的锚，但只做“字符串数组”：

```js
for (const key of ['topics','evidence','urls']) if (!isStringArray(raw[key])) ...
if (raw.rechecked_urls !== undefined && !isStringArray(raw.rechecked_urls)) ...
if (claim.urls.length > 0 && supported && verdict.rechecked_urls.length === 0) ...
```

于是：

- `rechecked_urls: ["not-a-url"]` / `["javascript:alert(1)"]` 过；
- `urls: ["T1"]`（不是 URL）过；
- 重复 URL、`rechecked_urls` 指向 claim 之外的域、`rechecked_urls` 与 quote 不匹配，全不报；
- “重抓记录”只证明数组非空，不证明抓过。

## 分诊与授权

- 严重级：P2 — 裁决的 URL 证据可被任意字符串冒充；“重抓锚”名不副实。
- 表面 / 边界：claims/verdicts 合同 / ② 静态
- DSH 不变量：fail-loud；URL 字段要有 scheme/host 判据
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "
import {parseClaims,parseVerdicts} from './checks/lib/gates/verdict-audit-core.mjs';
console.log(parseClaims(JSON.stringify({version:1,finalRef:1,claims:[{id:'C1',text:'x',urls:['javascript:alert(1)']}]})));
console.log(parseVerdicts(JSON.stringify({version:1,round:1,batches:[{session:'s',preset:'critic',depth:1,raw:'[]'}],verdicts:[{claim_id:'C1',batch:0,verdict:'supported',quote:'q',rechecked_urls:['not-a-url']}]})));
"
# 无 URL 形状/重复 finding
```

## 根因（已证）

`isStringArray` 是唯一判据；没有 `URL` 解析、scheme 白名单（http/https）、host、去重。
`verdict-audit` 的 `rechecked_urls` 语义只到“非空数组”。

## 牵出的失败类

- 语义 C2（字段类型 ≠ 语义）+ C7；与 269（状态字段浅检）同族。
- 类级方向 = 所有 URL 字段（claims.url/verdict.rechecked/evidence.source_url/provenance.url）
  共用 `parseHttpUrl` + 去重；非 http(s) 一律红。

## 修法

1. 统一 `isHttpUrl`：`new URL` + protocol ∈ {http,https}；claims/verdicts 非法 → 红；
2. `rechecked_urls` 去重、host 合理（与 claim.urls 有交集或显式 reason）；
3. 测试：`javascript:`/`not-a-url`/重复 → 红；合法 URL → 绿；
4. 旧场按断代。

## 修复判据

- URL 字段非 http(s)/重复 → 红；合法 → 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/verdict-audit-core.mjs",
    "tests/run/gates/verdict-audit.spec.mjs",
    "packages/deep-research-pack/content/templates/run/claims.json",
    "packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md"
  ],
  "red": {
    "command": "node --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 1,
    "output": "not ok 36 - URL 字段只认 http(s)、去重（BUG-270）"
  },
  "green": {
    "command": "node --test tests/run/gates/verdict-audit.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/verdict-audit.spec.mjs"
  }
}
```
