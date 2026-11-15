---
topic: pack src 目录与测试目录的对齐（client / lib / 产品面三块）
intent: 量清 pack 侧源码与测试的现状与跨树 import 成本，给出同名目录的候选形状与分步，服务新开的一张实施卡。
---

# pack src ↔ 测试：先对齐名字，再谈搬家

> 证据边界：HEAD `21e64be2`（owner 轴收口后），2026-11-15 静态测量（AST import 图 + 盘上枚举）。
> 未改任何文件。总轴已定案 = [implemented Note](../../../notes/implemented/2026-11-15-test-source-mirror.md)；
> 本材料只回答「pack 侧怎么落」。

## 0. 结论

1. **旧 issue 不重开**（仓规：已结永不重开，复发 = 引用旧卡的新卡）；pack 侧单独立新卡。
2. **理想形状 = 源码相对路径即测试相对路径**：
   - `src/lib/<family>/<name>.ts` ↔ `tests/cockpit/lib/<family>/<name>.spec.mjs`
   - `src/client/<sub>/<file>.ts(x)` ↔ `tests/cockpit/client/<sub>/<file>.spec.mjs`（根文件 → `client/` 根）
   - `src/{content,startup,defaults,fetch-fallback}/` ↔ `tests/pack/<surface>/`
   - 跨切 spec（`i18n`、`client-pure-logic`）→ `tests/cockpit/shared/`；无源码 import 的产品合同
     （17 个）→ `tests/pack/contract/`
3. **第一步不动源码文件内容、不改导出**：只给 `src/lib` 加家族目录（38 个模块），同步
   `tests/cockpit/lib` 同名；`src/client` 已有 6 个子目录，测试侧对齐即可。
4. **成本可量**：pack 内部 import 43 条、跨树 import `src/lib` 127 条、`src/client` 43 条；
   构建入口（`src/{index,client/index,content/index,startup/index,defaults/index,fetch-fallback/index}.ts`）
   保持原位即可，`package.json` exports 与 `lib/` 产物不受影响。
5. 仍缺一个用户判断：`src/lib` 的家族切法（7 选 6 还是更细），以及是否本期就动 `src`（vs 只动测试）。

## 1. 范围与边界

- **在范围内**：`packages/deep-research-pack/src/**` 与 `tests/{cockpit,pack}/**` 的目录/路径对齐；
  随之的 import、索引、两账、导航门禁。
- **不在范围**：`presets/` 与 `content/` 的数据组织（已有 design/70）；`src/*/index.ts` 的入口位置；
  已发布的 `exports`；`tests/contracts`。
- **已有决定**：owner 轴 = 消费者接口；测试镜像 = 同名相对路径；冻结层不改写、用登记簿。

## 2. 现状与成本

| 区域 | 源码 | 测试 | 今天是否同名 |
|---|---|---|---|
| 折算纯件 | `src/lib` 38 个 `.ts` 平铺 | `tests/cockpit/lib` 20 个平铺 | 否（名对、目录不对） |
| 观察面 | `src/client` 6 子目录 + 22 根文件（13 `.ts` + 9 `.tsx`） | `tests/cockpit/client` 20 个平铺 | 否（源码有 6 个目录，测试没有） |
| 产品面 | `src/{content,startup,defaults,fetch-fallback}` + `scripts/` | `tests/pack` 38 个平铺（含 17 个无源码 import 的合同） | 半（文件名按面，目录不按面） |

跨树 import 成本（行数，含 tests/scripts/dev/probes/pack 内部）：

| 目标 | pack 内部 | tests | scripts | dev/probes | 合计 |
|---|---:|---:|---:|---:|---:|
| `src/lib` | 43（同目录相对） | 29 | 7 | 2 | **约 81 + 内部 43** |
| `src/client` | 43 | 22 | 0 | 0 | **约 65** |

> 计数口径 = `from '…deep-research-pack/src/{lib,client}/…'` 的 import 行；`src/lib` 的 127 条里
> 含 tests/run 18、tests/pack 7、tests/cockpit 7、tests/contracts 4，其余为 scripts/dev/probes。

## 3. 候选形状

### A（推荐）源码相对路径即测试相对路径

