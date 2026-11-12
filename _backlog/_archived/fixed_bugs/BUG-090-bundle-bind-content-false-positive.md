---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-090：sessionBindingOf 把工具参数正文里的 `drt_<slug>/` 当路径——写 notes.md 提到别的 bundle 即强绑定到别的 run

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 绑定只检查真实路径字段 + 路径段边界，正文/grep pattern 不再强绑定（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/bundle-bind.ts`（`slugInArgs` +
> `sessionBindingOf`）。消费 = status/config/graph/final 四个观察面与 `bindingTrust`。

## 症状

`slugInArgs(args)` 把 **整个 tool/call arguments 对象 `JSON.stringify`** 后，用
`/drt_([a-z0-9][a-z0-9-]*)\//` 取第一个子串；不区分哪个字段、也不要求路径段边界。

因此一次**不在任何 bundle 里**的写操作，只要正文提到另一个 bundle 路径，就产生
`boundBy: write` 的强绑定：

```json
{"label":"write outside bundle, body mentions other","binding":{"slug":"other-run","boundBy":"write","kickoffSeen":false}}
{"label":"write outside bundle, body mentions not_drt_x","binding":{"slug":"fake","boundBy":"write","kickoffSeen":false}}
{"label":"grep pattern mentions other","binding":{"slug":"other-run","boundBy":"read","kickoffSeen":false}}
```

对照：`write({file_path:'drt_real-run/run.md'})` → `real-run`（正确）。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/bundle-bind-content-path.mjs
```

## 影响与触发面

- `bindingTrust` 把 `boundBy:'write'` 视为**永远可信**；观察面随后 `openRun('drt_other-run')`，
  显示另一场 run 的活动/版本/终稿；
- `not_drt_fake/` 这种非路径也命中（regex 没有前缀/段边界），一个正文单词即可改绑；
- write/edit 的 `content`、`grep` 的 `pattern`、命令参数中的示例路径都可能触发；
- 立项轨道抑制（kickoffSeen）也挡不住 write 绑定——强绑定直接可信；
- 不直接修改 run bundle，但会让用户/面板对错 run 做判断与操作。

## 根因（已证）

- `slugInArgs` 对 args 全量 stringify + 子串 regex，不检查字段语义/路径边界；
- `sessionBindingOf` 只按工具名分 write/read，不验证命中的 `drt_` 是否在 `file_path`/`path`
  等真实路径字段；
- regex `drt_` 没有 `(?:^|[/\\])` 前缀约束，`not_drt_x/` 也会命中。

## 修法候选（未实施）

1. 只检查已知路径字段（`file_path`/`path`/`paths`/`filePath` 等），并对字段值做路径段解析；
2. 至少给 regex 加路径段边界（`(?:^|[/\\])drt_.../`）并排除内容字段；
3. 写绑定的强信号应要求**文件路径本身**位于 `drt_<slug>/`，正文/pattern 仅作为弱读信号或不参与。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] `write({file_path:'notes.md', content:'see drt_other/run.md'})` 不再绑定 `other`；
- [ ] `write({file_path:'drt_real/run.md'})` 仍绑定 `real`；`grep` 的 pattern 不再产生强绑定；
- [ ] 正文中的 `not_drt_fake/` 不命中；真实 `drt_<slug>/` 路径仍命中；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明所有工具参数形态（skill/glob/paths 数组/相对绝对混合）的路径语义；
- 不证明真实模型会话中 content 出现 `drt_` 的分布；不证明观察面操作面的完整影响链。

## 已落地（2026-11-13）

- 证据 = `tests/run/bundle-bind.test.mjs` BUG-090。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
