---
topic: pack src 目录与测试目录的对齐（按 domain 切，路径同名优先）
intent: 量清 pack 侧源码与测试的现状与跨树 import 成本，给出按 domain 命名的同名目录形状与分步，service 实施卡。
---

# pack src ↔ 测试：先同名，再按 domain 切

> 证据边界：HEAD `4a523649`，2026-11-15 静态测量（AST import 图 + 盘上枚举）。未改任何文件。
> 总轴已定案 = [implemented Note](../../../../notes/implemented/2026-11-15-test-source-mirror.md)；
> 本文只回答「pack 侧按什么 domain 切、目录怎么同名」。术语方案 A 已由用户 2026-11-15 拍定。

## 0. 结论

1. **首要原则：源码相对路径 + `.spec.mjs` = 测试相对路径。** 家族按 domain/产品概念切，
   不按技术形态；目录要能容纳未来模块，不为今天 38 个文件凑形状。
2. pack 侧切 **7 个 domain**：`run` / `plan` / `events` / `method-library` / `review` /
   `workspace` / `shared`。名字 = 产品里能讲清的一块。
3. **`faces.json` 留在 `src/lib` 根**：它是 host / shared / client 三面互斥清单（横切属性），
   不是模块；域目录只装模块，对应测试改递归扫描。
4. `src/client` 的 6 个目录名 = 页签名（`method-library` / `research-graph` / `research-status` /
   `research-config` / `defaults` / `locales`），**不改名**；测试侧 `tests/cockpit/client/<sub>/` 对齐。
5. 成本：pack 内部 import 43 条；跨树 `src/lib` 约 81 条、`src/client` 约 65 条。构建入口
   （`src/*/index.ts`）与 `package.json` exports 不动。
6. 旧 issue 已归档（仓规不重开）；本卡为后继。

## 1. 术语为什么是这 7 个（撞车已查实）

| 候选 | 撞车 / 问题 | 处置 |
|---|---|---|
| `journal` | run bundle 已有 `journal.md`（运行纪要）；`journal-wire` 是**会话事件** | 弃用，改 **`events`** |
| `surface` | [terms.md](../../../../docs/terms.md) 的 `app surface` 是 DSH 既有术语 | 弃用 |
| `presentation` | 层名不是 domain 名；把默认值/标题与 i18n/文本混成一桶 | 弃用，拆 `workspace` + `shared` |
| `ui` / `view` | 这些件是**无 React 的纯数据/判据**，名字会误导 | 不用 |

## 2. 7 个 domain 与逐模块归属

| domain | 模块 | 一句话 |
|---|---|---|
| `run/` | run-context, run-version, run-fold, bundle-bind, binding-trust, final-target, receipt-fold, brief-fold, rerun-triage | 一场 run 作为事实容器：绑定、版本、终稿、回执、摘要、重跑 |
| `plan/` | plan-index, plan-graph, plan-diff, graph-model | 研究执行图：解析、版本 diff、plan↔Team 映射 |
| `events/` | journal-wire, activity-fold, member-activity, hitl-fold, tool-card, stream-failure | 会话事件流 → 人读活动、HITL、工具卡、流失败 |
| `method-library/` | library-fold, method-draft, method-library-{commands,events,hash,operation,operation-state,read,source,write}, method-of-question | 用户方法库与「本次研究」方法节（与 `client/method-library/` 同名） |
| `review/` | review-readiness | 交付审查判据（未来 claim/verdict 折叠的落点） |
| `workspace/` | start-card, workspace-title, research-defaults | 工作区注册、首屏判据、项目默认（`research-defaults.json` 在工作区） |
| `shared/` | i18n, config-tables, text-fold, markdown-mask | 被 2+ domain 共用、无单一主语的纯基础设施 |

`faces.json` 留 `src/lib` 根。**`shared` 铁律**：只收被 2+ domain 使用且没有主 domain 的件；
新模块先归 domain，归不进去再议。

## 3. 现状与成本

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
全部 `.ts`；域化后该测试改**递归扫描 + 相对路径**，`faces.json`（basename 清单）不变。

## 4. 目标形状

