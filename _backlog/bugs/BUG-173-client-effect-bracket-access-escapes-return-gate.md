---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-173：client-effect-return 只认点号属性——`scoped['effect']` 的无返回回调逃逸

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 client 注册契约，需用户放行
>
> 位置：[tests/checks/client-effect-return.test.mjs](../../tests/checks/client-effect-return.test.mjs)；
> 被测 = [packages/deep-research-pack/src/client/index.ts](../../packages/deep-research-pack/src/client/index.ts)。

## 症状

判据只匹配 `PropertyAccessExpression` 且属性名恰为 `effect`：

```js
if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'effect')
```

`scoped['effect'] (() => { registerWithoutDisposer() })` 是同一个 API 的方括号调用，AST 是
`ElementAccessExpression`，完全不在扫描面里；无返回 → 注册不可回收，测试仍 1/1 PASS。

## 复现（2026-11-14 实测）

```sh
cp packages/deep-research-pack/src/client/index.ts /tmp/index.ts.bak
cat >> packages/deep-research-pack/src/client/index.ts <<'EOF'

export function __probeBracketEffect(scoped: any) {
  scoped['effect'] (() => { void 0 })
}
EOF
node --test tests/checks/client-effect-return.test.mjs
# ok 1 - client 注册：每个 scoped.effect 回调都返回 disposer（静态形状）
# # tests 1 / # pass 1 / # fail 0      ← 应红
cp /tmp/index.ts.bak packages/deep-research-pack/src/client/index.ts
```

## 根因（已证）

AST 形状判据只建模了点号成员访问；`scoped['effect']` / `scoped["effect"]` 是同义调用，但
`isPropertyAccessExpression` 为 false。判据的合同句是「每个 `scoped.effect(callback,label)`」；
方括号写法属于同一 API，当前是**语法旁路**。

## 影响面

- 新代码只要用方括号访问 `scoped['effect']`，就能绕过「回调必须返回 disposer」的静态守卫；
  注册贡献在 HMR/卸载时不可撤销（与 BUG-160 的「提及/注释不是执行」同属判据形状窄于合同面）。
- 当前 `index.ts` 全用点号，属门禁钝化（P2）；但该守卫是 client dispose 的唯一快路径。

## 牵出的失败类

- **C7 假绿**（AST 形状窄于 API 面）+ **C2 消费者遗漏**。
- 同机制第 **1** 次（client-effect-return 是 W0-6 新守卫）；类修：把「effect 调用」抽成一个
  predicate（PropertyAccess **或** 字面量 ElementAccess），所有 client 注册判据共用。

## 修复判据

- 识别 `scoped['effect']` / `scoped["effect"]` 字面量方括号调用，与点号同判（回调必须 block body
  直接 return，expression body 视为返回）。
- 负例：上面的方括号无返回回调 → 必须红；正例：`scoped['effect'] (() => () => cleanup())` → 绿。
- 反证：先加方括号红例看红，再修 predicate；还原后全绿；防空语料 effects ≥10 不变。

## 修复关联

未修。触面 = client 注册契约/门禁自身，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
