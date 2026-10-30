// gates-cases.mjs — 门禁自测的注入案例表（纯 fs 注入手法 + CASES/CONTROLS 数据）。
// 从 scripts/smoke/gates-smoke.mjs 拆出（2026-10-09 layering 二代：tests/contracts/verify-gates.test.mjs
// 静态对账消费本表——驱动面（smoke 道，起子进程）不得被 tests import，案例表因此住 lib；
// 每 mutate 只做纯 fs 操作，git add 由驱动壳在 mutate 后统一执行，本模块零子进程）。
// 消费方：scripts/smoke/gates-smoke.mjs（真执行体）+ tests/contracts/verify-gates.test.mjs（静态对账）。
import { appendFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

// ── 注入手法（每条 = 该门禁负责拦的真实回归；静态契约测试对账 gate 名 ↔ verify gates 数组）──

const appendTo = (rel, text) => (dir) => appendFileSync(join(dir, rel), text);

const stripFirstStatusLine = (dirRel) => (dir) => {
  const d = join(dir, dirRel);
  const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    .find((f) => readFileSync(join(d, f), 'utf8').includes('> 状态：'));
  const p = join(d, target);
  writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter((l) => !l.startsWith('> 状态：')).join('\n'));
};

/** 证据节缺席注入（2026-10-08 补宽 note-format 的"## 实际跑过的验证"断言）：
 *  取第一篇非 grandfather 的 implemented Note，把**所有**含证据词表关键词的二级标题
 *  改成中性词 `## 附注`——模拟"这篇 Note 根本没有验证节"。
 *  必须一次改全部：词表含 验证/检查/验收/实录/记录/实证/探针/全绿/复验/证据，只改一个标题
 *  若该文还有别的证据节则仍是绿的（实测教训：首版只改首个匹配 → 门禁照绿，案例空转）。 */
const stripVerificationSection = (dirRel) => (dir) => {
  const d = join(dir, dirRel);
  const WORD = /^##(?!#)\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
  const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    .find((f) => {
      const t = readFileSync(join(d, f), 'utf8');
      return !t.includes('<!-- grandfather:') && WORD.test(t);
    });
  if (!target) throw new Error('找不到可注入的 implemented Note（无含证据节的非 grandfather 篇）');
  const p = join(d, target);
  const out = readFileSync(p, 'utf8').split('\n')
    .map((l) => (WORD.test(l) ? '## 附注' : l)).join('\n');
  writeFileSync(p, out);
};

/** 证据节注入（**否定式标题**形态）：把真实证据节标题换成"## 未验证的猜测"
 *  ——文字游戏：标题里"验证"二字在场，但它声明的是**没有验证**。
 *  门禁须仍判红（语义倒置：明说缺席反而满足"要有证据节"，2026-10-08 二轮自审抓获）。 */
const negateVerificationSection = (dirRel) => (dir) => {
  const d = join(dir, dirRel);
  const WORD = /^##(?!#)\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
  const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
    .find((f) => {
      const t = readFileSync(join(d, f), 'utf8');
      return !t.includes('<!-- grandfather:') && WORD.test(t);
    });
  if (!target) throw new Error('找不到可注入的 implemented Note（无含证据节的非 grandfather 篇）');
  const p = join(d, target);
  const out = readFileSync(p, 'utf8').split('\n')
    .map((l) => (WORD.test(l) ? '## 未验证的猜测' : l)).join('\n');
  writeFileSync(p, out);
};

const ISSUE_NAME = '2099-01-01-probe.md';
const ISSUE_TEXT = '---\nstatus: 推敲中\nopened: 2099-01-01\n---\n\n# Probe\n> 状态：推敲中｜结论倾向：未定｜可关闭：否\n';

function fixtureFile(dir, rel, text, indexed = true) {
  const path = join(dir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  if (indexed) appendFileSync(join(dirname(path), 'README.md'), `\n[${rel.split('/').at(-1)}](${rel.split('/').at(-1)})\n`);
}

const backlogIssue = (change = (text) => text, indexed = true) => (dir) =>
  fixtureFile(dir, `_backlog/issues/${ISSUE_NAME}`, change(ISSUE_TEXT), indexed);

const removeLedgerRow = (gateName) => (dir) => {
  const p = join(dir, 'docs', 'evaluation.md');
  writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter((l) => !l.startsWith(`| \`${gateName}\``)).join('\n'));
};

/** na 活性注入：把某条 `verdict=na` 的 liveness 缺席前提"变成存在"——即造出它当初声称
 *  本仓没有的那个面。门禁须报红（"依据静默腐烂"的病根反证，2026-10-08 增设）。
 *  选 `website/AGENTS.md` 的 `absent: website`：该目录在真仓不存在，副本内可安全创造。 */
const naLivenessAppears = () => (dir) => {
  mkdirSync(join(dir, 'website'), { recursive: true });
  writeFileSync(join(dir, 'website', 'AGENTS.md'), '# 站点探针\n');
};

/** na 活性注入（装饰性断言形态）：把某条 na 的缺席断言改回 **vendor 源路径本身**
 *  ——这种断言看着在场、却永不会为真实失效而响（vendor doc 本来就不拷进本仓）。
 *  门禁须报"断言空转"红，否则免检区只是换了个写法（2026-10-08 自查抓获 7 处）。
 *  **本案例只锁"断言 = 源路径"这一退化形态**：能力面以换名形态落地（如
 *  `src/lib/session-v5.ts` 之于 session-format 行）仍不被捕捉——那是 `reReviewOn`
 *  声明层负责的语义面，无机械判据可锁。勿把本案例读成"能力级腐烂已被覆盖"。 */
const naLivenessDecorative = () => (dir) => {
  const p = join(dir, 'docs', 'alignment-ledger.json');
  const ledger = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of ledger.sources) {
    if (s.verdict === 'na' && s.source === 'docs/api-gateway.md') {
      s.liveness = [{ absent: 'docs/api-gateway.md' }];
    }
  }
  writeFileSync(p, `${JSON.stringify(ledger, null, 2)}\n`);
};

/** na 活性注入（globAbsent 形态）：造一份命中 glob 的文件 → 门禁须报"glob 命中"红。
 *  **此前本分支零覆盖**（首版三个案例全走 absent，而 `matchSimpleGlob` 是新手写的正则
 *  路由——二轮自审点名"globAbsent 分支完全未被行使"）。 */
const naLivenessGlob = () => (dir) => {
  writeFileSync(join(dir, 'docs', 'architecture.zh.md'), '# 双语配对探针\n');
};

