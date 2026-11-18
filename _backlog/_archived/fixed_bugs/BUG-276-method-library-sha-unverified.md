---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-276：method.library_fields_sha256 只校验 64 位 hex——从不与工作区方法库实际字段对账

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：library_fields_sha256 从工作区方法库重算
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`checks/lib/gates/protocol-core.mjs:362–363`（只 `SHA256.test`）；模板 =
> `content/templates/run/protocol.json` 的 `method.library_fields_sha256`；
> 方法库正本 = `packages/deep-research-pack/src/lib/method-library/*` 与工作区 `method-library.md`。
> 探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

protocol 的 `method.library_fields_sha256` 是“本次采用的方法库字段快照指纹”。schema 只校验：

```js
if (method.library_fields_sha256 !== null && !SHA256.test(...)) red('必须是 null 或 64 位 hex')
```

没有任何代码把它与方法库实际字段（source/verify/report/limit 或 library entry）重算比对。因此：

- 写一个任意 64-hex（全 0）也能过；
- 方法库字段在 run 中途变更，protocol 的 sha 不会红；
- `library_name` + sha 只在投影里显示，不证明“采用的就是库里的那一版”。

## 分诊与授权

- 严重级：P2 — 方法库快照承诺无消费者；“采用库方法”可造假/漂移。
- 表面 / 边界：protocol→method-library 合同 / ② 静态
- DSH 不变量：fail-loud；sha 必须可复算
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn 'library_fields_sha256' checks packages/deep-research-pack/src | head
# 只有 protocol-core 的 hex 校验；无方法库重算
# 临时 protocol: kind=library, library_name=X, library_fields_sha256=000...0 → 绿
```

## 根因（已证）

`method` 只与 protocol 内部/投影对账（method.id 与 question 采用、kind/field keys），不读工作区
`method-library.md` 或打包内置库；sha 是自由声明。

## 牵出的失败类

- 语义 C2（指纹无消费者）+ C7；与 271/272 同族（protocol 声明字段）。
- 类级方向 = sha/指纹字段必须由正本重算；协议只存结果，不存自由值。

## 修法

1. `protocol-audit` 读方法库（`research-workspace/method-library.md` 或随包内置），按 `library_name`
   重算 fields sha，与 protocol 比对；不匹配 → 红；
2. `library_name` 不存在/字段缺失 → 红；
3. 测试：全 0/漂移 → 红；正确 sha → 绿；
4. 旧场按断代。

## 修复判据

- sha 由正本重算并比对；漂移/伪造 → 红；
- 旧场不误伤；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "checks/run-gates/protocol-audit.mjs",
    "tests/run/gates/protocol-core.spec.mjs",
    "checks/run-gates/run-accept.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 39 - method.library_fields_sha256：从方法库字段重算（BUG-276）"
  },
  "green": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
