# dev/ · 入口说明（环境/构建/同步 × run 通道 × 驱动）

> 命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)（含 `source dev/env.sh` 前置说明）；run 通道用法 = [Run 指南](../docs/guides/61-run-playbook.md)。本页 = dev/ 每个盘上入口的职责与状态。

## 环境与构建/同步

| 件 | 职责 |
|---|---|
| env.sh | 双 home（DSH_HOME=runtime/harness-home）+ 裸 dsh 拦截 + pre-commit 挂载——L1/L2 脚本的前置 |
| vendor-build.sh | vendor 树构建：tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳 |
| vendor-host-bundle.config.ts | host 半补建配置（逐包 tsdown，给缺 lib/index.js 的包补产物） |
| vendor-host-typert.config.ts | host 半补建备选配置（留档） |
| vendor-typert-emit.mjs | typert 产物生成器 |
| render-overlay.mjs | 生成器：从 pack 渲染 `dev/research.overlay.yml`（改 pack 后必跑，先于 L1） |
| sync-pack-workspace.mjs | 生成器：research-workspace 正本 → pack workspace/ 种子 |
| egress-probe.mjs | egress 模式判定 CLI（direct / tun / offline；核心 = `scripts/lib/egress.mjs`，boot-run 自检消费；设计 = egress issue 卡） |
| egress-proxy.mjs | 自旋本地转发代理 CLI（TUN 态 DSH fetch 出口；核心 = `scripts/lib/egress-proxy.mjs`；缺省端口 14200，boot-run 子进程方式起、随 web 回收） |
| research.overlay.yml | **生成物**（render-overlay 产出，勿手改）——源码域 overlay |

## run 通道

| 件 | 职责 |
|---|---|
| boot-run.sh | run 通道正式启动面：自检 → 组合检查/补装 → 漂移门 → boot web 3083 → 后台仪表盘（自 source env.sh） |
| run-kickoff.mjs | run 会话驱动：建 lead 会话 + 发 kickoff（GUI 的 RPC 替代入口） |
| stream-guard.mjs | 流畸形死亡自动恢复守卫（读会话日志 → `streamFailureOf` 折算 → 冷却后经 session/prompt 注入「继续」；`--once` 单次巡检）。**状态 = 实验件**：目的与 BUG-023 候选③ 同源，而候选③ 的前提（上游持续窗口）已被 2026-10-12 对照实验推翻（真实根因 = 出口代理撕裂流，见 [流直连 Note](../notes/implemented/2026-10-12-llm-stream-direct-no-proxy.md)）——故本守卫现仅对「直连路径再现」有意义；**已知缺陷（未修）**：末行 `process.exit(recovered \|\| !recovered ? 0 : 0)` 恒真 = 头注承诺的「退出码 1 = 未恢复放弃」在常规路径永不可达；无门禁/测试/文档消费 |

## 开发驱动

| 件 | 职责 |
|---|---|
| hitl-answer.mjs | HITL 代答（代理模拟；answerer 在浏览器客户端，先盘侧谓词自拒） |
| record-role-fixture.mjs | 角色组装面 fixture 录制（真模型档一次性；录制品人审入库 + 在场景声明登记 source 身份，此后 keyless 永久回放） |
| hooks/ | pre-commit 钩子（verify+tests 红灯拦 commit；env.sh 幂等挂载 core.hooksPath） |

## 运行区（已外移根级 runtime/）

harness-home/（开发 DSH home）与 smoke-workspace/（冒烟/boot 运行产物）的职责与状态 = [runtime/README.md](../runtime/README.md)——dev/ 只住源码驱动。
