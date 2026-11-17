---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-238：peer 范围 `^0.2.1-rc.2` 比 `engines.dsh <=0.2.1-rc.5` 宽——peer 可解析到引擎范围外

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack 触面；DSH 组 peer = engines 闭区间，非 tag 组显式分组） — 结论：DSH-tag 组 peer 范围 = engines.dsh 同一闭区间；非 tag 组（cordis/schemastery）保留各自范围；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：[packages/deep-research-pack/package.json](../../../packages/deep-research-pack/package.json) 的
> `engines.dsh` 与 `peerDependencies`；门禁 = `pack-bundle-compat`（只查 engines 覆盖 vendor，不查 peers）。
> 探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md) 第三轮。

## 症状

`engines.dsh` 是闭区间：

```text
>=0.2.1-rc.2 <=0.2.1-rc.5
```

但所有 DSH 包 peer 用脱字符：

```text
"@deepseek-ai/dsh-session": "^0.2.1-rc.2"   # 语义 = >=0.2.1-rc.2 <0.3.0
```

`^0.2.1-rc.2` 包含 `0.2.1` 正式版与 `0.2.2` 等**引擎范围之外**的版本。一个用户可以用 DSH `0.2.1` 正式版
满足全部 peers（npm/pnpm 不报 peer 冲突），却违反 `engines.dsh`（`0.2.1 > 0.2.1-rc.5`）。两个合同互相矛盾，
**peer 解析可能把用户带到引擎不支持的范围**。

```sh
node -e "const p=require('./packages/deep-research-pack/package.json'); console.log(p.engines.dsh); console.log(p.peerDependencies['@deepseek-ai/dsh-session'])"
# >=0.2.1-rc.2 <=0.2.1-rc.5
# ^0.2.1-rc.2
```

## 分诊与授权

- 严重级：P2 — 版本合同不一致；`engines` 默认只 warn（除非 `engine-strict`），peer 却会按宽范围解析。
- 表面 / 边界：发布 manifest（版本合同）/ ② 静态（semver 范围）
- DSH 不变量：fail-loud；一个包只能有一个可安装版本集
- 触及面：pack 公共行为 + 文档合同（engines/peer）
- 授权：用户 2026-11-17 放行（pack 触面 → 修复就绪 = P2 修复授权；peer 范围对齐已拍板）
- 批：运行时/开发边界第三轮（版本合同）

## 复现

复现状态：稳定（无需安装）。

```sh
node -e "const p=require('./packages/deep-research-pack/package.json'); const obj=p.peerDependencies; const dsh=Object.entries(obj).filter(([k])=>k.startsWith('@deepseek-ai/dsh-')); console.log(dsh.length, new Set(dsh.map(([,v])=>v)))"
# 多数 ^0.2.1-rc.2
```

## 根因（已证）

`engines.dsh` 在 0.2.1-rc 期间用闭区间钉 vendor tag；peer 用常规脱字符（DSH 包版本跟随 tag）。
`pack-bundle-compat` 只断言 engines 覆盖当前 vendor tag；`row-deps` 只查包名；没有
「peer range ⊆ engines range」的判据；`pack-bundle-compat` 也不查 peer 版本面。

## 牵出的失败类

- 发布面 C3（双份版本事实）+ C7（门禁只验一边）；与 [BUG-232](BUG-232-row-deps-scope-no-lib-types.md) 同族，
  但载体是版本范围而不是包名。
- 还可能有反向问题：某些 DSH 包版本不是 tag 版本（如 `dsh-session-query-sqlite ^4.4.3`、`cordis ^4.0.5`），
  不能一刀切 `^0.2.1-rc.2`；守卫需按「跟随 DSH tag 的包」清单分组。

## 修法

1. 把跟随 DSH tag 的 peer 范围改为与 `engines.dsh` 一致的闭区间（或 `>=0.2.1-rc.2 <=0.2.1-rc.5`）；
2. 非 DSH-tag 包（`cordis`/`schemastery`/`sqlite`）保留各自范围，并在守卫里分组；
3. `pack-bundle-compat`/新 `pack-deps` 加「peer range ⊆ engines range」（对 DSH 组）；
4. 负控：把一个 peer 改成 `^0.3.0` → 红；`0.2.1` 正式版是否纳入 engines 由发布决定（二选一，不要两边不一致）。

## 修复判据

- DSH 组 peer 范围 ⊆ engines.dsh；非 DSH 组显式分组；
- 守卫对 `^0.3.0`/`^0.2.1` 注入红，对合法闭区间绿；
- `pack-bundle-compat` / `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/package.json",
    "checks/lib/repo/pack-deps.mjs",
    "tests/checks/pack-deps.test.mjs",
    "checks/smoke/pack.e2e.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/pack-deps.test.mjs",
    "exit": 1,
    "output": "not ok 6 - 真实 manifest… peerDependency「@deepseek-ai/dsh-tools」范围 ^0.3.0 ≠ engines.dsh >=0.2.1-rc.2 <=0.2.1-rc.5——同一可安装版本集只能有一个范围"
  },
  "green": {
    "command": "node --test tests/checks/pack-deps.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/pack-deps.test.mjs"
  }
}
```
