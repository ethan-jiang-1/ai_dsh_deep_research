---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-245：`shipped-surface` 的 dev-root 词表漏 `src/` 与 `packages/`——发布物引用开发源码仍绿

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：src/packages 入 dev-root 闭集；package.json 排除（repository.directory 是 npm 元数据）；README 源码表改写；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-move-residuals-ii.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 三干净室入口
>
> 位置：[checks/lib/repo/shipped-surface.mjs](../../../checks/lib/repo/shipped-surface.mjs) 的
> `FREE_DEV_ROOTS` / `AMBIGUOUS_DEV_ROOTS`；实例 = [BUG-244](BUG-244-pack-client-bundle-src-path-comments.md)
> （`lib/client.js` 10 条 `src/`/`packages/` 引用）。探索轮 = [搬家残差 II](../settled_issues/2026-11-18-move-residuals.md) B。

## 症状

发布面守卫能抓 `checks/` / `tests/` / `tools/` / `probes/` / `_backlog/` 等，但对以下形态返回空：

```text
devRefsOf('see src/lib/foo.ts')        → []
devRefsOf('see packages/foo/bar.ts')   → []
devRefsOf('see AGENTS.md')             → []（无斜杠，非路径）
```

`src/` 与 `packages/` 都是开发源码树（tarball 不含）；所以 244 的 10 条引用、以及未来任何
“见 src/lib/…” 的发布文本，都能通过 `shipped-surface.test` 与 `pack.e2e`。上一轮 224/225/230/231
的修复只扩展了词表的一部分，**源码根没有进闭集**。

## 分诊与授权

- 严重级：P2 — 发布面门禁假绿；实例已在发布 bundle 中（244）。
- 表面 / 边界：发布面门禁 / ② 行为（纯函数）
- DSH 不变量：fail-loud；发布物不得引用未发布源码
- 触及面：门禁与验收合同（`shipped-surface` 词表）
- 授权：用户 2026-11-18 放行（门禁与验收合同触面 → 修复就绪 = P2 修复授权）
- 批：搬家残差 II（B）

## 复现

复现状态：稳定。

```sh
node --input-type=module -e "
import {devRefsOf} from './checks/lib/repo/shipped-surface.mjs';
for (const s of ['see src/lib/foo.ts','see packages/foo/bar.ts']) console.log(s, devRefsOf(s));
"
grep -cE '(^|[^A-Za-z0-9_.-])(src|packages)/' packages/deep-research-pack/lib/client.js   # 10
node checks/verify/verify.mjs --only=shipped-surface 2>/dev/null || true
```

## 根因（已证）

dev-root 闭集是手工枚举：`checks/tests/tools/probes/_backlog/_dist/.agents` + 歧义根；`src` 与
`packages` 未入表。`AGENTS.md`/`README` 等无斜杠开发件也不在路径匹配面。守卫测试只覆盖已入表的根。

## 牵出的失败类

- 发布面 C7（词表窄于源码树）+ C2；与 [BUG-244](BUG-244-pack-client-bundle-src-path-comments.md)
  是「守卫 vs 实例」一对，与 230/231 同一族。
- 类级方向 = dev-root 词表从「发布物 `files` 之外的本仓源码根」派生，或至少把 `src`/`packages` 加入并
  负控；歧义（`src` 是否可能指运行期目录）需显式判。

## 修法

1. `FREE_DEV_ROOTS` 加 `src`、`packages`（若要区分第三方 `packages/…`，用“本仓顶层存在”判）；
2. 无斜杠开发件（`AGENTS.md`、`README`?）单列；README 本身随包，不能一概禁；
3. 测试矩阵加 `src/lib/foo.ts`、`packages/x/y.ts`、`src/` 裸根；负控 = 运行期词（`content/`、`presets/`、`drt_`）仍绿；
4. 与 244 同上：重构建后零命中。

## 修复判据

- `src/`/`packages/` 引用在随包文本中必红；当前树 244 的 10 条先红；
- 运行期词不误伤；`shipped-surface.test` / `pack.e2e` / `pnpm verify` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/repo/shipped-surface.test.mjs",
    "checks/smoke/pack.e2e.mjs",
    "packages/deep-research-pack/README.md",
    "packages/deep-research-pack/README.zh.md",
    "packages/deep-research-pack/cordis.patch.yml"
  ],
  "red": {
    "command": "node --test tests/checks/repo/shipped-surface.test.mjs",
    "exit": 1,
    "output": "not ok 1 - 随包文本零开发面引用… src/client/… src/lib… packages/…（词表加根后的真红）"
  },
  "green": {
    "command": "node --test tests/checks/repo/shipped-surface.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/shipped-surface.test.mjs"
  }
}
```