/** na 活性注入（能力面声明缺失形态）：把某条**能力行**的 reReviewOn 删掉且不给 liveness
 *  → 门禁须报"两者皆无"红。锁的是 2026-10-08 二轮修正后的诚实分层：能力面缺席不得靠
 *  猜路径冒充机械覆盖（对抗自审实证：造 `src/lib/session-v5.ts` 时首版门禁照旧全绿）。 */
const naCapabilityUndefended = () => (dir) => {
  const p = join(dir, 'docs', 'alignment-ledger.json');
  const ledger = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of ledger.sources) {
    if (s.verdict === 'na' && s.source === 'docs/session-format-status.md') {
      delete s.liveness;
      delete s.reReviewOn;
    }
  }
  writeFileSync(p, `${JSON.stringify(ledger, null, 2)}\n`);
};

/** na 活性注入（缺字段形态）：删掉某条 na 的 liveness → 门禁须报"必须给 liveness"。
 *  防"新增 na 行时忘记登记缺席断言"重新变成永久免检区。 */
const naLivenessMissing = () => (dir) => {
  const p = join(dir, 'docs', 'alignment-ledger.json');
  const ledger = JSON.parse(readFileSync(p, 'utf8'));
  for (const s of ledger.sources) {
    if (s.verdict === 'na' && s.source === 'website/AGENTS.md') delete s.liveness;
  }
  writeFileSync(p, `${JSON.stringify(ledger, null, 2)}\n`);
};

/** discipline-map 人读表「不适用」行的免检区注入（缺重估触发形态）：把某行状态列还原成
 *  只写理由、不写触发条件的裸形态 → 门禁须报"没写什么情况下来重估"。
 *  防"新增 na 行时忘记给失效条件"重新变成永久免检区（该规则写在 discipline-map §维护规则，
 *  原先由 align-ledger 名义上复核，实际它只读 JSON 从不读人读表——2026-10-19 实证）。 */
const naTriggerMissing = () => (dir) => {
  const p = join(dir, 'docs', 'discipline-map.md');
  const lines = readFileSync(p, 'utf8').split('\n');
  const out = lines.map((line) => {
    if (!line.startsWith('| 站点投影：')) return line;
    return line.replace(/\| 不适用（[^|]*\|$/, '| 不适用（无对外文档站） |');
  });
  writeFileSync(p, out.join('\n'));
};

/** 防空语料注入：把全部 na 行的「不适用」改成 N/A → 门禁解析到 0 条，须报下限守卫而非静默绿。
 *  防"表格改版/正则失效使门禁静默变空集"（空门禁等于不存在）。 */
const naRowsVanished = () => (dir) => {
  const p = join(dir, 'docs', 'discipline-map.md');
  const out = readFileSync(p, 'utf8').split('\n').map((line) => {
    const cols = line.split('|');
    if (cols.length > 4 && /不适用/.test(cols[3])) cols[3] = cols[3].replace(/不适用/g, 'N/A');
    return cols.join('|');
  });
  writeFileSync(p, out.join('\n'));
};

/** 三态值域越界注入：把一行状态列改成闭集外的「已具备」→ discipline-state-vocab 须点名报红。 */
const stateVocabOutOfDomain = () => (dir) => {
  const p = join(dir, 'docs', 'discipline-map.md');
  const lines = readFileSync(p, 'utf8').split(String.fromCharCode(10));
  const out = lines.map((line) => {
    if (!line.startsWith('| 证据匹配面')) return line;
    return line.replace(/\| 照搬（[\s\S]*?\|$/, '| 已具备（增量 = 常驻化） |');
  });
  writeFileSync(p, out.join(String.fromCharCode(10)));
};

/** 防空语料注入：把绝大多数状态行的状态列**清空** → 门禁能解析的状态行骤降到下限以下，
 *  须报「解析失效或整表被改窄」的下限守卫，而不是静默变绿。
 *
 *  为什么不用"改表头"注入（2026-10-19 首版，已废弃）：只改一部分表头时门禁仍解析到足够
 *  行数，守卫不触发；全改表头时**两条守卫同时成立**，禁掉任一条案例照样红——案例分不清
 *  是哪条守卫在起作用，等于空转（实测：注释掉 tablesWithState 守卫后案例仍绿）。
 *  清空状态列只触发下限守卫一条，归因唯一。
 *  注意清空 ≠ 写成合法值：写「照搬」会保持行数与合法性，案例同样空转（本函数第二版踩过）。 */
const stateRowsVanished = () => (dir) => {
  const p = join(dir, 'docs', 'discipline-map.md');
  const lines = readFileSync(p, 'utf8').split(String.fromCharCode(10));
  const out = [...lines];
  const KEEP_FROM = 12; // 只保留前 12 行状态列，其余清空 → 远低于下限 60
  let seen = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const isHeader = /^\|/.test(lines[i]) && /^\|[\s\-:|]+\|$/.test(lines[i + 1]);
    if (!isHeader) continue;
    const headCols = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    const idx = headCols.findIndex((c) => c.includes('状态'));
    if (idx === -1) continue;
    for (let j = i + 2; j < lines.length && /^\|/.test(lines[j]); j++) {
      seen++;
      if (seen <= KEEP_FROM) continue;
      const cells = out[j].split('|');
      // split('|') 后 cells[0] 是空串，表头第 idx 列对应 cells[idx + 1]
      if (cells.length > idx + 1) cells[idx + 1] = ' ';
      out[j] = cells.join('|');
    }
  }
  writeFileSync(p, out.join(String.fromCharCode(10)));
};

const linkUntrackedTarget = () => (dir) => {
  // 目标在盘上存在但未被 git 跟踪（BUG-016 形态：tracked md 链接运行区文件——git 绿依赖机器
  // 状态而非仓库状态）。探针必须放在 .gitignore 真覆盖的路径（runtime/smoke-workspace/*）——
  // 驱动壳 mutate 后统一 git add -A，runtime/ 根不受 ignore、会被收进 tracked 集（2026-10-09
  // layering 二代统一 add 时实测咬出；ignored 文件 add -A 天然不入，案例恒 untracked）。
  mkdirSync(join(dir, 'runtime', 'smoke-workspace'), { recursive: true });
  writeFileSync(join(dir, 'runtime', 'smoke-workspace', 'orphan-probe.md'), '# 孤儿目标\n');
  appendFileSync(join(dir, 'README.md'), '\n[孤儿探针](runtime/smoke-workspace/orphan-probe.md)\n');
};

