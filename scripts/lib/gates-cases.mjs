// gates-cases.mjs — 门禁自测的注入案例表（纯 fs 注入手法 + CASES/CONTROLS 数据）。
// 从 scripts/smoke/gates-smoke.mjs 拆出（2026-10-09 layering 二代：tests/verify-gates.test.mjs
// 静态对账消费本表——驱动面（smoke 道，起子进程）不得被 tests import，案例表因此住 lib；
// 每 mutate 只做纯 fs 操作，git add 由驱动壳在 mutate 后统一执行，本模块零子进程）。
// 消费方：scripts/smoke/gates-smoke.mjs（真执行体）+ tests/verify-gates.test.mjs（静态对账）。
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

const linkUntrackedTarget = () => (dir) => {
  // 目标在盘上存在但未被 git 跟踪（BUG-016 形态：tracked md 链接运行区文件——git 绿依赖机器
  // 状态而非仓库状态）。探针必须放在 .gitignore 真覆盖的路径（runtime/smoke-workspace/*）——
  // 驱动壳 mutate 后统一 git add -A，runtime/ 根不受 ignore、会被收进 tracked 集（2026-10-09
  // layering 二代统一 add 时实测咬出；ignored 文件 add -A 天然不入，案例恒 untracked）。
  mkdirSync(join(dir, 'runtime', 'smoke-workspace'), { recursive: true });
  writeFileSync(join(dir, 'runtime', 'smoke-workspace', 'orphan-probe.md'), '# 孤儿目标\n');
  appendFileSync(join(dir, 'README.md'), '\n[孤儿探针](runtime/smoke-workspace/orphan-probe.md)\n');
};

/** 承重门禁抽样（增删同 diff：本表 + tests/verify-gates.test.mjs 无需改——它动态对账本表）。
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
  // archived-note-pointer（归档判定复核面）双形态：①活面加未登记的→archived 链接（归档
  // 前必须解除引用或登记）；②登记条目目标改不存在路径（失存——Note 移位/复活须同步登记簿）。
  { id: 'archived-pointer-unregistered', gate: 'archived-note-pointer', mutate: appendTo('README.md', '\n[归档指针探针](notes/archived/2026-09-24-ui-observability-surfaces.md)\n') },
  { id: 'archived-pointer-stale-entry', gate: 'archived-note-pointer', mutate: (dir) => {
    const p = join(dir, 'scripts', 'archived-note-pointers.json');
    const book = JSON.parse(readFileSync(p, 'utf8'));
    // 按 (source, target) 定位而非下标——首条目将来被清掉/移位时案例语义不漂（对抗自审 S4）
    const entry = book.pointers.find((e) => e.source === 'docs/00-index.md'
      && e.target === 'notes/archived/2026-09-24-ui-observability-surfaces.md');
    if (!entry) throw new Error('登记簿找不到定位条目（00-index → ui-observability-surfaces）——案例失效');
    entry.target = 'notes/archived/2099-01-01-nonexistent-probe.md';
    writeFileSync(p, `${JSON.stringify(book, null, 2)}\n`);
  } },
  { id: 'note-format-no-status', gate: 'note-format', mutate: stripFirstStatusLine(join('notes', 'implemented')) },
  { id: 'note-format-no-verification', gate: 'note-format', mutate: stripVerificationSection(join('notes', 'implemented')) },
  { id: 'note-format-negated-verification', gate: 'note-format', mutate: negateVerificationSection(join('notes', 'implemented')) },
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
    writeFileSync(p, readFileSync(p, 'utf8').replace('"dsh-v0.2.1-rc.2"', '"dsh-wrongtag"'));
  } },
  // guard-red-record（tests 面反证义务机械化）：标题声明无留证 / 悬空编号双形态。
  { id: 'guard-red-record-no-record', gate: 'guard-red-record', mutate: (dir) => {
    const p = join(dir, 'tests', 'local-date.test.mjs');
    appendFileSync(p, "\ntest('探针：声称守卫 BUG-004 但本文件无留证', () => {});\n");
  } },
  { id: 'guard-red-record-dangling', gate: 'guard-red-record', mutate: (dir) => {
    const p = join(dir, 'tests', 'local-date.test.mjs');
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
  { id: 'workspace-versioning-blanket-star', gate: 'workspace-versioning', mutate: (dir) => {
    for (const rel of ['research-workspace/.gitignore.example', 'packages/deep-research-pack/workspace/.gitignore.example']) {
      const p = join(dir, rel);
      writeFileSync(p, `*\n${readFileSync(p, 'utf8')}`);
    }
  } },
  // 开发证据白名单缺席（workspace-versioning）：删 drafts/.gitignore——drafts/ 重新变成
  // "探针稿与 dry-run 输出默认可被 git add"。
  { id: 'workspace-versioning-drafts-whitelist-missing', gate: 'workspace-versioning', mutate: (dir) => {
    rmSync(join(dir, 'research-workspace', 'drafts', '.gitignore'));
  } },
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
    appendFileSync(join(dir, 'tests', 'local-date.test.mjs'),
      "\n// 负例留证 2099-01-01：BUG-991——探针负例正本 = 本行（改判据 → 红；还原 → 绿）。\ntest('探针：活跃卡声明 BUG-991', () => {});\n");
  } },
  { id: 'client-keys-ignore-node-modules-and-directory-symlink', gate: 'client-keys', mutate: addIgnoredClientPaths() },
  { id: 'cockpit-doc-registry-ignore-node-modules-and-directory-symlink', gate: 'cockpit-doc-registry', mutate: addIgnoredClientPaths() },
];
