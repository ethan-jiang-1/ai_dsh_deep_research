---
status: 推敲中
opened: 2026-10-29
---

# 方法库工作台重排：A′ 精化 A

> 立卡：2026-10-29 ｜ 状态：推敲中（用户已采纳 A′；默认交互与写入授权已裁定；写入/默认/A′ 表面与来源、Session ready 校验的自动证据已通过；草稿 revision、窄屏/键盘/视觉及用户业务验收仍未完成）｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：否

## 当前目标

将拥挤的「库 / 表单 / 方法编辑」三栏重排为已采纳的 A′ 两列工作台。保留左侧库、右侧工作台及摘要在上、对话在下的关系；右侧以同一活动草稿呈现详情、访谈和表单检查，来源在访谈前明确选择，保存/删除提供结构化操作状态与结果核验。A′ 合同见 [重审稿](../research/method-library-cocreation/2026-10-29-method-library-workbench-review.md)。原 A 的讨论沿革仅见 [research 历史稿](../research/method-library-cocreation/2026-10-29-ux-redesign.md)，不作当前合同。

## 已决

- **设计方向：** 用户已采纳 A′ 精化原 A。
- **默认语义：** 普通保存不切换默认；编辑保留既有默认标记；另存为不改变旧条目或当前默认；只有显式「设为默认」才切换唯一标记；删除默认后允许零默认，不自动提升。
- **写入政策基线：** 方法文件是内容权威。保留模型可见 Host tool 写入；Client Remote 直接写入不授权。Host 只接受当前 Method Editor owning Session 中由 UI 命令 projection 接纳的一次性 claim，并校验 operation id、动作、目标名称与保存条目的 SHA-256 内容摘要；Host 返回结构化 `presentationMeta`，Client 按 tool call/result 的 `callId` 关联并独立回读工作区文件。两条路径的 pinned DSH/pack 证据比较见 [写入路径研究](../research/method-library-cocreation/2026-10-29-method-library-write-path-policy-comparison.md)。
- **操作交互决定：** 提供明确的「保存并设为默认」组合动作；提供独立的「清除默认」动作；普通保存、编辑和另存为不隐式改变默认，删除默认后允许零默认。
- 当前 DSH 不自动提供草稿恢复、业务 operation journal、跨进程 CAS 或 exactly-once；当前实现只在组件生命周期内持有 pending/unknown 状态，超时或回读不明时锁定重复写，刷新只做当前目标态对账，不宣称恢复原命令身份。具体机制边界见 [DSH 数据合同](../research/method-library-cocreation/2026-10-29-method-library-dsh-data-contract.md) 与 [生命周期审计](../research/method-library-cocreation/2026-10-29-method-library-state-lifecycle-audit.md)。

## 下一步

1. Host/Client 写入切片已由真实 Loader 组合 smoke 覆盖：默认操作、owner command、摘要失配拒绝及 workspace 回读均有断言。
2. `client-load-smoke` 已在最新 build 上全绿：两列、编辑访谈/表单切换、新建显式来源、内置四字段预览、已完成 run 预览与完成判据均已断言，零模型 prompt；窄屏和键盘可访问性仍待用户业务验收。
3. 用户完成业务验收后，再按 `issue-to-note` 记录去向与质量责任；issue 在此之前保持 active。

## 验收标准

1. **两列与表面（编排/Client）：** 库列与工作台列可用；工作台可呈现详情、访谈和表单检查；摘要与表单投影同一活动草稿。负例：模式切换不得卸载并丢失当前挂载期草稿/coach 历史，也不得宣称跨刷新恢复。证据：pack Client 行为验证及入口 smoke；视觉/交互由用户验收。
2. **来源选择（逻辑/编排）：** 从 run 起草前由用户选定具体来源；读取区分缺席、失败、取消、截断。必需来源到 EOF，否则标明 partial。负例覆盖缺文件、读取失败、未到 EOF。证据：pack 逻辑测试与 Client 行为检查；来源是否足以表达本次采用方法由用户验收。
3. **草稿与回填（逻辑/模型/编排）：** 单一 draft owner 持有内容、来源、手改保护和 revision；候选 patch 绑定 draft/base revision，stale patch 不覆盖用户修改。负例：旧回合迟到、重复 patch、手改后到达旧 revision。逻辑测试、模型输出观察和 Client 行为测试分开报告；访谈体验由用户验收。
4. **保存与删除（逻辑/编排）：** 冻结快照有 operation identity；Host 返回结构化结果；成功回读核对合同要求的条目字段和默认状态。超时、回读失败或身份不明显示结果未核实，不误报成功或自动重试。负例：迟到回执、重复名称歧义、取消/断线后未知结果。证据：writer 测试、选定路径的 Host/Client 装配测试和入口 smoke；模型 prose 不能代替业务结果。
5. **默认操作（逻辑/用户合同）：** 普通保存、编辑、另存为、设默认、保存并设为默认、清除默认、删除分别符合已决语义；库至多一个默认，允许零默认。负例：普通保存意外切换、另存为影响旧标记、删除时自动提升、重复默认、模型 prose 冒充默认操作结果。组合保存与独立清除默认均须有明确 UI 操作、Host 结构化结果与回读核对。
6. **错误与恢复（逻辑/编排）：** 历史打开失败不得显示为 ready；raw `session.follow` 不接收 caller cursor；恢复状态可见，不能把 snapshot 缺席解释成操作未执行。刷新恢复、跨进程无丢写和 exactly-once 不作承诺。证据：lifecycle 测试、入口 smoke 与失败态检查。
7. **视觉与可访问性（Client/用户）：** 页面根不滚；库、表单、对话按职责滚动；窄屏、键盘与深浅主题下关键流程无遮挡和溢出。client-load 只证明装载，需另作真实 UI 检查。
8. **回归交付：** 按改动面运行相关测试、`pnpm test`、`pnpm verify`、构建/Client smoke；模型行为改变且获授权时再跑真模型证据。自动测试不替代用户业务验收。

## 范围与顺序

- 仅按已采纳 A′ 推进；原 A 详细草案是 research 历史，不重新变成实施合同。
- 不承诺跨刷新草稿恢复、跨进程无丢写、operation journal 与文件的原子事务或 exactly-once。
- 默认交互细节与写入授权已完成裁定；实施按 Host projection/writer、Client 回读和真实 Loader 组合验证推进。
- issue 保持活跃至实施完成并由用户完成业务验收。

## 关闭条件

A′ 与影响操作语义/授权的决定均已记录；验收标准按最终决定收敛；实施切片与证据齐备；用户完成业务验收；按 `issue-to-note` 记录去向及质量责任；最后与活跃索引同次变更归档结案。