/** 承重门禁抽样（增删同 diff：本表 + tests/contracts/verify-gates.test.mjs 无需改——它动态对账本表）。
 *  id = 案例唯一标识（同一门禁可有多个注入形态，id 防重复条目）；gate = 期望点名的门禁；
 *  mutate(dir) = 在 fixture 内注入该门禁负责拦的回归（纯 fs——git add 由驱动壳统一执行）。
 *  expect（可选）= 断言红**必须含此子串**；用于"该门禁在副本基线本就非 PASS"的场景——
 *  此时只查 `FAIL  <gate>` 会因**别的**报因而假绿（断言空转）。凡 gate 在对照组非 PASS 者
 *  必须给 expect（主流程会强制检查这一点）。 */
/** 未登记模块注入（cockpit-doc-registry）：丢一个 pack 模块进 src/lib/，不改构成正本。 */
const dropUnregisteredModule = (dirRel, basename = 'probe-unregistered-module.ts') => (dir) => {
  const target = join(dir, dirRel, basename);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, 'export const probeUnregistered = 0\n');
};

/** 嵌套 client 源码中的 keyed 字面量（client-keys）：新增内部目录后仍须走 keys.ts 单一正本。 */
const addNestedClientKey = (subdir = 'research-status') => (dir) => {
  const target = join(dir, 'packages/deep-research-pack/src/client', subdir, 'probe-key.ts');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, "export const probe = 'sidebar.right.pane.tab'\n");
};

/** .ts 符号链接本身是 client 源码入口，仍需按链接路径登记并检查目标内容。 */
const addSymlinkClientKey = () => (dir) => {
  const source = join(dir, 'packages/deep-research-pack/src/probe-key-target.ts');
  const link = join(dir, 'packages/deep-research-pack/src/client/research-status/probe-key-link.ts');
  mkdirSync(dirname(source), { recursive: true });
  mkdirSync(dirname(link), { recursive: true });
  writeFileSync(source, "export const probe = 'sidebar.right.pane.tab'\n");
  symlinkSync(relative(dirname(link), source), link);
};

/** 被忽略的 node_modules 与指向外部目录的符号链接不属于 client 模块扫描面。 */
const addIgnoredClientPaths = () => (dir) => {
  const ignored = join(dir, 'packages/deep-research-pack/src/client/node_modules/probe.ts');
  const targetDir = join(dir, 'packages/deep-research-pack/src/external-client-probe');
  const linkDir = join(dir, 'packages/deep-research-pack/src/client/external-probe');
  mkdirSync(dirname(ignored), { recursive: true });
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(ignored, "export const probe = 'sidebar.right.pane.tab'\n");
  writeFileSync(join(targetDir, 'probe.ts'), "export const probe = 'sidebar.right.pane.tab'\n");
  symlinkSync(relative(dirname(linkDir), targetDir), linkDir, 'dir');
};

