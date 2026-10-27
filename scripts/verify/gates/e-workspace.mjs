// e-workspace.mjs — 域 E · 工作区生成物：手册/模板/种子/overlay 与版本单源。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PACK, PRESETS, gates, fail, note, walk } from '../context.mjs';

export function runE() {
// ── workspace-contract（研究手册 + templates/run/ 全表在位；bundle 目录
//    drt_<slug>/ 运行时由 lead 创建，无静态目录可查——D17 目录契约）──
{
  const gate = 'workspace-contract';
  if (!existsSync(join(ROOT, 'research-workspace', 'AGENTS.md'))) fail(gate, 'research-workspace/AGENTS.md 不存在');
  for (const t of ['run.md', 'question.md', 'topics.md', 'plan.md', 'leads.md', 'evidence-entry.md', 'findings.md', 'final.md']) {
    if (!existsSync(join(ROOT, 'research-workspace', 'templates', 'run', t)))
      fail(gate, `templates/run/ 缺模板 ${t}`);
  }
  // 手册唯一定居点 = research-workspace/AGENTS.md（agent-instructions 经会话 cwd projectRoot
  // 注入）；$DSH_HOME/AGENTS.md 是 DSH 全局注入第二通道，一旦存在必与手册漂移（事故实证：
  // 旧契约化石镜像让 lead 按 runs/<slug> 行动）——存在即红。
  if (existsSync(join(ROOT, 'runtime', 'harness-home', 'AGENTS.md')))
    fail(gate, 'runtime/harness-home/AGENTS.md 化石镜像在场（手册唯一注入通道 = cwd projectRoot）——删除它');
}

// ── handbook-budget（手册注入字节预算，2026-10-09 钉版复核吸收）──
// 为什么：agent-instructions 的 maxBytes 超限时**静默截断**（vendor render 先丢更宽的指令文件、
// 再截最具体的文件）——company 实测事故：preset 钉 16384 时手册 1.2KB，手册长到 17.4KB 后
// 成员会话从某节中句起整段丢失、"工作纪律"节从未注入（company handbook-budget 门禁出生现场，
// 2026-10-02；源 = company@59551f2 checks/run-gates.mjs:99–117）。本仓同构风险：手册是四角色
// 会话的注入正本，doc-budgets 的**行数**栅栏管不到**字节**截断。正本 = research-workspace/AGENTS.md
// （pack 种子由 pack-workspace-fresh 保证同步，不重复查）。
{
  const gate = 'handbook-budget';
  const handbookPath = join(ROOT, 'research-workspace', 'AGENTS.md');
  if (!existsSync(handbookPath)) fail(gate, 'research-workspace/AGENTS.md 不存在（workspace-contract 同报）');
  else {
    const handbookBytes = readFileSync(handbookPath).length;
    // 逐文件收集（不摊平）：单个 preset 丢 maxBytes 行时，摊平数组只剩三个一致值会静默放行——
    // 该角色手册失去截断防线而门禁绿（钉版复核对抗自审 S1；company 原版同款洞，此处收紧）。
    const perPreset = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => ({
      role: f.replace(/\.patch\.yml$/, ''),
      budgets: [...readFileSync(join(PRESETS, f), 'utf8').matchAll(/maxBytes:\s*(\d+)/g)].map((m) => Number(m[1])),
    }));
    if (perPreset.length === 0) fail(gate, 'presets 下零个 *.patch.yml——防空语料');
    const bare = perPreset.filter((e) => e.budgets.length === 0);
    if (bare.length > 0)
      fail(gate, `preset ${bare.map((e) => e.role).join(', ')} 缺 maxBytes 声明——该角色的 agent-instructions 无字节预算，手册超限即静默截断（补 packages/deep-research-pack/presets/<role>.patch.yml 的 maxBytes 行）`);
    else {
      const budgets = perPreset.flatMap((e) => e.budgets);
      if (new Set(budgets).size !== 1)
        fail(gate, `各 preset 的 maxBytes 不一致：${budgets.join(', ')}——预算应同值（改 packages/deep-research-pack/presets/<role>.patch.yml）`);
      else {
        const maxBytes = budgets[0];
        const margin = 1024; // render 包装开销余量（intro/省略注记——company 同款）
        if (handbookBytes + margin > maxBytes)
          fail(gate, `手册 ${handbookBytes}B + ${margin}B 余量 > maxBytes ${maxBytes}——agent-instructions 正在静默截断手册尾部（升 preset maxBytes 或先瘦身 research-workspace/AGENTS.md）`);
      }
    }
  }
}

