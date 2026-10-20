// backlog-liveness — 问题卡、缺陷、调研、方法与归档索引的结构合同（frontmatter 状态 / 结论倾向
// 闭集头 / 状态行镜像互查 / 池成员索引点名）。消费 = verify 门禁 backlog-liveness 与
// tests/backlog-liveness.test；规则正本 = _backlog/README（门禁只证结构，不证判断质量）。
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CARD_STATES = {
  issues: ['推敲中', '等人拍板'], bugs: ['排查中', '修复就绪', '修复落地', '等人拍板'],
  '_archived/settled_issues': ['已结'], '_archived/suspended_issues': ['叫停'],
  '_archived/fixed_bugs': ['已修'], '_archived/suspended_bugs': ['待修'],
};
const GRADUATION = ['未定', '现在做', '以后做', '不做', '并入已有'];
const SHELVES = [...Object.keys(CARD_STATES), 'research', '_archived/research', 'methods'];
const METHODS = ['requirements-elicitation', 'requirements-probes', 'requirements-synthesis',
  'validation-design', 'validation-evidence', 'validation-judgment', 'issue-to-note'];
const DATE_SLUG = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The local contract admits a flat mapping of one-line scalars, not arbitrary YAML documents.
function metadata(text) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (block === undefined) return { error: 'missing frontmatter' };
  const fields = new Map();
  for (const line of block.split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const m = /^([A-Za-z][\w-]*):[ \t]*(.*?)[ \t]*$/.exec(line);
    if (!m || fields.has(m[1]) || /^[|>{\[]/.test(m[2])) return { error: 'frontmatter must be a unique flat scalar mapping' };
    const value = m[2];
    if (/^["']/.test(value) && (value.length < 2 || value.at(-1) !== value[0])) return { error: 'unclosed scalar quote' };
    fields.set(m[1], value.replace(/^(["'])([\s\S]*)\1$/, '$2'));
  }
  return { fields };
}

// 状态行 = 卡头 12 行内首条 `> …状态：…` 引用行（加粗剥壳）；镜像记号 = 状态值取到空白/竖线/
// 括号为止并剥 🔒。生命周期互查（loop_advisor 借鉴，钉版见 docs/00-index §外部研究材料）：
// 活跃卡状态行记号必须等于 frontmatter status（frontmatter = 阶段唯一家，状态行 = 镜像 + 历史）；
// issues 另须带结论倾向闭集头。归档卡豁免——历史形态保留，退出值只查 CARD_STATES。
const statusLineOf = (text) => text.split('\n').slice(0, 12)
  .find((line) => /^>\s*.*状态[：:]/.test(line))?.replaceAll('**', '');
const phaseOf = (line) => /状态[：:]\s*([^\s｜|\n（(]*)/.exec(line)?.[1]?.replace(/🔒/g, '').trim();

/** Check current backlog structure over tracked files; empty active shelves are deliberately legal. */
export function backlogLivenessProblems(backlogRoot, trackedFiles) {
  if (!Array.isArray(trackedFiles)) throw new TypeError('backlog checker requires tracked files');
  const problems = [];
  const tracked = new Set(trackedFiles);
  const read = (rel) => readFileSync(join(backlogRoot, rel), 'utf8');
  const usable = (rel) => {
    const path = join(backlogRoot, rel);
    if (!existsSync(path)) { problems.push(`_backlog/${rel} missing`); return false; }
    if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) {
      problems.push(`_backlog/${rel} must be a regular file, not a symlink`); return false;
    }
    return true;
  };
  const files = (shelf) => trackedFiles.filter((p) => p.startsWith(`_backlog/${shelf}/`)
    && p.endsWith('.md') && !p.endsWith('/README.md'))
    .map((p) => p.slice(`_backlog/${shelf}/`.length));
  for (const rel of ['README.md', 'triggers.md', '_archived/README.md', ...SHELVES.map((s) => `${s}/README.md`)]) {
    if (!tracked.has(`_backlog/${rel}`)) problems.push(`_backlog/${rel} must be tracked (required layout)`);
    usable(rel);
  }
  for (const name of METHODS) if (!tracked.has(`_backlog/methods/${name}.md`))
    problems.push(`_backlog/methods/${name}.md missing from tracked method set`);

  for (const shelf of SHELVES) {
    const indexPath = `${shelf}/README.md`;
    if (!existsSync(join(backlogRoot, indexPath))) continue;
    const index = read(indexPath);
    for (const name of files(shelf)) {
      const rel = `${shelf}/${name}`;
      const loc = `_backlog/${rel}`;
      if (!usable(rel)) continue;
      if (!index.includes(name)) problems.push(`${loc} missing from ${indexPath} index`);
      const text = read(rel);
      const archived = shelf.startsWith('_archived/');
      const research = shelf.endsWith('research');
      if (!research && name.includes('/')) problems.push(`${loc} cards and methods must be flat files`);
      const parsed = metadata(text);
      if (archived && (research || parsed.error === 'missing frontmatter')) continue; // Legacy bodies stay untouched.
      if (parsed.error) { problems.push(`${loc} ${parsed.error}`); continue; }
      const fields = parsed.fields;
      if (research) {
        if ([...fields.keys()][0] !== 'topic' || !fields.get('topic')?.trim()) problems.push(`${loc} needs topic as first field`);
        if (!fields.get('intent')?.trim() || fields.get('intent').includes('\\n')) problems.push(`${loc} needs one-line intent`);
        if (fields.has('status')) problems.push(`${loc} research metadata must not contain status`);
      } else if (shelf === 'methods') {
        if (fields.get('name') !== name.replace(/\.md$/, '')) problems.push(`${loc} name must match filename`);
        for (const key of ['description', 'whenToUse']) if (!fields.get(key)?.trim()) problems.push(`${loc} needs ${key}`);
      } else {
        if ([...fields.keys()][0] !== 'status') problems.push(`${loc} needs status as first field`);
        if (!CARD_STATES[shelf].includes(fields.get('status'))) problems.push(`${loc} invalid status for shelf`);
        if (!DATE.test(fields.get('opened') ?? '')) problems.push(`${loc} needs opened: YYYY-MM-DD`);
        if (shelf.endsWith('bugs') && !['P0', 'P1', 'P2'].includes(fields.get('severity'))) problems.push(`${loc} needs severity: P0/P1/P2`);
        const statusLine = statusLineOf(text);
        // 归档卡的退出值：已结/已修 = 已离开活跃区，状态行（含历史头）不得再写可关闭：否。
        // 只看卡头 25 行——正文里的历史讨论可以引用旧值，卡头是当前记账面。
        if (archived && ['已结', '已修'].includes(fields.get('status'))) {
          const head = text.split('\n').slice(0, 25).join('\n');
          if (/可关闭\s*[：:=＝]\s*否/.test(head))
            problems.push(`${loc} 已归档（${fields.get('status')}）仍写可关闭：否——退出值必须与归档同次翻转为是`);
        }
        if (shelf === 'issues') {
          if (!DATE_SLUG.test(name)) problems.push(`${loc} filename must be YYYY-MM-DD-<slug>.md`);
          if (!statusLine || !/可关闭\s*[：:=＝]\s*否(?=[｜|\n（(]|$)/.test(statusLine))
            problems.push(`${loc} active status line must declare 可关闭：否`);
          if (statusLine && /可关闭\s*[：:=＝]\s*是(?=[｜|\n（(]|$)/.test(statusLine))
            problems.push(`${loc} is closeable but still active; archive in the same change`);
        }
        if (shelf === 'bugs' && !/^BUG-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name)) problems.push(`${loc} filename must preserve BUG-<NNN>-<slug>.md`);
        if (!archived) {
          if (statusLine) {
            const phase = phaseOf(statusLine);
            if (phase !== fields.get('status'))
              problems.push(`${loc} status line must mirror frontmatter status (状态：${fields.get('status')}；记号 = ${phase ?? '（无）'})`);
          } else if (shelf === 'bugs') {
            problems.push(`${loc} active bug needs a status line mirroring frontmatter status (状态：${fields.get('status')})`);
          }
          if (shelf === 'issues' && statusLine
            && !new RegExp(`结论倾向[：:]\\s*(?:${GRADUATION.join('|')})`).test(statusLine))
            problems.push(`${loc} active status line needs 结论倾向 head: <${GRADUATION.join('|')}> + 自由说明`);
        }
      }
    }
  }
  // 活跃索引 = 在办清单，不是归档导航：`## 活跃清单/列表` 节里的链接不得指向 _archived/。
  // 2026-10-20 审计 P0-3：bugs/issues 两页都把已归档卡列在"活跃"表里，fresh agent 会接手已结工作。
  for (const shelf of ['issues', 'bugs']) {
    const indexPath = `${shelf}/README.md`;
    if (!existsSync(join(backlogRoot, indexPath))) continue;
    const index = read(indexPath);
    const heading = /^##\s*活跃(?:清单|列表)[^\n]*$/m.exec(index);
    if (heading === null) continue;
    const start = heading.index + heading[0].length;
    const next = index.indexOf('\n## ', start);
    const section = index.slice(start, next === -1 ? undefined : next);
    for (const match of section.matchAll(/\]\(([^)]+)\)/g)) {
      // 池索引（.../README.md）是导航，不是"在办卡"；只抓具名卡链接。
      if (match[1].includes('_archived/') && !match[1].endsWith('/README.md'))
        problems.push(`_backlog/${indexPath} 活跃清单指向已归档卡：${match[1]}——活跃区只列在办卡`);
    }
  }
  return problems;
}
