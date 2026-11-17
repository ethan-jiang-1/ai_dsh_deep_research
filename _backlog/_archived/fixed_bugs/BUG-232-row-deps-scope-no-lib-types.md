---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-232：`row-deps` 只查 preset/bundle 行——`lib/*.js` 的 require 与 `.d.ts` 的 import 不在 peer 对账面

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行门禁触面；发布物 require / .d.ts import ↔ peers 双向对账） — 结论：pack-deps 双向对账（require/.d.ts import ⊆ peers；死 peer；范围=engines），pack.e2e 在真 tarball 上跑；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：[checks/verify/gates/b-pack.mjs](../../../checks/verify/gates/b-pack.mjs) 的 `row-deps`（第 142–159 行）；
> 缺口实例 = [BUG-229](BUG-229-client-bundle-react-peer-missing.md) / [BUG-230](BUG-230-shipped-surface-devref-lookbehind-bypass.md) /
> [BUG-231](BUG-231-shipped-surface-source-scan-gaps.md)。
> 探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

`row-deps` 的扫描面只有 `presets/*.patch.yml`、`workers/*.patch.yml`、`cordis.patch.yml` 里的
`name: '@deepseek-ai/...'` 行；**不扫**发布产物的 `lib/*.js` 的 `require(...)`，**不扫**
`lib/types/**/*.d.ts` 的 `import ... from`。

所以：

- `lib/client.js` `require("react")` / `react-dom` → peer 缺失，**绿**（229）；
- 公开 `.d.ts` import `dsh-client-ui-session` / `-slots` / `-tool` → peer 缺失，**绿**（230）；
- `.d.ts` import `dsh-experimental-agent-team`、peer 里却多一个 `experimental-client-ui-agent-team` → **绿**（231）。

`row-deps` 证明的是「YAML 行声明的包在 peers」，不是「发布物实际需要的包 = peers」。两个方向的缺口都在。

## 分诊与授权

- 严重级：P2 — 门禁假绿；本轮一次就带出 3 个 peer 缺口实例。
- 表面 / 边界：发布面门禁 / ② 静态（构建产物 + 类型声明 + manifest）
- DSH 不变量：fail-loud —— 运行时/类型依赖未声明必须红
- 触及面：门禁与验收合同（扩 `row-deps` 或新增 `pack-deps`）
- 授权：用户 2026-11-17 放行（门禁触面 → 修复就绪 = P2 修复授权）
- 批：运行时/开发边界第三轮（依赖面）

## 复现

复现状态：稳定。

```sh
node checks/verify/verify.mjs --only=row-deps   # 绿
grep -n 'require("react' packages/deep-research-pack/lib/client.js   # 未声明
grep -rhoE "from '@deepseek-ai/[^']+'" packages/deep-research-pack/lib/types --include='*.d.ts' | sort -u
node -e "const p=require('./packages/deep-research-pack/package.json'); console.log(Object.keys(p.peerDependencies).length)"
```

## 根因（已证）

`row-deps` 的判据来源是**声明文件**（YAML 行），不是**发布物实现**（`lib/` 构建产物 + `.d.ts`）；
实现里的外部依赖在 dev 环境由根 `node_modules` 的 devDeps 兜底，所以 `pnpm verify`/`pnpm test` 全绿。
`pack-manifest`/`client-half`/`pack.e2e` 也不查 peer 完整性。

## 牵出的失败类

- 发布面 C2（消费者遗漏）+ C7（门禁只验声明面）；与 [BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)
  同族的「发布物实现 vs 声明」缺口。
- 类修方向 = 发布物依赖闭包（`lib/*.js` require ∪ `lib/types/**/*.d.ts` import）对 `peerDependencies` 双向对账。

## 修法

1. 扩展 `row-deps` 或新增 `pack-deps`：
   - 前向：从 `lib/*.js` 抽 `require('<非相对>')`、从 `lib/types/**/*.d.ts` 抽 `from '<非相对>'`，包名（scoped 取前两段）
     必须 ∈ `peerDependencies`（排除 `node:*`、相对路径、打包内 chunk）；
   - 反向：`peerDependencies` 的每个包要么被上述 import 使用，要么在 `presets/workers/cordis` 行里被声明（现有扫描），
     否则红/显式 allowlist；
2. 负控：在 `lib/client.js` 注入 `require('left-pad')` → 红；在 `.d.ts` 注入未声明 import → 红；合法 peers 绿；
3. 防空语料：抽到的非相对 import 数下限。

## 修复判据

- 当前树先红（229/230/231 三组），修完后绿；
- 正向/反向/负控/防空四态齐；`pnpm verify` / `pnpm test` 绿；
- 不误伤 `node:*`、相对 import、tsdown chunk、`react`（若加入 peers）。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/pack-deps.mjs",
    "tests/checks/pack-deps.test.mjs",
    "checks/smoke/pack.e2e.mjs",
    "packages/deep-research-pack/package.json"
  ],
  "red": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 1,
    "output": "FAIL  发布物依赖闭包 = peers（正向/反向/范围） — 发布物 require/import「left-pad」不在 peerDependencies（包名 left-pad）"
  },
  "green": {
    "command": "node checks/smoke/pack.e2e.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/pack-deps.test.mjs"
  }
}
```
