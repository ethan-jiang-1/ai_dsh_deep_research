---
status: 修复就绪
severity: P1
opened: 2026-11-20
---

# BUG-340：protocol-audit CLI 使用未导入的 readdirSync，run-accept 的 protocol 预检必崩

> 严重级别：P1 ｜ 发现：2026-11-20 ｜ 状态：修复就绪（根因/修法/判据齐；本轮只报不修）

## 症状

任何 bundle 上执行 protocol 审计都会以 ReferenceError 退出；`run-accept` 的
protocol-audit 预检因此必红，新 run 写不了 `acceptance.md` / `delivered.json`，也不能
`--archive`。

```text
file:///.../checks/run-gates/protocol-audit.mjs:156
  const evidences = existsSync(evidenceDir)
                    ^
ReferenceError: readdirSync is not defined
```

## 根因

`checks/run-gates/protocol-audit.mjs` 顶部只 import
`{ existsSync, readFileSync, writeFileSync }`，而第 156 行用 `readdirSync(evidenceDir)` 读
`evidence/` 目录。`bf386685`（BUG-300…319 批）加入证据读取时漏了 import。

违反的性质：**纯核有测试 ≠ CLI 壳可执行**。`protocol-audit-core` 的测试全绿，壳从未被真跑。

## 复现

```sh
node checks/run-gates/protocol-audit.mjs research-workspace/drt_pg-latest-stable
# ReferenceError: readdirSync is not defined（exit 1）
node checks/run-gates/run-accept.mjs research-workspace/drt_pg-latest-stable --no-write
# protocol-audit 预检红 → run-accept RED
```

## 修法

1. import 补 `readdirSync`。
2. 同 diff 补一条 CLI 壳级测试（真跑该入口 + 最小 bundle），让"核绿、壳崩"不能再出现。

## 修复判据

- 上面第一条命令 exit 0，输出 protocol 审计行。
- 上面第二条命令的 protocol-audit 预检 PASS。
- 新增壳级测试在删掉 import 时点名红（先看红）。
- `pnpm verify` / `pnpm test` 绿。

可关闭：否
