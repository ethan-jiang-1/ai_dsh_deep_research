# 入口链 fresh-agent 审计与卫生修正（用户 steer，非队列条目）

> 状态：implemented

> 来源：用户 steer ×2——① roadmap.md 移至 docs/ 顶层（常设队列信息，与入口链其余
> 三件同级）；② 以 fresh-agent 视角审计信息架构（高信噪比 / 渐进式披露 / 从
> AGENTS.md 按图索骥全覆盖——信息不过窄也不过载），不符则调整。本 Note = 收尾
> 记录（决定 / 输掉的方案 / 实际跑过的验证 / 环境状态）。

> **部分取代关系**（互链义务，见 [notes/AGENTS.md §取代检查](../../notes/AGENTS.md)）：
> 本条是 fresh-agent 信息架构审计的**首轮**（入口链视角）；
> [fresh agent 清晰度与信噪比审计](2026-10-04-fresh-agent-doc-audit.md) 是**次轮**同题审计
> （深水区文档 + 盘面机械对账，修复已落地）。**本条的决定仍然有效**，故双方保留。

> 历史注记（2026-10-30）：入口链“四件”/ 最小集 5 文件 / ▶ 队列首位均为 2026-09-24 快照；
> 现行链 = [AGENTS §入口链](../../AGENTS.md)（先分流 + 1–4 步，D20 无队列）；l4-lite 遗留项
> 已随重写消失。

## 决定（7 项）

1. **roadmap.md → docs/ 顶层**（git mv 保历史）：入口链四件（AGENTS / 00-index /
   roadmap / evaluation）同级；引用同步 6 文件 10 处（AGENTS ×2、evaluation ×2、
   00-index ×2、README ×2、verify 头注 + 门禁 8 的 roadmap 路径）。独立提交 f9af63c。
2. **档位词汇统一**：废除全仓无定义且自相矛盾的"认证档"（AGENTS 命令表曾给
   release-smoke 标"认证档"，同文件密钥节又说它 keyless）→ 两分法：**keyless**
   （无凭据可跑；preset-smoke 真挂载档与 release-smoke 会起真 DSH 环境但无模型
   调用）/ **真模型档**（需 DEEPSEEK_API_KEY 与真模型调用）。定义入 AGENTS.md
   §密钥；替换点：命令表 ×2、60 §2 表、release-smoke/l4-lite-smoke 头注、
   roadmap 条目 4。
3. **60 §5 重写**：修正两处销账前残留——"DSH_SMOKE_REAL 需要 DEEPSEEK_API_KEY"
   （错：真挂载档 keyless，D14）与"web 搜索 provider 若需独立 key 随用随配"
   （Q1 已销账；D9：与 chat 同一把钥匙）。
4. **README 处置 = 修 + 并**（未删）：Commands 区并为指针（唯一正本 =
   AGENTS.md §命令表，此处不复制）；Directory Map 降稳定粒度（脚本只列名不标
   档位——档位标注正是本轮实证的漂移源）；Start Here 补 roadmap ▶ 入口；修
   preset-smoke "需 API key"错误标注与"辘体"错字。
5. **AGENTS.md §布局补真**：补 README.md、根 workspace 两行（盘上存在而图上
   无的地标）；删 notes/postmortem/（图上有而盘上无）；dev/ 补 smoke-workspace/；
   preset 行写全三件套（persona 是 agent.cordis.yml 内的行而非文件——消除三种
   粒度歧义，同步 00-index 术语映射行）。
6. **导航补针**：研究手册加"模板六件 ↔ run 文件"对应行（review/drafts/journal
   无模板的原因显式化）；pack README 加"新增一个研究角色"四步指针（探针 Q10
   原需拼 verify + cordis.patch.yml + package.json 三个源文件才能答）。
7. **design/10 §6 偏离表去重**：簿记正本 = AGENTS.md §偏离登记簿，本节改纯指针
   （原表已与正本漂移：3 行 vs 2 行、粒度不一——双家必腐的再证实）。

