---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-081：方法库条目名含全角「（」时被 fold 当作 provenance——保存 claim 永不成立，用户按占位符示例起名即失败

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 名称含全角括号在 UI/写工具明确拒绝（`methodNameIssue`），不再被 fold 当 provenance（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/library-fold.ts`（标题 →
> name/provenance 的切分）、`method-library-write.ts`（`renderLibraryEntry` 把 provenance
> 拼在名称后）、`method-library-commands.ts`（`argumentsMatch` / `entryName` 用 fold 名比对
> 命令里的 raw name）、`src/client/locales/zh.ts:200`（名称占位符示例）。

## 症状

方法库新建/编辑时，名称里带全角括号（例如 UI 自己建议的
`投研尽调（我的口径）`）：

1. `renderLibraryEntry` 生成 `## 投研尽调（我的口径）（2026-11-12，源自 对话）`；
2. `foldLibrary` 把标题切成 **name=`投研尽调` / provenance=`我的口径`**；
3. UI 命令里的 `name` 仍是 raw `投研尽调（我的口径）`；
4. `applyMethodLibraryOperationEvent` 的 `argumentsMatch` 用 `entryName(args.entry)`（fold 名）
   比对 raw command name → false，**claim 不建立**；
5. Lead 调 `method_library_upsert` 时 `hasMethodLibraryClaim` 为 false，工具抛
   「方法库写入没有匹配到当前 UI 操作，拒绝写入」；文件不变，UI 只显示通用失败回执。

ASCII 括号 `投研尽调(我的口径)` 不受影响（fold 只切全角 `（`），可作为对照。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/name-parenthesis.mjs
```

实测输出（2026-11-12）：

```json
{"inputName":"投研尽调（我的口径）","heading":"## 投研尽调（我的口径）（2026-11-12，源自 对话）","parsedName":"投研尽调","parsedProvenance":"我的口径","pendingName":"投研尽调（我的口径）","claims":0,"claimMatches":false}
{"inputName":"投研尽调(我的口径)","heading":"## 投研尽调(我的口径)（2026-11-12，源自 对话）","parsedName":"投研尽调(我的口径)","parsedProvenance":"2026-11-12，源自 对话","pendingName":"投研尽调(我的口径)","claims":1,"claimMatches":true}
```

## 影响与触发面

- `src/client/locales/zh.ts:200` 的 `namePlaceholder` **正是** `例如：投研尽调（我的口径）`；
  用户照示例命名即可触发。英文占位符未见此形态。
- 新建/编辑/保存并设为默认都经过同一条 save claim；名称含全角 `（` 时全部走 claim 失败。
- 失败发生在工具层，UI 没有名称语法校验；用户看到的是通用「未验证到变化」，不是
  「名称不能含全角括号」。不是数据损坏，但保存功能对该名称不可用。

## 根因（已证）

- `foldLibrary` 的标题语法：`name = title.slice(0, indexOf('（'))`，括号后缀一律 provenance；
- `renderLibraryEntry` 不转义名称里的 `（`，直接把 `(name)(provenance)` 拼接；
- 命令/claim 的 `name` 是 raw 输入，工具侧 `entryName` 用 fold 名，二者只在名称不含
  `（`/`〔` 等标注字符时一致；
- `argumentsMatch` 在 `tool/call` 阶段 false 后直接清空 `pending`，没有把
  「命令名 ≠ fold 名」作为可诊断的拒绝原因。

## 修法候选（未实施）

1. 名称输入校验：拒绝 `（`/`）`/`〔`/`〕` 等控制语法，UI 给明确文案；或
2. 写入/claim 全链路用 fold 后的规范化名称，并把原名称作为 provenance/显示名；或
3. `renderLibraryEntry` 对名称做转义/编码，同时改 parser 的对称解码。

倾向 1（最小、用户可理解），但需 owner 决定；**本卡不改代码**。

## 修复判据

- [ ] 名称含全角 `（` 时，UI 在发送前给出明确拒绝，或保存链路能对称解析并成功写库。
- [ ] `runtime/explore-20261112/name-parenthesis.mjs` 的全角括号用例 claim/写入结果符合所选修法；
      ASCII 括号对照不回归。
- [ ] `pnpm test` / `pnpm verify` 绿；新增用例先红后绿。

## 不证明

- 不证明其他 Unicode 标注字符（`〔〕`、零宽空格、RTL）的全部边界；不证明导入旧库时的名称
  歧义；不证明 UI 在真实浏览器里的提示文案（本卡止于纯函数/claim 面）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/library-fold.test.mjs` BUG-081 + `upsertMethodEntry` 拒绝用例。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
