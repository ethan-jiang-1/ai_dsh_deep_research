---
status: 修复就绪
severity: P2
opened: 2026-11-17
---

# BUG-209：asset-ledger 的 CANONICAL_LIBS 仍指旧 helper 名——读取缝改名后 oracleType 被静默翻成 self-referential

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：修复就绪（修正分类表 + 重生成；不改变判据）
>
> 位置：[checks/lib/test-infra/asset-ledger.mjs](../../checks/lib/test-infra/asset-ledger.mjs) 的
> `CANONICAL_LIBS`（第 29/31 行）；迁移面 = [tests/fixtures/asset-ledger/ledger.json](../../tests/fixtures/asset-ledger/ledger.json)。
> 探索轮 = [2026-11-17 卡](../issues/2026-11-17-exploratory-namespace-move.md) 预扫候选 P-1。

## 症状

`tests/pack/handbook-surface.mjs` / `tests/pack/template-files.mjs` 在 266b216c 被改名为
`*-helpers.mjs`，但 asset-ledger 的分类表没跟。分类器按**精确路径**匹配 `CANONICAL_LIBS`，
于是只 import 读取缝的 spec 从 `canonical` 掉成 `self-referential`：

```sh
node --input-type=module -e "
import {oracleTypeOf} from './checks/lib/test-infra/asset-ledger.mjs';
import {readFileSync} from 'node:fs';
const p='tests/pack/contract/template-contract.spec.mjs';
console.log(oracleTypeOf(readFileSync(p,'utf8'),{relPath:p,root:process.cwd()}));
"
# 实际：self-referential；应然：canonical（它读 pack 模板文件 = 独立真值）
```

同一个 commit 自己重生成账本时，把这个误分类吸收成了「当前状态」：

```sh
git show 266b216c -- tests/fixtures/asset-ledger/ledger.json | grep -B4 -A2 self-referential
# -      "oracleType": "canonical",
# +      "oracleType": "self-referential",
```

`tests/checks/asset-ledger.test.mjs` 只用同一张表重算，且「自指资产」断言只验**非空**，
所以自洽绿；`self-referential` 在 D55 账里的语义是「显式可见的迁移面」，这次误分类会
多登记一个不存在的迁移项、并少报一个 canonical 覆盖。

证据：`runtime/exploratory-20261117/p1-oracle-type.txt`、`-p1-git-evidence.txt`（gitignored）。

## 分诊与授权

- 严重级：P2 — 不影响运行期行为；破坏的是验证账本的分类真值（哪些测试的 oracle 是独立真值）。
- 表面 / 边界：测试资产账（D55）/ ② 行为（纯函数 + 生成物）
- DSH 不变量：fail-loud —— 分类表里的死路径应报红，而不是静默改变分类
- 触及面：none（修正数据使其符合既有 D55 合同；不改门禁/文档合同）
- 授权：自授权（P2 修理型：改表 + 重生成）
- 批：2026-11-17 命名空间搬家探索（预扫 P-1）

## 复现

复现状态：稳定（纯函数 + git 历史；无临时代码）。

```sh
# 1. 现盘分类表仍写旧名
sed -n '29p;31p' checks/lib/test-infra/asset-ledger.mjs
#   'tests/pack/handbook-surface.mjs'
#   'tests/pack/template-files.mjs'
ls tests/pack/*.mjs   # 实际只有 *-helpers.mjs / preset-helpers.mjs

# 2. 分类结果
node --input-type=module -e "
import {oracleTypeOf} from './checks/lib/test-infra/asset-ledger.mjs';
import {readFileSync} from 'node:fs';
const p='tests/pack/contract/template-contract.spec.mjs';
console.log(oracleTypeOf(readFileSync(p,'utf8'),{relPath:p,root:process.cwd()}));
"   # self-referential

# 3. 账本是同一 commit 吸收的
git show 266b216c -- tests/fixtures/asset-ledger/ledger.json | grep -B4 -A2 self-referential
```

## 根因（已证）

`CANONICAL_LIBS` 是「哪些读取缝代表独立真值」的**第二份事实**（第一份是 helper 的 import 关系）。
读取缝改名时只改了 import 与文件名，没改这张表；`oracleTypeOf` 只做 `Set.has(relPath)`，表里的
死路径不产生任何失败；随后 `record-asset-ledger` 用同一张表重算，把误分类合法化成账本当前值。
`asset-ledger.test` 的「漂移 = 红」是**同一函数的自洽对账**，看不见「函数输入表本身腐烂」。

根因证据：`git show 266b216c^:checks/lib/tools/asset-ledger.mjs` 与现盘逐字相同（第 29/31 行未变），
同一 commit 的 stat 显示两个 helper 改名 + 账本重生成 —— 三件事同批发生。

## 牵出的失败类

- 同机制第 1 次｜处置：类修 — 分类/白名单表里的每个路径都必须存在（新守卫；变异语料与测试夹具除外）。
- M4 生成器吸收 + C3 双份事实：搬家改的是「身份清单」，而生成器把清单的错当输入吸收。

## 修法

1. `CANONICAL_LIBS` 两条改为 `tests/pack/handbook-surface-helpers.mjs` / `tests/pack/template-files-helpers.mjs`；
2. `node tools/record/record-asset-ledger.mjs` 重生成；确认 `template-contract.spec.mjs` 回到 `canonical`；
3. 后续（单独一件）：加守卫「`CANONICAL_LIBS` / `EXTERNAL_LIBS` / `STRUCTURED_LIBS` 的每个路径在盘上存在」，
   负控 = 注入一条 `tests/pack/__gone__.mjs` 应变红。为什么不是「从 helper 头注自动推导」：本轮先把
   双份事实收口，自动推导是更大的设计变更。

## 修复判据

- 同一复现命令返回 `canonical`；`tests/fixtures/asset-ledger/ledger.json` 的
  `tests/pack/contract/template-contract.spec.mjs` 为 `canonical`，且重生成不再产生 diff；
- 邻接变体：`handbook-surface-helpers` 的消费方（`content-disclosure` 等）分类不变；
- 负控：把表里任一真实路径改成 `__gone__` 后，新守卫（同 diff 或 follow-up）必须红；
- `pnpm test`（spec + checks）绿。

## 修复关联

修复 commit 待落地；守卫那件若单独做，另开卡并链本卡。
