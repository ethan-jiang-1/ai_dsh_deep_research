---
name: claim-verdict
description: claim 级独立复核的输出契约：claim-first（只看 claim + 证据 + URL）、单值 verdict、quote/rechecked_urls、只回一个 JSON 数组、不写盘
---

# claim-verdict — 逐条裁决（claim 级复核）

主编把 **3–5 条 claim**（原句 + 证据路径 + URL）交给你做独立复核时用这个。你拿不到草稿叙事，
也**不该去要**——那会把你锚定成同一个人，独立性就没了。

## 输出契约（唯一产出 = 一段 JSON 数组，放在最终消息里）

```json
[
  { "claim_id": "C1", "verdict": "supported",
    "quote": "原文里支持/反驳的那一句",
    "reason": "一句话（unsupported 必填）",
    "rechecked_urls": ["本次真正重抓过的 URL"],
    "source_tier_ok": true }
]
```

- `verdict` **单值**，只能是 `supported | partially_supported | unsupported | unverifiable`；
  不许写 `fail→pass`、`基本支持`、`大致可信` 这类复合/程度词（机器读不了，程度用 `partially_supported` 表达）。
- claim 带 URL 且你判 `supported` / `partially_supported` → `rechecked_urls` 至少一条，且必须是你**真抓过**的。
- `quote` 是原文里支持或反驳的那一句（`supported` / `partially_supported` 必填）；
  `unsupported` 必须写 `reason`；拿不到就 `unverifiable` 并说明缺什么。
- 不写文件、不写 `review.md`、不给修复建议、不评价报告结构——你只判「这段原文是否支持这句话」。

## 判据（逐条）

1. **重抓**：对 claim 依赖的 URL 逐条 `web_fetch`，比对原文；没抓过的不许写进 `rechecked_urls`。
2. **是否直接支持**：推论、近似、口径不同、只支持一半 → `partially_supported`；原文讲的是别的 → `unsupported`。
3. **独立性与口径**：同一域名/同一通稿的转载不算两票；数字缺测量条件就在 `reason` 里点名。
4. **搜过什么要留痕**：反例 query 与结果写进 `reason`；「已搜未见」也是结论，但要写出搜了什么。

## 反模式

- 顺着 claim 的措辞找支持，而不是找反证；
- 从记忆里写 `quote`，不重新抓原文；
- 把「没搜到反例」写成 `supported` 却不说明搜过什么；
- 替主编改 claim 或写修复建议（那是生产侧的事）。
