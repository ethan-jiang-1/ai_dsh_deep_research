# BUG-010：回归经导入模块启动子进程，layering 静态守卫未检出

> 严重级别：P2｜发现：2026-10-05｜状态：活跃 — 已修复 2026-10-05：原生解码与执行路径零子进程；[Note](../../../notes/implemented/2026-10-05-project-navigability.md)

## 症状

[测试指令](../../../tests/AGENTS.md) 规定默认回归无模型、浏览器、网络与子进程。
[run-state 测试](../../../tests/run-state.test.mjs) 的不可读日志用例传入不存在的 `.zstd` 路径，
[读取器](../../../scripts/lib/run-state.mjs) 会先执行 `execSync` 启动 shell/zstd，再捕获失败并返回不可读。
`pnpm test` 可以全绿，不能证明实际执行路径没有子进程。

## 根因（源码核对）

[layering](../../../tests/layering.test.mjs) 仅扫描顶层测试文件文本，不追踪 import 后的执行路径。
读取器的 `.jsonl` 路径直接读文件，其他路径走解压子进程；测试的错误样本选中了后者。

## 复现

源码可达链：不可读日志测试 → `runStateOf` → `readSessionEvents` → 非 `.jsonl` 分支 → `execSync`。
本次已运行默认回归且全绿；没有另起 zstd 复现或修改源代码。

修复验收应独立观察测试是否尝试启动子进程，不能以现有 layering 静态检查绿作为证据。

## 牵出的失败类

测试入口合规而导入实现越界。不能简单禁止所有含子进程的模块导入：审计与 watcher 模块也导出
合法的纯解析接口。需要在接口或执行路径上区分纯判据与外部适配。

## 修复关联

[目录与入口治理 Note](../../../notes/implemented/2026-10-05-project-navigability.md)。
候选先把不可读回归改为不存在的 `.jsonl` 样本，保留不可读断言；再以反证验证执行路径守卫。
解压适配的真实行为由独立运行证据覆盖。

## 修复验证（2026-10-05）

[session-log](../../../scripts/lib/session-log.mjs) 使用 Node 原生 zstd API，校验连续帧结构；坏尾帧、截断和坏 JSONL
使整份日志不可读。run-state 保留公开读取接口，watch-run 复用 canonical 日志选择。

默认回归 194 项通过。执行路径探针在同进程运行同一测试集合，监测全部 Node 子进程入口，结果 0 次调用；注入被捕获的
`execSync` 后监测器退出 1，证明错误吞掉也不能假绿。顶层 layering 仍是静态范围检查，独立 smoke 另取证。
