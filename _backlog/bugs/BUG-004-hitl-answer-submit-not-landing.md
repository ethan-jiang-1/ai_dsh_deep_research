# BUG-004：hitl-answer 点击提交不落地——"卡头消"与盘侧 answer 事件脱钩

> 严重级别：P1（重要——授权代驱通道在当前 UI 上失效，只能降级文本消息应答）｜发现：2026-10-04｜状态：活跃

## 症状

`dev/hitl-answer.mjs` 对挂起 ask 卡执行选项点击 + 提交后，自报"卡头消——提交完成"，但
**盘侧会话日志无任何 answer 落地**（ask 的 tool/call 之后无 result、无 user/message），
工具自带的盘侧复核连续四次（HITL1 两卡 + HITL2 一卡三题）如实判"未真正提交"。均发生
于本 run（dr_agent-memory-landscape，0.2.0 timed ask 语义下）。

## 根因（假设）

"卡头消"的判据被 timed 语义污染：ask 挂起 600s 超时后工具返回 pending、卡片可能自行
收起/换形态——drive 的"卡头在→点击→卡头消"链路把"卡头消失"误读为提交成功，实际点击
落在 stale 卡或提交按钮未触发 vendor 的 answer RPC。复现要点：ask 创建 >600s 后 drive。
验证途径：在 drive 内点击前后各抓一次盘侧事件数，answer 事件落地才判成功（盘侧复核
已有，但应在**点击前**先校验卡片 still-answerable 的 DOM 锚，而不是事后）。

## 复现

```sh
source dev/env.sh && node --import tsx/esm dev/hitl-answer.mjs --port 3083 --token <t>
# 挂起 ask 超 600s 后执行：报"提交完成"但盘侧复核判未提交（连续四次）
```

## 牵出的失败类

**"UI 观察判据 vs 盘侧事实"脱钩**类（与 BUG-003 同族的反向实例）：工具用 DOM 状态
（卡头消失）当提交证据，盘侧才是真相——watch-run 已立"事件形状非字符串 grep"的先例，
hitl-answer 的成功判据应同样以盘侧 answer 事件落地为准（工具内已有盘侧复核，但放在
事后且只警告不退出——应升级为裁决）。

## 修复关联

当场未修（run 途中，降级文本消息应答完成两点交互——§4"答复作为新消息"语义兜底，授权
代驱划界内）。修复方向：drive 以盘侧 answer 事件落地为成功判据 + 点击前校验卡片
still-answerable 锚；盘侧复核从警告升格为 verdict（不落地 = FAIL exit 1）。
