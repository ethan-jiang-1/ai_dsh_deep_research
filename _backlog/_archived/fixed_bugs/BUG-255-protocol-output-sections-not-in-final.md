---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-255：`protocol.output.sections` 只对 question.md 的投影对账——final.md 可以完全换一套节名

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：protocol.output.sections→final H2 显式映射；final 缺节红
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-model-visible-semantics.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：[checks/lib/gates/protocol-audit-core.mjs](../../../checks/lib/gates/protocol-audit-core.mjs) 第 160–176 行
> （只检查 question.md §Protocol 的“输出”行含每个 section）；`protocol-core` 只校验 sections 非空/不重复。
> 探索轮 = [模型可见语义卡](../settled_issues/2026-11-18-model-visible-semantics.md)。

## 症状

`protocol.json` 的 `output.sections` 是本次报告的骨架（模板示例 = decision/options/criteria/tradeoffs/risks）。
门禁只验证：

- JSON 里 sections 是非空、无重复、无空串（`protocol-core`）；
- question.md §Protocol 的投影行包含每个 section 名（`protocol-audit`）。

但 **final.md / final/vN.md 不需要出现这些 section**；`presets.test` 只钉 final 的首屏六节
（决策摘要/备选与取舍/…），`reader` 门只钉读者版六节。于是：

```json
"output": { "sections": ["foo", "bar"] }
```

只要 question.md §Protocol 抄了 `sections = foo / bar`，协议审计绿；final.md 可以没有 foo/bar，
也可以写完全不同的节。报告契约在 JSON、投影、终稿三处各说一套。

## 分诊与授权

- 严重级：P2 — `output.sections` 是可执行合同却只对中间投影生效；终稿可偏离。
- 表面 / 边界：protocol→final 输出合同 / ② 静态（节名）
- DSH 不变量：fail-loud；同一契约不能只在中间件上生效
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定。

```sh
sed -n '160,176p' checks/lib/gates/protocol-audit-core.mjs
node -e "const p=require('./packages/deep-research-pack/content/templates/run/protocol.json'); console.log(p.output.sections)"
grep -n '决策摘要\|备选与取舍' packages/deep-research-pack/content/templates/run/final.md
# 临时 final.md 不含 sections（或换成自定义节）→ protocol-audit 不报
```

## 根因（已证）

`output.sections` 在协议审计里只校验 question 投影；final 的节名由 `presets.test` 的固定六节钉住，
不是从 protocol 派生。两份“节集合”没有对账，终稿也不读 protocol 的 sections。

## 牵出的失败类

- 语义 C2（三处节名事实）/ C7（中间件绿）；与 251/252 同族。
- 类级方向 = final 的节集合由 protocol.output.sections 派生（或显式映射表），question 投影只是副本。

## 修法

1. `protocol-audit` 增加 final 检查：final.md 的 H2 集合必须覆盖 protocol.output.sections（映射表若需要，
   单一正本）；final 缺 section → 红/警告（按契约版本）；
2. 模板示例的英文 sections 与 final 中文节名建立显式映射（或统一）；
3. 测试：protocol sections=["foo"] + final 无 foo → 红；合法映射 → 绿；
4. 与 reader 门的六节关系写清（reader 是终稿的读者版，不是另一套报告骨架）。

## 修复判据

- protocol.sections 在 final 可达；缺/多可按契约判红；合法模板绿；
- 旧场按断代；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "checks/run-gates/protocol-audit.mjs",
    "tests/run/gates/protocol-core.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 35 - final 覆盖 protocol.output.sections 的映射节…（关闭 checkFinalSections 后红）"
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
