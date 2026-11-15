---
status: 待落地
opened: 2026-11-15
---

# 推敲：pack src 目录与测试目录同名对齐（按 domain 切）

> 立卡：2026-11-15 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：proposed（先落 RFC；交付后随 Note 关闭，D52）
>
> **一句话**：把 `packages/deep-research-pack/src` 的目录与 `tests/{cockpit,pack}` 做成**同一相对路径**，
> 家族按 **domain** 切：`src/lib/{run,plan,journal,method-library,review,presentation,shared}/` ↔
> `tests/cockpit/lib/<domain>/`；`src/client/<sub>/` ↔ `tests/cockpit/client/<sub>/`；
> `src/<surface>/` ↔ `tests/pack/<surface>/`；跨切住 `tests/cockpit/shared/`，合同件住 `tests/pack/contract/`。
>
> **当前**：owner 轴已由 [implemented Note](../../notes/implemented/2026-11-15-test-source-mirror.md)
> 定案；pack 侧仍是「名对、目录不对」。用户 2026-11-15 定调：**目录名对齐是首位；切法按 domain/产品
> 概念，不按技术形态；长远的做对优先于省事**。盘点与成本 = [研究正文](../research/pack-src-test-mirror/2026-11-15-pack-src-test-mirror.md)。
>
> **下一步**：用户拍 §未决问题（7 个 domain 名、`research-defaults` 归属、合同件目录、client 是否改名）；
> 拍板后先落 RFC（逐模块 domain 表），再按 Step 1 → 2 → 3 实施。

**问题与期望结果：** 用户要求「最理想的代码目录名和测试目录名能对齐，Agent 寻找测试资产更容易」。
`scripts/lib` 侧已达成（同名 owner 目录 + 索引 + 门禁）；pack 侧没达成——从
`src/lib/library-fold.ts` 推不出测试在 `tests/cockpit/lib/library-fold.spec.mjs`（目录不对），从
`src/client/method-library/` 推不出测试在 `tests/cockpit/client/`（测试没有子目录）。期望 = 任一源码
路径的**相对路径**直接加 `.spec` 就是测试路径；跨切与合同件有唯一、显式的家；新增模块有唯一落点。

**当前情况（研究结论）：**

1. `src/lib` 38 个 `.ts` 平铺 + `faces.json`（host/shared/client 三面互斥清单，横切属性，留根）。
2. `src/client` 6 个子目录 + 22 根文件；`tests/cockpit/client` 20 个平铺。
3. `tests/pack` 38 个 spec：17 个不 import 任何 pack 源码（产品/配置合同）。
4. 跨切：`i18n.spec`、`client-pure-logic.spec` 同 import 多个域 → 固定住 `shared/`。
5. 建议 7 个 domain：`run`（run 容器）、`plan`（执行图）、`journal`（事件流/HITL）、
   `method-library`（方法库）、`review`（审查判据）、`presentation`（展示数据/视图模型）、
   `shared`（跨域纯函数）。逐模块表 = 研究 §1。
6. 成本：pack 内部 import 43 条；跨树 `src/lib` 约 81 条、`src/client` 约 65 条。构建入口
   （`src/*/index.ts`）与 `exports` 不动。
7. 旧 issue 已归档（[settled](../../_backlog/_archived/settled_issues/2026-11-15-test-source-mirror.md)），
   按仓规不重开——本卡是后继。

**未决问题：**

1. 7 个 domain 名是否照此定（唯一措辞分歧 = `presentation` vs `surface`）。
2. `research-defaults.ts` 放 `presentation/`，还是预留 `defaults/` domain。
3. 17 个无源码 import 的产品合同是否收 `tests/pack/contract/`。
4. 是否接受「client 子目录不改名、只让测试对齐」（推荐接受：client 目录名 = 页签名，改名成本高）。

**下一步：** 用户拍上列四条；agent 建 RFC（逐模块 domain 表 + dry-run 映射）→ Step 1（`src/lib/<domain>`
+ `tests/cockpit/lib/<domain>` + `faces.json` 递归校验）→ Step 2（`tests/cockpit/client/<sub>/`）→
Step 3（`tests/pack/<surface>/` + `contract/`）。

