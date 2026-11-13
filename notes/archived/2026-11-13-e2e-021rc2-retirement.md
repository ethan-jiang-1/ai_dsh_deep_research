# 资产退役：e2e-021rc2.entry（升级端到端）

> 状态：implemented
> 归档：2026-11-13

## 决定

退役 `scripts/smoke/e2e-021rc2.entry.mjs`（319 行，dev-only，无 CI）。退役前把其唯一的
**角色 picker 连续相邻**断言迁入 `client-load.entry` 并实跑绿；其余状态/配置页签真数据、
插件零故障断言由 `client-load.entry` 的 seed 档覆盖。

## 为什么

- `e2e-021rc2` 的独特价值是 0.2.1-rc.2 升级后的真实 picker/页签回归；随着 vendor pin 到 rc.5，
  这条「从 rc.2 升上来」的路径已不是日常开发面，且 dev-only、无 CI、维护成本高。
- 角色 picker 是它唯一未被 `client-load` 覆盖的断言；迁入后，`client-load` 的 seed 档
  （CI job `client-load`）在干净 home 上同时验证 picker、状态/配置/终稿页签与插件零故障。
- 退役不是删除证据：替代断言在 required CI 路径上，且比 dev-only 手动档更常跑。

## 输掉的方案

- **保留双档**：picker 断言重复，两个浏览器档继续分叉维护；不采纳。
- **只删文件、不迁 picker**：角色顺序回归失去可见证据；不采纳。
- **把升级路径改成 keyless 单测**：升级是真实 profile/真实 web 装配，单测看不见；不假装覆盖。

## 实际跑过的验证

- `client-load.entry --seed tests/fixtures/client-load-home --port 3118`：角色 picker
  `四个角色=4 连续=true`，序列含四个 Deep Research + Method Editor；整档 **ALL PASS**。
- 退役 diff：删 319 行 smoke、registry 条目、`scripts/README`/`guides/60`/`project-map` 行；
  `client-load-reference.support` / `web-ui-nav` 的消费注释同步；`pnpm verify` / `pnpm test` 绿。
- 历史链接：归档/研究件里指向旧文件的 markdown 链接改指本 Note（只改链接目标，不改正文）。

## 未证明 / 复活条件

- **未重跑 rc.2 → rc.5 的真实升级**；`engines.dsh` 仍声明 `>=0.2.1-rc.2 <=0.2.1-rc.5`。
- 若再次承诺 rc.2 升级路径、或用户报告 rc.2→rc.5 升级异常，按
  [`triggers.md`](../../_backlog/triggers.md) 的「0.2.1-rc.2 升级端到端」行复活：先补回
  picker/页签断言（可从本 Note 与 git 历史取回旧件），再决定是否重新进 CI。
