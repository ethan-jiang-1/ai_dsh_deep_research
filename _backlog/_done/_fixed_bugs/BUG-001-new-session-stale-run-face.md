# BUG-001：新会话立项窗口期，「研究状态」页签错呈上一次 run 的渐进面

> 严重级别：P1（观察面诚实性——驾驶舱核心承诺是"如实"，错绑直接违反）｜发现：2026-09-30｜状态：已修（2026-09-30 同日，修复见 _done/_fixed_bugs 登记行）

## 症状

新开一个 lead 对话、本轮 Deep Research **还没开始**（HITL1 未发或已答但新 bundle 未建）时，
右栏「研究状态」页签呈现的是**上一次 run** 的渐进面（研究问题行、证据计数、final 版本、
步骤条）——用户预期此处应显示"这一次还没开始"的诚实状态，而不是上一场的旧数据。

## 根因（假设，代码侧已定位）

`bundle-bind.ts` 的**读弱绑定** + `ResearchStatusTab.tsx` 的**抑制条件过窄**，两层叠加：

1. lead persona 的开工动作（"先看现有 drt_* bundle 里最近交付的 final/ 当前版"）**必然**
   read 绑定到最新旧 bundle（`sessionBindingOf`：任何工具调用参数带 `drt_<slug>/` 路径即
   绑，读命中 → `boundBy: 'read'`）；
2. 渐进面抑制条件 = `boundBy === 'read' && hitl.pending`（G4，2026-09-28 首跑实证立项预检
   错绑后加的窄修）——只盖住 **HITL 挂起期**。两个窗口漏在外面：
   - 预检读取发生在 **HITL1 ask 发出之前**（开工动作先于三问）——此刻 pending=false，
     旧 run 渐进面照常渲染；
   - HITL1 拍板后到新 bundle 落盘（write 命中）之间的窗口同理。
   G4 注释明言"恢复会话只读查询（无挂起）不受影响"是**有意保留**——所以修法不能一刀切
   把 read 绑定全灭。

**修复方向（候选 B）**：区分"立项窗口"与"恢复查询"——journal 里出现过本会话的 HITL1 ask
（立项语义）且仅有 read 绑定时，渐进面抑制并显示专属状态"**这场 run 还没开始**（读到的是
上一场的上下文）"；无 ask 的只读查询（恢复会话形态）维持现状。判据可用 hitl-fold 已有
的 ask 检测面。备选 A（read 绑定永不单独驱动渐进面）会回退恢复查询 UX，不取。

## 复现

1. `bash dev/boot-run.sh` 起 run 通道（已有历史 run 的 research-workspace）；
2. 新开 lead 会话，发任一研究请求（或什么都不发，等 lead 开工动作自己读旧 bundle）；
3. HITL1 三问发出**之前**打开右栏「研究状态」页签 → 见上一场 run 的问题行/证据数/版本。

## 修复关联

**已修（2026-09-30 同日，用户点名当场修）**：

- `bundle-bind.ts`：`SessionBinding` 增 `kickoffSeen`（立项轨道信号 = `ask_user_question`
  调用 ∨ `skill` 调用加载 `research-brief`——persona 规定的开工第一步，覆盖预检读取→ask
  发出前的窗口；ask 在场覆盖拍板后→落笔前的窗口）；
- `ResearchStatusTab.tsx`：抑制条件扩为 `read && (pending || kickoffSeen)` + 专属
  「🌱 这场研究还没开始」状态行；附带修复 boundRef 守卫只比 slug 的潜伏 bug（同 slug 的
  boundBy 翻转与 kickoffSeen 翻转此前不触发重渲染）；
- 测试：bundle-bind +4 kickoff 矩阵（skill 加载/ask 调用/恢复会话负样本/边界），两处
  deepEqual 随新字段翻新；
- 连带（本卡修复期间暴露）：client-load-smoke 三条轨道断言从"已交付 run 假设"改为
  **盘侧相对**（done 步数与 deriveSteps 对账；重入点/↻ 回边按 delivered ∨ 尾窗挂起
  [loopOn 同谓词] 分支）——此前绑到在飞 bundle 会假红。

**验证**：tests 120/0（fold 矩阵）+ client-load-smoke ALL PASS（真浏览器：绑定会话渐进面
= 盘侧真值、未绑定零泄漏）+ 活体探针：kickoff+读绑定旧 bundle 的挂起会话页签 =
⏳ 横幅 + 抑制线 + **零旧 run 渐进面泄漏**。**如实记档**：🌱 状态行的活体观察未捕获
（瞬态窗口 + 探针会话被通道重启冻结在挂起态）——触发条件有单测矩阵、渲染分支与已验证
的兄弟态同构，待首场真 run 顺带确认。
