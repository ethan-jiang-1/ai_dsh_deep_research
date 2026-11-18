---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-241：clean-room 的泄漏检查只硬编码 3 个包名——新增 peer 不会进入干净室判据

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：探测集从 peerDependencies 全量派生（peerNamesOf）；三入口共用，新增 peer 自动覆盖；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-move-residuals-ii.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 三干净室入口
>
> 位置：[checks/smoke/cold-start.entry.mjs](../../../checks/smoke/cold-start.entry.mjs) 第 51 行 ·
> [checks/smoke/release.entry.mjs](../../../checks/smoke/release.entry.mjs) 第 243 行 ·
> [checks/smoke/lifecycle.entry.mjs](../../../checks/smoke/lifecycle.entry.mjs) 第 203 行；
> 三处 `names: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives']`。
> 探索轮 = [搬家残差 II](../settled_issues/2026-11-18-move-residuals.md) A/B。

## 症状

干净室的「依赖解析不落仓根」检查只探测三个包名，而 `packages/deep-research-pack/package.json`
的 `peerDependencies` 有 30+ 项（client-ui / api / session / web / tool …）。新增一个 peer（例如
`@deepseek-ai/dsh-client-ui-session`）时：

- `pack-deps` 的发布物闭包会检查它（若被 require/import）；
- 但 clean-room 的 `moduleLeakOf` 不会探测它 → 安装测试无法发现「这个 peer 实际由仓内 symlink 提供」；
- 三处名单还各自手写，未来必漂（与 `count-free` 的双份事实同形）。

## 分诊与授权

- 严重级：P2 — 干净室覆盖窄于 peer 合同；新增 peer 时判据静默不扩。
- 表面 / 边界：干净室安装测试 / ② 行为（模块解析）
- DSH 不变量：fail-loud；干净室应检查**全部** peer，而不是抽样
- 触及面：none（测试基础设施）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（A/B）

## 复现

复现状态：稳定（读码 + manifest）。

```sh
grep -n "names: \['react'" checks/smoke/{cold-start,release,lifecycle}.entry.mjs
node -e "const p=require('./packages/deep-research-pack/package.json'); console.log(Object.keys(p.peerDependencies).length)"
```

## 根因（已证）

三个入口在 refactor 时抄了同一份 3 名样例（React + primitives），没有从 `peerDependencies` 派生；
`clean-room.mjs` 的 `moduleLeakOf` 只接收 `names`，不读 manifest；`clean-room-policy.test` 也不验名单覆盖。
`clean-room` 的注释说「解析不经过 ROOT/node_modules」，但名单是抽样。

## 牵出的失败类

- 干净室 C7（抽样冒充闭包）+ C3（三处手抄名单）；与 [BUG-240](BUG-240-clean-room-module-leak-base-home-root.md)
  同族，但这是**名单**而不是**解析基**。
- 类级方向 = 干净室探测集 = `peerDependencies`（减去 host 明确提供的 React？由决策）。

## 修法

1. `moduleLeakOf` 的调用方从 `pkg.peerDependencies` 派生 `names`（全部，或按「宿主提供」显式分组）；
2. 名单与 `pack-deps` 的 peer 集合同源，避免三处手写；
3. `clean-room-policy.test` 加一条：注入一个新 peer → 干净室探测集含它；名单少一个 → 红。

## 修复判据

- 三个入口的 `names` 与 peer 集合（或显式分组）一致；
- 新增 peer 时干净室自动探测（测试注入验证）；
- `pnpm test` / `pnpm test:entry` 相关件绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/harness/clean-room-policy.mjs",
    "checks/lib/harness/clean-room.mjs",
    "checks/smoke/cold-start.entry.mjs",
    "checks/smoke/release.entry.mjs",
    "checks/smoke/lifecycle.entry.mjs",
    "tests/checks/harness/clean-room-policy.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/harness/clean-room-policy.test.mjs",
    "exit": 1,
    "output": "not ok 6 - 探测集从 peerDependencies 全量派生… 全量 peer 名单必须命中 profile 里的仓内 symlink"
  },
  "green": {
    "command": "node --test tests/checks/harness/clean-room-policy.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/harness/clean-room-policy.test.mjs"
  }
}
```
