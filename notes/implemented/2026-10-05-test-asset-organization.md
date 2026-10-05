# 测试资产组织收拢——词汇对照与落家序

> 状态：implemented

来源推敲卡：[2026-10-05-test-asset-organization](../../_backlog/_done/_closed_plans/2026-10-05-test-asset-organization.md)（深想轮两实验与六点裁决随卡归档）。用户 2026-10-05 点名 ongoing goal 优先推进：R1 深想当日毕业 → R2 立红落地 → R3 对账收尾（D23 第二例闭环）。

## 问题

测试资产的组织有套路（三轴：档位 / 验收面 / 命名即层）但缺两块单一入口：传统 unit / integration / e2e 词汇与本仓形态无对照桥（[project-map](../../docs/project-map.md) 只说"不是金字塔"不给翻译，新人带金字塔脑子对不上号）；"新检查住哪"的决策规则散在四份文档，且六步序经三例回放实锤缺一步（一次性检查无家）。

## 决定

- **[project-map §测试怎么选](../../docs/project-map.md) 增两节，成为单一入口**：「测试词汇对照」——金字塔词汇（单元 / 契约 / 集成 / 端到端 / 生产审计）× 本仓形态 × 住哪 × 凭据表，反金字塔理由 = **标签回答不了"要什么前置"**，本仓三轴（档位 / 验收面 / 命名即层）各答什么；「新检查落家序」——**七步修正版**：①契约测试（义务 = evaluation 对应面登记 + 带反证）→ ②一次性检查（跑完即弃、证据进实施记录，**复现第二次即升格契约测试**——三例回放实锤补的步）→ ③`*-smoke`（后缀申报档位）→ ④真模型档（closed set 登记）→ ⑤verify 门禁（[writing-a-gate](../../.agents/skills/writing-a-gate/SKILL.md) 全流程）→ ⑥run 门 → ⑦fixtures（taxonomy 建行 + 零孤儿断言）；新测试资产**形态先入词汇表再落文件**；
- **成本只成文一句原则**：穷举矩阵不是目标，能咬中本次回归的红灯才是；
- **[guides/60 §2](../../docs/guides/60-dev-loop.md) 纪律三条 → 五条**：借入姊妹仓 `ai_dsh_assitant`（钉版 [00-index §外部研究材料](../../docs/00-index.md)）的互补案例规则（条件命题的证据必须含互补案例——单一状态的证据集抓不到状态 bug）与仪器对准目标（检查显式锚定目标 home，扫错对象拿无关残留凑绿）；
- **机械把守**：[tests/navigability-contract.test.mjs](../../tests/navigability-contract.test.mjs) 扩两组常驻断言（词汇五词 + 反金字塔理由 + 链接解析；七步关键词 + 成本原则 + 链接解析）。

## 输掉的方案

### 全量照搬姊妹仓 docs/testing.md

他们有独立 testing.md 与 interface 子目录是包结构与测试量级使然；本仓 19 个回归文件、路由表已在 guides/60 §2，复制 = 双家 + 大 churn。触发重评 = 包结构与测试量级显著变化。

### tests/ 内分 unit / contract 两套词表或子目录

一词一义；glob 层无差别对待是设计（都 keyless 秒级、同一条 `pnpm test`）。

### 覆盖面账 / 成本曲线成文

无数值数据先成文 = 假牙齿（floor 教训同源）；清单必腐（count-free 门禁存在理由同源）。触发器：覆盖账 = 首处"删了才对"死代码实证；成本曲线 = 某档频度漂移造成实际成本疼痛实证。

### mutation testing / property-based

刻意不做——当前失败模式（漂移、虚账、链接烂）全部被既有门禁族咬住，无此两类检查才能暴露的实证缺口。

### 姊妹仓"目录即 interface"分层（tests/ 子目录 = 被测 interface）

不现在建。触发条件 = tests/ 检索开始靠猜或文件数显著上升（同 vendor notes class 层的既定触发模式）。

## 验证

- **立红（D23）**：契约测试扩两组断言首跑 **2 红 7 绿**（两节缺席即红——判据在实现前确实能失败，红证在条目实施记录与前序 commit）；
- **红转绿**：落地两节 + 纪律五条后修一处链接深度（`docs/` → `.agents/` 应为一层；md-links 与契约测试同抓——本 session 第三次同类红，顺带验证"链接解析归 md-links"分工）→ 契约 9/9；
- **四门对账（2026-10-05）**：词汇门 = 契约断言绿（五词 + 理由 + 链接）；落家门 = 七步断言绿 + **义务链走查全通**（七步的登记义务逐条验证 owner 在场：evaluation 契约回归行 / tests-AGENTS 反证句 / scripts-AGENTS 命名即层与 closed set / writing-a-gate 技能 / gate-ledger-sync 台账 / 零孤儿断言）；成本门 = "穷举矩阵不是目标"在场断言 + 经济学"维持判断制 + 触发器"登记于输掉的方案；负知识门 = 四条带触发条件在场（上节）；
- `pnpm verify` 全绿 + `pnpm test` 203/203（R3 收尾同 diff 复跑）；
- **行为零变更**：verify.mjs gates 数组未动、脚本行为未动（对照本条目全部 commit 的 diff 面）。

## 环境状态

- L1 / L2 / 真模型档未跑：纯文档 + 契约测试改动，非其判据面（如实分开，未跑 ≠ 通过）；
- entry-chain-probe 未跑：本条目改动面不含根 AGENTS.md 与 docs/AGENTS.md（project-map 与 guides/60 属 docs 正文非指令文件），按 guides/60 §4 不触发必跑条件；
- 深想轮原始材料（姊妹仓两文件全文要点、三例回放明细）随推敲卡归档于 `_done/_closed_plans/`，钉版身份 = 00-index 外部研究材料表。
