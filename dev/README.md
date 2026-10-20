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
| sync-pack-workspace.mjs | 生成器：research-workspace 正本（含工作区 `.gitignore`）→ pack workspace/ 种子 |
| research.overlay.yml | **生成物**（render-overlay 产出，勿手改）——源码域 overlay |

## run 通道

| 件 | 职责 |
|---|---|
| run-driver.mjs | **驱动入口（启动/验证/呈交一条命令）**：`up` 起通道（经 boot-run，不绕漂移门）或复用已在飞的 → 用 cdp-probe 验浏览器面 + 截图 → 打印呈交块；`probe` 对已起通道只验面；`url` 打印当前通道 URL。verdict = exit 0 可呈交 / 1 红（不得呈交）/ 2 未跑；verdict JSON + `run-driver-status.png` 落 `runtime/smoke-workspace/`。通道事实唯一来源 = `web.log` 最后一条横幅 |
| boot-run.sh | run 通道正式启动面：自检 → 组合检查/补装 → 漂移门 → boot web 3083 → 后台仪表盘（自 source env.sh） |
| llm-socket-isolation.cjs | api.deepseek.com socket 隔离预载（NODE_OPTIONS）：LLM 流与 web_search 两类请求均每请求一次性连接、永不复用；上游边缘对长命复用连接有相位性故障（[postmortem](../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md)），移除 = 摘 boot-run 一行 |
| run-kickoff.mjs | run 会话驱动：建 lead 会话 + 发 kickoff（GUI 的 RPC 替代入口） |

## 开发驱动

| 件 | 职责 |
|---|---|
| hitl-answer.mjs | HITL 代答（代理模拟；answerer 在浏览器客户端，先盘侧谓词自拒） |
| record-role-fixture.mjs | 角色组装面 fixture 录制（真模型档一次性；录制品人审入库 + 在场景声明登记 source 身份，此后 keyless 永久回放） |
| hooks/ | pre-commit 钩子（verify+tests 红灯拦 commit；env.sh 幂等挂载 core.hooksPath） |

## 运行区（已外移根级 runtime/）

harness-home/（开发 DSH home）与 smoke-workspace/（冒烟/boot 运行产物）的职责与状态 = [runtime/README.md](../runtime/README.md)——dev/ 只住源码驱动。
