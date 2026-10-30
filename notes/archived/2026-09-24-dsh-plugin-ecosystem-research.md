# RFC：DSH 插件生态认真研究（粗扫的后续）

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap §队列「DSH 插件生态认真研究」（2026-09-26 补完毕业手续——**毕业事故见
[postmortem](2026-09-26-roadmap-graduation-drift.md)**：本 RFC 的报告早已交付，
但迁移与 roadmap 更新漏做，队列 ▶ 因此指了一件已完成的事）。

## 决定

按 research 技能跑一轮认真调研，产出**调研报告**（不是代码）；结论直接决定后续投入方向
（守差异化 vs 补生态空白）。报告 = [dsh-plugin-ecosystem](../implemented/2026-09-25-dsh-plugin-ecosystem.md)。

## 实施记录

- 报告落 `notes/research/2026-09-25-dsh-plugin-ecosystem.md`（10+ 钉版引用：清单/竞品仓库/
  官方 Discussion/媒体报道）；`notes/research/README.md` 状态表 + `docs/00-index.md`
  §外部研究材料落点同 diff 登记；
- 生态规模实证：知识研究类 **456+ 插件**、多个 awesome 清单（280+ 至全量收录）、已从
  "赛博乐高"进化为 Agent Store；
- 直接竞品 8 个（dsh-deep-research / dsh-scholar / dsh-deepresearch / dsh-evoresearch /
  dsh-search-boost / dsh-industry-research / dsh-science / dsh-plugin-insight-mode）；
- **定位结论**：我们的空白位 = **多角色 preset 架构 + 证据机械审计 + DSH 原生 Teams**；
  搜索增强/学术工具/知识库三面生态已饱和——不扩，守质量框架定位。

## 验收（实际达成）

- 报告带钉版引用 ✓（10+ URL + 拉取日期）；
- 一句话结论 ✓：**相邻位竞争激烈但"通用 deep research 质量框架"是空白位；不影响路线，
  但排除了"往搜索/学术面扩"这一方向**。

## 输掉的方案

- **现在就做**（原草案）：当时否决（用户节奏触发）；后由用户纳入马拉松三号自主执行；
- **报告落 docs/**：否决——调研报告属"过去"层，归 `notes/research/`（带状态表）。
