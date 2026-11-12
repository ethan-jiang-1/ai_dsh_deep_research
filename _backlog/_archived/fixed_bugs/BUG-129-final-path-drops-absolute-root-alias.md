---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-129：finalPathOf 丢弃绝对路径的根——跨 workspace 的同 slug 交付被别名成当前 cwd 的 bundle

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — 新增 `finalPathOfWithin(raw,cwd)` 并接入状态页：绝对 present 路径必须落在 cwd 内，跨 workspace 不别名（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/final-target.ts:134-148`（`finalPathOf`），消费方
> `src/client/delivery-watch.ts`、`src/client/research-status/useStatusFeed.ts`。
> 关联：BUG-122（嵌套非 bundle 后缀）的「下一层：绝对路径工作区根校验」——本轮把该空白补测。

## 症状

`deliverables/presented` 的路径通常是**绝对路径**。`finalPathOf` 对绝对路径只做「拒绝 notes/drafts/src/tests
下的 drt_」，其余**直接取终稿族后缀**、把根丢掉：

| present 事件里的绝对路径 | 返回 | 问题 |
|---|---|---|
| `/Users/…/research-workspace/drt_x/final.md` | `drt_x/final.md` | ✓（正确） |
| `/Users/…/research-workspace/archive/drt_x/final.md` | `archive/drt_x/final.md` | ✓ |
| **`/tmp/other-workspace/drt_x/final.md`** | **`drt_x/final.md`** | ✗ 根被丢弃，别名成**当前 cwd** 的 `drt_x` |
| **`/home/u/elsewhere/drt_x/final/v2.md`** | **`drt_x/final/v2.md`** | ✗ 同上 |
| `/ws/../other/drt_x/final.md` | `drt_x/final.md` | ✗ 同上（`..` 也不拒） |

于是：一条指向**别的 workspace**（或临时目录）的 present 事件，会被 UI 当成「本会话 cwd 下的
`drt_x/final.md`」——若本 cwd 恰好有同名 slug，自动打开/状态页会展示**另一个 workspace 的同名文件**；
若没有，则打开一个不存在的路径（静默失败）。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { finalPathOf } from './packages/deep-research-pack/src/lib/final-target.ts';
for (const p of ['/tmp/other-workspace/drt_x/final.md', '/home/u/elsewhere/drt_x/final/v2.md', '/ws/../other/drt_x/final.md'])
  console.log(p, '→', finalPathOf(p));
"
# 实测三条都 → 'drt_x/final.md'（期望 null 或带「根不在本 cwd」标记）
```

## 根因（已证）

```js
// 绝对路径：拒绝明显非 bundle 容器下的嵌套；其余按终稿族后缀提取（调用方按会话 cwd 解读）。
if (/(?:^|\/)(?:notes|drafts|src|tests)\/drt_/.test(normalized)) return null
const match = FINAL_FAMILY_SUFFIX.exec(normalized)
```

1. `finalPathOf` 是纯函数、拿不到 cwd，于是**主动丢弃根**；注释把校验责任推给调用方；
2. 两个消费方（`delivery-watch` / `useStatusFeed`）拿到的已是相对路径，**没有原文**可校验；
3. 结果：从「presented 绝对路径」到「UI 打开的相对路径」之间**没有任何一道校验**——别名成立。

## 影响面

- 自动打开（delivery-watch）可能打开**错误 workspace 的同名终稿**（内容错配）或不存在的路径；
- 状态页的交付卡显示错误的目标（同一 slug 时甚至显示本 cwd 的旧文件）；
- 属**路径身份/包含性**问题，不阻塞门禁（presentGate 有自己的 bundle 内检查），但违反「present 指向
  的就是用户看到的交付」的观察面承诺。

## 修复判据

1. 新增带 cwd 的入口（如 `finalPathOfWithin(raw, cwd)`）：绝对路径必须 resolve 后落在 `cwd`（或
   `cwd/archive`、`cwd/_abandoned`）内才返回相对路径，否则 null；相对路径保持现有语义；
2. 消费方（delivery-watch / useStatusFeed）改用带 cwd 的入口；`finalPathOf` 保留为纯后缀解析但**头注
   写明「只做后缀归一，不含根校验，不得直接用于打开文件」**；
3. 先红后绿：上表 5 行——跨 workspace/`..` 路径修复后 null；本 workspace 根/archive/_abandoned 仍返回
   相对路径；真实 journal 事件复跑自动打开仍命中正确文件；
4. `pnpm test` + `pnpm verify` 绿；`delivery-watch` 的单测补「绝对路径不在 cwd」分支。

## 修复关联

[BUG-122](BUG-122-final-path-nested-non-bundle.md) 的未跑面包屑
（绝对路径工作区根校验）；与 [BUG-078](BUG-078-portable-bundle-path-relative-escape.md)
（portableBundlePath 相对逃逸）同属「路径包含性」族，但方向相反（那条是相对逃逸，本条是绝对根的丢弃）。

## 已落地（2026-11-13）

- 证据 = `tests/run/final-target.test.mjs` BUG-129。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
