# deep-research-pack

Deep Research 插件包：四角色 preset + host bundle 行。当前为**纯配置包**（零自写 JS、零构建、无 client 面，见 docs/00-index.md D7）——UI 用现成团队界面（`ui-agent-team`），皮肤层留待后续轮次。

## 内容

| 位置 | 内容 |
|---|---|
| `cordis.patch.yml` | bundle 行：preset roster（default: lead）+ present + ui-agent-team 观察行（团队机制行归 vendor agent-team-profile 层——A 定案；web 行 = base 出厂行、不进 bundle，D9） |
| `presets/lead/` | 研究主编：立项对齐（HITL1）、拆解分派、组队、综合交付（HITL2/Final） |
| `presets/scout/` | 侦察员：广度搜索、来源发现与质量分级、候选方向图 |
| `presets/analyst/` | 分析员：深度挖掘、证据抽取、交叉验证、反例搜索 |
| `presets/critic/` | 核查员：对抗审查、无来源结论狩猎、交付前质量门 |

角色职责表与方法论映射：`docs/design/20-roles.md`、`docs/design/30-methodology-mapping.md`。

## 新增一个研究角色

**第 0 步（先于一切代码）**：增删角色 = 推翻 D2（角色 = 4 个，见 docs/00-index.md 台账）——先在台账登记新 D 号，再动手。tests 的数量哨兵（tests/presets.test.mjs）会机械拦住没登记的增删。

1. `presets/<role>/` 三件套：`preset.yml`（name/description/order）+ `agent.cordis.yml`（自包含组合：persona 行 + skills roots + 工具行 + agent-instructions 行）+ `skills/<n>/SKILL.md`（frontmatter `name` = 目录名）；
2. 结构门禁：verify 门禁 preset-structure + 门禁 row-deps（行引用的 `@deepseek-ai/*` 全进 peerDependencies）；
3. roster 自动发现：bundle 的 agent-presets 行 `roots` 指向 `presets/`，新角色无需逐个登记 bundle 行；
4. 消费点**无需逐个改**：角色清单事实源 = 盘上 `presets/` 目录（基础整治 §3.2）——`preset-smoke` / `release-smoke` / `team-preflight-smoke` / `boot-run.sh` / `tests` 全部目录枚举。唯二要补的：`l4-lite-smoke` 的 `PROMPTS` 加该角色的标记 prompt（缺了 fail-loud 退出）；`scripts/l4-lite-smoke.mjs` 之外若新写脚本，用 `scripts/lib/roles.mjs` 枚举，别手抄清单（verify 门禁 `role-list-sync` 咬硬编码）；
5. 完成定义 = preset-smoke 真挂载绿（L1 面，keyless）。

## 新增一个 skill

1. 建 `presets/<role>/skills/<n>/SKILL.md`——frontmatter `name:` 必须**逐字等于目录名**（verify 门禁 preset-structure 强制）；
2. `agent.cordis.yml` **不用改**：`customSkillDirs` 指向整个 `skills/` 目录且 `includeDefaultRoots: false`，自动发现；
3. `cordis.patch.yml` **不用改**（bundle 行只管 roster/工具，不管 skill）；
4. 文档**不用改**：skills 清单的单一事实源 = 盘上目录（20-roles §2 已路由，基础整治 C8）；仅当 skill 承载**新方法论条目**时，`docs/design/30-methodology-mapping.md` 同 diff（L3 合同）；
5. 完成定义 = `source dev/env.sh && DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs` 绿——它断言每角色 `skills/list` **恰好等于**盘上目录，多一个少一个都会红。
