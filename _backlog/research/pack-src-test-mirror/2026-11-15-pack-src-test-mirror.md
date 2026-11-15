---
topic: pack src 目录与测试目录的对齐（按 domain 切，路径同名优先）
intent: 量清 pack 侧源码与测试的现状与跨树 import 成本，给出按 domain 命名的同名目录形状与分步，服务新开的一张实施卡。
---

# pack src ↔ 测试：先同名，再按 domain 切

> 证据边界：HEAD `21e64be2`（owner 轴收口后），2026-11-15 静态测量（AST import 图 + 盘上枚举）。
> 未改任何文件。总轴已定案 = [implemented Note](../../../notes/implemented/2026-11-15-test-source-mirror.md)；
> 本材料只回答「pack 侧按什么 domain 切、目录怎么同名」。

## 0. 结论

1. **首要原则（用户 2026-11-15 定调）：源码相对路径 + `.spec.mjs` = 测试相对路径。
   家族按 domain/产品概念切，不按技术形态（fold / ui / bundle 这类名字一律不要）。**
   长远看，目录要能容纳未来模块，不因今天的 38 个文件凑形状。
2. pack 侧切成 **7 个 domain**：`run` / `plan` / `journal` / `method-library` / `review` /
   `presentation` / `shared`。每个名字 = 产品里能讲清的一块，不是代码形状。
3. **`faces.json` 留在 `src/lib` 根**：它是 host / shared / client 三面互斥清单（横切属性），
   不是模块；域目录只装模块。对应测试改为递归扫描。
4. `src/client` 已有 6 个子目录，测试侧对齐即可（`method-library` 与 lib 同名，其余各自领域名）；
   **不为了三方同名去改 client 目录名**（源码改名成本高、收益低，且 client 目录名就是页签名）。
5. 成本：pack 内部 import 43 条；跨树 `src/lib` 约 81 条、`src/client` 约 65 条。构建入口
   （`src/*/index.ts`）与 `package.json` exports 不动。
6. 旧 issue 已归档（仓规不重开），本卡为新卡；实施仍走 RFC → 分步。

## 1. 为什么是这 7 个 domain

判断标准（按序）：① 一个名字能说清「研究产品里的哪一块」，而不是「代码长什么样」；② 新模块
有唯一显然的落点；③ 与 `src/client` 的既有领域名尽量不冲突；④ 能容纳未来（evidence /
protocol / lens 等）而不重排。

| domain | 模块 | 一句话 |
|---|---|---|
| `run/` | run-context, run-version, run-fold, bundle-bind, binding-trust, final-target, receipt-fold | 一场 run 作为事实容器：绑定、版本、终稿、回执、重跑 |
| `plan/` | plan-index, plan-graph, plan-diff, graph-model | 研究执行图：解析、版本 diff、plan↔Team 映射 |
| `journal/` | journal-wire, activity-fold, member-activity, hitl-fold, tool-card, stream-failure | 会话事件流 → 人读活动、HITL、工具卡、流失败 |
| `method-library/` | library-fold, method-draft, method-library-{commands,events,hash,operation,operation-state,read,source,write}, method-of-question | 用户方法库与「本次研究」方法节（与 `client/method-library/` 同名） |
| `review/` | review-readiness | 交付审查判据（未来 claim/verdict 折叠的落点） |
| `presentation/` | i18n, config-tables, brief-fold, text-fold, start-card, workspace-title, rerun-triage | 无 React 的展示数据与视图模型：locale、配置表、业务摘要、标题、文案 |
| `shared/` | markdown-mask | 跨域纯函数（Markdown 遮罩；notes/门禁也在用） |

`faces.json` 留根；`research-defaults.ts` 归 `presentation/`（它是项目默认的读面与展示数据，
不是 run 事实）——若后续 defaults 长出 host 写面，再单开 `defaults/` domain 也是自然演进。

**为什么不是技术形态名**：`fold/`、`ui/`、`bundle/` 是按代码写法分类，新模块会不断落错；
domain 名让「该不该放这儿」有唯一答案。**为什么不是按 client 页签**：`journal`/`run` 同时喂
状态页与图谱页，按页签会逼出「共享页签」这种假 domain。

## 2. 现状与成本

| 区域 | 源码 | 测试 | 今天 |
|---|---|---|---|
| 折算纯件 | `src/lib` 38 个 `.ts` 平铺 + `faces.json` | `tests/cockpit/lib` 20 个平铺 | 名对、目录不对 |
| 观察面 | `src/client` 6 子目录 + 22 根文件 | `tests/cockpit/client` 20 个平铺 | 源码有目录、测试没有 |
| 产品面 | `src/{content,startup,defaults,fetch-fallback}` + `scripts/` | `tests/pack` 38 个平铺（17 个无源码 import） | 半对齐 |

