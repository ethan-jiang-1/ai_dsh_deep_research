---
status: 已修
severity: P1
opened: 2026-11-20
---

# BUG-340：protocol-audit CLI 壳三处未跑路径（缺 import / null 解引用），run-accept 的 protocol 预检必崩

> 严重级别：P1 ｜ 发现：2026-11-20 ｜ 状态：已修（2026-11-21）— 结论：壳补 `readdirSync`/`splitFrontmatter` import + `protocol === null` 守卫；壳级证据走 ⑩ 带 evidence 用例；审查：agent — 红证 + e2e 全绿；去向：none — 机械修复

## 症状

任何带 `evidence/` 的 bundle 上执行 protocol 审计都会以 ReferenceError 退出；缺 `protocol.json` 的 bundle 上以 TypeError 退出。`run-accept` 的 protocol-audit 预检因此必红，新 run 写不了 `acceptance.md` / `delivered.json`，也不能 `--archive`。

```text
file:///.../checks/run-gates/protocol-audit.mjs:158
  const { fm } = splitFrontmatter(readIf(join(evidenceDir, file)))
ReferenceError: splitFrontmatter is not defined
```

## 根因

`checks/run-gates/protocol-audit.mjs` 的壳有三处从未被真跑覆盖的路径：

1. 顶部只 import `{ existsSync, readFileSync, writeFileSync }`，而证据扫描用 `readdirSync` 与 `splitFrontmatter`（`bf386685` 加入证据读取时漏 import）；
2. 缺 `protocol.json` 时 `protocol === null`，仍解引用 `protocol.method`——`run-accept` 的 no-protocol 预检必崩；
3. CLI 从未在有 `evidence/` 的 bundle 上跑过：旧夹具没有证据目录，所以第 1 条一直绿，第 2 条被第 1 条挡在更早的崩溃里。

违反的性质：**纯核有测试 ≠ CLI 壳可执行**。`protocol-audit-core` 的测试全绿，壳从未被真跑。

## 复现

```sh
node checks/run-gates/protocol-audit.mjs research-workspace/drt_pg-latest-stable
# 修复前：ReferenceError: readdirSync is not defined；补 import 后撞 splitFrontmatter is not defined
node checks/run-gates/protocol-audit.mjs <缺 protocol.json 的 bundle>
# 修复前：TypeError: Cannot read properties of null (reading 'method')
node checks/smoke/run-accept.e2e.mjs
# 修复前：⑩ 带 evidence 用例红（ReferenceError）、⑩ no-protocol 用例红（TypeError）
```

## 修法

壳补 `readdirSync` + `splitFrontmatter` import；`protocol === null` 时跳过 method-library 检查（缺协议由 `no-protocol` 判据承担，不在壳里二次崩）。同 diff 在 `run-accept.e2e.mjs` 的 ⑩ 契约夹具里加 `evidence/` 文件并断言「不用未定义符号 / 返回判定而非崩溃」，同时修掉让该件长期假红/早退的两处夹具缺口（⑩ final 缺 H2、⑥ 交付段缺 `delivered:` 指针）。

## 修复判据

- 真 bundle 上 CLI 不再以 ReferenceError/TypeError 退出，返回 0/1 判定；旧 bundle 的内容红（如 final-sections）按不兼容原则不修。
- `run-accept` 的 protocol 预检不再因壳崩溃而红；内容红如实记录。
- 壳级测试在删掉 import 或 null 守卫时点名红（先看红）。
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/run-gates/protocol-audit.mjs",
    "checks/smoke/run-accept.e2e.mjs"
  ],
  "red": {
    "command": "node checks/run-gates/protocol-audit.mjs research-workspace/drt_pg-latest-stable",
    "exit": 1,
    "output": "ReferenceError: readdirSync is not defined；补 import 后撞 splitFrontmatter is not defined；缺 protocol.json 时 TypeError: Cannot read properties of null (reading 'method')"
  },
  "green": {
    "command": "node checks/smoke/run-accept.e2e.mjs",
    "exit": 0,
    "output": "⑩ 带 evidence：CLI 不用未定义符号 / 返回判定而非崩溃；⑩ 契约日后缺 protocol：红项点名 no-protocol；run-accept.e2e 全绿"
  },
  "guard": {
    "path": "checks/smoke/run-accept.e2e.mjs"
  }
}
```

可关闭：是
