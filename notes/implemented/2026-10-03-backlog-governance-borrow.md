# _backlog 治理二轮借鉴（loop_advisor 2026-10-03 版：主干框架 / reference 区 / 暂停池 / 索引对账）

> 状态：implemented

归宿：用户直派（2026-10-03：「治理规矩还是要从 ai_dsh_loop_advisor/_backlog 学习来整理整理
我们的 _backlog/……尽量借鉴吧，因为整个结构多少都是一样的」）。借鉴源 = `ai_dsh_loop_advisor/
_backlog` 全树通读（其 README 自记 lineage：trunk 框架 / reference 区 / suspended 池系 2026-10-03
自 `ai_deerflow_dr_v3/_backlog` 二轮借入）。落地 = `_backlog/README.md`（宪章升级）+
`reference/`、`_done/_suspended_{plans,bugs}/`、`_done/_reference/` 四个新池 +
plans/bugs README 对齐（措辞见宪章各节）+ plans-liveness 门禁扩展（索引交叉对账）。

## 决定

**采纳五件**（全部按本仓结构改写，非原样照搬）：

1. **主干框架**（缓冲 → 毕业 → 生产线 → 回写，一次说全）+ 三条硬规矩：无 RFC 不行为 /
   卡载思考 Note 载决定 / **回写不夹带**（下游暴露的新问题回缓冲立新卡，不做 Note 搭车
   条款）——最后一条是本轮最大增益：此前"执行中暴露的下一个问题"没有明文归宿。
2. **宪章/账本分离**：README 手册 = 宪章（只记制度，制度级决定才动）；点名活卡/计数/现值
   的都是账本（随卡动）。检验法入宪章。
3. **reference/ 推敲资料区**：喂活跃卡的调研材料的家（半成品合法、随卡毕业 `git mv` 至
   `_done/_reference/`、无状态行、索引成员门禁）。空位实证 = mcp-client 推敲卡的调研
   材料曾只能塞进卡体。
4. **暂停双池**（`_done/_suspended_{plans,bugs}/`）：**未裁决**暂停（用户明示先放一放、
   无毕业判断，重启条件随卡，重启需用户新优先级决定）——与 queue.md §搁置池（**已裁决**
   do-not-now，复活条件 + rejected Note）语义正交，不重叠。
5. **plans-liveness 扩展：索引交叉对账**——plans/bugs/reference 三活跃面 + _done 五池，
   每个文件必须被其 README 索引点名（孤儿即红）；反方向（索引行点名缺文件）归 md-links。
   loop_advisor 的教训 = 该检查在其仓三度复发后才加，本仓前置采纳。
6. **推敲卡命名对齐 full-date**（用户指出 `260928-pipeline-polish` 未对齐要求后采纳）：
   `YYMMDD-<slug>` → `YYYY-MM-DD-<slug>`（与 notes 树同一种日期格式——loop_advisor 的原
   论据成立）。迁移 = 全仓 6 卡改名（git mv）+ 15 文件引用更新 + plans-liveness 正则更新
   + D19 行措辞修订（替代首借时的 YYMMDD 裁定，D19 行保留决策轨迹）。

**不借两件**（理由记本 Note 存档，不入宪章——不借鉴的不提）：①loop_advisor 的"无队列"模型（其调度归
notes/proposed + goal 机制）——与本仓 D20/入口链第 3 步冲突，queue.md 是 ▶ 唯一指针的家；
②OpenSpec 加工机制——本仓生产线 = notes/，主干框架已按本仓结构改写。
（原"不借"第三件「推敲卡全日期命名」在用户指出命名未对齐后翻案为采纳，见决定 6。）

连带翻案：宪章负知识表 `_suspended_*` / `_reference_` 两行由"不借"翻"采纳"——原判据
（"第二个搁置池" / "notes/archived 已覆盖"）均未区分本轮 loop_advisor 细化的语义边界
（未裁决暂停 vs 已裁决搁置；留存型参考 vs 服务活跃卡的资料），翻案理由逐条入表。

## 输掉的方案

- **全盘照搬（连"无队列"模型一起）**：否决——queue.md 是入口链第 3 步的 ▶ 唯一指针
  （D20 用户裁决），搬掉 = 推翻规划面单一化；主干框架已按本仓结构改写（queue 留作次序
  半区），两全。
- **维持 `_suspended_*` / `_reference_` 两行"不借"不动**：否决——原判据混淆了语义边界
  （见连带翻案）；loop_advisor 2026-10-03 版的细化语义正好补上判据缺口，且空位有实证。
- **只改宪章、不加门禁**：否决——索引纪律没有机械把守必然漂移（loop_advisor 自己的
  教训：三度复发才升格）；本仓前置采纳且反证当轮就抓到真孤儿（见验证）。

## 实际跑过的验证（2026-10-03，全部实跑）

| 面 | 结果 |
|---|---|
| 反证（先想红） | 注入无索引孤儿卡 `_backlog/plans/261003-orphan-test.md`（状态行合规，仅索引缺失）→ plans-liveness **红** → 移除 → 绿 |
| 上岗即战果 | 红证当场抓到**真孤儿**：`_done/_closed_plans/2026-10-02-mcp-client-adoption.md` 毕业时漏建索引行（本轮补行）——门禁价值当轮兑现 |
| L0 | verify 全绿（plans-liveness 扩展后）+ tests 122/0 |
| 开关两向 | 暂停池/资料区为空池合法态（0 文件无断言）；md-links 覆盖反方向 |

## 环境状态

- `_backlog/` 新结构 = README（宪章）+ queue.md（次序半区）+ plans/ + bugs/ + reference/
  （活跃三面）+ _done/（closed_plans / suspended_plans / fixed_bugs / suspended_bugs /
  reference 五池）；
- plans-liveness 门禁范围扩大（原状态行检查 + 新索引交叉对账），台账同步
  [evaluation.md §L0](../../docs/evaluation.md)；
- 借鉴链完整记录于宪章开篇（company D31 → 本仓首借 D19/D20 → loop_advisor 2026-10-03
  二轮 → ai_deerflow_dr_v3 同日版）。