// ── workspace-versioning（工作区版本控制边界）。规则：工作区跟踪面的规则住在
//    两个**必须被跟踪**的规则文件里——`research-workspace/.gitignore.example`（运行区拒收名单，
//    同时是随 pack 分发的种子正本；包内名带 `.example` 因为 npm pack 永不打包 `.gitignore`
//    文件名，scaffold 落地时改回本名）与 `research-workspace/drafts/.gitignore`（开发证据
//    白名单：探针稿与 dry-run 输出默认拒收）。为什么机械化：本仓根 .gitignore 对工作区不生效，
//    `git add -A` 又只加已跟踪文件——**"规则文件在库"本身就是边界存在的唯一形式**：正本一丢，
//    pack 照旧发布、本仓静默失去边界。覆盖面的重点在**内容与形态**：裸 `*` 拒收全部会把被
//    跨目录引用的材料一起拒收（fixture 实测全新 clone 后 drafts 全丢、md-links 红），故门禁
//    同时钉"显式列名单"（出现裸 `*` 即红）与四条运行区拒收行的在场。防空语料：正本/种子/
//    drafts 任一缺席、正本与种子不逐字节相等、缺任一拒收行 → 红（拒收行丢了，安装方一次
//    `git add -A` 就把整个 run 历史提交进他自己的库）。──
{
  const gate = 'workspace-versioning';
  const seed = join(PACK, 'workspace', '.gitignore.example');
  const scaffoldPath = join(PACK, 'scripts', 'scaffold.mjs');
  const rootRules = join(ROOT, 'research-workspace', '.gitignore.example');
  const draftsRules = join(ROOT, 'research-workspace', 'drafts', '.gitignore');
  const seedText = existsSync(seed) ? readFileSync(seed, 'utf8') : null;
  if (seedText === null) fail(gate, 'packages/deep-research-pack/workspace/.gitignore.example 缺席——安装方将拿不到工作区忽略规则（修正 = 补正本后跑 `node dev/sync-pack-workspace.mjs`）');
  else {
    // 种子名 = `.gitignore.example` 而非 `.gitignore`：npm pack 永不打包名为 .gitignore 的文件
    // （`files: ["workspace/**"]` 也照删，实测）——种子若叫 .gitignore，安装方永远收不到它。
    // 故这里同时钉"包内没有 .gitignore（那意味着选了随包会被丢的名字）"与"scaffold 会改名落地"。
    if (existsSync(join(PACK, 'workspace', '.gitignore')))
      fail(gate, 'packages/deep-research-pack/workspace/.gitignore 在场——npm pack 永不打包该文件名，种子会从 tarball 里静默消失（修正 = 用 .gitignore.example 形态）');
    const scaffoldSrc = existsSync(scaffoldPath) ? readFileSync(scaffoldPath, 'utf8') : '';
    const seedCorePath = join(PACK, 'scripts', 'lib', 'seed-core.mjs');
    const seedCoreSrc = existsSync(seedCorePath) ? readFileSync(seedCorePath, 'utf8') : '';
    const seedManifestPath = join(PACK, 'workspace', 'seed.json');
    let seedManifest = null;
    try { seedManifest = JSON.parse(readFileSync(seedManifestPath, 'utf8')); } catch { seedManifest = null; }
    if (!scaffoldSrc.includes('seed.json'))
      fail(gate, 'scaffold.mjs 未读 workspace/seed.json——种子安装/升级失去版本与哈希依据');
    if (!scaffoldSrc.includes('seedSourceRel'))
      fail(gate, 'scaffold.mjs 未用 seedSourceRel 处理包内名 → 落地名');
    if (!/destRel === '\.gitignore'\s*\?\s*'\.gitignore\.example'/.test(seedCoreSrc))
      fail(gate, 'seed-core.mjs 未把 .gitignore 映射到 .gitignore.example——规则不会铺到安装方工作区');
    if (!seedManifest || !Object.hasOwn(seedManifest.files ?? {}, '.gitignore'))
      fail(gate, 'workspace/seed.json 缺 .gitignore 条目——安装方的忽略规则不在种子清单里');
    if (!existsSync(rootRules)) fail(gate, 'research-workspace/.gitignore.example 不在位——工作区跟踪面的规则正本（修正 = 重建后跑 `node dev/sync-pack-workspace.mjs`）');
    else if (readFileSync(rootRules, 'utf8') !== seedText) fail(gate, 'research-workspace/.gitignore.example 与 pack 种子 workspace/.gitignore.example 不一致——正本与分发件漂移（修正 = `node dev/sync-pack-workspace.mjs`）');
    if (!existsSync(draftsRules)) fail(gate, 'research-workspace/drafts/.gitignore 不在位——开发证据白名单（新探针稿会默认可被 git add）');
    // 拒收清单 = 三个运行区名字。形态是**显式列名单**而非裸 `*` 拒收全部：工作区里还有被
    // 文档与测试跨目录引用的材料（本仓 drafts/ 开发证据），裸 `*` 会连它们一起拒收——fixture
    // 实测全新 clone 后 drafts 全丢、md-links 红（见 Note §实际跑过的验证）。名单少一项
    // 就等于该类运行区重新可提交，故逐项钉。
    const denies = ['drt_*/', 'archive/', '_abandoned/', 'method-library.md'];
    for (const deny of denies) {
      const escaped = deny.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`^\\s*${escaped}\\s*$`, 'm').test(seedText))
        fail(gate, `种子 workspace/.gitignore.example 缺拒收行 \`${deny}\`——安装方该类运行区重新可被 git add（修正 = 改正本 research-workspace/.gitignore.example 后跑 \`node dev/sync-pack-workspace.mjs\`）`);
    }
    if (/^\s*\*\s*$/m.test(seedText))
      fail(gate, '种子 workspace/.gitignore.example 出现裸 `*` 整目录拒收——它会连工作区里被跨目录引用的材料（如 drafts/ 开发证据）一起拒收，全新 clone 后链接与测试同时失效（修正 = 改回显式列名单）');
  }
}

