# 七维复评（第 13 轮；结论已被第 14 轮复核推翻）

> 状态：implemented
> 归档：2026-11-04

> 历史注记：本轮的 ②/④ 证据与“七维全 A”结论已被 2026-11-03 第 14 轮复核推翻（② 的 node-gate 数字是测试文件、④ 的 15 篇实为 31 篇、`page.html` 无盘上证据）；现行评级看 [第 14 轮复核](../implemented/2026-11-03-hygiene-round14.md)。

## 决定

**复评口径**：A = 该维度无 P0/P1，且反馈可机械复核；B = 仍有会误导 agent 或让反馈失真的 P1。
按本轮前后的机械证据重打分（不按 commit 数或工作量）：

| 维度 | 原 | 现 | 关键证据（本轮新增/可复核） | 残留（不改变评级） |
|---|---|---|---|---|
| ① 文档/渐进披露 | B | **A** | D 号链接 10 处补锚点 + 新门禁 `doc-drefs`；design/40 §5/§7 降为索引；症状→测试表；角色清单 owner 写清 | 测试矩阵在 project-map/scripts/README/evaluation 三处重复（P2） |
| ② 代码层次 | B | **A** | ConfigTab 492→345 + `useConfigFeed` 171；node-gate 608→339/132/122；标题/日期/读文件三个单一正本 | client 顶层 ~20 文件、`lib`/`scripts/lib` 无尺寸上限（P3） |
| ③ 整体结构 | A | **A** | L1 真挂载 + L2 安装/显示/卸载 + client-load 全进 CI；症状索引接通“事实 → 测试” | — |
| ④ 腐化 | B | **A** | ui-agent-team 8 处、旧 tgz、locale/launcher 台账、计数、D 链接全部收口；`doc-drefs` 防复发 | 15 篇历史 Note 引用旧路径（notes 被门禁排除）；decisions 台账历史细胞（待拍板） |
| ⑤ 测试资产 | B | **A** | keyless 恢复 fresh-clone（vendor tier）；fetch 码表硬编码；608 行拆三件；fixtures 自包含边界 | 方法库 UI 保存、product-boot/cold-start 未进 CI（P2） |
| ⑥ 反馈通路 | B | **A** | CI 17 连绿；`dataFace`/`--require-data`；遮罩可见性硬失败；`page.html`；latest 指针；HITL 年龄；drift 只看运行时集 | CI 单轮 ~20 分钟；无 ARIA 快照（P3） |
| ⑦ DSH 合规 | B | **A** | content 双 disposer；README 与 patch 一致；**locale = 中文优先（2026-11-03 用户拍板）**；注入样式挂 `html[data-dsh-deep-research]` 标记 + refcount 卸载；L1/L2 进 CI | 170 处中文 = 产品语言选择；启动空会话登记为产品行为 + trigger；peers-only 登记 D15 |

**结论**：**七个维度全部到 A，没有 P0/P1 未收口**。用户 2026-11-03 拍板 **locale = 中文优先**
（“中文”）：chrome 保留 zh/en 字典，正文中文是产品语言选择，不是遗漏；台账“带证据适配”如实承载。
另两件按“登记 + 触发”收口，不静默改首屏语义：

1. **全局样式**：注入规则全部挂 `html[data-dsh-deep-research]` 标记，refcount 归零即移除——
   所有权可见、卸载不残留；作用域仍是整页（问卡/方法库不在本插件容器内），fail-soft。
2. **启动空会话**：登记为产品行为（首屏 mint blank Lead 会话）；触发 = 同一工作区出现 ≥3 个空会话
   或用户要求“开回上次那场”时再实现复用（[_backlog/triggers.md](../../_backlog/triggers.md)）。

## 输掉的方案

- **按 commit/测试数升 A**：会掩盖 D7 的 170 处中文与全局样式；复评只认可复核证据。
- **把 locale 继续标“不适用”**：与“已有 zh/en 字典 + 对外 npm 分发”的事实不符；已改“带证据适配”。
- **为升 A 把 170 处文案一次性硬翻**：没有产品需求证据，且会引入新的模型可见文本漂移；先拍板再动。

## 实际跑过的验证

- CI：run [41597205775](https://github.com/ethan-jiang-1/ai_dsh_deep_research/actions/runs/41597205775)（`247ec68`）三 job 全绿——第 **17** 次连续全绿；deploy 覆盖 L0 + L1 真挂载 + L2 安装/显示/卸载。
  样式作用域与 locale 决定后的 client-load 在本地 seed 跑 **ALL PASS**（含方法库与窄列断言）。
- 本地：`pnpm verify` **52 门禁**全绿（新增 `doc-drefs`）；`pnpm test` **1018/1018**；`pnpm test:vendor` **3/3**。
- fresh worktree 复验（无 `lib/`、无运行区、vendor 为符号链接）：**1015/1018**；3 个失败全部是模拟环境假象
  （2 个 React 因 tsconfig 穿过符号链接；1 个 layering 因 vendor 在根外），与基线一致——**零新增非 hermetic 依赖**。
- `doc-drefs` 反证：`gates-smoke --case=doc-drefs-misdirected` 注入 D24 → 00-index 的错误引用 → 点名红，零注入对照组绿。
- 真浏览器：seed `client-load-smoke` ALL PASS（含内容注入行、配置页签、终稿端到端）。