## 已知与未决

- **已知**：成本、构建入口约束、两账与门禁清单（研究 §4）、跨切名单、`faces.json` 的横切性质。
- **已知不会做**：改 `src/*/index.ts` 入口位置；改 `exports`；重命名源码文件（只加 domain 目录）；
  动 `presets/`/`content/` 数据组织；为了三方同名去改 `src/client` 子目录名。
- **未决**：上列四条。

## 方案与取舍

| 方案 | 形态 | 取舍 |
|---|---|---|
| **A（推荐）** | 按 domain 分 7 目录，源码相对路径即测试相对路径 | 字面对应 + 语义落点唯一；成本 = 约 146 条 import + 两账/索引；需拍 domain 表 |
| B | 只动测试、源码平铺 | 成本最低；字面对应不成立，回落到旧约定 |
| C | 只建索引 | 零搬家；不满足「目录名对齐」 |
| D | 按技术形态（fold/ui/bundle…） | **否决**：新模块会持续落错，不满足长远 |

## 判据形状

- **权威事实**：测试路径 = 源码相对路径 + `.spec.mjs`；domain 表（逐模块）写进 RFC 与卡；
  `faces.json` 留 `src/lib` 根并按 basename 对账；`shared/`/`contract/` 的成员由规则判定。
- **读取方**：`test-surface`（递归）、`src-lib-faces`（递归 + 三面互斥）、`client-surface`（键随子目录）、
  `tests/INDEX.generated.md`（扩到 pack）、`md-links`（登记簿）。
- **坏输入**：源码模块无同名测试且未登记理由 → 红；测试路径与源码相对路径不一致 → 红；
  `shared/` 出现单一 domain 的 spec → 红；`contract/` 出现 import 源码的 spec → 红；
  `faces.json` 漏文件/重复 → 红。
- **旧形态**：cockpit/pack 旧测试路径进重定向登记簿；冻结层不改写。
- **反证**：错位 spec / 漏 domain 目录 / 跨切错放 / 合同件错放各看红一次。

## 验收标准

1. **domain 表**：38 个文件（含 `research-defaults` 归属裁决）逐一归入一个 domain，表在 RFC 与卡上可见；
   `faces.json` 明确留根。
2. **源码**：`src/lib/<domain>/` 就位；`src/client/<sub>/` 与 `src/{content,startup,defaults,fetch-fallback}`
   保持/补齐；`src/*/index.ts` 入口与 `exports` 不变；`faces.json` 仍在 `src/lib` 根。
3. **测试**：`tests/cockpit/lib/<domain>/`、`tests/cockpit/client/<sub>/`、`tests/pack/<surface>/`
   与 `shared/`、`contract/` 就位；三块根层零平铺 spec。
4. **门禁**：`test-surface` pack lib 递归 + 防空语料；`src-lib-faces` 递归且三面互斥不破；
   `client-surface` 键随子目录；新增「路径同名」契约（错位/漏 domain/跨切错放/合同件错放各留反证）。
5. **索引与两账**：`tests/INDEX.generated.md` 覆盖 pack；asset-ledger（cockpit 40 / pack 38）与
   guard-ledger（cockpit 10 / pack 1）重生成后对账绿；旧路径登记簿可解析。
6. **回归**：`pnpm verify` 与 `pnpm test` 全绿，零新增 skip；`pnpm typecheck` 通过。
7. **文档**：`tests/AGENTS` 写清三块镜像规则与未来 domain 预留（evidence/protocol/lens）；
   `docs/project-map` owner 轴节补 pack；`triggers` 行更新。
8. **可回滚**：Step 1–3 各自独立 `git mv` 反向 + 索引/两账重生成即回退。

## 关闭条件

- 上列 8 条满足；RFC 与实现同变更链回本卡；`pnpm verify`/`pnpm test`/`pnpm typecheck` 绿作为交付证据；
- 交付后按 `> 去向` 落 Note 并与本卡归档同变更（D52）。
