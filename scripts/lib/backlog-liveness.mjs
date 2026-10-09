import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const CARD_STATES = {
  issues: ['推敲中', '等人拍板'], bugs: ['活跃'],
  '_archive/settled_issues': ['已结'], '_archive/suspended_issues': ['叫停'],
  '_archive/fixed_bugs': ['已修'], '_archive/suspended_bugs': ['待修'],
};
const SHELVES = [...Object.keys(CARD_STATES), 'research', '_archive/research', 'methods'];
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
  for (const rel of ['README.md', 'triggers.md', '_archive/README.md', ...SHELVES.map((s) => `${s}/README.md`)]) {
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
      const archived = shelf.startsWith('_archive/');
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
        if (shelf === 'issues') {
          if (!DATE_SLUG.test(name)) problems.push(`${loc} filename must be YYYY-MM-DD-<slug>.md`);
          const statusLine = text.split('\n').slice(0, 12).find((line) => /^>\s*.*状态[：:]/.test(line))?.replaceAll('**', '');
          if (!statusLine || !/可关闭\s*[：:=＝]\s*否(?=[｜|\n（(]|$)/.test(statusLine))
            problems.push(`${loc} active status line must declare 可关闭：否`);
          if (statusLine && /可关闭\s*[：:=＝]\s*是(?=[｜|\n（(]|$)/.test(statusLine))
            problems.push(`${loc} is closeable but still active; archive in the same change`);
        }
        if (shelf === 'bugs' && !/^BUG-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name)) problems.push(`${loc} filename must preserve BUG-<NNN>-<slug>.md`);
      }
    }
  }
  return problems;
}

/** Current work records use real Markdown links, not slug mentions or historical shelves. */
export function currentWorkRecordProblems(repoRoot, block) {
  const refs = [...block.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((m) => m[1].replace(/^<|>$/g, '').split('#')[0])
    .filter((target) => !/^[a-z]+:/i.test(target));
  const allowed = (path) => path.endsWith('.md') && !path.endsWith('/README.md') && [
    join(repoRoot, '_backlog', 'issues'), join(repoRoot, 'notes', 'proposed'),
  ].includes(dirname(path));
  const resolved = refs.flatMap((target) => {
    const candidates = [resolve(repoRoot, target), resolve(repoRoot, '_backlog', target)];
    return [...new Set(candidates)].filter(allowed);
  });
  if (resolved.length === 0) return ['current queue item must link an active issue or proposed RFC'];
  return resolved.filter((path) => !existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())
    .map((path) => `current work record missing or not a regular file: ${path}`);
}