export const CASES = [
  { id: 'md-links-dead', gate: 'md-links', mutate: appendTo('README.md', '\n[死链探针](./definitely-missing-file.md)\n') },
  { id: 'md-links-untracked', gate: 'md-links', mutate: linkUntrackedTarget() },
  { id: 'md-anchors-missing', gate: 'md-anchors', mutate: appendTo('README.md', '\n[坏锚探针](AGENTS.md#这个锚点肯定不存在xyz)\n') },
  // 非 ASCII 路径形态（2026-10-21 卫生轮补宽）：md-utf8-newline / md-anchors 的 ls-files 原无
  // core.quotepath=false——非 ASCII tracked 路径（_dist/安装手册.md）被引号转义后 existsSync
  // miss → 稀疏态 continue 静默跳过 = md-links 已修过的同款漏扫（BUG-016 家族）。案例先红实录：
  // 注入违反到非 ASCII 路径，旧实现下两门禁不点名（案例红）→ 补 quotepath → 点名报红（案例绿）。
  { id: 'md-utf8-newline-nonascii-path', gate: 'md-utf8-newline', mutate: (dir) => {
    const p = join(dir, '_dist', '安装手册.md');
    if (!existsSync(p)) throw new Error('夹具缺 _dist/安装手册.md（非 ASCII tracked 路径样本）——案例失效');
    const t = readFileSync(p, 'utf8');
    if (!t.endsWith('\n')) throw new Error('样本本就无尾换行——注入形态失效（先修样本再挂案例）');
    writeFileSync(p, t.replace(/\n$/, ''));
  } },
  { id: 'md-anchors-nonascii-path', gate: 'md-anchors', mutate: appendTo(join('_dist', '安装手册.md'), '\n[坏锚探针](../README.md#这个锚点肯定不存在xyz)\n') },
  // ── 2026-10-21 卫生轮后续：补齐结构性可注入、此前只有一次性 Note 红证的门禁。
  //    不在本表收录的 4 道（vendor-pin / vendor-clean / pin-agreement / hooks-active）
  //    断言对象 = submodule 或本机 git config 的真实状态，副本不可造——名单与理由正本 =
  //    本文件 NO_CASE_GATES；覆盖率不在此记数（反向对账 = verify-gates.test）。
  //    本组全部为"注入后目标门禁必须点名报红"；对照组证明零注入时这些门禁在副本内 PASS。──
  { id: 'pack-contract-sync-runs-path', gate: 'pack-contract-sync', mutate: appendTo(join('packages', 'deep-research-pack', 'README.md'), '\n旧契约探针：runs/<slug>/\n') },
  { id: 'client-effect-wrap-bare-register', gate: 'client-effect-wrap', mutate: appendTo(join('packages', 'deep-research-pack', 'src', 'client', 'index.ts'), '\nsidebarRightTabs.register(\'probe-tab\', {})\n') },
  { id: 'note-status-readme-missing', gate: 'note-status', mutate: (dir) => rmSync(join(dir, 'notes', 'implemented', 'README.md')) },
  { id: 'note-graduation-plan-heading', gate: 'note-graduation-rewrite', mutate: (dir) => {
    const d = join(dir, 'notes', 'implemented');
    const target = readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()
      .find((f) => !readFileSync(join(d, f), 'utf8').includes('<!-- grandfather:'));
    if (!target) throw new Error('找不到非 grandfather 的 implemented Note——案例失效');
    appendFileSync(join(d, target), '\n## 验收\n');
  } },
  { id: 'dev-skill-format-name-mismatch', gate: 'dev-skill-format', mutate: (dir) => {
    const p = join(dir, '.agents', 'skills', 'writing-a-gate', 'SKILL.md');
    const t = readFileSync(p, 'utf8');
    if (!/^name:\s*writing-a-gate\s*$/m.test(t)) throw new Error('夹具 SKILL.md frontmatter 形态变了——案例失效');
    writeFileSync(p, t.replace(/^name:\s*writing-a-gate\s*$/m, 'name: writing-a-gate-probe'));
  } },
  // 自咬防护（本文件自身在 live 扫描面内）：连续字面量会让本门禁在真仓/对照组就红——
  // 路径段运行时拼接，源码里不出现门禁正则要匹配的完整形态。
  { id: 'proposed-pointer-dangling', gate: 'proposed-pointer-live', mutate: (() => {
    const probe = ['notes', 'proposed', '2099-01-01-probe.md'].join('/');
    return (dir) => appendFileSync(join(dir, 'README.md'), `\n指向 \`${probe}\` 的探针\n`);
  })() },
  { id: 'vendor-links-registry-version', gate: 'vendor-links', mutate: (dir) => {
    const lockPath = join(dir, 'pnpm-lock.yaml');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const dep = Object.keys(pkg.devDependencies ?? {}).find((d) => d.startsWith('@deepseek-ai/'));
    if (!dep) throw new Error('夹具 package.json 无 @deepseek-ai devDependency——案例失效');
    const lines = readFileSync(lockPath, 'utf8').split('\n');
    const i = lines.findIndex((l) => l.trim() === `'${dep}':`);
    if (i === -1) throw new Error('夹具 lockfile 无该依赖条目——案例失效');
    const j = lines.findIndex((l, k) => k >= i && k < i + 5 && /version:\s*link:vendor\/dsh\//.test(l));
    if (j === -1) throw new Error('夹具该依赖未解析为 link:vendor/dsh/——案例失效');
    lines[j] = lines[j].replace(/version:\s*link:vendor\/dsh\/\S+/, 'version: 1999.0.0');
    writeFileSync(lockPath, lines.join('\n'));
  } },
  { id: 'workspace-contract-template-missing', gate: 'workspace-contract', mutate: (dir) => rmSync(join(dir, 'research-workspace', 'templates', 'run', 'question.md')) },
  { id: 'workspace-contract-run-template-missing', gate: 'workspace-contract', mutate: (dir) => rmSync(join(dir, 'research-workspace', 'templates', 'run', 'run.md')) },
  { id: 'release-version-drift', gate: 'release-version', mutate: (dir) => {
    const p = join(dir, 'packages', 'deep-research-pack', 'package.json');
    const pkg = JSON.parse(readFileSync(p, 'utf8'));
    pkg.version = '9.9.9';
    writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
  } },
  { id: 'dist-manual-version-drift', gate: 'dist-manual-version', mutate: (dir) => {
    const p = join(dir, '_dist', '安装手册.md');
    const t = readFileSync(p, 'utf8');
    if (!/\|\s*版本\s*\|\s*\S+\s*\|/.test(t)) throw new Error('夹具手册无版本行——案例失效');
    writeFileSync(p, t.replace(/(\|\s*版本\s*\|\s*)\S+(\s*\|)/, (m, a, b) => `${a}9.9.9${b}`));
  } },
  { id: 'claude-symlink-regular-file', gate: 'claude-symlink', mutate: (dir) => {
    const p = join(dir, 'CLAUDE.md');
    if (!lstatSync(p).isSymbolicLink()) throw new Error('夹具 CLAUDE.md 非 symlink——案例失效');
    rmSync(p);
    writeFileSync(p, '# probe\n');
  } },
  { id: 'secrets-untracked-log-leak', gate: 'secrets-untracked', mutate: (dir) => {
    // 敏感后缀全部被 .gitignore 接管——先解除忽略再落盘，否则驱动壳的 git add -A 收不进 index
    appendFileSync(join(dir, '.gitignore'), '\n!probe-leak.log\n');
    writeFileSync(join(dir, 'probe-leak.log'), 'probe\n');
  } },
  { id: 'secrets-untracked-tmp-dir-leak', gate: 'secrets-untracked', mutate: (dir) => {
    // 历史事故形态：tests/.tmp-evidence-audit 曾被 git add -A 收进 index。先解除新加的 .tmp*/ 忽略。
    mkdirSync(join(dir, 'tests', '.tmp-probe'), { recursive: true });
    appendFileSync(join(dir, '.gitignore'), '\n!tests/.tmp-probe/\n!tests/.tmp-probe/probe.txt\n');
    writeFileSync(join(dir, 'tests', '.tmp-probe', 'probe.txt'), 'probe\n');
  } },
  { id: 'secrets-untracked-underscore-tmp-leak', gate: 'secrets-untracked', mutate: (dir) => {
    // 测试临时区 `_tmp/` 的已跟踪形态（与 .tmp* 同族，门禁两个模式各一案例）
    mkdirSync(join(dir, 'tests', '_tmp'), { recursive: true });
    appendFileSync(join(dir, '.gitignore'), '\n!tests/_tmp/\n!tests/_tmp/probe.txt\n');
    writeFileSync(join(dir, 'tests', '_tmp', 'probe.txt'), 'probe\n');
  } },
  { id: 'secrets-untracked-pack-lib-leak', gate: 'secrets-untracked', mutate: (dir) => {
    // 构建中间产物强制入库（git add -f 的等价注入）：先解除 packages/deep-research-pack/lib/ 忽略。
    mkdirSync(join(dir, 'packages', 'deep-research-pack', 'lib'), { recursive: true });
    appendFileSync(join(dir, '.gitignore'), '\n!packages/deep-research-pack/lib/\n!packages/deep-research-pack/lib/probe.js\n');
    writeFileSync(join(dir, 'packages', 'deep-research-pack', 'lib', 'probe.js'), 'module.exports = {}\n');
  } },
  { id: 'secrets-untracked-editor-state-leak', gate: 'secrets-untracked', mutate: (dir) => {
    // 编辑器/本机态强制入库（.cursor/ 是代表形态；其余同族模式由 .gitignore + 门禁共同覆盖）
    mkdirSync(join(dir, '.cursor'), { recursive: true });
    appendFileSync(join(dir, '.gitignore'), '\n!.cursor/\n!.cursor/probe\n');
    writeFileSync(join(dir, '.cursor', 'probe'), 'probe\n');
  } },
  { id: 'host-paths-home-leak', gate: 'host-paths', mutate: (dir) => {
    // live 文档注入本机绝对 home 路径——跨环境不可解析，必须红。
    // 路径拼接而非字面量：本文件也在 host-paths 的 live 扫描面内，字面量会让门禁自咬。
    const hostPath = ['', 'Users', 'probe', 'private'].join('/');
    writeFileSync(join(dir, 'docs', 'probe-host-path.md'), `# probe\n\n本机路径：${hostPath}\n`);
  } },
  // 自咬防护：端口号从被撞文件现取（本文件处于 port-exclusive 扫描面，且不得写 'port = 数字' 形态）
  { id: 'port-exclusive-double-claim', gate: 'port-exclusive', mutate: (dir) => {
    const src = readFileSync(join(dir, 'scripts', 'smoke', 'l4-lite-smoke.mjs'), 'utf8');
    const m = /'port',\s*'(\d{4,5})'/.exec(src);
    if (!m) throw new Error('夹具 l4-lite-smoke 的端口声明形态变了——案例失效');
    appendFileSync(join(dir, 'scripts', 'lib', 'roles.mjs'), `\nconst PORT = ${m[1]};\n`);
  } },
  // archived-note-pointer（归档判定复核面）双形态：①活面加未登记的→archived 链接（归档
  // 前必须解除引用或登记）；②登记条目目标改不存在路径（失存——Note 移位/复活须同步登记簿）。
  { id: 'archived-pointer-unregistered', gate: 'archived-note-pointer', mutate: appendTo('README.md', '\n[归档指针探针](notes/archived/2026-09-24-ui-observability-surfaces.md)\n') },
  { id: 'archived-pointer-stale-entry', gate: 'archived-note-pointer', mutate: (dir) => {
    const p = join(dir, 'scripts', 'archived-note-pointers.json');
    const book = JSON.parse(readFileSync(p, 'utf8'));
    // 按 (source, target) 定位而非下标——首条目将来被清掉/移位时案例语义不漂（对抗自审 S4）
    const entry = book.pointers.find((e) => e.source === 'docs/decisions.md'
      && e.target === 'notes/archived/2026-09-24-ui-observability-surfaces.md');
    if (!entry) throw new Error('登记簿找不到定位条目（00-index → ui-observability-surfaces）——案例失效');
    entry.target = 'notes/archived/2099-01-01-nonexistent-probe.md';
    writeFileSync(p, `${JSON.stringify(book, null, 2)}\n`);
  } },
  { id: 'note-format-no-status', gate: 'note-format', mutate: stripFirstStatusLine(join('notes', 'implemented')) },
  { id: 'note-format-no-verification', gate: 'note-format', mutate: stripVerificationSection(join('notes', 'implemented')) },
  { id: 'note-format-negated-verification', gate: 'note-format', mutate: negateVerificationSection(join('notes', 'implemented')) },
  { id: 'entry-chain-member-missing', gate: 'entry-chain', mutate: (dir) => {
    rmSync(join(dir, 'docs', 'design', '60-intent-carriers.md'));
  } },
  { id: 'entry-chain-no-title', gate: 'entry-chain', mutate: (dir) => {
    const p = join(dir, 'AGENTS.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/^## 入口链.*$/m, '## 探针替代标题'));
  } },
  { id: 'backlog-issue-no-frontmatter', gate: 'backlog-liveness', mutate: backlogIssue(() => '# Probe\n> 状态：推敲中｜可关闭：否\n') },
  { id: 'backlog-issue-closeable', gate: 'backlog-liveness', mutate: backlogIssue((text) => text.replace('可关闭：否', '可关闭：是')) },
  { id: 'backlog-issue-orphan', gate: 'backlog-liveness', mutate: backlogIssue((text) => text, false) },
  { id: 'backlog-bug-severity', gate: 'backlog-liveness', mutate: (dir) => fixtureFile(dir, '_backlog/bugs/BUG-999-probe.md', '---\nstatus: 排查中\nseverity: P3\nopened: 2099-01-01\n---\n\n# Probe\n> 严重级别：P3｜发现：2099-01-01｜状态：排查中\n') },
  // 生命周期互查案例（loop_advisor 借鉴 2026-10-12）：issues 结论倾向闭集头 / 状态行镜像漂移 /
  // bugs 枚举越界 / bugs 镜像漂移——四形态各一条，注入均须被 backlog-liveness 点名报红。
  { id: 'backlog-issue-graduation-open', gate: 'backlog-liveness', mutate: backlogIssue((text) => text.replace('结论倾向：未定', '结论倾向：尽快给个说法')) },
  { id: 'backlog-issue-mirror-drift', gate: 'backlog-liveness', mutate: backlogIssue((text) => text.replace('> 状态：推敲中｜', '> 状态：等人拍板｜')) },
  { id: 'backlog-bug-enum-invalid', gate: 'backlog-liveness', mutate: (dir) => fixtureFile(dir, '_backlog/bugs/BUG-998-probe.md', '---\nstatus: 修复中\nseverity: P1\nopened: 2099-01-01\n---\n\n# Probe\n> 严重级别：P1｜发现：2099-01-01｜状态：修复中\n') },
  // 活跃索引幽灵 / 归档退出值（2026-10-20 P0-3 扩）：两形态各一条。
  // `_` 前缀真实路径也受 doc-budgets（2026-10-20 P1）：给 `_backlog/AGENTS.md` 追加超预算行。
  { id: 'doc-budgets-underscore-file', gate: 'doc-budgets', mutate: (dir) => {
    const p = join(dir, '_backlog', 'AGENTS.md');
    writeFileSync(p, readFileSync(p, 'utf8') + '\n'.repeat(60));
  } },
  { id: 'backlog-active-index-ghost', gate: 'backlog-liveness', mutate: (dir) => {
    const p = join(dir, '_backlog', 'issues', 'README.md');
    const text = readFileSync(p, 'utf8');
    writeFileSync(p, text.replace(/^## 活跃清单\n/m, '## 活跃清单\n\n| [幽灵](../_archived/settled_issues/2026-10-18-research-method-config-ux.md) | 已归档 |\n'));
  } },
  { id: 'backlog-archived-closeable-no', gate: 'backlog-liveness', mutate: (dir) => {
    const p = join(dir, '_backlog', '_archived', 'settled_issues', '2026-10-18-research-method-config-ux.md');
    const text = readFileSync(p, 'utf8');
    writeFileSync(p, text.replace('可关闭：是', '可关闭：否'));
  } },
  { id: 'backlog-bug-mirror-drift', gate: 'backlog-liveness', mutate: (dir) => fixtureFile(dir, '_backlog/bugs/BUG-997-probe.md', '---\nstatus: 排查中\nseverity: P1\nopened: 2099-01-01\n---\n\n# Probe\n> 严重级别：P1｜发现：2099-01-01｜状态：修复就绪\n') },
  { id: 'backlog-research-status', gate: 'backlog-liveness', mutate: (dir) => fixtureFile(dir, '_backlog/research/2099-01-01-probe.md', '---\ntopic: Probe\nintent: "Evidence"\nstatus: 活跃\n---\n\n# Probe\n') },
  { id: 'backlog-method-no-trigger', gate: 'backlog-liveness', mutate: (dir) => {
    const path = join(dir, '_backlog/methods/issue-to-note.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace(/^whenToUse:.*\n/m, ''));
  } },
  { id: 'gate-ledger-sync-row', gate: 'gate-ledger-sync', mutate: removeLedgerRow('dist-manual-version') },
  // handbook-budget 事故形态：四 preset 同降过限（手册字节 + 余量 > maxBytes）——company
  // 同构面出过真实事故（手册 17.4KB 超预算后注入静默截断，2026-10-09 钉版复核吸收）。
  { id: 'handbook-budget-truncated', gate: 'handbook-budget', mutate: (dir) => {
    for (const f of readdirSync(join(dir, 'packages/deep-research-pack/presets'))) {
      if (!f.endsWith('.patch.yml')) continue;
      const p = join(dir, 'packages/deep-research-pack/presets', f);
      // 不钉字面值：预算将来升到任何值，本注入都把四 preset 一致压到 8000（< 手册字节 + 余量）
      writeFileSync(p, readFileSync(p, 'utf8').replace(/maxBytes: \d+/g, 'maxBytes: 8000'));
    }
  } },
  { id: 'handbook-budget-mismatch', gate: 'handbook-budget', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/presets/lead.patch.yml');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/maxBytes: \d+/, 'maxBytes: 8192'));
  } },
  // S1 事故形态（对抗自审抓获）：单个 preset 丢 maxBytes 行——摊平收集会静默放行，逐文件收集必须红
  { id: 'handbook-budget-bare-preset', gate: 'handbook-budget', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/presets/lead.patch.yml');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/\n\s*maxBytes: \d+/, ''));
  } },
  // client-half 双方向（release-smoke-hardening 件⑤a）：exports ./client 与 dsh.client 声明
  // 任一脱钩都是静默失效（company postmortem 0002：vendor 门禁只 glob 树内包，仓外 pack 射程外）。
  { id: 'client-half-no-export', gate: 'client-half', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"./client": {', '"./client-probe": {'));
  } },
  { id: 'client-half-no-decl', gate: 'client-half', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"client": {', '"client-probe": {'));
  } },
  // pack-bundle-compat 含当前 tag（件⑤b）：升 pin 忘把新 tag 加进兼容矩阵——判据前移到 L0，
  // 别等 L2 安装冒烟才现形。探针值避开 `dsh-v<数字>` 形态（pin-agreement 会把形似 tag 的
  // 字面量当钉复述对账——探针不是钉声明）。
  { id: 'pack-bundle-compat-tag-missing', gate: 'pack-bundle-compat', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"0.2.1-rc.2"', '"0.9.9"'));
  } },
  // 宿主只认 engines.dsh；范围必须覆盖当前 vendor tag。删掉 engines.dsh = 退回 peer 语义。
  { id: 'pack-bundle-compat-engines-drift', gate: 'pack-bundle-compat', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/package.json');
    const j = JSON.parse(readFileSync(p, 'utf8'));
    delete j.engines.dsh;
    writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  } },
  // guard-red-record（tests 面反证义务机械化）：标题声明无留证 / 悬空编号双形态。
  { id: 'guard-red-record-no-record', gate: 'guard-red-record', mutate: (dir) => {
    const p = join(dir, 'tests', 'run', 'local-date.test.mjs');
    appendFileSync(p, "\ntest('探针：声称守卫 BUG-004 但本文件无留证', () => {});\n");
  } },
  { id: 'guard-red-record-dangling', gate: 'guard-red-record', mutate: (dir) => {
    const p = join(dir, 'tests', 'run', 'local-date.test.mjs');
    appendFileSync(p, "\ntest('探针：悬空编号 BUG-999', () => {});\n");
  } },
  // align-ledger 在副本基线**非 PASS**（vendor/dsh 是 gitlink submodule，副本不拷其内容 →
  // "vendor 里不存在"是副本环境的固有报因）。故两案例必须带 expect 指名"na 活性"报因，
  // 否则注入未生效也会因既有的 vendor 报因看到 FAIL 而假绿。
  { id: 'align-ledger-na-liveness-appears', gate: 'align-ledger', mutate: naLivenessAppears(),
    expect: 'na 理由已失效——"website" 现在存在' },
  { id: 'align-ledger-na-liveness-decorative', gate: 'align-ledger', mutate: naLivenessDecorative(),
    expect: 'liveness 断言空转' },
  { id: 'align-ledger-na-liveness-glob', gate: 'align-ledger', mutate: naLivenessGlob(),
    expect: 'glob "docs/**/*.zh.md" 命中 docs/architecture.zh.md' },
  { id: 'align-ledger-na-capability-undefended', gate: 'align-ledger', mutate: naCapabilityUndefended(),
    expect: 'docs/session-format-status.md: verdict=na 必须给 liveness' },
  { id: 'align-ledger-na-liveness-missing', gate: 'align-ledger', mutate: naLivenessMissing(),
    expect: 'website/AGENTS.md: verdict=na 必须给 liveness' },
  // 本门禁在零注入副本基线 PASS（只读 docs/discipline-map.md，副本里是实拷贝），按驱动壳
  // 约定「基线 PASS 则不给 expect」——注入报因的精确性由真实仓反证记录背书
  // （evaluation.md §L0 登记表该行），此处只断言"被点名报红"。
  { id: 'discipline-na-trigger-missing', gate: 'discipline-na-trigger', mutate: naTriggerMissing() },
  { id: 'discipline-na-trigger-rows-vanished', gate: 'discipline-na-trigger', mutate: naRowsVanished() },
  { id: 'discipline-state-vocab-out-of-domain', gate: 'discipline-state-vocab', mutate: stateVocabOutOfDomain() },
  { id: 'discipline-state-vocab-rows-vanished', gate: 'discipline-state-vocab', mutate: stateRowsVanished() },
  // 未登记模块注入（cockpit-doc-registry）：往 pack 的 src/lib/ 丢一个新模块、不动构成正本
  // ——模拟"模块上了盘、正本没跟上"（2026-10-11 实测形态：brief-fold / review-readiness 上线
  // 后正本仍写「七区」「六件」）。git add 由驱动壳统一执行，故 tracked 面能看见它。
  { id: 'cockpit-doc-registry-unregistered-module', gate: 'cockpit-doc-registry', mutate: dropUnregisteredModule('packages/deep-research-pack/src/lib') },
  { id: 'cockpit-doc-registry-unregistered-nested-client-module', gate: 'cockpit-doc-registry', mutate: dropUnregisteredModule('packages/deep-research-pack/src/client/research-status') },
  { id: 'cockpit-doc-registry-duplicate-basename', gate: 'cockpit-doc-registry', mutate: dropUnregisteredModule('packages/deep-research-pack/src/client/other-status', 'types.ts') },
  { id: 'cockpit-doc-registry-unregistered-nested-lib-module', gate: 'cockpit-doc-registry', mutate: dropUnregisteredModule('packages/deep-research-pack/src/lib/nested') },
  { id: 'cockpit-doc-registry-unregistered-spaced-module', gate: 'cockpit-doc-registry', mutate: dropUnregisteredModule('packages/deep-research-pack/src/client/research status') },
  { id: 'cockpit-doc-registry-symlink-client-module', gate: 'cockpit-doc-registry', mutate: addSymlinkClientKey() },
  { id: 'client-keys-nested-client-key-literal', gate: 'client-keys', mutate: addNestedClientKey() },
  { id: 'client-keys-nested-spaced-client-key', gate: 'client-keys', mutate: addNestedClientKey('research status') },
  { id: 'client-keys-symlink-module-key-literal', gate: 'client-keys', mutate: addSymlinkClientKey() },

  // ── 2026-10-21 卫生轮 B4 补员：老门禁常驻反证。背景：verify 门禁总量中仅少部分有常驻
  //    案例（一次性 Note 红证不防 verify 重构致钝化）；本批优先补「mutate 便宜 × 判据复杂」
  //    的文本门禁。不适合副本注入的四道（vendor-pin / vendor-clean / pin-agreement /
  //    hooks-active——断言对象 = submodule 真实状态或本机 git config，fixture 副本天然不可达）
  //    在 docs/evaluation.md §L0 各行的反证指针列登记理由，本表不收。──
  // count-free：向 live 文档注入硬计数行（数字 + 四计数名词之一）。源码里数字经运算拼出——
  // count-free 的扫描面包含本文件，写死「数字+名词」字面会咬到真仓的这张表自己。
  { id: 'count-free-hard-count', gate: 'count-free', mutate: (dir) => {
      appendFileSync(join(dir, 'scripts', 'README.md'), `\n探针行：本仓现共有 ${21 + 22} 门禁，计数正本 = verify 的 gates 数组。\n`);
    } },
  // doc-now-only：向 live 文档注入变更史措辞（禁词写在 .mjs 源码里合法——该门禁只扫 *.md）。
  { id: 'doc-now-only-changelog-word', gate: 'doc-now-only', mutate: (dir) => {
      appendFileSync(join(dir, 'scripts', 'README.md'), '\n> 历史注记：早期版本的问题单已销账，此处仅存档。\n');
    } },
  // role-list-sync：往单一事实源访问器自身注入角色清单字面量（门禁守的正是「清单只住盘上
  // presets/」被破坏的形态）。角色名从盘上 presets/ 现取（与门禁检测同源），本表源码零角色
  // 名字面量——字面写死会先咬到真仓的这张表。
  { id: 'role-list-sync-roster-literal', gate: 'role-list-sync', mutate: (dir) => {
      const roles = readdirSync(join(dir, 'packages', 'deep-research-pack', 'presets'))
        .filter((f) => f.endsWith('.patch.yml')).map((f) => f.replace(/\.patch\.yml$/, '')).sort();
      if (roles.length < 3) throw new Error('presets/ 角色不足——注入前提失效');
      appendFileSync(join(dir, 'scripts', 'lib', 'roles.mjs'), `\nexport const probeRoster = [${roles.map((r) => `'${r}'`).join(', ')}]\n`);
    } },
  // preset-structure：删一个 config 字段行（order）——字段摊平收集会静默放行，逐字段检查必须红。
  // （该行在 preset patch 的 insert 正文内，同 clone 里 overlay-fresh 也会红——非目标报因不碍判。）
  { id: 'preset-structure-field-missing', gate: 'preset-structure', mutate: (dir) => {
      const p = join(dir, 'packages', 'deep-research-pack', 'presets', 'lead.patch.yml');
      writeFileSync(p, readFileSync(p, 'utf8').replace(/\n\s*order: \d+/, ''));
    } },
  // preset-structure：删整条 time-context 行——时钟是日期契约的原生来源（D32），缺席必须红。
  { id: 'preset-structure-clock-missing', gate: 'preset-structure', mutate: (dir) => {
      const p = join(dir, 'packages', 'deep-research-pack', 'presets', 'lead.patch.yml');
      writeFileSync(p, readFileSync(p, 'utf8').replace(/\n\s*- id: time-context\n\s*name: '@deepseek-ai\/dsh-time-context'/, ''));
    } },
  // row-deps：删一条 peerDependencies 行——preset 行引用的包失去声明（真实回归 = 新增行忘登记；
  // 挑 @deepseek-ai/dsh-agent-preset：所有 preset patch 行都引用它，一处删除即报）。
  { id: 'row-deps-peer-missing', gate: 'row-deps', mutate: (dir) => {
      const p = join(dir, 'packages', 'deep-research-pack', 'package.json');
      writeFileSync(p, readFileSync(p, 'utf8').replace(/.*"@deepseek-ai\/dsh-agent-preset": "[^"]*",\n/, ''));
    } },
  // overlay-fresh：改生成物一字节（registry 默认 preset 指向）——手改生成物 = 与渲染器漂移。
  { id: 'overlay-fresh-stale-byte', gate: 'overlay-fresh', mutate: (dir) => {
      const p = join(dir, 'dev', 'research.overlay.yml');
      writeFileSync(p, readFileSync(p, 'utf8').replace('default: lead', 'default: probe'));
    } },
  // pack-workspace-fresh：删一件种子（节点契约）——正本仍在、种子缺席即漂移。
  { id: 'pack-workspace-fresh-seed-missing', gate: 'pack-workspace-fresh', mutate: (dir) => {
      rmSync(join(dir, 'packages', 'deep-research-pack', 'workspace', 'NODES.md'));
    } },
  // repo-conventions：本门禁在副本基线**非 PASS**（fixture 无 vendor/dsh/package.json → engines
  // 对齐无证据源）——按驱动壳约定必须带 expect 指名注入报因（同 align-ledger 族），
  // 否则注入未生效也会被既有报因蒙混成绿。注入 = .editorconfig 丢 root 声明。
  { id: 'repo-conventions-editorconfig-root-missing', gate: 'repo-conventions', mutate: (dir) => {
      const p = join(dir, '.editorconfig');
      writeFileSync(p, readFileSync(p, 'utf8').replace('root = true', 'root = false'));
    },
    expect: '.editorconfig 缺 "root = true"' },

  // 工作区运行区拒收行被删（workspace-versioning）：种子丢掉 `drt_*/` 行——安装方一次
  // `git add -A` 就把整个 run 历史提交进他自己的库。正本同改保 pack-workspace-fresh 绿
  // （否则红的是新鲜度门禁，本案例会因别的报因假绿）。
  { id: 'workspace-versioning-run-area-denial-missing', gate: 'workspace-versioning', mutate: (dir) => {
    for (const rel of ['research-workspace/.gitignore.example', 'packages/deep-research-pack/workspace/.gitignore.example']) {
      const p = join(dir, rel);
      writeFileSync(p, readFileSync(p, 'utf8').replace(/^drt_\*\/\n/m, ''));
    }
  } },
  // 种子退化成裸 `*` 拒收全部（workspace-versioning）：它会把被跨目录引用的材料一起拒收——
  // 全新 clone 里 drafts 开发证据全丢，md-links 随之红（fixture 实测形态）。
  // 未交付停放位拒收行被删（workspace-versioning）：种子丢掉 `_abandoned/` 行——未交付
  // run 会被安装方一次 `git add -A` 提交进库；正本同改保 pack-workspace-fresh 绿。
  { id: 'workspace-versioning-abandoned-denial-missing', gate: 'workspace-versioning', mutate: (dir) => {
    for (const rel of ['research-workspace/.gitignore.example', 'packages/deep-research-pack/workspace/.gitignore.example']) {
      const p = join(dir, rel);
      writeFileSync(p, readFileSync(p, 'utf8').split('\n').filter((l) => l.trim() !== '_abandoned/').join('\n'));
    }
  } },
  { id: 'workspace-versioning-blanket-star', gate: 'workspace-versioning', mutate: (dir) => {
    for (const rel of ['research-workspace/.gitignore.example', 'packages/deep-research-pack/workspace/.gitignore.example']) {
      const p = join(dir, rel);
      writeFileSync(p, `*\n${readFileSync(p, 'utf8')}`);
    }
  } },
  // 种子清单缺 .gitignore 条目（workspace-versioning）：安装方的忽略规则不在清单里——
  // scaffold 不会铺，工作区一次 git add -A 会把 run 历史提交进用户库。
  { id: 'workspace-versioning-seed-gitignore-missing', gate: 'workspace-versioning', mutate: (dir) => {
    const p = join(dir, 'packages/deep-research-pack/workspace/seed.json');
    const j = JSON.parse(readFileSync(p, 'utf8'));
    delete j.files['.gitignore'];
    writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  } },
  // 开发证据白名单缺席（workspace-versioning）：删 drafts/.gitignore——drafts/ 重新变成
  // "探针稿与 dry-run 输出默认可被 git add"。
  { id: 'workspace-versioning-drafts-whitelist-missing', gate: 'workspace-versioning', mutate: (dir) => {
    rmSync(join(dir, 'research-workspace', 'drafts', '.gitignore'));
  } },
  // dev/ 运行态回流（dev-runtime-clean）：在源码驱动目录造一个误落位 run bundle——
  // .gitignore 能挡 git，挡不住 cp -r/打包；门禁直接看盘。
  { id: 'dev-runtime-clean-stray', gate: 'dev-runtime-clean', mutate: (dir) => {
    mkdirSync(join(dir, 'dev', 'harness-home', 'drt_probe'), { recursive: true });
    writeFileSync(join(dir, 'dev', 'harness-home', 'drt_probe', 'final.md'), '# probe\n');
  } },
  // 客户端三位置候选链（run-context-single-source）：页签重新手拼 archive/_abandoned
  // 发现规则 → 门禁点名红。正解 = openRun / bundleCandidates。
  { id: 'run-context-single-source-client-chain', gate: 'run-context-single-source', mutate: (dir) => {
    appendFileSync(join(dir, 'packages', 'deep-research-pack', 'src', 'client', 'ResearchStatusTab.tsx'),
      "\nconst __probe = ['drt_x', 'archive/drt_x', '_abandoned/drt_x'];\n");
  } },
];

// 无常驻注入案例的门禁（结构性不适）：断言对象 = submodule 或本机 git config 的真实状态，
// 副本里造不出来（副本没有该 submodule / 本就未设 hooksPath）。**正本在此**——覆盖率由代码
// 维护，散文只指这里；verify-gates.test 反向断言「gates 数组 − 案例覆盖 = 本清单」，
// 新增门禁不带案例、或案例退役后遗留覆盖缺口都会红（2026-10-27 卫生轮：此前账本写 39/43，
// 盘上实为 43/47，两个分母都不对，而只做单向对账无人拦）。
export const NO_CASE_GATES = [
  { gate: 'vendor-pin', reason: '断言对象 = submodule 钉身份（副本不含 submodule 内容，基线即红）' },
  { gate: 'vendor-clean', reason: '断言对象 = submodule 的 git status（副本无此仓库）' },
  { gate: 'pin-agreement', reason: '真串读取在 submodule 一步 fail-loud，注入的伪串永不到达扫描步' },
  { gate: 'hooks-active', reason: '断言对象 = 本机 git config core.hooksPath（副本 git init 后本就未设）' },
];

export const CONTROLS = [
  { id: 'backlog-active-issue', gate: 'backlog-liveness', mutate: backlogIssue() },
  // guard-red-record 双址正向：活跃 bugs/ 卡 + 带留证的标题声明 → 门禁照常 PASS
  //（活跃址解析；CONTROLS 断言目标门禁 PASS，其他门禁红不拦——活跃探针卡不满足
  //  全部门禁形状属预期）。
  { id: 'guard-red-record-active-bug', gate: 'guard-red-record', mutate: (dir) => {
    writeFileSync(join(dir, '_backlog', 'bugs', 'BUG-991-probe.md'),
      '---\nstatus: 排查中\nseverity: P2\nopened: 2099-01-01\n---\n\n# Probe\n> 严重级别：P2（次要）｜发现：2099-01-01｜状态：排查中\n');
    appendFileSync(join(dir, '_backlog', 'bugs', 'README.md'), '\n[BUG-991-probe](BUG-991-probe.md)\n');
    appendFileSync(join(dir, 'tests', 'run', 'local-date.test.mjs'),
      "\n// 负例留证 2099-01-01：BUG-991——探针负例正本 = 本行（改判据 → 红；还原 → 绿）。\ntest('探针：活跃卡声明 BUG-991', () => {});\n");
  } },
  { id: 'client-keys-ignore-node-modules-and-directory-symlink', gate: 'client-keys', mutate: addIgnoredClientPaths() },
  { id: 'cockpit-doc-registry-ignore-node-modules-and-directory-symlink', gate: 'cockpit-doc-registry', mutate: addIgnoredClientPaths() },
];