## 输掉的方案

- **README 压成纯指针页**（探针首选建议）：保留人类门面的稳定粒度信息（原则级
  Rules / 粗粒度 Directory Map 漂移面低）；Commands 已并指针。若 README 再漂移
  → 降级纯指针页（复活条件登记于此）。
- **AGENTS.md 纪律表外移**（探针"过载"项）：纪律锚须常驻入口文件，可辩护；已有
  ⚠ 首版子集自省，队列条目「dsh-discipline 全量枚举」落地时整表替换。
- **队列生命周期双家收敛**（roadmap 头注 vs 60 §0）：一详一略、内容一致、零漂移
  史，保留。
- **把本轮登记为队列条目**：用户 steer 即时指令，直接执行；探针的制度化已由队列
  条目 4（entry-chain-probe 脚本化）承接——本轮即该条目的一次语义版人工执行。

## 证据（fresh-agent 探针 = 零上下文 subagent，只读，禁脚本/git/改文件）

- **首轮探针**（读 14 文件 + 3 次 ls）：10/10 定向问答找到、除 README（图上无此
  地标）外**零盲找**；开工就绪最小集 = 5 文件（AGENTS → 00-index → roadmap →
  60 → evaluation）；总评 **4.5/5**——渐进披露真实成立（design 深水区/notes/tests
  全部按需可达不强制），扣分全在"一处事实一个家"执行瑕疵（README 双家腐烂、
  60 §5 残留、"认证档"无定义——自家教义未贯彻到自家门口）。探针独立复现走读
  发现的全部漂移，并额外发现 60 §5 两处错误与档位词自相矛盾。
- **复验探针**（定点回归 6 摩擦点）：执行中（零上下文 subagent，定点回归：档位词汇/
  README 一致性/60 §5/模板对应/新增角色指针/布局树实物对照）；结果落地后以追加小节
  补录于本 Note。

## 实际跑过的验证

- `node scripts/verify.mjs`：8 门禁全绿（roadmap 搬家后、全部调整后各跑一次）；
- `node --test tests/*.test.mjs`：10 pass / 0 fail（同上两个时点）；
- `grep 认证档` 全仓：活文档清零（AGENTS.md §密钥的定义说明句除外——那是定义
  本身）；notes/ 历史记录保留原样（时间点记录，不追改）。

## 环境状态

- 本轮纯 docs/脚本头注卫生，未动 preset 与包内容 → 按面选择表（60 §2）不触发
  L1/L2/L3 加跑条件；
- ▶ 条目「l4-lite-smoke 复跑」未动（steer 插队），仍居队列首位；本轮已知遗留
  一个待修项：l4-lite-smoke.mjs 第 34 行 zstd 守卫的运算符优先级 bug（恒 false，
  守卫从不触发），随该条目一并处理。

## 补录（同日）：复验探针结果 + .gitignore 审计与修正（steer ③）

### 复验探针（定点回归）：6/6 PASS

零上下文 subagent 对六个摩擦点逐项从零验证（只读 + ls，全部结论带实读行号）：档位
词汇（keyless/真模型档在 AGENTS.md §密钥就地定义、活文档零"认证档"未定义使用）、
README 与 AGENTS 零矛盾、60 §5 与 AGENTS §密钥零矛盾、模板对应显式（手册一行 +
门禁 7 机械背书）、新增角色四步指针自包含（pack README 单文件）、布局树与实物
零虚构。**五项旧摩擦对 fresh agent 均不再咬人。** 两条轻微残余同轮修掉：AGENTS.md
布局行补 pnpm-lock.yaml、packages 行补"新增角色步骤见包 README"半句。

### .gitignore 审计与修正

**审计（实证，非自述）**：
- check-ignore 全套：真实敏感/残留路径 13/13 被接住（凭据/会话日志/profiles/
  node_modules/tgz 双位置/runs 内容/.env*/.pem/.key/.log/.envrc）；
