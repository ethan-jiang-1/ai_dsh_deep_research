# 探针索引（生成物，勿手改）

> 生成器 = `probes/_index.mjs --write`；事实源 = 每支探针头注；本表只答「有哪些、在哪」。
> 指南 = [../docs/guides/66-probe-playbook.md](../docs/guides/66-probe-playbook.md)。

## behavior/（4 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [discipline-probe.mjs](behavior/discipline-probe.mjs) | 五场景纪律在真模型下按合同触发（A2/B1/收活两态/计划确认卡） | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | 纪律合同/persona/skill 文本改动；收活判据变更；snapshot 重录后 | 常驻 |
| [entry-chain-probe.mjs](behavior/entry-chain-probe.mjs) | 入口链三问（授权范围/RFC 条件/开发环路径）真模型可召回 | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | 改根/子树 AGENTS 或入口链；入口链导航合同变更；纯文档卫生轮 | 常驻 |
| [method-library-probe.mjs](behavior/method-library-probe.mjs) | Lead 能说出偏好库路径、当前条目数、点名条目缺席（BUG-042 判据 #4） | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | 偏好库播种/手册指路/面板文案改动；BUG-042 回归 | 常驻 |
| [rerun-triage-probe.mjs](behavior/rerun-triage-probe.mjs) | 给一句「太浅」，Lead 按五条转接纪律回话 | 真模型（DEEPSEEK_API_KEY；REAL_MODEL 闭集） | rerun-triage skill/HITL2 文案/终稿页脚改动；2026-10-23 卡回归 | 常驻 |

## browser/（1 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [cdp-probe.mjs](browser/cdp-probe.mjs) | 驾驶舱显示/点击/会话回复在真实浏览器成立（--ask 以日志落盘为判据） | 连已起 GUI（--ask 按会话档） | 改驾驶舱渲染/交互/页签；run-driver 浏览器判据；BUG-021 回归 | 常驻 |

## stream/（1 支）

| 探针 | 一句话 | 档位 | 何时跑 | 状态 |
|---|---|---|---|---|
| [llm-stream-tee.cjs](stream/llm-stream-tee.cjs) | LLM 流异常时留下可离线复判的原始字节/响应头四件套 | 活进程仪器（NODE_OPTIONS 预载；keyless） | 流异常第一动作（MALFORMED/断流/重试风暴）；BUG-022/023/024 复盘 | 常驻 |
