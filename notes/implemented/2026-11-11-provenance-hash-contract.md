> 状态：implemented

# Provenance hash 合同：owner = ops/Lead，不是 analyst

## 决定

把 provenance `sha256` 的 owner 从“analyst 在 run 内算”改成 **ops/Lead 后补**，并明确
缺 hash 的审计语义：

- `content/manual.md`：provenance 可选；**hash 的 owner 是 ops/Lead，不是 analyst**；
  派发不得要求它用 `python3 hashlib`；缺 hash = UNATTESTED，不是伪造；`file://` 无
  provenance = MAJOR；细节下放到 `content/generic/state-and-recovery.md`。
- `presets/analyst/skills/evidence-extraction/SKILL.md`：新增“provenance / hash 边界”——
  analyst 不算 sha256、不把 workflow 当计算器；只写非 hash 元数据；需要 hash 时写 gap。
- `team-assembly` 派发纪律：**provenance hash 不派给角色**；hash 由 ops/Lead 后补或显式
  窄工具；缺 hash = UNATTESTED；不要把 workflow 当计算器。
- D47 的 provenance 子句登记在 [decisions](../../docs/decisions.md#d47)（D48 并入 D47，
  台账 ≤32KB 硬顶）。

背景证据：`c91d1525`（quick_factual analyst child）的 prompt 要求 “python3 hashlib”，
但 analyst 工具面没有 bash/python；它把 `workflow` 当 JS SHA-256 沙箱（`sha256-slice`，
无 agent），未授权且 `sandbox-unavailable`。这不是“模型不守纪律”，是合同要求了角色
没有的能力，唯一的替代工具恰好是越权的那一个。

## 输掉的方案

- **给 analyst 加 bash**：能力面过大，与“研究角色只读写证据”的边界冲突。不选。
- **新增窄 `provenance_hash` 工具**：可作为后续选项；当前没有审计门强制 run 内 hash，
  先走 ops/Lead 后补，避免新代码面与 D 号。
- **保留 python3 指令但只改 prompt**：analyst 仍无 python，模型还会找 workflow；
  没有解决根因。不选。
- **删掉 provenance**：`file://` 的 MAJOR 规则和离线复算仍有价值；保留契约，只改 hash
  owner。不选。

## 实际跑过的验证

- `node --test tests/pack/content-disclosure.spec.mjs`：T0 从 10433 压到 9973 字符，
  低于 10000 触发线；generic 指针/结构绿。
- `node --test tests/pack/presets.spec.mjs`：provenance hash 合同三条（manual / analyst
  skill / team-assembly）绿；`node --test tests/pack/wave-contract.spec.mjs` 绿。
- `pnpm test`：1165 pass / 0 fail。
- `DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs`：角色/worker 真挂载绿（模型
  可见文本变更后的 L1）。
- `node scripts/smoke/l4-lite.e2e.mjs`：全角色响应 + scout 工具调用绿。
- 真模型 `analyst` 会话 `request/header`：`present` / `subagent`，**无 workflow**；
  SHA 误用的工具路径已从普通 analyst 上消失。
- `node scripts/smoke/release.entry.mjs --install-only`：安装域全绿。
- `node scripts/dist/export-dist.mjs`：0.3.1 tarball 与手册重生成。

## 残余风险

- 没有跑一场完整 quick_factual pilot 验证“模型不再自己找 hash 路径”；当前证据是合同
  文本 + analyst 工具面无 workflow。下一场 quick_factual run 应观察 provenance 是否
  按合同缺省。
- 若审计门后续要求 run 内 hash，需重新评估窄 `provenance_hash` 工具；不要回退到
  bash 或 workflow。
- 手册 T0 刚好低于 10000；后续新增常驻文本必须先下放/压缩（content-disclosure 会把守）。
