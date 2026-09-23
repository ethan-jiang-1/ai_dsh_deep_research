# 台账补行 D11–D13（卫生，用户 steer，非队列条目）

> 来源：用户 steer——本会话 fresh-agent 入口链走读发现 00-index 台账跳号（D1–D10 直接
> 跳 D14/D15），点名打扫。本 Note = 收尾记录（考古 / 决定 / 输掉的方案 / 实际跑过的验证）。

## 考古（红证：行从未存在，非被删）

- `git log -G '^\| D1[123] \|' -- docs/00-index.md` 零命中——台账从无 D11–D13 行；R1
  原版（ea0d3b7）台账止于 D10；D14/D15 于 166d94e 补录（[l1-l2-green](2026-09-24-l1-l2-green.md)
  Note 自述"台账补录"）。
- 号源 = [r1-scaffold](2026-09-24-r1-scaffold.md) Note §决定：`队列制 + RFC 分家 +
  status rots 拆除（D11–D13…）`——决定真实且施行中，但行从未落台账；该 Note"详见
  docs/00-index.md 台账 D1–D13"因此一直是空引用，后续 D14/D15 顺号跳空。
- 咬点：台账读到 D10→D14 会怀疑漏读（本轮走读即被逼离链 grep——全程唯一一次脱链）。

## 决定

- 补三行入 [00-index](../../docs/00-index.md) 已定表，号序照 scaffold Note 并列顺序
  重建：D11 队列制 / D12 队列与 RFC 分家 / D13 status rots 拆除。
- 行式 = 一句话决定本体 + 载体指针（D11→roadmap 头注；D12→proposed/README；D13→
  evaluation.md §3 尾注 + intents 第 6 条）——机制详述不搬家，一处事实一个家不破。
- scaffold Note 不追改（时间点记录纪律）；补行后其"台账 D1–D13"引用自愈为真（探针
  Q3 判定：指针有效，范围滞后于现状属时间快照设计内行为）。

## 输掉的方案

- **墓碑注记一行**（"D11–D13 = 流程决策，详住 roadmap 头注"）：省两行，但把"D11 是
  什么"这个最基础的台账问题留在指针跳之后；行式登记与其余 14 行同构，直接可答。
- **追改 scaffold Note 的过期引用**：违反"notes = 时间点记录，不追改"纪律；补行方案
  下引用自愈，无需触碰。
- **顺带收敛 D9 同钥事实的 4 处复述**：上轮审计已裁决为可辩护缓存（key 配错代价高、
  四处受众不同），非本轮 scope；钥匙逻辑若变更须 4 处同改的提醒记于此。

## 实际跑过的验证

- `node scripts/verify.mjs`：9/9 门禁全绿——含一次现场红证：首版 D12 行链接误写
  `../proposed/README.md`（少 notes/ 一层），md-links 门禁抓红
  （`docs/00-index.md: 链接不可解析 → ../proposed/README.md`）→ 修正为
  `../notes/proposed/README.md` → 绿。门禁反证纪律的意外免费再证。
- `node --test tests/*.test.mjs`：10 pass / 0 fail。
- fresh-agent 探针（零上下文 subagent，只读，时不变 5 问）：**5/5 PASS**——D1–D15
  连续无跳号；D11/D12/D13 内容与载体经台账行指针一跳可达；scaffold 引用相符性（指针
  有效）；回归哨兵（▶ 唯一当前指针、release-smoke keyless 档）。零盲找、零脱链，
  共读 10 文件。
- 附带发现（设计内，不处置）：历史 Note 残留旧档位词"认证档"（l1-l2-green §21）——
  时间快照纪律豁免（上轮审计已裁决 grep 清零只及活文档），现行定义唯一处 =
  AGENTS.md §密钥。

## 环境状态

- 纯 docs 卫生，未动 preset 与包内容 → 面选择表（60 §2）不触发 L1/L2/L3 加跑；
- 工作区起点干净（git status 空），本 diff = docs/00-index.md + 本 Note（窄证据切片）。
