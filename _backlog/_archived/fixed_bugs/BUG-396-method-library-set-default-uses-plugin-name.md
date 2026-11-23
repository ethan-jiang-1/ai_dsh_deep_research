---
status: 已修
severity: P1
opened: 2026-11-23
---

# BUG-396：method_library_set_default 的 action=set 分支误用插件名变量 name 对账，写盘后必抛错

> 严重级别：P1 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：set_default 的核对与回执只用请求名；未声明目标名不写盘；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在 Method Editor 会话中通过 `method_library_set_default` 执行 `{ action: 'set', name: '<任意方法名>', operationId }` 将某条方法设为默认时：
- 工具先持有文件锁把 `〔默认偏好〕` 写入磁盘上的 `method-library.md`；
- 随后回读核对竟把库里的新默认名 `defaults[0]` 与模块级常量 `export const name = 'method-library-tool'` 比对（`defaults[0] !== name`）；
- 只要方法不叫 `'method-library-tool'`，工具必定抛出 `Error('默认操作回读未通过：库默认标记不符合操作结果')`，造成“磁盘已改写、工具报错回绝、UI 侧判作失败/状态未知”的半写入分裂态。即使方法名恰巧叫 `'method-library-tool'`，返回值里的 `name` 字段返回的也是插件名常量而非输入方法名。

## 分诊与授权

- 严重级：P1 — Host 方法库「设默认」工具主路径 100% 必败且先改盘后抛错。
- 表面 / 边界：pack host tool（[method-library-tool.ts](../../../packages/deep-research-pack/src/method-library-tool.ts)）/ ① 代码（Tool execute）。
- DSH 不变量：Fail-loud consistency — 写后回读必须核对真实参数 `requestedName`（且未验证通过前不应处于半成功状态或被插件常量遮蔽）。
- 触及面：none — host 工具层 + 单测。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 直接调用 `method_library_set_default.execute`（`action: 'set'`, `name: '比较分析法'`），可见磁盘已写入 `〔默认偏好〕`（`DISK_CONTAINS_DEFAULT= true`），随后抛出 `Error: 默认操作回读未通过：库默认标记不符合操作结果`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply } from "./packages/deep-research-pack/src/method-library-tool.ts";
const tmp = mkdtempSync(join(tmpdir(), "bug396-"));
try {
  writeFileSync(join(tmp, "method-library.md"), "## 比较分析法（2026-11-23，内置：方案比较）\n- 找来源: official\n- 怎么核实: cross-check\n- 报告怎么写: table\n- 不承诺: no forecast\n", "utf8");
  const tools = new Map();
  apply({
    sessionProjections: {
      register() {},
      stateOf: () => ({
        methodEditor: true, activeTurn: 1, pending: null,
        claims: [{ operationId: "0123456789abcdef", action: "set-default", requestId: "req-1", turn: 1, name: "比较分析法", callId: "call-1" }],
      }),
    },
    tools: { register: (d) => tools.set(d.name, d) },
  });
  const res = await tools.get("method_library_set_default").execute(
    { action: "set", operationId: "0123456789abcdef", name: "比较分析法" },
    { agent: { session: { header: { agentPreset: "method-editor", cwd: tmp } } }, callId: "call-1" },
  );
  assert.equal(res.name, "比较分析法");
} finally {
  console.log("DISK_CONTAINS_DEFAULT=", readFileSync(join(tmp, "method-library.md"), "utf8").includes("〔默认偏好〕"));
  rmSync(tmp, { recursive: true, force: true });
}
'
```

## 根因（已证）

[method-library-tool.ts](../../../packages/deep-research-pack/src/method-library-tool.ts) 第 21 行定义插件名常量 `export const name = 'method-library-tool'`；在 `method_library_set_default.execute`（第 136–170 行）中：
1. 第 141 行提取了 `const requestedName = args.action === 'set' ? args.name : undefined`，第 154 行也用 `requestedName` 调 `setDefaultMethodEntry`；
2. 但第 160 行回读校验写成了 `defaults[0] !== name`，第 167 行返回值写成了 `name: args.action === 'set' ? name ?? '' : ''`，两处均引用了模块级 `name`（`'method-library-tool'`）而非 `requestedName`（且 TypeScript 下 `name` 是有效 string 常量所以未报错）。

## 牵出的失败类

- 同机制第 1 次｜处置：点修 + 为 `method-library-tool.ts` 全部工具补充覆盖 `action='set'|'clear'` 的真实执行回归。

## 修法方向

- 第 160 与 167 行改用 `requestedName`（即 `args.name`）；
- 为防后续重构再次遮蔽，可重命名或明确解构局部变量，并为 `method_library_upsert` / `method_library_set_default` / `method_library_remove` 补充 keyless 真实文件执行单测；同时若需避免回读校验失败后磁盘残余脏态（在能检测不合法前先纯计算验证），亦可一并加固。

## 修复判据

- 复现命令退出码为 0，`method-library.md` 写入唯一默认 `'比较分析法'`，工具返回 `{ action: 'set', name: '比较分析法', defaults: ['比较分析法'] }`。
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 execute 里的 `requestedName`/`target` 改回模块级 `name`（插件名）→ 合法 set 写盘后必抛「回读未通过」，回执名报成插件名。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/method-library-tool.ts",
    "tests/pack/contract/method-library-tool-defaults.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-396 set_default：核对与回执' tests/pack/contract/method-library-tool-defaults.spec.mjs",
    "exit": 1,
    "output": "默认操作回读未通过：库默认标记不符合操作结果"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/pack/contract/method-library-tool-defaults.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/pack/contract/method-library-tool-defaults.spec.mjs"
  }
}
```
