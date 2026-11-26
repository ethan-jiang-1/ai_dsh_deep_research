---
status: 已修
severity: P0
opened: 2026-11-27
---

# BUG-436：run-context 默认 40 行上限截断 protocol.json / topics.md / claims.json / verdicts-rN.json，导致真实契约在 Status 页显示「契约无效」

> 严重级别：P0 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：canonical EOF_NAME 补齐 protocol.json / topics.md / review/claims.json / review/verdicts-r<N>.json / claims.json / verdicts.json；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在包含合规 `protocol.json`（58 行 UTF-8 JSON，状态 `approved`）的完整沙箱 bundle 上打开「研究状态」页签（Light 1440×900 / Dark 1440×900 / EN 1440×900），`ProtocolCard` 却全部降级显示为：
- `data-protocol-state="unreadable"`
- 标签：`契约无效`（EN：`Invalid`）
- 文案：`protocol.json 读取失败或不合法——请重试或检查目录。`

仓库模板本身 [content/templates/run/protocol.json](../../../packages/deep-research-pack/content/templates/run/protocol.json) 就已有 **52 行**，超过 40 行截断红线——因此任何按模板生成的真实 `protocol.json` 在观察面都会触发误报 `契约无效`。

## 根因与边界

- [run-context.ts](../../../packages/deep-research-pack/src/lib/run/run-context.ts)（`L95-L112`） 的 `EOF_NAME` 正则未包含 `protocol.json`、`topics.md`、`review/claims.json`、`review/verdicts-r<N>.json`（或 `claims.json` / `verdicts.json`），导致 `readPolicyOf(name)` 退回 `DEFAULT_LINES = 40`；
- 超过 40 行时 `view.read(...)` 返回 `truncated: true`；
- [artifact-read.ts](../../../packages/deep-research-pack/src/lib/run/artifact-read.ts)（`L133`） 将 `outcome.value.truncated === true` 判定为 `unreadable`，于是完整 JSON 尚未解码就被判失效。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/stage234.log`、`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/06-status-protocol-radar-light-1440.png`、`13-dark-status-1440.png`、`18-en-status-1440.png`。

## 复现

```sh
wc -l packages/deep-research-pack/content/templates/run/protocol.json
# 实测 52 行 > DEFAULT_LINES(40)；真浏览器 Stage 2 `06-status-protocol-radar-light-1440.png` 复现 data-protocol-state="unreadable"
```

## 修复判据

1. `EOF_NAME` 覆盖 `protocol.json`、`topics.md`、`review/claims.json`、`review/verdicts-r<N>.json`（及各自兼容路径），确保按模板尺寸的文件完整读到 `eof`；
2. 真浏览器打开含 52+ 行 `protocol.json` 的会话时，`ProtocolCard` 渲染 `data-protocol-state="ok"` 与 `approved` 内容（非 `契约无效`）；
3. `node:test` 单测覆盖 >40 行 `protocol.json` / `topics.md` / `claims.json` / `verdicts-r1.json` 不被 `DEFAULT_LINES` 误截断。

## 分诊与授权

- 严重级：P0 — canonical 工件落回 40 行上限，导致 Status/Final/Hub 读完整契约与裁决必遭截断判错。
- 表面 / 边界：run-context 读策略表（`packages/deep-research-pack/src/lib/run/run-context.ts`）。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`run-context.ts` 的 `EOF_NAME` 正则遗漏 `protocol.json`、`topics.md`、`review/claims.json`、`review/verdicts-r<N>.json`、`claims.json`、`verdicts.json`，使这些文件落入 `DEFAULT_LINES = 40` 固定行窗而被截断成 `truncated: true` → `unreadable`。

## 修法

补全 `EOF_NAME` 正则覆盖上述全部 canonical 工件，并在 `tests/cockpit/lib/run/artifact-read.spec.mjs` 增加类级守卫确保 `ARTIFACT_POLICY` 中除 `plan.md` 外均走 `'eof'`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/run-context.ts",
    "tests/cockpit/lib/run/artifact-read.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --test tests/cockpit/lib/run/artifact-read.spec.mjs",
    "exit": 1,
    "output": "BUG-436 readPolicyOf：40 !== 'eof'"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/lib/run/artifact-read.spec.mjs"
  }
}
```
