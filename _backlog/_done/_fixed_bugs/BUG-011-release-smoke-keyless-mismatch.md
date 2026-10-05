# BUG-011：L2 无模型调用，但部署检查使无凭据全绿承诺不成立

> 严重级别：P2｜发现：2026-10-05｜状态：活跃 — 已修复 2026-10-05：安装模式与研究就绪模式分开，L2 全绿；[Note](../../../notes/implemented/2026-10-05-project-navigability.md)

## 症状

根 [AGENTS.md](../../../AGENTS.md) 与 [开发环](../../../docs/guides/60-dev-loop.md) 把 L2 标为 keyless，
定义为无凭据可跑。[release-smoke](../../../scripts/release-smoke.mjs) 要求安装副本的 scaffold 与
preflight 返回成功；[preflight](../../../packages/deep-research-pack/scripts/preflight.mjs) 将
环境 key 为空且凭据文件缺席计入 hardFail。因此无凭据时部署链不可能全绿。

## 根因（源码核对）

安装结构验收与真实研究准备检查共用 preflight 的一次总 verdict。
“无模型调用”与“无需凭据”是不同性质。preflight 仅检查环境变量或文件在场，
也不能证明凭据有效、provider 可响应。

## 复现

在无模型 key 环境且无凭据文件的 DSH home 中运行部署 preflight，会得到密钥检查失败与 exit 1。
release-smoke 要求同一 preflight 全绿，因而跟随失败。
本次仅核对源码分支，未改动/移除凭据，未执行完整安装复现。

## 牵出的失败类

一个验证命令同时承担安装证据与生产就绪检查，导致 keyless 合同和实际前置不一致。
增加虚假凭据文件凑绿会掩盖问题，不是修复。

## 修复关联

[目录与入口治理 Note](../../../notes/implemented/2026-10-05-project-navigability.md)。
候选给安装验收一个明确的不检查模型就绪性模式，部署用户默认仍检查就绪性；
用无 key、无凭据文件的隔离环境证明 L2 全绿，同时证明默认部署检查仍会拒绝缺失凭据。
是否改变 preflight 接口与验收合同须随该实现变更记录。

## 修复验证（2026-10-05）

preflight 提供显式 `--install-only`，scaffold 转发；安装 verdict 明确不代表研究就绪，默认凭据检查保留。
`release-smoke` 对非模型命令使用清洗环境，隔离空凭据 home 的安装验收退出 0、默认 preflight 退出 1，
只拒绝模型密钥检查。`source dev/env.sh && node scripts/release-smoke.mjs` 实跑 ALL PASS：pack、干净 profile
安装、scaffold 真铺种子、安装验收、缺凭据反证和安装域四角色真挂载全部通过。部署契约测试 10 项通过。
