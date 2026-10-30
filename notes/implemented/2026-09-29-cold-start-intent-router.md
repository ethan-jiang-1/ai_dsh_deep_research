# cold-start intent router：入口按"用它 / 改它"分流 + 部署主路径硬修（用户直派）

> 状态：implemented

归宿：用户直派（2026-09-29，不在队列）。取代检查：
[entry-chain-fresh-agent-audit](2026-09-24-entry-chain-fresh-agent-audit.md)（留活跃）拥有
"以 fresh-agent 视角审计入口链"这一方法与本仓上一轮卫生修正——本条沿用同一方法、只记本轮
**新增**决定，不取代它。

## 问题（探针实测，不是推演）

判据由用户给定：不是"我读得懂"，而是**一个没有任何上下文的 fresh agent，用任意说法指向
"启动 / 用 / 装这个插件"，能否立刻落到正确入口**。做法 = 零上下文只读 subagent 复现（沿用
2026-09-24 那轮的方法），共三轮 9 个探针。

- **首轮 4 个探针（四种说法）4/4 都需要反问用户**，且四人各自选了不同答案：两个走"装进 DSH"
  （pack README §部署）→ 两个走"本仓 run 通道"（`dev/boot-run.sh`）。同一句话落到不同路径 =
  泛化性缺陷：**答案在仓库里，但"用户说法 → 哪个文档"的路由不在**。
- 探针顺带抓出**四处机械可证**的缺陷（照文档做会失败或产出与承诺不符）：
  1. **部署主路径（F2）**：缺 profile 模板初始化、且用 private 包的 registry 裸名——
     `vendor/dsh/apps/cli/src/plugin.ts:40` 对缺失 profile 走
     `initProfile(dir, PROFILE_TEMPLATES[profile]?.bundles ?? DEFAULT_PROFILE_BUNDLES)`，而
     `app-boot/src/profile.ts:203` 的 `DEFAULT_PROFILE_BUNDLES = ['@deepseek-ai/dsh-base']`：
     **没有 `dsh-web-app` 就没有 web，也就没有"研究状态"页签**；本包 `"private": true` 未发布
     registry，`add dsh-deep-research-pack` 解析不到。
  2. **PATH bin（F2b）**：pack README 的 scaffold/preflight 用 PATH bin 名，而 tarball 装法不生成
     PATH bin（实测 `which dsh-deep-research-scaffold` 为空）→ 两条命令必 command not found。
  3. **`--from-default-profile` 的幂等假象（F8）**：三处写"profile 已存在则跳过"，但没写此时该改用
     不带该 flag 的 `dsh --profile <p> --dump-config`——带着 flag 重跑会因"已存在"硬失败
     （`apps/cli/src/profile-boot.ts:101-131`）。
  4. **端口缺省与现实不符（F3）**：`boot-run.sh` 头注记着 2026-09-28 用户指令"3081 让给别的项目、
     本仓通道用 3083"，缺省却仍是 3081，61 还写"固定 3081"，STEPS 文本硬编码 3081——而实测
     `dev/smoke-workspace/web.log` 的 token URL 是 `http://127.0.0.1:3083/…`、3083 有 LISTEN
     （pid 84609），**在飞通道确实在 3083**。

## 决定

1. **入口按意图分流（D21）**：路由正本 = [00-index §先分流](../../docs/00-index.md)（说法 → owner →
   **单个**首个动作）；根 `AGENTS.md §入口链` 与 `README §Start Here` 各一行指针；入口链 1–4 步
   只在"改本仓"时适用。模型句前置："本包自身没有进程，启动 = 装进 profile + 起 profile"。
2. **默认与反问的优先级写死**：未指定别的 DSH home → 直接走本仓通道，**不停下来发问**（这句只管
   "别问哪个 home"）；只有明说别的 home 才问。第一轮稿把"默认"与"含糊时先问"并列 → 二轮探针指出
   自相矛盾、三轮探针指出"在飞 run 检查"同样没被排名 → 本轮把优先级一次写清。
3. **"启动前先判接续还是新开"入路由与技能**：动作 = `ls -dt research-workspace/drt_*/`（`archive/`
   除外），**根目录下每个未归档 bundle 都报出来**，分两类——(a) 无 `final/` 或 `review.md` 非
   `readiness: PASS` = 在飞 → 问"接续还是新开"；(b) 有 `final/` 且 PASS = 已交付未归档 → 问"先归档
   再新开，还是补研究"。两轮探针（三个 agent 独立）都命中"文档只覆盖'跑新的/装/验证'，没覆盖
   '半场 run 摆在根目录'这格"——三轮探针撞到的正是 (b)（`final/v1.md` + `readiness: PASS` 但仍在
   工作区根）。同一规则进 [running-a-research-run §1](../../.agents/skills/running-a-research-run/SKILL.md)
   （技能是 fresh agent 跑研究时真正加载的程序化记忆）。
4. **部署路径与 release-smoke 证明过的形状同形**：web 模板初始化 → `add file:<绝对路径>`；bin 改
   安装副本脚本全路径；补"验证安装"（`--dump-config` 四行断言）与 `DSH_HOME` 默认 `~/.dsh`；三条坑
   写进文档（出厂模板不读本地同名 profile；`file:` 相对路径按 profile 目录解析；已存在 profile 时
   去掉 `--from-default-profile`）。
