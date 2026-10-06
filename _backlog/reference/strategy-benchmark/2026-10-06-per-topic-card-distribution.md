# per-topic 卡数存量分布（候选 A 标定 ①步，2026-10-06）

> 喂 [_backlog/queue.md](../../queue.md) §搁置池「per-topic evidence 数量地板参数化」行——复活路径 ①存量标定（本文件）→ ②新 run 增记（进行中：mistral T1=14、mcp-hosts T1=3/T2=8/T3=4/T4=6/T6=12/T7=15 已随场记 journal）→ ③分布实证「低卡数 **且** wave2 返工」场次 → 立门。生成方式 = 一次性脚本逐场读 topics.md（scope_role: primary）× evidence frontmatter（supports 字段），脚本已弃（数据在此钉版）。

## 分布总览（n = 68 个 primary topic，25 场可数 / 31 场总量）

| 统计 | 值 |
|---|---|
| min | 0（kimi-api-pricing T1；geometry-coaching T3 计数为 0 但另有 10 张卡 supports 字段缺——旧格式场） |
| p25 | 6 |
| **中位** | **13** |
| p75 | 18 |
| max | 53（open-weights-swebench-parity T1） |
| 低于源仓地板（wave0=12 / wave1=10） | **28 / 68** |

## 逐场明细（primary topic 数 ｜ 各 topic 卡数 ｜ supports 缺失卡数）

| run | primary | per-topic | 缺 supports |
|---|---|---|---|
| drt_2026-ai-browser-landscape | 2 | T1=18 T2=20 | 0 |
| drt_2026-ai-coding-agent-landscape | 2 | T1=18 T2=20 | 0 |
| drt_2026-ai-video-generation-landscape | 2 | T2=13 T3=24 | 0 |
| drt_agent-memory-landscape | 2 | T2=21 T4=23 | 0 |
| drt_cn-agentic-parity | 4 | T2=13 T3=13 T4=8 T5=9 | 1 |
| drt_cn-dr-products | 5 | T2=10 T3=6 T4=6 T5=20 T6=12 | 0 |
| drt_cn-llm-deep-research | 3 | T2=5 T3=6 T4=4 | 1 |
| drt_cn-llm-infra | 5 | T1=9 T2=15 T3=15 T4=6 T5=4 | 1 |
| drt_cn-llm-pricing-2026-10 | 4 | T1=9 T2=6 T3=16 T4=15 | 0 |
| drt_cn-us-open-model-ecosystem | 4 | T2=4 T3=1 T4=5 T5=4 | 0 |
| drt_cn-us-open-source | 5 | T1=5 T2=16 T3=18 T4=12 T5=13 | 0 |
| drt_computer-use-benchmarks | 1 | T4=14 | 0 |
| drt_deepseek-api-pricing | 1 | T1=14 | 0 |
| drt_dsh-release-watch | 2 | T1=7 T2=9 | 0 |
| drt_geometry-coaching | 1 | T3=0（10 张卡 supports 缺失，旧格式） | 10 |
| drt_kimi-api-pricing | 1 | T1=0 | 0 |
| drt_mcp-hosts-governance | 6 | T1=3 T2=8 T3=4 T4=6 T6=12 T7=15 | 0 |
| drt_mcp-server-ecosystem | 3 | T1=5 T2=10 T3=8 | 0 |
| drt_open-tts-2026-landscape | 3 | T1=45 T2=45 T3=29 | 0 |
| drt_open-weights-swebench-parity | 1 | T1=53 | 0 |
| drt_openai-context-window | 1 | T1=7 | 0 |
| drt_selfhosted-ai-gateway | 3 | T1=39 T2=18 T3=19 | 0 |
| drt_siliconflow-financials | 3 | T1=16 T2=20 T3=14 | 0 |
| drt_token-factory | 3 | T1=19 T2=19 T3=13 | 0 |
| drt_zhipu-api-pricing | 1 | T1=16 | 0 |

## 不可数场次（6）与口径发现

quick_factual 型 6 场（claude-context-window、cn-us-cpu-gap、deepseek-chat-price-check、mistral-api-model-list、qwen-dashscope-pricing、swebench-verified-top）**topics.md 不带 `scope_role: primary` 标记**——标定口径对其天然不可数。这本身是一条候选 A 之外的小发现：若立门，门判据须对 quick_factual 型豁免或改口径（该型通常单 topic，卡数语义不同）。

## 对复活条件 ③ 的当前读数

低卡数（<10）的 28 个 primary topic **单独不触发**立门——条件 ③ 要求"低卡数 **且** wave2 返工"双条件同场。下一步（若继续推）：交叉各场 `final/v2+` 在场与 journal rerun 标记，列出双条件同场清单；目前双条件同场数 = 待查（初扫 mcp-hosts：低卡 3 topic、零返工 PASS——不支持立门）。