- tracked 清单 60 文件零敏感物；dev/ 与 runs/ 下只有资产 + .gitkeep；
- 历史：截至本审计唯一一次事故 = tarball 误提交（166d94e 进、efcf56d 出），凭据从未进过库；
  2026-10-25 追补：另有 `tests/.tmp-evidence-audit` 误提交（fdc1421 进、c488959 出），两次均非
  敏感、均已从 HEAD 移除；完整审计与“保留历史、不改写”的决定 =
  [开源发布面 Note](2026-10-25-open-source-launch.md)。
- 盘上零"未跟踪且未忽略"残留。

**发现的洞与修正**：
1. **机密段原在中部，gitignore"后匹配者胜"使防御纵深名存实亡**——红证：在 dev 段
   模拟两行 `!profiles` 再包含（提交 profile 夹具的自然写法），`git add -A` 干跑
   直接列出 `.credentials.yaml` 与 `node_modules/`（泄漏面实锤）。修正 = **两段式
   重写**：① 位置性运行区（中部，允许 ! 再包含夹具）；② 绝不进库置底段（机密 +
   依赖/构建/OS 残留，勿移动勿后补）。绿证：同样再包含模拟下 add -A 干跑零敏感物；
   13/13 路径回归全过。测量教训两条入册：`git status` 折叠显示全未跟踪目录（grep
   子路径测不到）；`check-ignore -v` 对否定模式的退出码有歧义——泄漏判据必须用
   `git add -n -A` 干跑。
2. **`.envrc`（direnv）未盖**——补进置底段；`packages/*/*.tgz` 收敛为 `*.tgz`
   （纯配置仓无合法 tarball，任何深度皆残留）。
3. **gitignore 对已跟踪文件无效**（tarball 事故正是此类）——verify 新增门禁 9
   `secrets-untracked`：git ls-files 清单断言零 credentials/.env*/.envrc/.pem/
   .key/node_modules/.pnpm-store/*.tgz/*.log/.DS_Store。红绿反证：注入 tracked 哑
   .pem → 门禁红（精确点名文件与处置法）→ 还原 → 9 门禁全绿。

**验证**：verify 9 门禁 + node --test 10 pass（红绿前后各跑，全部实际执行）。

### 追补（steer ⑤）：roadmap.md 再迁仓库根 + 终扫收口

用户定案：队列文件升**仓库根**（与 AGENTS/README 同级——全仓最高频查阅的"当前"指针
要最高可见度；此前的 docs/ 顶层为过渡位）。引用同步 11 处：AGENTS 布局树（roadmap
入根、docs/ 行收敛）+ 指针链接、00-index 层表/文档地图（链接改 ../）、evaluation ×2、
README ×2、verify 头注 + 门禁 8 路径；md-links 门禁范围纳入根 roadmap.md。

**终扫（系统结构面）发现与处置**：design/10 §2 与 pack README 的 bundle 内容描述仍写
"web 工具"——D9 实证前的旧措辞（机器真相早已由 tests/pack/presets.test.mjs 守卫：web 行
不得进 bundle），散文未跟上机器。两处改为 roster + present + 团队三行。

**终扫结论**（四 preset 实读 + overlay + 测试断言逐项核对）：工具面与 design/10 §4
逐角色精确对齐（lead 独有 ask-user + present；scout/analyst 有 subagent；critic 刻意
无两者——"工具面即职责边界的机器表达"成立）；overlay 与 cordis.patch.yml 行等价；
presets.test.mjs 六测覆盖结构/行依赖/bundle 形状/web 行禁入/compat 钉 tag。结构两维
（导航 + 系统）实证无已知问题；遗留项全部为已登记队列条目（D10 vendor submodule /
纪律全量枚举 / 探针脚本化 / l4-lite zstd 守卫 + 复跑），非结构缺陷。
