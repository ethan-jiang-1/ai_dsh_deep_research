# dev/ · 入口说明（环境/构建/同步 × run 通道 × 驱动 × 运行区）

> 命令与前置正本 = [guides/60 §2](../docs/guides/60-dev-loop.md)（含 `source dev/env.sh` 前置说明）；run 通道用法 = [Run 指南](../docs/guides/61-run-playbook.md)。本页 = dev/ 每个盘上入口的职责与状态。

## 环境与构建/同步

| 件 | 职责 |
|---|---|
| env.sh | 双 home（DSH_HOME=dev/harness-home）+ 裸 dsh 拦截 + pre-commit 挂载——L1/L2 脚本的前置 |
| vendor-build.sh | vendor 树构建：tsc host/client + typert 产物 + client bundle + host 半补建 + 前端壳 |
| vendor-host-bundle.config.ts | host 半补建配置（逐包 tsdown，给缺 lib/index.js 的包补产物） |
| vendor-host-typert.config.ts | host 半补建备选配置（留档） |
| vendor-typert-emit.mjs | typert 产物生成器 |
| render-overlay.mjs | 生成器：从 pack 渲染 `dev/research.overlay.yml`（改 pack 后必跑，先于 L1） |
| sync-pack-workspace.mjs | 生成器：research-workspace 正本 → pack workspace/ 种子 |
| research.overlay.yml | **生成物**（render-overlay 产出，勿手改）——源码域 overlay |

## run 通道

| 件 | 职责 |
|---|---|
| boot-run.sh | run 通道正式启动面：自检 → 组合检查/补装 → 漂移门 → boot web 3083 → 后台仪表盘（自 source env.sh） |
| run-kickoff.mjs | run 会话驱动：建 lead 会话 + 发 kickoff（GUI 的 RPC 替代入口） |

## 开发驱动

| 件 | 职责 |
|---|---|
| hitl-answer.mjs | HITL 代答（代理模拟；answerer 在浏览器客户端，先盘侧谓词自拒） |
| record-role-fixture.mjs | 角色组装面 fixture 录制（真模型档一次性；录制品人审入库后 keyless 永久回放） |
| hooks/ | pre-commit 钩子（verify+tests 红灯拦 commit；env.sh 幂等挂载 core.hooksPath） |

## 运行区（gitignored，不入库）

| 目录 | 性质 |
|---|---|
| harness-home/ | 开发 DSH home：会话、凭据、插件安装（崩溃半径隔离；日用 ~/.dsh 不动） |
| smoke-workspace/ | 冒烟与 boot 的运行产物区：日志（*.log）、探针留档（entry-chain-probe-*.md）、release-pack/、run-pack/、npm-cache/（工具态重定向）、dashboard.html 投影——全部非 canonical；regression-process-guard.mjs = 被走查 Note 引用的一次性原型，非正本 |
