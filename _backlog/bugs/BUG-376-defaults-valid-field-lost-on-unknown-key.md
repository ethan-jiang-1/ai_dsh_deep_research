---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-376：research-defaults.json 有未知键时，合法 effort 被静默丢弃却提示「未知字段已忽略」

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/config-defaults-mixed-verdict.json` + `config-defaults-mixed.png`；
> 夹具 = `runtime/e2e/config-defaults-mixed-e2e.mjs`。

## 症状

工作区的 `research-defaults.json` 含**合法** `effort: "deep"` 和一个未知键 `unknown: "x"`。
打开「研究配置」页签：

```text
未知字段已忽略：unknown:unknown；写入前请先修正 research-defaults.json（不会被静默删除）。
...
深度自动（由 Lead 判断）
```

提示说“未知字段已忽略”，但合法的 `effort: deep` 也被丢了——深度显示「自动」。用户会以为
只有未知键被忽略、`deep` 仍生效，实际文件被整体 fail-closed 成空默认。

## 证据

seed 工作区写入：

```json
{ "schema": 1, "effort": "deep", "unknown": "x" }
```

真浏览器打开研究配置页签。verdict（`runtime/e2e/config-defaults-mixed-verdict.json`）：

```json
{
  "failureShown": false,
  "paneText": "…… 未知字段已忽略：unknown:unknown；写入前请先修正 research-defaults.json（不会被静默删除）。 …… 深度自动（由 Lead 判断） ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/config-defaults-mixed-e2e.mjs
```

## 根因

`DefaultsStore` 对 `research-defaults.json` 走 fail-closed 解析：任何未知键 → `problems`，
`value` 保留 `emptyDefaults()`（或未合并的合法字段）。视图把 `problems` 渲染成
「未知字段已忽略」，但 `value` 已是空默认，于是：

- 文案声称只忽略未知键；
- 合法 `effort: deep` 没有进入按钮/面板状态；
- 用户看到「自动」，与磁盘文件冲突，且没有“整份文件无效”的提示。

## 修法方向（未实施）

- 两种取向选一并写进合同：
  - **保留合法字段**：解析已知键、列出未知键 warning，合法值照常生效；
  - **整份 invalid**：不显示“未知字段已忽略”，而是「默认文件含未知字段，整份不生效」+
    修正入口；按钮/面板明示“文件无效”，不是“自动”。
- 不要用“已忽略未知字段”的文案掩盖整份 fail-closed 的效果。
- 保留无文件/空文件 = 自动（负控）；合法文件 = 对应值（正向）。

## 修复判据

- 合法字段 + 未知键 → 要么合法字段生效且只警告未知键，要么明示整份文件无效；
  不允许“深度自动 + 未知字段已忽略”的矛盾。
- 仅合法字段 → 深度/输出/来源照常生效（正向）。
- 无文件/空文件 → 自动（负控）。
- 未知键但无合法字段 → 明确 invalid/警告，不冒充自动（若选 invalid 取向）。
- 红证：把 mixed 文件的 `value` 折回 empty 且保留“已忽略未知”文案 → 本夹具再次出现
  “自动 + 已忽略”，exit 1；还原后绿。
- guard 落点：`parseDefaults`/`DefaultsStore` 的 mixed 键矩阵 + 面板文案，或浏览器层用例。