// ── dev-runtime-clean（dev/ 只住源码驱动；运行态必须住 runtime/ 或研究工作区）──
// 为什么：dev/ 是源码驱动目录，运行态住 runtime/（harness-home / smoke-workspace）或研究工作区。
// 2026-10-25 数据边界审计实测 dev/harness-home/ 里躺着 run bundle；.gitignore 能挡 git，挡不住
// cp -r/打包目录。本门禁把“dev/ 无运行态”变成机械事实（不扫 tracked，直接看盘）。
{
  const gate = 'dev-runtime-clean';
  const dev = join(ROOT, 'dev');
  const forbidden = [];
  const walk = (dir, rel = '') => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      const p = join(dir, ent.name);
      const r = rel === '' ? ent.name : `${rel}/${ent.name}`;
      if (ent.isDirectory()) {
        if (ent.name === 'harness-home' || ent.name === 'sessions' || /^drt_/.test(ent.name)) forbidden.push(`dev/${r}`);
        walk(p, r);
      } else if (ent.name === '.credentials' + '.yaml') forbidden.push(`dev/${r}`);
    }
  };
  if (!existsSync(dev)) fail(gate, 'dev/ 缺席——源码驱动目录不在位');
  else walk(dev);
  if (forbidden.length > 0)
    fail(gate, `dev/ 下出现运行态：${forbidden.slice(0, 5).join('、')}${forbidden.length > 5 ? '…' : ''}——运行态住 runtime/ 或研究工作区（迁移/清理后再提交；见 guides/63）`);
  else note(gate, 'dev/ 无运行态（harness-home / drt_* / sessions / 凭据）');
}

