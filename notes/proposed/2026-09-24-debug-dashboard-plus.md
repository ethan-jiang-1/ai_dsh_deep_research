# RFC：debug-dashboard-plus——仪表盘多场可见 + 流程感知 + HITL 等待横幅 + boot-run 瑕疵收尾

> 状态：**approved（2026-09-24 八小时路线图批准框架；同日用户放行静默自主执行）** ·
> 归宿：roadmap §队列「debug-dashboard-plus」· 设计依据：
> [ui-observability-surfaces §3.1/§7](../research/2026-09-24-ui-observability-surfaces.md)
> + 2026-09-24 run 错位事故（run 在旧通道跑了 40 分钟，观察面零感知——需求即时性实证）

## 问题

- 仪表盘只认 research-workspace 的 drt_*（--latest 单场）；ad-hoc 场
  （dev/harness-home/runs/*）完全裸奔——今天 CPU run 全程不可见；
- 用户看不出 run 走到哪一步（要自己读文件推导）；
- lead 挂起 ask_user_question 等拍板时，用户不盯 GUI 就不知道"在等你"（d29822ed 的
  HITL1 挂起无人知晓即实证）；
- boot-run 两瑕疵：trap 在 job_kill 下不杀 watcher（手动清过实证）；pack 源与 profile
  安装镜像无漂移检测——今天三次注入面事故里两次是镜像类，缺机制化补丁。

## 方案

1. **多 run 场扫描**：扫描根扩为 research-workspace（drt_*）+ dev/harness-home/runs
   （ad-hoc 场，页面标注"ad-hoc·无契约"）；--latest 跨场取最新；各场摘要并排列出；
2. **流程步骤条**：按文件在场 + mtime 推导生命周期步（question → topics → leads →
   evidence → findings → review → final/v_N），当前步高亮——零发明，纯文件事实；
3. **HITL 等待横幅**：检测 lead 会话日志中 open 的 ask_user_question（zstd 逐事件；
   实现前先验 node:zlib 的 zstd 可用性，不可用降级 mtime 启发式 = journal 静默 + 无新
   文件 + 未交付，横幅标注"推断"）→ 横幅"⏳ 等你拍板（HITL）"；run 活跃静默期反向提示
   "静默自主区——角色在干活，无需等待"；
4. **deep-link**：横幅与会话行链到 web GUI 会话（token 由 boot-run 注入环境变量）；
5. **boot-run 瑕疵收尾**：trap 修复（EXIT/INT/TERM 全杀 + 进程组）；**pack 漂移检测**
   （pack 源 yml/md 逐文件 hash vs profile 镜像对应文件，不符 → fail-loud：提示重建
   或同步后再 boot）。

## 输掉的方案

- 右栏 GUI 页签承接（否——那是「观察面 GUI 化」条目的活；本件坚持 keyless 只读
  投影、零 client 代码）；
- 从 deliverables/present 面板推 HITL 状态（否——那是交付态不是等待态，语义不符）；
- 漂移检测做成 verify 门禁（否——profile 镜像是运行区，verify 不扫运行区 = 手册合同；
  检测归 boot-run 启动时刻）。

## 验收判据

- keyless（纯 fs 解析，无模型/网络——tests/layering 同款纪律）+ fail-soft；
- 多场实证：ad-hoc 场 cn-us-cpu-gap 出现在仪表盘且带"ad-hoc·无契约"标注；
- HITL 横幅用 d29822ed 的挂起 ask 实测出现；run 活跃期反向提示出现；
- 漂移检测红绿反证：篡改镜像一文件 → boot 报红 → 同步恢复 → 绿；
- trap 修复实证：job_kill 后无 watcher 残留进程。
