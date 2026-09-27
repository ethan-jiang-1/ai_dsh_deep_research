# RFC：debug-dashboard-plus——仪表盘多场可见 + 流程感知 + HITL 等待横幅 + boot-run 瑕疵收尾

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap §队列「debug-dashboard-plus」（已离队）· 设计依据： [ui-observability-surfaces §3.1/§7](./2026-09-24-ui-observability-surfaces.md) + 2026-09-24 run 错位事故（run 在旧通道跑了 40 分钟，观察面零感知——需求即时性实证）

## 决定

本条目同日立项、同日实施毕业——决定正文 = 下方方案五点（全部已交付），
验证与现场证据 = 文末实施记录。

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

## 实施记录（2026-09-24，同日实施毕业）

**实现**：run-dashboard.mjs 重写——新增纯函数 listScenes（多场扫描）/ sceneState（stat-only
进度）/ deriveStep（流程步骤条）/ decompressSessionLog（zstd 多帧切段解压）/ detectHitlWait
（真事件流等待检测）/ readGuiBase（web.log token 基址）+ 渲染层（横幅/步骤条/场清单）+
watch 孤儿自退出（ppid 变化即退）；boot-run.sh——drift_check 函数（`--drift-check` 单跑
模式 + 每次 boot 内联执行）+ trap cleanup（EXIT/INT/TERM 全杀 + pkill 子进程）+ web 输出
tee 进 web.log（deep-link 数据源）；AGENTS 命令表同步。

**验收实证（全部通过）**：

1. 23 tests 绿（+3：多场扫描过滤排序 / final+review 双命名与步骤推导 / HITL 多帧检测）；
2. ad-hoc 场实测出现在场清单（cn-ai-chip-adoption + cn-us-cpu-gap + drt 桥接场，带标注）；
3. HITL 横幅实测**三会话**（a2a6850a = run 的 HITL2 挂起 + d29822ed/cc7e241f = 孤儿
   HITL1）——真事件流检测（末事件 = 未答 ask），非启发式；静默区反向提示逻辑在场
   （有等待时不显示，互斥正确）；
4. 漂移检测红绿反证 + **首跑抓到真漂移**：cordis.patch.yml / README.md 镜像 = D16 前旧版
   （此前手术同步只覆盖 7 个当日改过的文件）——检测上线即值回票价；
5. 孤儿自退实证：job_kill 杀父 → watcher 2s 内自退（输出文件 mtime 冻结 + pgrep 无残留）；
   trap 修复代码在场，live kill 复核随下次通道全重启（web 运行中不重启）。

**实现中发现（对后续条目是前置知识）**：DSH 会话日志 = 逐次 append 的 **zstd 多帧拼接**
（实测 357 帧 / 639 行）——node:zlib 的 zstdDecompressSync 是单帧 API，直接喂整文件只得
首帧（228 字节）；须按帧魔数（28 B5 2F FD）切段逐帧解压再拼接。判据③④ 的日志核对、
entry-chain-probe 读会话日志时同此。

**deep-link 现状**：web.log token 基址链已实装（下次 boot 生效——当前 web 是旧 boot 起的
无 tee）；会话级路由待 vendor web 调研，本轮 base URL 即用。

**毕业动作**：本文件迁 notes/implemented/；roadmap 队列行删除；m2-run-mechanics §暂停点
偏差①（boot-run 两瑕疵）随本条目销账。
