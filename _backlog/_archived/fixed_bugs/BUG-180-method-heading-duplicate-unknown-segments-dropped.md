---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-180：方法标题把未知/重复段当合法——编辑一次静默丢掉 `（来源2）` / `〔草稿〕`

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — 段循环维护 provenanceSeen/defaultSeen + 写路径 fail-loud；P2 修理型
>
> 位置：[library-fold.ts](../../../packages/deep-research-pack/src/lib/library-fold.ts) 的
> `parseMethodHeading` 段循环；写路径 = [method-library-write.ts](../../../packages/deep-research-pack/src/lib/method-library-write.ts)；
> 同族 = BUG-138（未识别尾缀）/ BUG-167（Cf 归一）。

## 症状

段循环只对「第一个 `（…）`」赋 provenance、对「精确 `〔默认偏好〕`」置 default；**第二个 `（…）`
或任何其它 `〔…〕`** 被消费后既不赋义、也不标 `wellFormed=false`：

```text
"## 方法（来源1）（来源2）"   => {"provenance":"来源1","wellFormed":true}
"## 方法（来源）〔草稿〕"      => {"provenance":"来源","wellFormed":true}
"## 方法〔草稿〕"             => {"wellFormed":true}
"## 方法〔默认偏好〕〔草稿〕"  => {"isDefault":true,"wellFormed":true}
```

写路径因此把该标题当作可改写行；`upsert` 用 `renderMethodHeading` 重写为
`## 方法（新来源）`（或只保留默认标记），**第二段/未知标记被静默删除**。

## 复现（2026-11-14 实测）

```sh
TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e '
import { parseMethodHeading } from "./packages/deep-research-pack/src/lib/library-fold.ts";
import { upsertMethodEntry } from "./packages/deep-research-pack/src/lib/method-library-write.ts";
const sections = { source: "s", verify: "v", report: "r", limit: "l" };
for (const head of ["## 方法（来源1）（来源2）", "## 方法（来源）〔草稿〕", "## 方法〔草稿〕", "## 方法〔默认偏好〕〔草稿〕"]) {
  const lib = head + "\n- 找来源: s\n- 怎么核实: v\n- 报告怎么写: r\n- 不承诺: l\n";
  const res = upsertMethodEntry(lib, { name: "方法", provenance: "新来源", isDefault: false, sections, legacyText: null });
  console.log(JSON.stringify(head), "=>", JSON.stringify(parseMethodHeading(head)), "action=", res.action, "after=", JSON.stringify(res.text.split("\n")[0]));
}
'
```

实测四例均 `wellFormed:true`、`action=updated`，首行分别变成 `## 方法（新来源）` /
`## 方法（新来源）` / `## 方法（新来源）` / `## 方法（新来源）〔默认偏好〕`——原第二段消失。

## 根因（已证）

段循环的「识别」与「合法性」判据分离：只要 `HEADING_SEGMENT` 匹配任意 `（…）`/`〔…〕` 就消费，
只有**不是段**的尾缀才置 `wellFormed=false`。第二 provenance / 未知 `〔…〕` 是「已识别形态但
不应存在」，当前没有分支。

## 影响面

- 用户写了 `（日期）（来源）` 或 `〔草稿〕` 后编辑任意字段，第二次来源/标记被静默删除；数据损失不可恢复。
- 写路径不报错，用户看不到「这条标题有未知段」；与 BUG-138 的「未识别后缀」同族，但这次是
  **看似合法**的段形态。
- 默认标记重复 `〔默认偏好〕〔默认偏好〕` 同病：只保留一个，第二个被吞。

## 牵出的失败类

- **C4 边界/语法** + **C3 读/写同源**（fold 与写路径共享 codec，但 codec 把未知段当合法）。
- 同机制第 **5** 次（127/128/138/167 → 本条已识别段）。类修：段循环维护 `provenanceSeen` /
  `defaultSeen`，第二个 provenance、未知 `〔…〕`、第二个 default 一律 `wellFormed=false`；
  写路径复用同一判定，不另写白名单。

## 修复判据

- `parseMethodHeading`：第二个 `（…）`、任何不属于 `〔默认偏好〕` 的 `〔…〕`、第二个
  `〔默认偏好〕` → `wellFormed=false`；`name`/首个 provenance 不变。
- `upsertMethodEntry`/`setDefaultMethodEntry` 对 `wellFormed=false` 的标题 fail-loud
  （「先规范化标题再编辑」），不得静默重写丢段。
- 反证：上表四例先红（`wellFormed:true`/updated/丢段）后绿（false/抛错/保留）；正例
  `（来源1）〔默认偏好〕` 仍 updated 且不丢段；`tests/cockpit/library-heading-consistency.spec.mjs`
  增矩阵，40 格不回归。

## 修复关联

未修。P2 修理型，授权范围 = `library-fold.ts` + `method-library-write.ts` + 对应 spec；
去向可记 `none — 缺陷修复`。

## 修复落地（2026-11-14）

- **改动**：`packages/deep-research-pack/src/lib/library-fold.ts`、`packages/deep-research-pack/src/lib/method-library-write.ts`、`tests/cockpit/library-heading-consistency.spec.mjs`
- **红证**：`node --test tests/cockpit/library-heading-consistency.spec.mjs`
  ```
  not ok 4 - 段身份：重复/未知段必须不可改写，写路径 fail-loud 不丢段
  # pass 3
  # fail 1
  ```
- **绿证**：`node --test tests/cockpit/library-heading-consistency.spec.mjs`
  ```
  # tests 4
  # pass 4
  # fail 0
  ```
- **反证/边界**：旧实现四例 `wellFormed:true` + `action=updated` 并丢第二段；修后
  `wellFormed:false` + `upsert` 抛「标题格式不可识别/重名」。正例
  `## 方法（来源1）〔默认偏好〕` 仍 updated，输出保留 `〔默认偏好〕`；`pnpm typecheck` 通过。
