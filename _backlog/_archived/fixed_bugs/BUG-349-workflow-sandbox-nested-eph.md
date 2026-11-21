---
status: 已修
severity: P2
opened: 2026-11-21
---

# BUG-349：run 通道从代理沙箱启动时，workflow 的 W2 脚本扇出必失败（sandbox-exec EPERM）

> 严重级别：P2 ｜ 发现：2026-11-21 ｜ 状态：已修（2026-11-21）— 结论：启动探测嵌套沙箱，运行时上下文显式声明脚本层不可用；不改 vendor、不假装已执行；审查：agent — 注入红回归 + 真环境探测；去向：none — 环境处置
>
> 现场 = `research-workspace/drt_sodium-ion-bess/waves/W2.json`；run 通道 = 3083。

## 症状

P5 run 的 plan v2 把 W2 定为 `lens-fanout` 脚本层（executor = research-wave，4 cells）。
实际执行时 workflow 工具在**阶段开始前**就报错，零 agent 启动：

```json
"stop_reason": "error",
"errors": ["workflow run failed: workflow execution failed (sandbox-unavailable): sandbox-exec: sandbox_apply: Operation not permitted"]
```

lead 只能降级为 4 个一次性 subagent 补跑；W2 的"脚本扇出"能力在本轮完全没有被验证。

## 根因

run 通道由 DSH 代理在**已被沙箱化的进程**里启动（seatbelt），workflow 工具再起
`sandbox-exec` 做第二层沙箱 → 嵌套 apply 被拒。用户在自己的终端起通道不会遇到；但本仓
文档化的开发环正是代理操作 run，所以这是常态路径。

同轮还叠加了另一个沙箱限制：Playwright MCP 的缓存目录在 `~/Library/Caches`，同样 EPERM
（见 `leads.md` 的通道表）。

## 复现

```sh
# 在 DSH 代理会话里起通道（tools/channel/run-driver.mjs up）→ 跑一个含 Wave 执行的 plan
# 检查 waves/W2.json：stop_reason=error, sandbox_apply: Operation not permitted
```

## 修法（需拍板）

1. run 通道启动时探测外层沙箱；在嵌套环境下把 W2 路由到"对话层 subagent 扇出"并显式记 deviation；
2. 或给 workflow 提供 `sandbox: none/inherit` 选项（由 DSH 侧决定）；
3. 或文档化"代理起的通道不做脚本层扇出"，plan 在嵌套环境不生成 W2 脚本行。

## 修复判据

- 嵌套环境下 W2 要么真跑（子代理启动数 = cells），要么在 plan/waves 里显式记 `sandbox-unavailable`
  降级且不声称脚本层已执行。
- 非嵌套环境脚本层仍绿（负控：不能把功能整体删掉）。
- `waves/W2.json` 的 `agents_started` 与实际子会话数一致。

可关闭：否

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "tools/channel/start-channel.mjs",
    "checks/lib/shared/sandbox-capability.mjs",
    "packages/deep-research-pack/src/content/index.ts",
    "tests/run/shared/sandbox-capability.spec.mjs",
    "tests/pack/content/content-effect.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/pack/content/content-effect.spec.mjs",
    "exit": 1,
    "output": "注入回归：删掉 capabilityNote 的 env 判断 → 嵌套环境 runtime context 不出现「脚本层沙箱不可用」（1 例红）"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/pack/content/content-effect.spec.mjs",
    "exit": 0,
    "output": "2 例全过（非嵌套无提示 / 嵌套有提示）；本环境实测 /usr/bin/sandbox-exec 探测 status=71「Operation not permitted」→ env=1"
  },
  "guard": {
    "path": "tests/pack/content/content-effect.spec.mjs"
  }
}
```

边界：探测只决定模型可见提示；workflow 的 `sandbox-unavailable` 仍由 waves 如实记录（不改 vendor、不伪造脚本层执行）。非嵌套环境 env 不置位，注入文本与重录快照完全一致。

可关闭：是
