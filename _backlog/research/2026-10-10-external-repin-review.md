---
topic: 外部材料钉版债复核
intent: 为 company 钉版复核 Note 登记的两笔"结论待复核"债提供逐面判定与重钉依据（两债均维持）。
---

# 外部钉版债复核：二代语料 + ai_dsh_assitant（2026-10-10）

> 服务 = [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md)
> §其他外部材料钉版状态登记的两笔"结论待复核"。方法 = 只读（外部仓零改动）；范围窄化如实
> 分列——上游后续提交不自动等于"我们错了"，逐面对内容判定。

## 债 1：`_dsh_plugin_agent_ready_development`（二代语料）

**bbcf346ddb → ad6f5319dc（/Users/bowhead/deepseek-harness），24 提交，六条吸收面全部结论维持。**

1. 独立插件仓开发闭环：吸收范围（native-development-model/ + repo-harness/）仅 4 文件 5 行指针改述，闭环正文零改动；
2. 语义评审四角色：仅 1 处链接改名；新页 Ref 12 §4 反而强化"完成判断仍分属不同位置"；
3. 完成判断公理：新页 `12-agent-contract-evidence.md` = 三件契约资产（model-visible logged / 可回放会话 / 独立 oracle）+ "把 goal 标成 complete 并不建立三件资产"——与本仓 evaluation §完成判断四分离同向强化；
4. 条件性记录：判据收窄（"代码、测试和现有文档都装不下的 why"）+ 三结局 keep/archive/**consolidate-and-delete** + "一篇 Note 不能被改写成另一个决定"——本仓取代检查已有等价条款，精化不推翻；"不可改写成另一决定"可选补强（登记不实施）；
5. 门禁自测模式：语料 verify.test.mjs 零改动；FAQ 20 明文"`.agents/skills/` 没有「写 Agent Note」的 skill，这是分工不是遗漏"——支持本仓"语义自审做技能不门禁化"的输掉的方案；
6. 快照证据面（FAQ 21）：fb862eed5c 已全量对账"无需返工"（repin Note 实录），其后仅 1 行 scope 指针。

范围边界：24 提交中 2 个落 `_digested/test-strategy/`（另一登记材料，基线 = vendor commit），不属本债；其余 3 个未触及吸收条款。
可选精化登记：Ref 12 "新机械守卫必先看红（亲手看红再撤掉），修 bug 用反事实标准'会为这次回归失败'"——与本仓 guides/60 §0 兼容（对**新守卫**的义务更窄更精确；D23 是用户定调，维持）。

## 债 2：`/Users/bowhead/ai_dsh_assitant/`

**576c5f8 → 202a27b，全仓 210 提交，只审吸收两路径（notes/ + _backlog/）= 141 提交；_backlog 快照 ce649db → 202a27b = 8 提交。**

- **面① notes/ 治理：核心维持，两处上游演变形（登记改述，本仓落点零修改）**：
  - 四条纪律：第 1/2/4 条 HEAD 原样存活；"禁掩盖修法"政策 owner 原样在场；
  - 第 3 条上游改述为"真证据记在交付里（卡或提交说明），只有 §〇 要求留 note 时验收节才收命令"——证据落点从 note 挪到交付记录。判定：本仓不动摇（本仓 implemented 必带「实际跑过的验证」骨架源自 vendor 规范 note-format 门禁；该改述是姊妹仓对 vendor 骨架的自我偏离）；
  - "复发升格触发器"条款上游从 §二之三 收走（移居其专门 Note）——**钉版行描述须同 diff 改述**，否则指向不存在的条款位置；
  - 上游政策演变（如实登记不跟）：e64110b 意图通道默认翻转（呈批优先）与本仓轻立场（RFC 不是普遍前置）相反；加生成索引→再撤索引回归"目录树即清单"——本仓门牌 + note-status 形态不受影响。
- **面② _backlog/ 分层：结论维持**（8 提交全是内容卡，分层结构与章程零变化）。

方法如实：141 提交逐条过标题分类，治理相关 ~20 个逐 diff，其余（run 记录/冻结迁移）按标题+目录归类核过、未逐篇读正文。

## 重钉动作（已落地）

1. 债 1 重钉 `bbcf346ddb → ad6f5319dc`（00-index 外部材料行同 diff）；
2. 债 2 重钉 `576c5f8 → 202a27b` **且** 行描述改述（"四条纪律（第 3 条上游改述为证据由交付记录承载）+ 复发升格触发器已移居其复发追踪 Note"）；_backlog 快照行一并重钉 `ce649db → 202a27b`；
3. 本仓落点（guides/60 §0、notes/README 门牌、D23 Note）无需任何修改——复核确认。
