# 研究方法配置——方法预设、单次快照与工作区用户方法库

> 状态：implemented

出处 = 推敲卡三卡簇（用户 2026-10-12 授权实施）：
[总卡](../../_backlog/issues/2026-10-12-research-preference-templates.md)（总体边界与预设模型）·
[单次卡](../../_backlog/issues/2026-10-12-research-method-run-lifecycle.md)（单次选择/执行/恢复）·
[长期卡](../../_backlog/issues/2026-10-12-research-method-profile-management.md)（长期管理，未实施）；
统一依据 = [综合研究](../../_backlog/research/2026-10-12-research-preferences.md)。机制基座 =
[计划确认闸门 Note](2026-10-07-plan-review-gate.md)——HITL1 两段卡结构与豁免规则由其拥有，
[HITL1 业务决策简报 Note](2026-10-11-hitl1-business-brief.md) 拥有第四问触发机制；本篇只记
「方法」这一新增维度的决定理由。

## 决定

方法 = **调查路径指导**（怎样调查、核验、综合），与研究类型（什么形态的问题）、深度/篇幅
（投入多少）三轴互不替代。首版四预设：**事实核查 / 领域地图 / 主张核查 / 方案比较**。

1. **快照落点 = question.md 新增「研究方法（本次实际采用）」节**，不新增文件——零 NODES
   六处同步面；scout/analyst/critic 派发五件①已要求先读 question.md，方法随既有读取路径
   自然送达；恢复/重派/续跑只认该节，**不认方法名**（方法名只是标签，合同是节里的调查
   要求文本）；
2. **选择入口 = 不加第四问**——推荐方法由 Lead 依判型与题面自动给出：普通 run 在既有计划
   确认卡的计划要点中加**方法行**（名称 + 一句人话 + 调整走既有「修订计划」自然语言）；
   quick_factual 免第二卡 → 方法 = 事实核查**自动采用**，方法节记理由，运行中 steer 可改。
   既有三问卡零例外纪律不动（防双菜单/重复选择）；
3. **类型→方法映射**：quick_factual→事实核查 · exploratory_map→领域地图 ·
   claim_verification→主张核查 · 选型/对比/方案指导题→方案比较（题面特征可校正兜底判型，
   如选型题即使归全景也推方案比较）；**方法不替代判型操作单**；
4. **内容住 lead 的 research-brief skill**（方法论文本），不是新增用户菜单/配置文件；共同
   底线（来源链、摘录、独立性、日期、缺口、readiness）**不因方法降级**——方法只填未指定
   项，用户已明确要求优先；
5. **长期复用 = 对话式显式保存**：用户明确要求（「记住这种做法/以后都用」类原话）→ Lead
   把当次有效方法写成工作区 `research-workspace/method-library.md` 命名条目；此后立项 Lead
   显式读库作推荐参考，题面指定仍优先；库不存在直接跳过不报错，**仅显式请求才写**；
6. **派发点名方法动作**（team-assembly）：每份派发从方法节摘该角色相关调查要求写进任务
   （scout→信息源策略、analyst→检验策略、critic→核查点）——fresh 队员靠这条拿到自己的
   做法，方法名不替代五件任何一件；
7. **critic 新增方法承诺核查节**（MAJOR 级，question.md 有方法节时）：报告/证据与方法明显
   不符 → MAJOR；判不了 → 显式 `UNVERIFIED` 按未决对待（同 MAJOR 阻塞 PASS）——**不因方法
   名放行，也不凭方法名追加未被要求的新动作**；quick_factual 轻量模式仅核查自动采用事实在场。

## 输掉的方案

- **Settings 管理页 / profile 级默认**：写 UI/host 业务代码需显式重议 **D7/D18 架构边界**
  （本仓架构宪章流程），未获用户裁定前不实施——重议条件 = 用户明确要求图形化管理或跨工作区
  复用。首版只做对话式显式保存；
- **第四个 HITL 问（方法选择卡）**：双菜单/重复选择风险——用户已在三问卡上选过类型，方法
  推荐可由类型推导；再问一遍 = 问卡疲劳换不来信息增益（与业务简报 Note「固定第四问」同款
  否决理由）；显式修订路径已存在（「修订计划」自然语言），不需要常设卡位；
- **独立方法文件（method.md）/ 新节点**：question.md 已是方向契约的家，一处事实不设两个家
  （计划确认闸门 Note「独立计划文件」同款）；方法节写进既有 snapshot 面，恢复合同零新增；
- **机械硬门（方法承诺进 node-gate）**：方法文本是自然语言调查要求，机械化需先把方法形式化
  ——未标定先上门 = 假牙齿（floor 教训，计划确认闸门 Note 同款）；纪律级先行，critic 判据兜
  语义面，遵守率标定后再议升格；
- **预设扩到「研究证据综合/系统综述」类高承诺模式**：高承诺模式需另证能力（PRISMA 类流程、
  检索式穷尽性判据），无证据支撑就进预设 = 空承诺；延后，用户提出时如实说明并按普通方法推进；
- **Cockpit 方法摘要**：只读观察增强，核心闭环优先——列 stretch，核心验收后再做（走 lib 折算
  纯函数 + 状态页一行，仅读 bundle）。

## 实际跑过的验证

- **L0**：`pnpm verify` 全绿（19 项含 overlay-fresh / pack-workspace-fresh / doc-budgets）；
  `pnpm test` **405/405**（含方法节相关契约钉）；
- **L1**：preset-smoke 真挂载 **ALL PASS**（4 preset + skills 硬隔离断言）——证明 persona/
  skills 装配真生效（no-key 证管道）；
- **真模型走查**（quick_factual「DeepSeek chat 上下文长度」，HITL 代答 pick=recommended 并
  显式记账代理模拟）：方法节自动采用落格含判型理由/本题化调查要求/不承诺边界；派工五件含
  方法动作；critic 轻量独立重抓执行了方法检验策略，二轮 readiness **PASS**（零 CRITICAL）；
  HITL2 定稿 → final/v1.md → present → goal complete 全链走通；
- **操作侧 evidence-audit**：12 证据、URL 真抓 12、摘录回溯 70/71、final 链 50/50、
  **CRITICAL 0**（MAJOR 1 为操作侧审计记录，非交付门）；
- **未覆盖（如实分开，均为后续 run/授权项）**：普通 run（非 quick）的计划卡方法行与修订调整
  路径 · 方法库保存路径（代理模拟未发起保存请求，写入分支未被真跑）· Cockpit 方法摘要
  （已延后）· UX 可理解性真人测试（以完整文案 + 任务走查记录代替，**未经真人验证**如实标注）。

## 环境状态

改动面六处实现 = research-brief skill（四预设内容/映射/确认落格/用户方法库协议）+ lead.patch
persona（立项读库/计划卡方法行）+ question.md 模板（方法节 + Snapshot 行）+ NODES 立项行 +
team-assembly 派发点名方法动作 + critic 方法承诺核查节（4 节新增，原 4/5 顺延为 5/6）；种子
（`packages/.../workspace/`）与 `dev/research.overlay.yml` 为**重生成非手改**（生成器 =
sync-pack-workspace / render-overlay，两门禁把守）。运行中 web 进程缓存 boot 时文本——下次
boot run 通道时新 persona/skill 自然生效。三卡状态翻转 推敲中→**等人拍板**（实施完成待
review）；长期卡记为最小形态已实施、Settings 路径保持活跃待裁定。