跨树 import 成本：

| 目标 | pack 内部 | tests | scripts | dev/probes | 合计 |
|---|---:|---:|---:|---:|---:|
| `src/lib` | 43 | 29 | 7 | 2 | 约 81 + 内部 43 |
| `src/client` | 43 | 22 | 0 | 0 | 约 65 |

**face 清单约束**：`tests/pack/src-lib-faces.spec.mjs` 要求 `faces.json` 三面互斥且覆盖 src/lib
全部 `.ts`。域化后该测试要改成**递归扫描 + 相对路径**；`faces.json` 本身（basename 清单）保持不变。

## 3. 目标形状

```
packages/deep-research-pack/src/lib/run/            ↔ tests/cockpit/lib/run/
packages/deep-research-pack/src/lib/plan/           ↔ tests/cockpit/lib/plan/
packages/deep-research-pack/src/lib/journal/        ↔ tests/cockpit/lib/journal/
packages/deep-research-pack/src/lib/method-library/ ↔ tests/cockpit/lib/method-library/
packages/deep-research-pack/src/lib/review/         ↔ tests/cockpit/lib/review/
packages/deep-research-pack/src/lib/presentation/   ↔ tests/cockpit/lib/presentation/
packages/deep-research-pack/src/lib/shared/         ↔ tests/cockpit/lib/shared/
packages/deep-research-pack/src/lib/faces.json      （清单留根，不进域）

src/client/<sub>/  ↔ tests/cockpit/client/<sub>/   （method-library / research-graph /
                                                   research-status / research-config / defaults / locales）
src/<surface>/    ↔ tests/pack/<surface>/          （content / startup / defaults / fetch-fallback）
tests/cockpit/shared/                              ← 跨切 spec（i18n、client-pure-logic）
tests/pack/contract/                               ← 17 个无源码 import 的产品合同
```

**对齐规则（写进卡与 tests/AGENTS）**：测试路径 = 源码相对路径 + `.spec.mjs`；跨切 spec 只许住
`shared/`；`contract/` 里的 spec 不许 import 源码。未来 domain 预留：`evidence/`、`protocol/`、
`lens/`——新增模块先问「属于哪个 domain」，没有就新开，不塞进 `shared/`。

## 4. 机械面（同变更要改）

- `test-surface`：pack `src/lib` 覆盖检查改递归 + 相对路径。
- `src-lib-faces.spec`：递归扫描 + 相对路径；`faces.json` 仍按 basename 对账。
- `client-surface`：键已含子目录；根文件移入子目录时同步；`.tsx` 仍整体归 client-load。
- `tests/INDEX.generated.md`：扩到 pack（模块 → domain → 测试）。
- `scripts/test-path-redirects.json`：cockpit/pack 旧路径登记（冻结层链接）。
- `asset-ledger`（cockpit 40 / pack 38）与 `guard-ledger`（cockpit 10 / pack 1）重生成。
- 构建入口与 exports 不动。

## 5. 分步与回滚

1. **Step 0**：把 7 个 domain 的模块表写进 RFC（逐模块），跑改名映射 dry-run。
2. **Step 1**：`src/lib/<domain>/` + `tests/cockpit/lib/<domain>/`；import 重写；`faces.json` 留根、
   `src-lib-faces` 改递归；两账/索引/门禁同步；verify + test 绿。
3. **Step 2**：`tests/cockpit/client/<sub>/` 对齐（源码不动）。
4. **Step 3**：`tests/pack/<surface>/` + `contract/`。
5. 每步 `git mv` 反向即可回滚；Step 1 不改任何源码内容/导出。

## 6. 未决（需用户拍）

1. 7 个 domain 名是否照此定（`presentation` vs `surface` 是唯一措辞分歧）。
2. `research-defaults.ts` 放 `presentation/` 还是预留 `defaults/` domain。
3. 17 个产品合同是否收 `tests/pack/contract/`。
4. 是否接受「client 子目录不改名、只让测试对齐」这一取舍。

## 附录 · 38 个 `src/lib` 文件

activity-fold, binding-trust, brief-fold, bundle-bind, config-tables, faces.json（留根）, final-target,
graph-model, hitl-fold, i18n, journal-wire, library-fold, markdown-mask, member-activity, method-draft,
method-library-commands, method-library-events, method-library-hash, method-library-operation-state,
method-library-operation, method-library-read, method-library-source, method-library-write,
method-of-question, plan-diff, plan-graph, plan-index, receipt-fold, rerun-triage, research-defaults,
review-readiness, run-context, run-fold, run-version, start-card, stream-failure, text-fold, tool-card,
workspace-title。
