# RFC：pack src ↔ 测试按 domain 同名（方案 A）

> 状态：proposed
> 关联：[issue 2026-11-15-pack-src-test-mirror](../../_backlog/issues/2026-11-15-pack-src-test-mirror.md) ·
> [研究题](../../_backlog/research/pack-src-test-mirror/README.md) ·
> [总轴 Note](../implemented/2026-11-15-test-source-mirror.md)

## 问题

`packages/deep-research-pack/src/lib` 38 个模块平铺、`src/client` 有 6 个子目录，而
`tests/cockpit/{lib,client}` 两个大桶平铺。从源码路径推不出测试路径，agent 找测试资产要靠记忆或
全文检索。用户要求目录名与测试目录名对齐，且切法按 domain、不按技术形态，长远可扩展。

## 决定

1. **`src/lib` 切 7 个 domain**，逐模块归属如下（38 个 `.ts`）：
   - `run/`：run-context、run-version、run-fold、bundle-bind、binding-trust、final-target、
     receipt-fold、brief-fold、rerun-triage。
   - `plan/`：plan-index、plan-graph、plan-diff、graph-model。
   - `events/`：journal-wire、activity-fold、member-activity、hitl-fold、tool-card、stream-failure。
   - `method-library/`：library-fold、method-draft、method-library-commands、method-library-events、
     method-library-hash、method-library-operation、method-library-operation-state、method-library-read、
     method-library-source、method-library-write、method-of-question。
   - `review/`：review-readiness。
   - `workspace/`：start-card、workspace-title、research-defaults。
   - `shared/`：i18n、config-tables、text-fold、markdown-mask。
2. **`faces.json` 留 `src/lib` 根**：host / shared / client 三面清单是横切属性，不是模块；
   `src-lib-faces` 改为递归扫描 + 相对路径。
3. **测试镜像**：主语模块的相对路径 + `.spec.mjs` = 测试路径（`tests/cockpit/lib/<domain>/`、
   `tests/cockpit/client/<sub>/`、`tests/pack/<surface>/`）；跨切 spec 住 `tests/cockpit/shared/`；
   无源码 import 的产品合同住 `tests/pack/contract/`。
4. **跨根例外登记**：`tests/contracts`（跨面合同）与 `tests/run`（scripts 为主语）允许测 pack 模块，
   由镜像契约里的例外表记路径 + 理由；不为字面对齐搬走 scripts/contracts 域测试。
5. **`src/client` 子目录不改名**（页签名）；测试对齐即可。`src/*/index.ts` 与 `exports` 不动。
6. **`shared` 铁律**：只收被 2+ domain 使用且无主 domain 的件；未来 domain 预留 `evidence/`、
   `protocol/`、`lens/`，不得把新模块塞进 `shared/` 了事。

## 输掉的方案

- **`journal/`**：与 run bundle 的 `journal.md` 撞义（`journal-wire` 是会话事件）。
- **`presentation/`**：层名不是 domain 名，且把默认值/标题与 i18n/文本混成一桶。
- **`surface/`**：与 DSH `app surface` 撞义。
- **技术形态名**（fold / ui / bundle）：新模块持续落错。
- **按 client 页签切 lib**：`events`/`run` 同时喂多个页签，会逼出「共享页签」假 domain。
- **改 client 子目录名**：连带 keys/文案/docs，成本高收益低。
- **强制三方同名**：`src/lib` 与 `src/client` 只在自然重合处共用词（`method-library`）。

## 验收

与 [issue §验收标准](../../_backlog/issues/2026-11-15-pack-src-test-mirror.md) 的 8 条一致：
domain 表；源码目录；测试镜像（含 shared/contract）；门禁递归 + 同名契约（四类反证）；
索引与两账；verify/test/typecheck 绿；文档；每步可回滚。

## 迁移顺序

1. Step 1：`src/lib/<domain>/` + `tests/cockpit/lib/<domain>/`；import 重写；`faces.json` 留根、
   `src-lib-faces` 递归；索引/两账/登记簿同步。
2. Step 2：`tests/cockpit/client/<sub>/` 对齐。
3. Step 3：`tests/pack/<surface>/` + `contract/`。

## 残余风险

- `shared/` 4 件可能增长；超过 6 件或出现主 domain 明确的件时重估。
- 跨根例外若增多，镜像契约会变松；例外表超过 5 条时重估规则。
- `rebuild` 产物与 `exports` 不受影响，但 `src-lib-faces` 的相对路径断言需与域表同源。
