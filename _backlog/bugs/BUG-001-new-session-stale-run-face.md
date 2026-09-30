# BUG-001：新会话立项窗口期，「研究状态」页签错呈上一次 run 的渐进面

> 严重级别：P1（观察面诚实性——驾驶舱核心承诺是"如实"，错绑直接违反）｜发现：2026-09-30｜状态：活跃

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

待修（用户 2026-09-30 报告并定预期："不应该呈现的是上一次，而是这一次还没开始"）。
涉及面：`packages/deep-research-pack/src/client/ResearchStatusTab.tsx`（抑制条件）+
可能的 `bundle-bind.ts`（ask 信号面）+ keyless 单测（`tests/` 补立项窗口形态矩阵）+
`client-load-smoke` 渐进面断言（未开始态的盘侧真值对账）。
