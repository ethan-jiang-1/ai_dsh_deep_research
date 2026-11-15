---
status: 待落地
opened: 2026-11-15
---

# 推敲：pack src 目录与测试目录同名对齐（按 domain 切）

> 立卡：2026-11-15 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：proposed（RFC = `notes/proposed/2026-11-15-pack-src-test-mirror.md`；交付后随 Note 关闭，D52）
>
> **一句话**：`src/lib` 切 7 个 domain（`run` / `plan` / `events` / `method-library` / `review` /
> `workspace` / `shared`），`src/client` 与 `src/<surface>` 保持既有目录；测试按**同一相对路径**
> 镜像：`tests/cockpit/lib/<domain>/`、`tests/cockpit/client/<sub>/`、`tests/pack/<surface>/`。
>
> **当前**：owner 轴已由 [implemented Note](../../notes/implemented/2026-11-15-test-source-mirror.md)
> 定案；pack 侧仍是「名对、目录不对」。术语方案 A 已由用户 2026-11-15 拍定（弃 `journal` /
> `presentation` / `surface`）。盘点 = [研究正文](../research/pack-src-test-mirror/2026-11-15-pack-src-test-mirror.md)。
>
> **下一步**：用户已拍 A；agent 落 RFC → Step 1（`src/lib/<domain>` + `tests/cockpit/lib/<domain>`）→
> Step 2（`tests/cockpit/client/<sub>/`）→ Step 3（`tests/pack/<surface>/` + `contract/`）。

**问题与期望结果：** 用户要求「最理想的代码目录名和测试目录名能对齐，Agent 寻找测试资产更容易」。
`scripts/lib` 侧已达成；pack 侧没达成——`src/lib/library-fold.ts` 与
`tests/cockpit/lib/library-fold.spec.mjs` 名对目录不对；`src/client/method-library/` 与
`tests/cockpit/client/` 深浅不一致。期望 = 主语模块的相对路径 + `.spec` 就是测试路径；新增模块有
唯一 domain 落点；跨根例外显式登记。

**当前情况：**

1. `src/lib` 38 个 `.ts` 平铺 + `faces.json`（host/shared/client 三面清单，留根）。
2. 7 个 domain 与逐模块归属 = [研究 §2](../research/pack-src-test-mirror/2026-11-15-pack-src-test-mirror.md)：
   run 9 / plan 4 / events 6 / method-library 11 / review 1 / workspace 3 / shared 4。
3. `src/client` 6 个子目录 + 22 根文件；`tests/cockpit/client` 20 个平铺。
4. `tests/pack` 38 个 spec：17 个不 import 任何 pack 源码。
5. 跨根：`review-readiness` 由 `tests/run` 测；`markdown-mask` 由 `tests/contracts` 测——**接受为
   登记例外**，不为字面对齐搬走 scripts/contracts 域的测试。
6. 成本：pack 内部 import 43 条；跨树 `src/lib` 约 81 条、`src/client` 约 65 条；构建入口与 exports 不动。

**未决问题：**

1. `tests/cockpit/lib/review/` 无直接 spec（`review-readiness` 由 `tests/run` 测）——接受跨根例外
   （推荐）还是把该 spec 搬进 pack 镜像。
2. 17 个产品合同是否全部收 `tests/pack/contract/`（推荐：无源码 import 一律收）。
3. `src-lib-faces.spec` 自身放 `tests/pack/contract/` 还是 `tests/pack` 根（推荐：contract）。

**下一步：** 落 RFC（逐模块 domain 表 + dry-run 映射）→ Step 1 → 2 → 3；每步 verify/test/typecheck 绿。

## 已知与未决

- **已知**：成本、构建入口约束、两账与门禁清单（研究 §5）、跨根例外名单、`faces.json` 的横切性质。
- **已知不会做**：改 `src/*/index.ts` 入口与 `exports`；重命名源码文件（只加 domain 目录）；
  改 `src/client` 子目录名；动 `presets/`/`content/` 数据组织。
- **未决**：上列三条（都有推荐，实施时按推荐并登记，若用户反对再改）。

## 方案与取舍

| 方案 | 形态 | 取舍 |
|---|---|---|
| **A（已拍）** | 7 domain + 同名测试；跨根例外登记 | 字面对应 + 语义落点唯一；成本约 146 条 import + 两账/索引 |
| B | 只动测试、源码平铺 | 成本最低；字面对应不成立 |
| C | 只建索引 | 零搬家；不满足「目录名对齐」 |
| D | 技术形态名（fold/ui/bundle） | 否决：新模块持续落错 |
| E | `journal` / `presentation` / `surface` 命名 | 否决：与 run `journal.md`、DSH `app surface` 撞义 |

## 判据形状

- **权威事实**：主语模块的相对路径 + `.spec.mjs` = 测试路径；domain 表（逐模块）在 RFC/卡；
  `faces.json` 留 `src/lib` 根并按 basename 对账；跨根例外 = 登记表（路径 + 理由）。
- **读取方**：`test-surface`（递归）、`src-lib-faces`（递归 + 三面互斥）、
  `tests/INDEX.generated.md`（扩 pack）、`md-links`（登记簿）。
- **坏输入**：主语模块无同名测试且不在例外表 → 红；测试路径与源码相对路径不一致 → 红；
  `shared/` 出现单一 domain 的 spec → 红；`contract/` 出现 import 源码的 spec → 红；
  `faces.json` 漏文件/重复 → 红。
- **旧形态**：cockpit/pack 旧测试路径进重定向登记簿；冻结层不改写。
- **反证**：错位 spec / 漏 domain 目录 / 跨切错放 / 合同件错放各看红一次。

## 验收标准

1. **domain 表**：38 个文件逐一归 domain（run 9 / plan 4 / events 6 / method-library 11 / review 1 /
   workspace 3 / shared 4），表在 RFC 与卡上可见；`faces.json` 留根。
2. **源码**：`src/lib/<domain>/` 就位；`src/client/<sub>/` 与 `src/<surface>/` 保持；`src/*/index.ts`
   与 `exports` 不变。
3. **测试**：`tests/cockpit/lib/<domain>/`、`tests/cockpit/client/<sub>/`、`tests/pack/<surface>/`、
   `tests/cockpit/shared/`、`tests/pack/contract/` 就位；主语为 pack 的 spec 根层零平铺
   （根文件镜像 `client/` 根除外）。
4. **门禁**：`test-surface` pack lib 递归 + 防空语料；`src-lib-faces` 递归且三面互斥不破；
   新增「路径同名」契约（错位/漏 domain/跨切错放/合同件错放各留反证）。
5. **索引与两账**：`tests/INDEX.generated.md` 覆盖 pack；asset-ledger（cockpit 40 / pack 38）与
   guard-ledger（cockpit 10 / pack 1）重生成后对账绿；旧路径登记簿可解析。
6. **回归**：`pnpm verify` / `pnpm test` / `pnpm typecheck` 全绿，零新增 skip。
7. **文档**：`tests/AGENTS` 写清三块镜像规则、跨根例外与未来 domain 预留（evidence/protocol/lens）；
   `docs/project-map` owner 轴节补 pack；`triggers` 行更新。
8. **可回滚**：Step 1–3 各自独立 `git mv` 反向 + 索引/两账重生成即回退。

## 关闭条件

- 上列 8 条满足；RFC 与实现同变更链回本卡；三条验证命令绿作为交付证据；
- 交付后按 `> 去向` 落 Note 并与本卡归档同变更（D52）。
