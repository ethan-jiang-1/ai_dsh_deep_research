---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-230：`shipped-surface` 的 `devRefsOf` 漏 `./checks`、`../tests`、裸根 `checks/`、`./research-workspace`——新守卫可被一个 `.` 绕过

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行门禁触面；路径 token 归一 + 裸根闭集） — 结论：路径 token 先归一（./ ../ 前导 / 反斜杠）再判根，裸根按开发根闭集判；URL 外部导航不判；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：[checks/lib/repo/shipped-surface.mjs](../../../checks/lib/repo/shipped-surface.mjs) 的
> `PATH_TOKEN` lookbehind 与 `tokenIsDevRef`（`rest === ''` 放行）；消费方 =
> `tests/checks/shipped-surface.test.mjs` + `checks/smoke/pack.e2e.mjs`。
> 探索轮 = [运行时依赖/安装边界卡](../settled_issues/2026-11-17-runtime-deps-install-boundary.md)。

## 症状

发布面自足守卫的路径 token 对以下形态返回空（即「不是 dev 引用」）：

```text
devRefsOf('see ./checks/x.mjs')              → []
devRefsOf('see ../tests/y.spec.mjs')         → []
devRefsOf('see checks/')                     → []
devRefsOf('see ./research-workspace/x')      → []
```

原因：`PATH_TOKEN` 的 lookbehind `(?<![A-Za-z0-9_./-])` 把前导 `.` / `/` 排除；`tokenIsDevRef`
对 `root/` 且 `rest === ''`（裸根）返回 false；`DEV_INSTANCE` 的 lookbehind 同样挡 `./`。
于是一个随包 skill/README 只要写成 `./checks/…` 或 `checks/`，新守卫与 `pack.e2e` 都绿——
而上一轮正是用这个守卫关闭 219–228 的。

## 分诊与授权

- 严重级：P2 — 门禁假绿；绕过只需一个前缀，属于上一轮新守卫的契约缺口。
- 表面 / 边界：发布面门禁 / ② 行为（纯函数）
- DSH 不变量：fail-loud —— 开发面引用不应因书写前缀而改变判定
- 触及面：门禁与验收合同（`shipped-surface` 纯函数 + 测试）
- 授权：用户 2026-11-17 放行（门禁触面 → 修复就绪 = P2 修复授权）
- 批：运行时依赖/安装边界（第三轮）

## 复现

复现状态：稳定（纯函数，无仓库改动）。

```sh
node --input-type=module -e "
import {devRefsOf} from './checks/lib/repo/shipped-surface.mjs';
for (const s of ['see ./checks/x.mjs','see ../tests/y.spec.mjs','see checks/','see ./research-workspace/x'])
  console.log(JSON.stringify(s), devRefsOf(s));
"
# 全部 []（应为 dev 引用）
```

现有 `tests/checks/shipped-surface.test.mjs:75–80` 只测了 `checks/lib/...` / `research-workspace/`
的正常形态，没有 `./` / `../` / 裸根 / 反斜杠；`pack.e2e` 复用同一纯函数，所以两处都漏。

## 根因（已证）

`PATH_TOKEN` 用 lookbehind 保证「前面不是路径字符」，本意是避免把 `research-workspace` 里的
`checks` 之类子串当根；代价是把 `./`、`../`、`/` 这些**合法路径前缀**也排除了。裸根放行是为了
避免把 `checks/` 当路径（讨论退役时可能合法），但发布面守卫应把「已知开发根 + `/`」一律视为 dev 引用。

## 牵出的失败类

- 发布面 C7（假绿）+ C4（路径形态边界）；与 [BUG-232](BUG-232-row-deps-scope-no-lib-types.md) 同族，
  但载体是守卫自身。
- 类级方向 = 路径 token 先归一（`./`/`../`/`/`/`\` 去前缀）再判根；裸根按已知根闭集判。

## 修法

1. `devRefsOf` 先对行内 token 做**路径归一**：剥 `./`、`../`、前导 `/`、反斜杠转 `/`，再匹配根；
2. 裸根（`checks/`、`tests/`、`tools/`、`probes/`、`_backlog/`、`_dist/`、`.agents/`）按已知开发根判 dev；
3. 测试加矩阵：`./checks/x`、`../tests/x`、`checks/`、`/checks/x`、`checks\\x`、`./research-workspace/x`
   全红；运行期词（`content/`、`presets/`、`drt_`、`research_pack_root`）仍绿；
4. `pack.e2e` 复用同一纯函数即自动获得修正；负控注入到随包 skill 看红。

## 修复判据

- 上表 4 形态全部返回 dev ref；反斜杠/前导斜杠同样命中；
- 运行期词与 `release notes/` 等自然语言用法不误伤（现有正例保持）；
- `shipped-surface.test` 矩阵先红后绿；`pack.e2e` / `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 1,
    "output": "not ok 7 - dev 引用判据的边界… error: '\"see ./checks/x.mjs\" 应判为 dev 引用（前缀不能绕过）'"
  },
  "green": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shipped-surface.test.mjs"
  }
}
```
