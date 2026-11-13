# 测试制度：三环、四账、五关

> 状态：implemented
> 关联：[D54](../../docs/decisions.md#d54)；操作手册 = [guides/67](../../docs/guides/67-test-strategy.md)；
> 程序卡 = [测试策略制度化](../../_backlog/_archived/settled_issues/2026-11-13-test-strategy-institutionalization.md)；
> 失败类账本 = [普查](../../_backlog/_archived/research/dsh-test-strategy/2026-11-13-failure-class-census.md)；
> 命名车道 = [D53](../../docs/decisions.md#d53)

## 决定

测试制度按三条循环、四份账本、五个关口运行；证据选择先归**失败类**，再选**最低可见层**，不按
测试金字塔或改文件数分配。任何修复要么落类级守卫，要么显式登记「不可机械化」；不能只补实例测试。

- **三环**：回归环（`pnpm test` = spec + checks；`test:vendor`）、装配环（L1/L2/entry/回放/真模型档）、
  发现环（探索 charter、变异矩阵、probes、后验取证）。
- **四账**：资产账（smoke registry 的 cost/uniqueClaim/oracle/sunset/lane）、失败类账（159 例普查 +
  类→守卫→缺口）、证据账（`reviewing-a-delivery` 的证据账本节）、探索账（research 题 + 探索技能）。
- **五关**：准入（唯一证明面/最低层/负控/owner/成本）、变更类（模型可见→snapshot B；新纯件→直测；
  新实体→消费者矩阵；新判据→变异矩阵）、必需（产品面证据在 CI/收尾，skip 可见）、退役
  （uniqueClaim/oracle/sunset 仍成立）、复盘（P0/P1/复发 → 五节复盘 + 新守卫）。
- **不是第六评估面**：五面验收合同仍以 [evaluation](../../docs/evaluation.md) 为准；本制度只回答
  「这次改动配什么证据、算不算够」。

## 为什么

79 张探索 BUG 的共同形态是「回归绿，但新输入上静默放行」：实例修了 8 次仍复发、双份事实各修一半、
消费者清单手写漏项、慢壳判据只能等分钟级、在场/点击计数/自报成功被当内容证明。根因不是测试数量，
而是缺类级守卫、缺必需性、缺账本与命名。三环四账五关把「发现→修→忘」改成
「发现→归类→类级守卫→账本→复盘」，并用 D53 的命名车道保证每条资产一眼可判。

## 输掉的方案

- **测试金字塔**：按层分配比例，不回答「这个失败类在哪层看得见」；本仓的贵层是浏览器/安装/模型，
  不是「集成」这个抽象层。
- **逐 BUG 补测试**：修 159 次仍不知道下一变体；只值实例，不值类。
- **所有测试塞进一个 `pnpm test`**：慢车道拖垮 pre-commit；发现环本来就不该每次跑。
- **覆盖率百分比门禁**：覆盖率高仍可全是 happy path；本仓用失败类 + 变异矩阵 + 盘侧 oracle 代替。
- **把探索当英雄行为**：不毕业成技能/账本，下一轮换个人重来；W3-1 已把 E1–E6 做成技能。

## 实际跑过的验证

- [guides/67](../../docs/guides/67-test-strategy.md) 已在 00-index / guides/60 / evaluation 接线；
  `docs-consistency` 路由 `exploratory-verification` 技能。
- 失败类普查 159 例、17 条复发链、41 张「修了未沉淀」已入账；smoke registry 28 条四字段 + lane。
- 机械把守：`test-lanes` / `smoke-registry` / `smoke-oracle-surface` / `ci-jobs` / `model-workflow` /
  `decisions-now` D53/D54；`pnpm test` spec 1339 + checks 101 全绿，`pnpm verify` 全绿（本机 2026-11-13）。
- 类级守卫先行片：方法库 heading 40 格、run-lock 7 例、方法库路径 8 例、CI 聚合 skipped=failure、
  lifecycle 装起后 content.apply 效果 + 可选团队层缺席。
- 未证明：W2-3 消费者全矩阵（已落 role 窄矩阵）、W2-6/7 全族假绿 oracle/变异证明、W3-5 资产退役（已完成）、
  W0-6 hook/DOM 行为面；`test:e2e`/`test:entry` 全量未跑。

## 环境状态

本机 macOS / Node 22.23.1 / pnpm 11.7.0；D54 台账行 32,725 bytes（硬顶 32,768）——下一次新增 D 号
必须先按「搬 Note」压缩旧行，不能抬顶。CI 的 `all-checks-passed` 与 `model-smoke` 是静态契约 +
手动通道，真实 GitHub 绿灯与带 key 运行仍需外部执行。