// ── overlay-fresh（源码域 overlay 是**生成物**——由 dev/render-overlay.mjs 从 pack
//    渲染；改 pack 后不重渲染即红。0.1.7 preset 重设计后 overlay 必须携带 preset 行，两处手写
//    必然漂移，故改成生成 + 新鲜度门禁（vendor 的"生成 + freshness"形态；本仓首个 tracked
//    生成物，登记在 discipline-map 源 7）。）──
{
  const gate = 'overlay-fresh';
  const r = spawnSync(process.execPath, ['dev/render-overlay.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    const first = `${r.stderr ?? ''}${r.stdout ?? ''}`.trim().split('\n').filter(Boolean)[0];
    fail(gate, first ?? 'dev/research.overlay.yml 与 pack 渲染结果不一致——跑 `node dev/render-overlay.mjs` 重生成');
  }
}

// ── pack-workspace-fresh（sync-pack-workspace --check）：手册/模板是会话 cwd 的内容，
// pack 必须自带（否则部署方装了包也没有研究纪律）。正本 = research-workspace/，
// 种子 = pack workspace/（生成物，勿手改；漂移即红——与 overlay-fresh 同形态）。
{
  const gate = 'pack-workspace-fresh';
  const r = spawnSync(process.execPath, ['dev/sync-pack-workspace.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    const first = `${r.stderr ?? ''}${r.stdout ?? ''}`.trim().split('\n').filter(Boolean)[0];
    fail(gate, first ?? 'pack workspace/ 种子与 research-workspace/ 正本漂移——跑 `node dev/sync-pack-workspace.mjs` 重同步');
  }
}

// ── release-version（发布版本单一源：root 镜像 pack；tag 一致性由 release-check 在发布前查）──
// 病根：仓库出现过 root 0.1.0 / pack 0.1.1 / tag 0.1.2 三套版本，发布时无法判断 tag 该对谁。
// 规则正本 = docs/guides/64-release-versioning.md：发布版本 = pack version；root 必须镜像；
// tag = 同版本 annotated。CI 不假定 tag 在场，故 tag 检查归 scripts/dist/release-check.mjs。
{
  const gate = 'release-version';
  const readVersion = (rel) => {
    try { return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')).version; }
    catch (e) { fail(gate, `${rel} 不可读/不是合法 JSON（${e.code || e.message}）——发布版本源不可判`); return null; }
  };
  const rootVersion = readVersion('package.json');
  const packVersion = readVersion('packages/deep-research-pack/package.json');
  const semver = /^\d+\.\d+\.\d+$/;
  for (const [label, version] of [['root package.json', rootVersion], ['pack package.json', packVersion]]) {
    if (version !== null && (typeof version !== 'string' || !semver.test(version))) {
      fail(gate, `${label} version = ${JSON.stringify(version)}——必须是三段 semver（X.Y.Z）`);
    }
  }
  if (rootVersion !== null && packVersion !== null && rootVersion !== packVersion) {
    fail(gate, `版本漂移：root ${rootVersion} ≠ pack ${packVersion}——发布版本以 pack 为准，root 必须镜像（规则 = docs/guides/64-release-versioning.md）`);
  }
}

// ── dist-manual-version（dist 导出合同——精神移植 ai_dsh_architect docs/distribution.md：
//    _dist/安装手册.md 是 tracked 生成物（生成器 = scripts/dist/export-dist.mjs），表头版本必须等于
//    pack 的 package.json 版本，且指名同目录 tarball 的文件名——版本动而手册不重导出即红，
//    迫使版本 bump 与重导出同 diff。导出目的地 = _dist/（tarball gitignored）。）──
{
  const gate = 'dist-manual-version';
  const manualPath = join(ROOT, '_dist', '安装手册.md');
  if (!existsSync(manualPath)) {
    fail(gate, '_dist/安装手册.md 缺席——tracked 生成物必须在库（跑 `node scripts/dist/export-dist.mjs` 导出）');
  } else {
    const manual = readFileSync(manualPath, 'utf8');
    const packVersion = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).version;
    const head = manual.split('\n').slice(0, 10).join('\n');
    const m = head.match(/\|\s*版本\s*\|\s*(\S+)\s*\|/);
    if (!m) {
      fail(gate, '_dist/安装手册.md: 表头 10 行内无「| 版本 | … |」行——手册是 scripts/dist/export-dist.mjs 的生成物，勿手写；跑 `node scripts/dist/export-dist.mjs` 重生成');
    } else if (m[1] !== packVersion) {
      fail(gate, `_dist/安装手册.md: 表头版本 ${m[1]} ≠ pack package.json 的 ${packVersion}——版本 bump 必须同 diff 重导出（跑 \`node scripts/dist/export-dist.mjs\` 后提交）`);
    }
    const t = head.match(/\|\s*安装包\s*\|\s*`([^`]+)`/);
    if (!t || t[1] !== `dsh-deep-research-pack-${packVersion}.tgz`) {
      fail(gate, `_dist/安装手册.md: 表头未指名当前 tarball dsh-deep-research-pack-${packVersion}.tgz——手册与旁边的产物漂移，重导出`);
    }
  }
}

// ══ 域 F · 仓规与开发环境（symlink/敏感物/门禁自反/入口链/端口/提交纪律） ══
}
