# deep-research-pack

Deep Research 插件包：四角色 preset + host bundle 行。R1 为**纯配置包**（零自写 JS、零构建、无 client 面）——UI 用现成团队界面（`ui-agent-team`），皮肤层留待后续轮次。

## 内容

| 位置 | 内容 |
|---|---|
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ web 工具 + 团队通道 + present |
| `presets/lead/` | 研究主编：立项对齐（HITL1）、拆解分派、组队、综合交付（HITL2/Final） |
| `presets/scout/` | 侦察员：广度搜索、来源发现与质量分级、候选方向图 |
| `presets/analyst/` | 分析员：深度挖掘、证据抽取、交叉验证、反例搜索 |
| `presets/critic/` | 核查员：对抗审查、无来源结论狩猎、交付前质量门 |

角色职责表与方法论映射：`docs/design/20-roles.md`、`docs/design/30-methodology-mapping.md`。
