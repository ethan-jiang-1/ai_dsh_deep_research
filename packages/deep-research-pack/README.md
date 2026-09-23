# deep-research-pack

Deep Research 插件包：四角色 preset + host bundle 行。当前为**纯配置包**（零自写 JS、零构建、无 client 面，见 docs/00-index.md D7）——UI 用现成团队界面（`ui-agent-team`），皮肤层留待后续轮次。

## 内容

| 位置 | 内容 |
|---|---|
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ web 工具 + 团队通道 + present |
| `presets/lead/` | 研究主编：立项对齐（HITL1）、拆解分派、组队、综合交付（HITL2/Final） |
| `presets/scout/` | 侦察员：广度搜索、来源发现与质量分级、候选方向图 |
| `presets/analyst/` | 分析员：深度挖掘、证据抽取、交叉验证、反例搜索 |
| `presets/critic/` | 核查员：对抗审查、无来源结论狩猎、交付前质量门 |

角色职责表与方法论映射：`docs/design/20-roles.md`、`docs/design/30-methodology-mapping.md`。

## 新增一个研究角色

1. `presets/<role>/` 三件套：`preset.yml`（name/description/order）+ `agent.cordis.yml`（自包含组合：persona 行 + skills roots + 工具行 + agent-instructions 行）+ `skills/<n>/SKILL.md`（frontmatter `name` = 目录名）；
2. 结构门禁：verify 门禁 3（preset-structure）+ 门禁 6（行引用的 `@deepseek-ai/*` 全进 peerDependencies）；
3. roster 自动发现：bundle 的 agent-presets 行 `roots` 指向 `presets/`，新角色无需逐个登记 bundle 行；
4. 完成定义 = preset-smoke 真挂载绿（L1 面，keyless）。
