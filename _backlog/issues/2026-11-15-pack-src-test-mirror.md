---
status: 待落地
opened: 2026-11-15
---

# 推敲：pack src 目录与测试目录同名对齐

> 立卡：2026-11-15 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：proposed（先落 RFC；交付后随 Note 关闭，D52）
>
> **一句话**：把 `packages/deep-research-pack/src` 的目录与 `tests/{cockpit,pack}` 做成**同一相对路径**
> ——`src/lib/<family>/` ↔ `tests/cockpit/lib/<family>/`、`src/client/<sub>/` ↔
> `tests/cockpit/client/<sub>/`、`src/<surface>/` ↔ `tests/pack/<surface>/`；跨切住 `tests/cockpit/shared/`，
> 无源码 import 的产品合同住 `tests/pack/contract/`。
>
> **当前**：owner 轴已由 [implemented Note](../../notes/implemented/2026-11-15-test-source-mirror.md)
> 定案并落地在 `scripts/lib` + `tests/run`；pack 侧仍是「名对、目录不对」——`src/lib` 38 个平铺、
> `src/client` 有 6 个子目录而 `tests/cockpit/client` 平铺、`tests/pack` 按文件名而不是目录分面。
> 盘点与成本 = [研究正文](../research/pack-src-test-mirror/2026-11-15-pack-src-test-mirror.md)。
>
> **下一步**：用户拍 §未决问题（家族切法、`library-fold`/`graph-model` 归属、是否连 `src` 一起动、
> 17 个合同件是否收 `contract/`）；拍板后先落 RFC，再按 Step 1 → 2 → 3 实施。

**问题与期望结果：** 用户要求「最理想的代码目录名和测试目录名能对齐，Agent 寻找测试资产更容易」。
`scripts/lib` 侧已达成（同名 owner 目录 + 索引 + 门禁）；pack 侧没达成——从 `src/lib/library-fold.ts`
推不出测试在 `tests/cockpit/lib/library-fold.spec.mjs`（目录不对），从 `src/client/method-library/`
推不出测试在 `tests/cockpit/client/`（测试没有子目录）。期望 = 任一源码路径的**相对路径**直接加
`.spec` 就是测试路径；跨切与合同件有唯一、显式的家。

**当前情况（研究结论）：**

1. `src/lib` 38 个模块平铺；`tests/cockpit/lib` 20 个 spec 平铺。
2. `src/client` 6 个子目录（defaults/locales/method-library/research-config/research-graph/research-status）
   + 22 个根文件；`tests/cockpit/client` 20 个 spec 平铺。
3. `tests/pack` 38 个 spec：按文件名前缀分面（content-/startup-/defaults-/fetch-fallback-），
   其中 **17 个不 import 任何 pack 源码**（产品/配置合同）。
4. 跨切：`i18n.spec`、`client-pure-logic.spec` 同时 import 多个子目录/家族 → 固定住 `shared/`。
5. 成本：pack 内部 import 43 条；跨树 `src/lib` 约 81 条、`src/client` 约 65 条。构建入口
   （`src/*/index.ts`）与 `package.json` exports 不动，产物路径不变。
6. 旧 issue 已归档（[settled](../../_backlog/_archived/settled_issues/2026-11-15-test-source-mirror.md)），
   按仓规不重开——本卡是它的后继。

**未决问题：**

1. `src/lib` 家族切法：6 个（fold/plan/method/config/bundle/ui）还是更粗/更细。
2. `library-fold`、`graph-model` 归 `method` 还是 `ui`。
3. 本期是否连 `src` 一起动；或先只动测试（源码平铺、测试按前缀分组）。
4. 17 个无源码 import 的产品合同是否收进 `tests/pack/contract/`。

**下一步：** 用户拍上列四条；agent 建 RFC → Step 1（`src/lib` 家族 + `tests/cockpit/lib` 同名）→
Step 2（`tests/cockpit/client/<sub>/`）→ Step 3（`tests/pack/<surface>/` + `contract/`）。

## 已知与未决

- **已知**：成本、构建入口约束、两账与门禁清单（研究 §4）、跨切名单。
- **已知不会做**：改 `src/*/index.ts` 入口位置；改 `exports`；重命名源码文件（只加目录）；
  动 `presets/`/`content/` 数据组织。
- **未决**：上列四条 + 是否给 `src/client` 根文件也加一个 `root/`（默认留在 `client/` 根）。

## 方案与取舍

| 方案 | 形态 | 取舍 |
|---|---|---|
| **A（推荐）** | 源码相对路径即测试相对路径（三块分开） | 字面对应；成本 = 约 146 条 import + 两账/索引；需拍家族表 |
| B | 只动测试、源码平铺 | 成本最低；但字面对应不成立，靠前缀与索引 |
| C | 只建索引 | 零搬家；不满足「目录名对齐」 |

## 判据形状

- **权威事实**：测试路径 = 源码相对路径 + `.spec.mjs`（三块各自的根）；家族表写在 RFC/卡上；
  跨切与合同件由 `shared/`、`contract/` 的成员表钉住。
- **读取方**：`test-surface`（pack lib 递归）、`client-surface`（`CLIENT_SMOKE_ONLY` 键）、
  `tests/INDEX.generated.md`（扩到 pack）、`md-links`（登记簿）。
- **坏输入**：源码模块无同名测试且未登记理由 → 红；测试路径与源码相对路径不一致 → 红；
  `shared/` 里出现单一面 spec → 红；`contract/` 里出现 import 源码的 spec → 红。
- **旧形态**：cockpit/pack 旧测试路径进重定向登记簿；冻结层不改写。
- **反证**：错位 spec / 漏家族目录 / 跨切错放 / 合同件错放各看红一次。

## 验收标准

1. **家族表**：38 个 `src/lib` 模块逐一归入一个家族（含 `library-fold`/`graph-model` 的裁决），
   表在 RFC 与卡上可见。
2. **源码**：`src/lib/<family>/` 就位；`src/{content,startup,defaults,fetch-fallback}` 与
   `src/client/<sub>/` 保持/补齐；`src/*/index.ts` 入口与 `exports` 不变。
3. **测试**：`tests/cockpit/lib/<family>/`、`tests/cockpit/client/<sub>/`、`tests/pack/<surface>/`
   与 `shared/`、`contract/` 就位；三块根层零平铺 spec。
4. **门禁**：`test-surface` pack lib 递归 + 防空语料；`client-surface` 键随子目录；新增/扩展
   「路径同名」契约（错位/漏家族/跨切错放各留反证）。
5. **索引与两账**：`tests/INDEX.generated.md` 覆盖 pack；asset-ledger（cockpit 40 / pack 38）与
   guard-ledger（cockpit 10 / pack 1）重生成后对账绿；旧路径登记簿可解析。
6. **回归**：`pnpm verify` 与 `pnpm test` 全绿，零新增 skip；`pnpm typecheck` 通过。
7. **文档**：`tests/AGENTS` 写清三块镜像规则；`docs/project-map` owner 轴节补 pack；`triggers` 行更新。
8. **可回滚**：Step 1–3 各自独立 `git mv` 反向 + 索引/两账重生成即回退。

## 关闭条件

- 上列 8 条满足；RFC 与实现同变更链回本卡；`pnpm verify`/`pnpm test`/`pnpm typecheck` 绿作为交付证据；
- 交付后按 `> 去向` 落 Note 并与本卡归档同变更（D52）。
