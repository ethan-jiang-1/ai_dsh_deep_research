# 低置信区第 8 轮：plan 门剩余/方法库 N/A/缓存身份/并发与端口（批 N：BUG-300…319）

> 状态：implemented
> 历史注记：本篇第 8 项的启动互斥实现被[预防性质量首批](2026-11-20-preventive-quality-pilot.md)部分取代；当前启动所有权与生命周期看新篇，本篇其余决定仍按原记录。
>
> 历史注记：续 [low-confidence-20-round2](2026-11-18-low-confidence-20-round2.md)；
> 前批决定仍现行，本批把“实机才发虚”的剩余收紧。

## 决定

1. **plan active 节点字段必填**（300–302）：`owner_role`、`kind`、`task_id` 缺一即红；
   `task_id` 无 Team 映射写 `—`（模板同步），`plan-only` 只允许出现在 `## Wave 执行` 层。
2. **剩余工作与图一致**（303/304/305）：`- 无` 与 active 节点共存红；Wave 声明层必须有
   `W<n>.x` 节点；v>1 前版快照必须可解析、版本相符、且不得与当前 `plan.md` 完全相同。
   （快照内容的任意改写仍不可判——没有外部锚；见残余风险。）
3. **声明 library 必须可核**（307）：`library_fields_sha256` 非 null 但候选路径找不到
   `method-library.md` → 红；`sha=null` 的 library_name 才允许 N/A。
4. **覆盖表质量分档**（311）：格内 `A<n>/B<n>` 与盘上 evidence 的 quality 计数对账。
5. **threshold 只约束 critical claims 的证据**（312）：从 `review/claims.json` 取 critical
   claims 的 evidence 集合；缺 claims 时才回退全部。
6. **长度只计散文**（313）：剔除 fenced code、inline code、URL、markdown 表格后再计
   words/pages。
7. **probe 身份含 MCP**（308）：`MCP_PLAYWRIGHT` 进 `probeIdentityOf`。
8. **启动互斥**（309/310）：`run-driver up` 用原子 mkdir 锁 + owner.json + stale 回收；
   `boot-run.sh` 用同一 `$STATE_DIR/boot-run.lock` 文案 fail-loud；并发不再竞争端口/状态根。
9. **端口自持有**（315–317）：cold-start/snapshot/client-load 缺省用 `pickFreePort()`，
   显式 `--port` / env 仍可覆盖。
10. **cold-start 进 nightly**（314）：registry tier `nightly`；nightly 增加 L2 干净室步骤；
    预算 cap nightly 12→13（D54 同 diff 说明：clean-room 是发布前唯一完整安装证据）。
11. **pack 指纹含 symlink**（318）：`collectPackEntries` 收录 symlink（link 目标 + 目标内容
    sha256）；**probe 缓存原子写**（319）：临时文件 + rename。

## 输掉的方案

- **plan task_id 可空**：Team 映射缺失会让派工与图脱节；用 `—` 显式表示“无映射”，
  不用空白省略。
- **快照内容哈希入重写记录**：会改模型可见 plan 模板与历史格式，收益不抵本轮范围；
  先钉“非当前 + 可解析 + 版本相符”，残余风险写 Note。
- **固定端口保留 + 锁**：锁只能防并发，不能防与其它入口/外部占用互撞；动态端口更根本。
- **threshold 全量证据**：背景/方法卡低质会假红；改为 critical claims 的证据集合。
- **review 只数 evidence 文件**：同一卡多 lens/质量差异不可见；加 A/B 分档对账。
- **cold-start 继续 dev-only**：唯一仓外安装组合不进 nightly = 最容易坏的路径无持续证据；
  用 +1 nightly 预算换。

## 实际跑过的验证

- `pnpm verify` / `pnpm test` 全绿；`pack.e2e` 86 条目；`cold-start` 动态端口 GREEN（本机）。
- 红证回放：plan 300–306 各自红；307 缺库红；308 MCP 身份红；309/310 锁红；311 A/B 分档红；
  312 critical 作用域红；313 噪声计数红；314 nightly 13>12 红；315–317 固定端口静态契约红；
  318 symlink 指纹红；319 原子写残留红；各自还原 → 绿。
- `nightly.yml` 新增 `L2 clean-room cold start`；registry cold-start tier=nightly；
  `smoke-cost-budget` nightly cap 13（D54 说明同 diff）。

## 残余风险

- **plan 快照内容仍无外部锚**：只能证明“不是当前版且可解析”，不能证明快照未被改写；
  要真正不可篡改需在 `## 重写记录` 落 sha256（模型可见模板变更，另开卡）。
- **plan 字段必填对旧 plan 从严**：旧归档不重审；新 plan 按模板写 `—`/`plan-only`。
- **314 nightly 只在 workflow 层**：本机未跑 nightly；下一次夜间执行才证明 cold-start 在 CI 的
  环境（vendor 构建/缓存/端口）下可跑。
- **315–317 真浏览器/干净室入口未在并行压力下复跑**：动态端口是代码级保证；并发实测留给
  nightly/手动。
- **318 symlink 读目标内容**：循环 symlink 读取失败时 sha 为空（仍入 link 字段）；pack 源当前
  无 symlink，属防御。
- **319 原子写只保证单文件替换**：不处理跨进程 last-writer-wins；缓存语义按 key 覆盖，可接受。
- L1/L4 未跑；无真实模型调用。