5. **端口单一事实源 + 缺省改 3083**：`boot-run.sh` 缺省 3083，`hitl-answer.mjs` / `run-kickoff.mjs`
   默认也读 `DSH_RUN_PORT`（缺省同值）；头注与 STEPS 不再写死；`boot-run.sh` 端口占用 fail-loud，
   且**先判占用者是谁**——是本仓在飞通道 → 别另起（URL/token 见横幅或 `dev/smoke-workspace/web.log`），
   不是 → 换端口或确认后停掉（别盲杀，那会终局化挂起的 HITL 回合）。托管后台形态**绕过漂移门**，
   故 61 §0 写明前提 = 先 `bash dev/boot-run.sh --drift-check` 过门。
6. **预算升顶带理由**：`AGENTS.md` 130→132、`README.md` 30→31，理由登记在
   [scripts/doc-budgets.json](../../scripts/doc-budgets.json) 的 `_raises`（分流句是每轮在场的判据，
   下放不了）。

## 输掉的方案

- **只加 FAQ / 不动入口链**：探针证明缺的不是"答案"而是"说法的路由"；FAQ 会长成第二份文档地图
  （双家必腐，本仓已有 README 漂移先例）。
- **把"启动"钉成单一含义**：用户说法天然歧义（新开 / 续跑 / 装 / 只验证挂载），钉死会制造
  "文档正确但用户被拒"。选分流 + 默认 + 判别句。
- **在 boot-run 里自动换端口**：静默改变端口会让横幅 URL 与人的预期不符；改 fail-loud + 补救。
- **缺省端口保持 3081（本轮中途曾这样定过）**：当时的论据是"3081 实测空闲、别把缺省与在跑实例
  耦合"。后拿到 `web.log` 的 3083 token URL + pid 84609 监听 3083 + 用户 2026-09-28 的成文指令，
  三条同向 → 推翻，缺省改 3083（保留 `DSH_RUN_PORT` 覆写）。
- **更新旧的 entry-chain-fresh-agent-audit（而非新建）**：它是那一轮的记录（内容含已由 D20 退役的
  roadmap.md），本轮决定属新增类；按取代检查第三条，双方保留互链。

## 验证

- **首轮探针 ×4**（零上下文、只读）：4/4 需反问 + 上列缺陷清单。
- **二轮探针 ×3**（同法，读改后文档）：三人**都在第 1 个文件**（00-index §先分流）拿到唯一入口命令，
  无人被队列链带走——"去哪"闭环；同时给出三条新缺口（接续/新开缺页、默认 vs 反问矛盾、pack README
  ③ bin 不可用），已同轮修掉（决定 2/3/4）。
- **三轮探针 ×2**（同法，验收二轮修复）：install 侧确认"按安装副本全路径执行不会失败、按 bin 名才会"
  与文档一致，并抓出 F8（已修）；launch 侧确认判据生效（它自己按文档去做"接续还是新开"的扫视并如实
  反问），并抓出"优先级没排""已交付未归档这格没覆盖"（已修，见决定 2/3）。
- **四轮探针 ×1**（同法，验收三轮修复）：端口（3083）、(b) 类路由与反问句、优先级裁定三项都对（均带
  文件 + 行号）；再抓出三处**本轮修复自身留下的不一致**——技能页只编码了 (a) 类、托管后台形态没说
  它绕过漂移门、"已交付"判据把 `present` 声明当成了盘上事实——已全部同轮修掉（决定 3/5）。
- **机械证据**：`pnpm verify` 全绿（含 md-links / md-anchors / doc-budgets / entry-chain /
  dist-manual-version）；`pnpm test` 112 pass；`node scripts/release-smoke.mjs`（L2 安装面）
  ALL PASS；`node scripts/export-dist.mjs` 全绿（手册按新模板重导，tarball 内 README 已核）；
  `node scripts/entry-chain-probe.mjs`（真模型档）**ALL PASS**——入口链四问答案仍与真值一致
  （我加的"先分流"句没有把链带偏）。
- **机制核对走 vendor 源**（不是注释传说）：`apps/cli/src/plugin.ts:40`、
  `app-boot/src/profile.ts:203`、`apps/cli/src/profile-boot.ts:101-131`、CLI 参考
  `--from-default-profile` 节（"不会读取本地同名 profile，不会复制其依赖或 patch"）。

## 环境状态

- 本轮未改模型可见文本（persona / skill 正文 / 研究手册零改动），行为面无变化；
- **有一场 run 在飞**：`research-workspace/drt_mcp-server-ecosystem/`——2026-09-29 14:36 仍在写
  `journal.md`，`final/v1.md` 已落、`review.md` = `readiness: PASS`（第 2 轮复评），但**仍在工作区根
  未归档**（位置 = 状态说该进 `archive/`）。即：run 已到交付收尾、通道活在 **3083**。本轮**未动**该
  bundle、未起任何通道（探针只读；entry-chain-probe 用自己的 3102）。是否接续/归档留给用户；
- 端口实测：3080 = 本仓开发 GUI（pid 2807）、3081 空闲、3083 = 在飞 run 通道（pid 84609）；
- **已知残留（当时，已修）**：scaffold 补团队层未钉版本——已由 2026-10-26 部署真伪轮的
  TEAM_SPEC 钉版 + `--refresh-team` 修复；原记录保留作历史。
