# tests/checks 按 checks/lib owner 镜像（门禁车道分目录）

> 状态：implemented
> 关联：[owner 轴 Note](2026-11-15-test-source-mirror.md)（本轮补完其被划掉的一角）；[D53](../../docs/decisions.md#d53)；
> [tests/AGENTS](../../tests/AGENTS.md)；[triggers](../../_backlog/triggers.md) tests/ 分域行。

## 决定

1. **`tests/checks/` 由平铺改为 `tests/checks/<owner>/`**：owner ∈ `analyze` `channel` `harness` `repo`
   `shared` `test-infra`，与 `checks/lib/<owner>/` 同名。`gates`/`probes` 的回归仍住 `tests/run/`
   （spec 车道），门禁车道不复制它们。
2. **落点规则（机械可判）**：一个 test 直接 import 的 `checks/lib` owner 唯一 → 该 owner 目录；
   2+ owner → `shared/`；零 `checks/lib` import → `repo/`（仓库级合同：文档、notes、backlog、release、
   CI、静态源码扫描）。根层零平铺、只许一层 owner、不建二级目录。
3. **车道不变**：文件名后缀仍是 `.test.mjs`，`pnpm test:checks` 的发现面改为
   `tests/checks/*/*.test.mjs`；`test-lanes`、`test-placement`、`test-owner-mirror` 三处门禁同时
   钉住新形态（未知 owner / 根层平铺 / 错深度 / 错依赖 = 红）。
4. **搬家账本与两账**：61 条旧路径进 `checks/test-path-redirects.json`（冻结层链接经簿解析，活文档
   直接改指新路径）；`asset-ledger` 重生成、`guard-ledger` 与归档 bug 卡的 `guard.path` 改到新路径、
   `tests/INDEX.generated.md` 重生成。
5. **为什么是 `checks/lib` 而不是 `checks/` 顶层**：`checks/{verify,smoke,run-gates,release,test}` 是
   入口/车道，不是源码树（研究实测：入口目录零 import 边）；`checks/lib` 才是被测试 import 的模块树。
   把 test 塞进 `verify/` `smoke/` 等目录会让 60 个文件里的大多数（repo 合同、test-infra）无家可归。

## 输掉的方案

- **镜像 `checks/` 顶层子目录**（`tests/checks/{verify,smoke,run-gates,release}/`）：否决。多数
  test 的主语是仓库级合同（docs/notes/backlog/release/CI）或测试基础设施，不归属任何入口目录；
  入口目录本身零 import 边，目录映射不产生可导航性。
- **按主语分桶**（`smoke/` `docs/` `client/` `release/`）：否决。这是第三套轴，和 2026-11-15 已否决的
  「主语轴」同因——不回答「谁在用」，且需要逐文件人工判断，无法机械对账。
- **保持平铺，只补文档**：否决。用户 2026-11-18 明确要现在做长期正确的事；61 个文件与
  `tests/run` 的 6 个 owner 目录长期不对称，且旧决定只以一句「门禁车道」附在别篇 Note 里。
- **把 test 搬进 `tests/run` 或新建 `tests/repo` 域**：否决。车道 = 命令与频率（D53），搬域会改变
  `pnpm test:spec` / `test:checks` 的选中面；owner 镜像不需要动车道。
- **让 `tests/checks` 继续平铺、只加生成索引**：否决。索引已经在（`tests/INDEX.generated.md`），
  但目录仍是一屏 61 个文件，agent 的第一跳不可见。

## 实际跑过的验证

- 迁移量：61 个 `.test.mjs` `git mv` 入 6 个 owner 目录；57 处 `../../checks/` import 改
  `../../../`；41 处 ROOT 深度 +1、1 处 `new URL` 深度 +1；61 条重定向；guard-ledger 与 37 个 `_backlog` 卡的
  `guard.path` 更新；asset-ledger 重生成（227 assets）；索引重生成。
- **先红**：新 `test-placement` 规则在旧平铺树上红（`tests/checks 下必须再有 owner 目录`）；
  `test-lanes` ② 红（列出 61 个平铺文件）；`test-owner-mirror` 新增 checks 分支红（同一列表）；
  `pnpm verify --only=test-placement` 对暂存的 `tests/checks/zz-flat-probe.test.mjs` 红（exit 1）。
- **落点反证**：`tests/checks/zz-flat-probe.test.mjs` → `test-lanes` 根层平铺红；
  `tests/checks/shared/zz-wrong-owner.test.mjs`（只依赖 repo 却住 shared）→ `test-owner-mirror`
  红；删除探针后恢复绿。
- `pnpm test:checks`：251 pass / 0 fail（新 glob 收全 61 文件）；`pnpm test` 全绿；`pnpm verify`
  全绿（md-links 368 条经重定向簿解析）；`node checks/smoke/gates.e2e.mjs` exit 0（157 个注入案例）。
- import 解析复核：61 个移动文件的所有相对 import 均解析到盘上（0 missing）。

## 残余风险与重议条件

- `repo/` 是零 import 合同的默认桶（24 件）——若它超过 35 件或出现明显误分类，重估是否把
  「仓库级合同」拆成二级桶（例如 docs / release），但那会引入第三层，先看索引是否够用。
- `analyze/`、`channel/` 目前各 1 件——owner 镜像保留单件目录；若单件目录 >2 个，重估是否合并进
  `shared/`（当前不做，避免破坏「单 owner → 该 owner」的机械规则）。
- `checks/lib` owner 漂移 → 重跑 `node tools/record/render-test-index.mjs`；`test-owner-mirror` /
  `test-placement` / `test-lanes` 会先红。
- 重议触发：`tests/checks` 超过 80 个 test，或 「机制名 → 首跳」检索仍失败，或 owner 门禁误报率
  超过 10%。
