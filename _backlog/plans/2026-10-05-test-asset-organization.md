# 推敲：测试资产的组织——档位、验收面与传统金字塔词汇的桥

> 状态：推敲中｜毕业门判断 = 待定（预判：小缺口直派收拢，深题成文与否待推敲）｜下一步 = 用户点名继续推敲，或打磨轮成熟后转直派/RFC

## 背景 / 触发

用户 2026-10-05 提问：单元 / 集成 / 端到端等测试资产如何组织，"起码有一个套路，不能太随便"。本轮 session 实查判定：本仓已有**三轴组织**（2026-10-04 test-strategy 采纳时刻意的反金字塔设计）——档位轴（keyless ↔ 真模型，`layering` 钉死默认回归零外部依赖）、验收面轴（L0–L4，面面不互抵）、命名即层轴（`*.test.mjs` / `*-smoke` / `*-probe` / `*-gate·audit·scan`，文件名即申报），外加 fixtures taxonomy 与任务型路由表。真缺口 = 传统词汇对照桥与新检查落家序的单一入口；用户裁定入卡深想（金字塔比例 / 成本档位策略 / 覆盖面账），不做直派小修。

## 已知与未决

### 已知事实

- 三轴正本在场：[project-map §测试怎么选](../../docs/project-map.md)（证据表）、[evaluation 五面](../../docs/evaluation.md)、[scripts/AGENTS 命名即层与档位登记制](../../scripts/AGENTS.md)、[tests/AGENTS 放置规则](../../tests/AGENTS.md)——"新检查住哪"的成分齐但散在四处；
- 回归文件 19 个：纯函数型 4 个（消费 `scripts/lib` 谓词与折算）+ 契约型其余——glob 层无差别对待（keyless 秒级、同一条 `pnpm test`）；
- 传统词汇对照词典已拟（见候选 A 表，未落盘——本卡即其持有处）；
- 姊妹仓 `ai_dsh_assitant` 有 `docs/testing.md`（prove-it-red 政策 owner）与 `pre-push-evidence` 技能（改动面 → 最小可信证据的选择 owner）——与本仓任务型路由表同职能异载体，未细读；
- 反对方向的在案教训：清单必腐（count-free 门禁的存在理由同源）、一词一义（第二套阶段词 = 噪声）、目录窄迁三条件刚判"不迁"（[项目可驾驭性 Phase 1 Note](../../notes/implemented/2026-10-05-project-navigability-phase1.md)）。

### 未决点

1. **词汇桥**：传统 unit / integration / e2e ↔ 本仓形态的对照表落不落、落哪（project-map §测试怎么选最顺；tests/AGENTS 预算顶格）；
2. **落家序**：六步决策序（契约测试 → 冒烟 → 真模型档 → verify 门禁 → run 门 → fixtures）收拢成单一入口文档，还是维持四处分散 + 本卡持有；
3. **比例与成本**：各档位触发频率与成本曲线（每 commit 秒级 → 按改动面 → 里程碑级）要不要成文为显式选层策略；升档判据（"失败先定位层再扩大范围"原则）够不够；
4. **覆盖面账**：要不要任何形式的覆盖登记（反对：清单必腐；支持：驾驶盲区不可见）——折中候选 = 关键资产清单住 discipline-map，或显式判"不做"；
5. **真模型档经济学**：L4-lite 等档的成本与触发节奏无量化，何时值得升档全靠判断；
6. **传统概念无落点者**（mutation testing、property-based 等）：要不要显式登记"刻意不做 + 理由"，防后人再问。

### 待答问题 / 待跑实验

- 待答 = 上列六点；待跑 = 通读姊妹仓 `docs/testing.md` 与 `pre-push-evidence` 技能全文（同职能异载体的借鉴价值）；可选实验 = 用最近三个真实改动回放"落家序"，验证每步是否都能无歧义选对家。
- **喂给谁**：毕业判断 → 小缺口直派收拢（候选 A/B）或维持现状只留对照表进卡；深题若需成文 → RFC。

## 候选与取舍

- **候选 A（最小）**：对照表 + 落家序收拢进 project-map §测试怎么选——素材已备（下表），零新发明；代价小，但不解决比例 / 覆盖 / 经济学深题。

  | 传统词汇 | 本仓形态 | 住哪 |
  |---|---|---|
  | 单元（纯函数） | run-state / hitl-fold / activity-fold / tool-card / bundle-bind 断言 | tests/ |
  | 契约（结构断言） | layering / smoke-contract / evaluation-contract / presets / 各门用例 / navigability-contract | tests/ + fixtures |
  | 集成（真子系统，keyless） | preset-smoke / release-smoke / snapshot-replay / client-load | scripts/ 冒烟族 |
  | 端到端（真模型） | l4-lite / team-preflight / entry-chain-probe / client-hitl；完整 run = L4 全量 | scripts/ 真模型档 |
  | 生产审计 | node-gate / schema-scan / evidence-audit（对真实 run bundle） | scripts/ run 门 |

- **候选 B（成文选层策略）**：A + 档位成本与升档判据成文——回答"什么改动值得跑多贵的东西"；
- **候选 C（覆盖面账）**：关键资产 × 证据面矩阵；
- **预判输掉**：tests/ 内再分 unit / 契约两套词表或子目录（一词一义）；全量覆盖台账（清单必腐）；为组织而组织的目录迁移（窄迁结论同源）。

## 毕业门

1. **词汇门**：传统词汇 ↔ 本仓形态对照有唯一家（或显式判"不落 + 理由"），新人带金字塔脑子 1 跳对上号；
2. **落家门**：新检查"住哪"有单一入口决策序，六步各链到 owner 文档（或显式判"维持分散 + 理由"）；
3. **成本门**：档位触发频率与升档判据成文，或显式判"维持判断制 + 理由"；
4. **负知识门**：无落点的传统概念显式登记"刻意不做"（若有），防同一个问题重开讼。
