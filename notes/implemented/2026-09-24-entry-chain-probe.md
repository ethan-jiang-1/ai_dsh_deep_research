# RFC：entry-chain-probe——入口链探针脚本化

> 状态：implemented

归宿：roadmap §队列「entry-chain-probe」（已离队）· 语义版已人工两跑（2026-09-24 定向 + 定点回归，见 implemented Note）——本条目 = 脚本化 + 制度化 ✓

## 决定

本条目同日立项、同日实施毕业：脚本 `scripts/entry-chain-probe.mjs`（真模型档）+ 制度化
（guides/60 §4 第 4 步 + AGENTS 命令表/密钥档位/布局树）。

## 问题

入口链（AGENTS → 00-index → roadmap ▶ → 活跃 RFC → guides/60）是全仓唯一开工路径，
其语义漂移只能靠真模型 fresh-context 阅读抓——人工跑靠记忆执行会漂；company 探针的
已知盲区：问句期望也会过期（问法必须时不变，否则换条目就失效）。

## 方案

1. 脚本 `scripts/entry-chain-probe.mjs`（**真模型档**，需凭据）：全新子代理上下文
   只读入口链 5 步 → 答 N 个**时不变问法**（"现在该做什么？依据链上哪一步？队列里
   下一条是什么？"——答案随 ▶ 变，问法永不变）；
2. 断言：答案与 roadmap ▶ 条目、活跃 RFC 状态行、guides/60 程序一致（软断言 +
   输出留档人工复核）；
3. 节奏制度化：每 feature 条目收尾跑（guides/60 §4 第 4 步的机械可选形态）。

## 输掉的方案

- **keyless 断言版**（否——入口链问题本质是语义阅读理解；结构面已有 entry-chain
  门禁覆盖，语义面 regex 无牙）；
- **塞进 verify**（否——档位纪律：真模型不进 keyless 回归，tests/layering 守卫）。

## 验收判据

- 脚本对当前入口链跑通，答案与 ▶ 条目一致（首跑证据进本条目毕业 Note）；
- M2 收口实跑一轮（作为 docs 面改动的探针义务）；
- 问句清单经"时不变"评审：换任何 ▶ 条目，问法不变仍可判卷。

## 实施记录（2026-09-24，同日毕业）

**实现**：`scripts/entry-chain-probe.mjs`——boot web（本仓 vendor 机制基线）→ standard
preset 全新会话（cwd = 仓根，无研究 pack 上下文污染）→ 时不变四问（Q1 当前该做什么 /
Q2 结论来自链上哪步 /Q3 下一条目 / Q4 开工收尾程序在哪——问法不随 ▶ 变，答案随 ▶ 变）
→ 会话日志 zstd 多帧解压轮询取答 → 脚本自抽真值（roadmap ▶ 主题 + 下一条目）软断言
（bigram 命中）→ 全文留档 dev/smoke-workspace/ 供人工复核。RPC 协议照抄 l4-lite 实证
（/api/<method> + client-request 包裹 + result.ok/value——首版自创 JSON-RPC 形态失败，
教训：会话驱动的协议细节以已验证脚本为准，不猜）。

**首跑实证（ALL PASS）**：Q1 命中「首个完整研究 run」7/8 bigram（模型甚至读到了活跃
RFC 的收口方案）；Q2 正确指认第 3 步 roadmap ▶；Q3 命中「M2 收口与复盘」5/6；Q4 正确
指认 guides/60。留档 = dev/smoke-workspace/entry-chain-probe-2026-09-24T16-11-28-414Z.md。

**制度化**：guides/60 §4 第 4 步 = 机械版命令（无凭据退化语义版人工）；AGENTS 命令表 +
密钥档位（真模型档第三员）+ 布局树 scripts 行同步。

**验证**：首跑 ALL PASS（真模型档）；17 门禁 + 23 tests 绿。