```
src/lib/fold/            ↔ tests/cockpit/lib/fold/
src/lib/plan/            ↔ tests/cockpit/lib/plan/
src/lib/method/          ↔ tests/cockpit/lib/method/
src/lib/config/          ↔ tests/cockpit/lib/config/
src/lib/bundle/          ↔ tests/cockpit/lib/bundle/
src/lib/ui/              ↔ tests/cockpit/lib/ui/
src/client/method-library/ ↔ tests/cockpit/client/method-library/
src/client/research-graph/ ↔ tests/cockpit/client/research-graph/
…（其余 4 个子目录同理；根文件 → tests/cockpit/client/）
src/content|startup|defaults|fetch-fallback/ ↔ tests/pack/content|startup|defaults|fetch-fallback/
tests/cockpit/shared/    ← i18n / client-pure-logic 等跨切
tests/pack/contract/     ← 17 个无源码 import 的产品合同
```

**家族切法候选（38 个 lib 模块）**：
`fold/`（activity-fold、member-activity、brief-fold、hitl-fold、journal-wire、receipt-fold、run-fold、tool-card、stream-failure、text-fold）、
`plan/`（plan-diff、plan-graph、plan-index、rerun-triage）、`method/`（method-draft、method-library-*、method-of-question）、
`config/`（research-defaults、config-tables、i18n）、`bundle/`（bundle-bind、binding-trust、final-target、run-context、run-version、review-readiness、markdown-mask）、
`ui/`（start-card、workspace-title、library-fold?）。**library-fold/graph-model 归 method 还是 ui 需拍。**

### B 只动测试（源码保持平铺）
- 测试目录按「被测模块名前缀」分组；源码零改。成本最低，但字面对应不成立，回落到旧约定。

### C 只建索引（不动目录）
- 已有 `tests/INDEX.generated.md` 可扩到 pack；零搬家，但用户要的「目录名对齐」不满足。

**推荐 A，分两刀**：先 `src/lib` 家族（源码 + `cockpit/lib` 同步），再 `src/client` 子目录与
`tests/pack` 的 surface 目录；`tests/cockpit/shared` 与 `tests/pack/contract` 收跨切与合同件。

## 4. 机械面（同变更要改的）

- `tests/checks/test-surface.test.mjs`：pack `src/lib` 的覆盖检查目前是扁平（`!rel.includes('/')`），
  要改成递归 + 相对路径。
- `tests/checks/client-surface.test.mjs`：`CLIENT_SMOKE_ONLY` 键已含子目录（`method-library/useDraftState`），
  根文件移入子目录时键要跟；`.tsx` 仍整体归 client-load。
- `scripts/test-path-redirects.json`：cockpit/pack 测试旧路径的登记（冻结层链接）。
- `asset-ledger`（cockpit 40 / pack 38）与 `guard-ledger`（cockpit 10 / pack 1）重生成。
- 构建入口与 `package.json` exports **不动**（`src/*/index.ts` 保持原位）。

## 5. 分步与回滚

1. **Step 0（证据）**：给 38 个 lib 模块拍家族表（含 library-fold/graph-model 归属），写成卡上的表；
   跑一遍改名映射脚本的 dry-run（只打印不落盘）。
2. **Step 1（最小闭环）**：`src/lib/<family>/` + `tests/cockpit/lib/<family>/`；import 重写（约 81 条）；
   两账/索引/门禁同步；`pnpm verify` + `pnpm test` 绿。
3. **Step 2**：`tests/cockpit/client/<sub>/` 对齐（源码已分组，只动测试与 import）。
4. **Step 3**：`tests/pack` 按 surface 分目录 + `contract/` 收 17 个合同件。
5. 每步 `git mv` 反向即可回滚；Step 1 之前不改任何源码内容。

## 6. 未决（需用户拍）

1. `src/lib` 是否按 6 个家族切（fold/plan/method/config/bundle/ui），还是更粗/更细。
2. `library-fold`、`graph-model` 归 `method` 还是 `ui`（跨观察面与折算）。
3. 本期是否连 `src` 一起动，还是只动测试（B 的变体）。
4. 17 个无源码 import 的产品合同是否收进 `tests/pack/contract/`。

## 附录 · 38 个 `src/lib` 模块

activity-fold, binding-trust, brief-fold, bundle-bind, config-tables, final-target, graph-model, hitl-fold,
i18n, journal-wire, library-fold, markdown-mask, member-activity, method-draft, method-library-commands,
method-library-events, method-library-hash, method-library-operation-state, method-library-operation,
method-library-read, method-library-source, method-library-write, method-of-question, plan-diff, plan-graph,
plan-index, receipt-fold, rerun-triage, research-defaults, review-readiness, run-context, run-fold,
run-version, start-card, stream-failure, text-fold, tool-card, workspace-title。
