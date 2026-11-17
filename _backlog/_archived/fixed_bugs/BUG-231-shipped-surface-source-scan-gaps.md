---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-231：`shipped-surface.test` 的源侧扫描漏 `content/**/*.js` 与 `locale*`——push 绿，nightly 才红

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（自授权 P2：测试覆盖） — 结论：源侧扫描集由 files 允许集派生（覆盖 content/**/*.js 与 locale*），pack.e2e 断言发布文本集 ⊆ 源侧集；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：[tests/checks/shipped-surface.test.mjs](../../../tests/checks/shipped-surface.test.mjs) 的
> `shippedSources()`（第 38–42 行）；对照 = [checks/smoke/pack.e2e.mjs](../../../checks/smoke/pack.e2e.mjs)
> 的 `shippedTexts = listed.filter(TEXT)`（第 63 行，nightly 真 tarball）。
> 探索轮 = [运行时依赖/安装边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md)。

## 症状

`shippedSources` 的扫描面：

```js
walk(join(PACK,'presets'), name => /\.(?:md|ya?ml)$/.test(name))
walk(join(PACK,'content'), name => /\.(?:md|json)$/.test(name))   // ← 不含 content/**/*.js
walk(join(PACK,'scripts'), name => /\.(?:mjs|cjs|js)$/.test(name))
walk(join(PACK,'workers'), name => /\.(?:js|json|md)$/.test(name))
walk(join(PACK,'src'),     name => /\.(?:ts|tsx)$/.test(name))
// locale* 根本没有 walk
```

但发布物含：

- `content/waves/lens-fanout.js`（运行时 workflow 脚本；`files: content/**` 随包）；
- `locale*/**/*.json`（用户可见文案；随包）。

在这两类文件里写入 `checks/…` / `research-workspace/` 等 dev 引用，`shipped-surface.test`
（`pnpm test` 车道）**不会扫**；只有 night**ly** 的 `pack.e2e`（真 tarball 文本）会红。
于是 push 门禁绿、合并后夜间红——正是「证据在门里吗」的第三态。

## 分诊与授权

- 严重级：P2 — 测试覆盖/节奏；不阻断运行，但 push 与 nightly 的证据面不等价。
- 表面 / 边界：发布面测试（源侧）/ ② 静态（文件集）
- DSH 不变量：fail-loud；同一判据在最短车道必须能看见
- 触及面：none（测试覆盖；不改产品/门禁契约）
- 授权：自授权（P2 修理型）
- 批：运行时依赖/安装边界（第三轮）

## 复现

复现状态：稳定（读码 + 文件集）。

```sh
grep -n "walk(join(PACK,'content')" tests/checks/shipped-surface.test.mjs   # .md|json
find packages/deep-research-pack/content -name '*.js'                      # content/waves/lens-fanout.js
ls packages/deep-research-pack/locale*                                     # locale* 不在 shippedSources
# 注入一个 dev 引用到 content/waves/lens-fanout.js 的注释 → pnpm test 绿；pack.e2e 红
```

## 根因（已证）

`shippedSources` 按「源码文件类型」手工挑，`content` 只挑了 `.md/.json`（漏了同目录的运行时 `.js`），
`locale*` 完全不在 walk 列表。`pack.e2e` 的 `shippedTexts` 用 tarball 清单 + `TEXT` 扩展名，覆盖面更全，
但它属 e2e/夜间。源侧测试的防空语料（≥60 文件）挡不住「少扫一个子集」。

## 牵出的失败类

- 发布面 C2/C7（扫描面窄于发布集）+ 测试节奏（push vs nightly）；与 [BUG-230](BUG-230-shipped-surface-devref-lookbehind-bypass.md)
  同批（守卫自身），但这次是**文件集**而不是路径形态。
- 类级方向 = 源侧扫描集 == tarball 允许集（按扩展名/目录统一），而不是手工近似。

## 修法

1. `shippedSources` 改为按「发布允许集 + 文本扩展名」生成（复用 `filesAllowlistIssues`/`files` 的允许集，
   或统一走 `shippedTextFiles()` 助手），不再手工 walk 子集；
2. 补 `content/**/*.js`、`locale*/**/*.json`、`package.json`（scripts 字段另判）等；
3. 防空语料改为「源侧扫描集 ⊇ 发布文本集」集合断言（缺一个就红），而不是文件数下限；
4. 负控：往 `content/waves/lens-fanout.js` 注释注入 `checks/__gone__.mjs` → `pnpm test` 红；还原绿。

## 修复判据

- 源侧扫描集覆盖 tarball 中所有文本文件（至少 content JS、locale JSON）；集合差为空；
- 注入 dev 引用到 content JS / locale JSON → `pnpm test` 红（不再只 nightly）；
- `shipped-surface.test` / `pack.e2e` / `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs",
    "checks/smoke/pack.e2e.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 1,
    "output": "not ok 2 - 源侧扫描集由 files 允许集派生… content 的运行时 .js 必须在源侧扫描集（旧版只收 .md/.json）"
  },
  "green": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/shipped-surface.test.mjs"
  }
}
```