```
packages/deep-research-pack/src/lib/run/            ↔ tests/cockpit/lib/run/
packages/deep-research-pack/src/lib/plan/           ↔ tests/cockpit/lib/plan/
packages/deep-research-pack/src/lib/events/         ↔ tests/cockpit/lib/events/
packages/deep-research-pack/src/lib/method-library/ ↔ tests/cockpit/lib/method-library/
packages/deep-research-pack/src/lib/review/         ↔ tests/cockpit/lib/review/
packages/deep-research-pack/src/lib/workspace/      ↔ tests/cockpit/lib/workspace/
packages/deep-research-pack/src/lib/shared/         ↔ tests/cockpit/lib/shared/
packages/deep-research-pack/src/lib/faces.json      （清单留根）

src/client/<sub>/  ↔ tests/cockpit/client/<sub>/   （method-library / research-graph /
                                                   research-status / research-config / defaults / locales）
src/<surface>/    ↔ tests/pack/<surface>/          （content / startup / defaults / fetch-fallback）
tests/cockpit/shared/                              ← 跨切 spec（i18n、client-pure-logic）
tests/pack/contract/                               ← 17 个无源码 import 的产品合同
```

**主镜像规则**：一个 spec 的**主语模块**属于 pack `src/lib/<domain>/` 时，测试住
`tests/cockpit/lib/<domain>/`；主语属于 `src/client/<sub>/` 时住 `tests/cockpit/client/<sub>/`。
**跨根例外**：`tests/contracts`（跨面合同）与 `tests/run`（scripts 为主语、pack 为次）允许测 pack
模块，由登记表记明理由——不为了字面对齐把 scripts 域的测试搬走。
**未来 domain 预留**：`evidence/`、`protocol/`、`lens/`；没有新 domain 时不塞 `shared/`。

## 5. 机械面（同变更要改）

- `test-surface`：pack `src/lib` 覆盖检查改递归 + 相对路径。
- `src-lib-faces.spec`：递归扫描 + 相对路径；`faces.json` 仍按 basename 对账。
- `client-surface`：键已含子目录；根文件保持根，不需要改。
- `tests/INDEX.generated.md`：扩到 pack（模块 → domain → 测试）。
- `scripts/test-path-redirects.json`：cockpit/pack 旧路径登记（冻结层链接）。
- `asset-ledger`（cockpit 40 / pack 38）与 `guard-ledger`（cockpit 10 / pack 1）重生成。
- 构建入口与 exports 不动。

## 6. 分步与回滚

1. **Step 0**：RFC 逐模块 domain 表 + 改名映射 dry-run。
2. **Step 1**：`src/lib/<domain>/` + `tests/cockpit/lib/<domain>/`；import 重写；`faces.json` 留根、
   `src-lib-faces` 改递归；两账/索引/门禁同步；verify + test 绿。
3. **Step 2**：`tests/cockpit/client/<sub>/` 对齐（源码不动）。
4. **Step 3**：`tests/pack/<surface>/` + `contract/`。
5. 每步 `git mv` 反向即可回滚；Step 1 不改任何源码内容/导出。

## 7. 未决（需用户拍）

1. `tests/cockpit/lib/review/` 无直接 spec（`review-readiness` 由 `tests/run` 测）——接受跨根例外，
   还是把该 spec 移到 pack 镜像？（研究建议：接受例外并登记。）
2. 17 个产品合同是否全部收 `tests/pack/contract/`（若无源码 import 一律收）。
3. `src-lib-faces.spec` 自身住 `tests/pack/contract/` 还是留 `tests/pack` 根。

## 附录 · 38 个文件与 domain

run: run-context, run-version, run-fold, bundle-bind, binding-trust, final-target, receipt-fold,
brief-fold, rerun-triage（9）
plan: plan-index, plan-graph, plan-diff, graph-model（4）
events: journal-wire, activity-fold, member-activity, hitl-fold, tool-card, stream-failure（6）
method-library: library-fold, method-draft, method-library-commands, method-library-events,
method-library-hash, method-library-operation, method-library-operation-state, method-library-read,
method-library-source, method-library-write, method-of-question（11）
review: review-readiness（1）
workspace: start-card, workspace-title, research-defaults（3）
shared: i18n, config-tables, text-fold, markdown-mask（4）
faces.json（根，不计）
9+4+6+11+1+3+4 = 38 ✓
