// decisions-now.test.mjs — 决策台账只写当前决定（2026-11-03 七维卫生审计 D1-7）。
//
// 合同（D56 纯路由台账）：`docs/decisions.md` 每行 = ≤100 可见字的定性结论 + ≤120 可见字的路由列，
// 且每个已定行至少一条「可解析、已跟踪、非冻结」的活载体链接；参数归 docs/ 合同，理由归 notes/。
// 判据 = 纯函数 validateDecisionsLedger(text, { exists, isTracked })，变异矩阵在本文件下半。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BYTE_CEILING = 16 * 1024;
const DECISION_MAX = 100;
const REFS_MAX = 120;
const MIN_LAST_D = 56;
const RETIRED_NUMBERS = [35, 38, 39];
const FROZEN = /^(notes\/archived\/|_backlog\/_archived\/)/;

const ANCHOR_LEAD = /^<a id="d\d+"><\/a>/;
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;

/** 单元格可见文本：去锚点、链接取标签、去加粗/代码包装。 */
export function visibleText(cell) {
  return cell
    .replace(ANCHOR_LEAD, '')
    .replace(LINK, '$1')
    .replace(/\*\*|`/g, '')
    .trim();
}

/** 转义感知的 GFM 行拆列（`\|` 不分列）；非表行返回 null。 */
export function splitRow(line) {
  if (!line.startsWith('|') || !line.trimEnd().endsWith('|')) return null;
  const body = line.trimEnd().slice(1, -1);
  return body.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

function sectionOf(text, from, to) {
  const start = text.indexOf(from);
  if (start < 0) return null;
  const end = to === null ? -1 : text.indexOf(to, start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

/** 一节里的唯一连续表：返回 { rows, problems }；rows = 三列单元数组（含行文本）。 */
function tableOf(label, block, problems) {
  const lines = block.split('\n');
  const hdr = lines.findIndex((l) => l.startsWith('| # |'));
  if (hdr < 0) {
    problems.push(`${label}节缺表头`);
    return [];
  }
  if (!/^\|---\|---\|---\|$/.test(lines[hdr + 1] ?? '')) problems.push(`${label}表缺三列分隔行`);
  let end = hdr + 2;
  const rows = [];
  while (end < lines.length && lines[end].startsWith('|')) {
    const cells = splitRow(lines[end]);
    if (cells === null || cells.length !== 3) {
      problems.push(`${label}表行列数 ≠ 3：${lines[end].slice(0, 40)}`);
    } else {
      const m = /^<a id="d(\d+)"><\/a>D\1$/.exec(cells[0]);
      if (m === null) problems.push(`${label}表首列无 <a id="dN"></a>DN 锚点：${cells[0].slice(0, 30)}`);
      else rows.push({ number: Number(m[1]), decision: cells[1], refs: cells[2] });
    }
    end += 1;
  }
  const stray = lines.slice(end).filter((l) => l.trim().startsWith('|'));
  if (stray.length > 0) problems.push(`${label}表尾后仍有孤立管道行（表内空行会打断渲染）：${stray[0].slice(0, 32)}`);
  return rows;
}

function fileLinks(refs) {
  const out = [];
  for (const m of refs.matchAll(LINK)) {
    const url = m[2];
    if (url.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(url)) continue;
    out.push(posix.normalize(posix.join('docs', url.split('#')[0])));
  }
  return out;
}

function anchorLinks(refs) {
  return [...refs.matchAll(LINK)].map((m) => m[2]).filter((u) => /^#d\d+$/.test(u));
}

/**
 * 纯判据：台账文本 + 文件系统谓词 → 问题清单（空 = 通过）。
 * exists(repoRelPath) / isTracked(repoRelPath) 由调用方注入，便于变异测试。
 */
export function validateDecisionsLedger(text, { exists, isTracked }) {
  const problems = [];
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > BYTE_CEILING) problems.push(`台账 ${bytes} bytes 超过 ${BYTE_CEILING} 硬顶`);
  const active = sectionOf(text, '## 已定', '## 已退役');
  const retired = sectionOf(text, '## 已退役', '### 待定');
  if (active === null || retired === null) return [...problems, '缺「## 已定」或「## 已退役」节'];
  if (active.split('\n').some((l) => l.startsWith('>'))) problems.push('已定节含引用块（版本/安装事实横幅属于合同，不属于台账）');
  const activeRows = tableOf('已定', active, problems);
  const retiredRows = tableOf('已退役', retired, problems);
  const all = [...activeRows, ...retiredRows];
  const counts = new Map();
  for (const { number } of all) counts.set(number, (counts.get(number) ?? 0) + 1);
  const dup = [...counts].filter(([, c]) => c > 1).map(([n]) => `D${n}`);
  if (dup.length > 0) problems.push(`D 号重复：${dup.join(',')}`);
  const max = Math.max(0, ...counts.keys());
  if (max < MIN_LAST_D) problems.push(`最大 D 号 ${max} < ${MIN_LAST_D}——防空语料`);
  const missing = [];
  for (let n = 1; n <= max; n += 1) if (!counts.has(n)) missing.push(`D${n}`);
  if (missing.length > 0) problems.push(`D 号不连续（缺 ${missing.join(',')}）`);
  const totalAnchors = [...text.matchAll(/<a id="d(\d+)"><\/a>D\1/g)].length;
  if (totalAnchors !== all.length) problems.push(`锚点 ${totalAnchors} 个但表行 ${all.length} 行（锚点必须只在表首列）`);
  for (const n of RETIRED_NUMBERS) {
    if (!retiredRows.some((r) => r.number === n)) problems.push(`D${n} 不在已退役表`);
    if (activeRows.some((r) => r.number === n)) problems.push(`D${n} 仍在已定表`);
  }

  const lengthProblems = (kind, { number, decision, refs }) => {
    const out = [];
    const d = visibleText(decision).length;
    const r = visibleText(refs).length;
    if (d === 0 || d > DECISION_MAX) out.push(`D${number} 决定列 ${d} 字（0<n≤${DECISION_MAX}）`);
    if (r === 0 || r > REFS_MAX) out.push(`D${number} 路由列 ${r} 字（0<n≤${REFS_MAX}）`);
    for (const f of fileLinks(refs)) {
      if (!exists(f)) out.push(`D${number} 链接目标不存在：${f}`);
    }
    return kind === 'active' ? out : out;
  };

  for (const row of activeRows) {
    problems.push(...lengthProblems('active', row));
    const { number, decision, refs } = row;
    if (/20\d{2}-\d{2}-\d{2}\s*修订/.test(decision)) problems.push(`D${number} 含日期化修订标记`);
    if (/已退役/.test(decision)) problems.push(`D${number} 已退役却仍在已定表`);
    if (/(?:由|被) D\d+ 取代/.test(decision)) problems.push(`D${number} 已被取代却仍在已定表`);
    const live = fileLinks(refs).filter((f) => !FROZEN.test(f) && exists(f) && isTracked(f));
    if (live.length === 0) problems.push(`D${number} 路由列无可解析的活载体（须 ≥1 条已跟踪、非冻结文件链接）`);
  }
  for (const row of retiredRows) {
    problems.push(...lengthProblems('retired', row));
    const { number, refs } = row;
    if (anchorLinks(refs).length === 0) problems.push(`D${number} 退役行缺 #dN 取代者锚点`);
    if (fileLinks(refs).length === 0) problems.push(`D${number} 退役行缺文件链接`);
  }
  for (const { number, refs } of [...activeRows, ...retiredRows]) {
    for (const a of anchorLinks(refs)) {
      const target = Number(a.slice(2));
      if (!counts.has(target)) problems.push(`D${number} 的锚点 ${a} 无对应 D 号`);
    }
  }
  return problems;
}

// ───────────────────────── 真仓合同 ─────────────────────────

const TEXT = readFileSync(join(ROOT, 'docs', 'decisions.md'), 'utf8');
// keyless 车道禁子进程（layering），不能问 git；「已跟踪」以入库边界近似：盘上存在且不在 gitignored 运行区
// （入库边界 = docs/contracts/git-boundary.md）。
const REAL_FS = {
  exists: (p) => existsSync(join(ROOT, p)),
  isTracked: (p) => !/^(runtime|node_modules|vendor|_dist\/.*\.tgz)/.test(p) && !p.endsWith('.tgz'),
};

test('真台账通过纯路由判据：长度上限、活载体、连续 D 号、16KB 硬顶', () => {
  assert.deepEqual(validateDecisionsLedger(TEXT, REAL_FS), []);
});

function rowOf(n) {
  const line = TEXT.split('\n').find((l) => l.startsWith(`| <a id="d${n}"></a>D${n} |`));
  assert.ok(line, `D${n} 缺席`);
  return splitRow(line);
}

test('宪法锚点 D53–D56 在册并路由到各自权威合同与 Note', () => {
  const want = {
    53: ['testing.md', '2026-11-13-test-naming-lanes.md'],
    54: ['testing.md', '2026-11-13-test-strategy-operating-model.md'],
    55: ['testing.md', '2026-11-14-verification-oracle-hardening.md'],
    56: ['./AGENTS.md', '2026-11-14-decisions-routing-ledger.md'],
  };
  for (const [n, parts] of Object.entries(want)) {
    const refs = rowOf(n)[2];
    for (const p of parts) assert.ok(refs.includes(p), `D${n} 路由列缺 ${p}`);
  }
});

test('D53/D54 的制度词住在权威合同里（台账只路由，不复述）', () => {
  const lanes = readFileSync(join(ROOT, 'docs/testing.md'), 'utf8');
  for (const token of ['*.spec.mjs', '*.e2e.mjs', '*.entry.mjs', 'tests/checks/<owner>/*.test.mjs']) {
    assert.ok(lanes.includes(token), `testing.md 缺车道 ${token}`);
  }
  for (const token of ['三环', '四账', '五关', '失败类', '最低可见层']) {
    assert.ok(lanes.includes(token), `testing.md 缺制度词 ${token}`);
  }
});

// ───────────────────────── 变异矩阵 ─────────────────────────

const GOOD_ROW = (n, decision = '**结论**：一句话', refs = '[合同](./a.md)') => `| <a id="d${n}"></a>D${n} | ${decision} | ${refs} |`;
function ledger({ rows, retired, last = 56, extra = '' } = {}) {
  const active = rows ?? Array.from({ length: last }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n)).map((n) => GOOD_ROW(n));
  const gone = retired ?? RETIRED_NUMBERS.map((n) => `| <a id="d${n}"></a>D${n} | 旧决定 | 由 [D40](#d40) 取代——[Note](./a.md) |`);
  return [
    '# t', '', '## 已定', '', extra, '| # | 决定 | 依据/出处 |', '|---|---|---|', ...active, '',
    '## 已退役', '', '| # | 决定（退役） | 现行为 |', '|---|---|---|', ...gone, '', '### 待定', '', '无。', '',
  ].join('\n');
}
const FS_OK = { exists: () => true, isTracked: () => true };

test('变异基线：合成合法台账零问题', () => {
  assert.deepEqual(validateDecisionsLedger(ledger(), FS_OK), []);
});

test('变异 a：决定列 105 字 = 红', () => {
  const rows = [...Array.from({ length: 56 }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n)).map((n) => (n === 7 ? GOOD_ROW(7, '长'.repeat(105)) : GOOD_ROW(n)))];
  assert.match(validateDecisionsLedger(ledger({ rows }), FS_OK).join('\n'), /D7 决定列 105 字/);
});

test('变异 b：路由列 130 字散文倾倒 = 红', () => {
  const rows = Array.from({ length: 56 }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n)).map((n) => (n === 9 ? GOOD_ROW(9, '短', `[a](./a.md)${'理'.repeat(130)}`) : GOOD_ROW(n)));
  assert.match(validateDecisionsLedger(ledger({ rows }), FS_OK).join('\n'), /D9 路由列 \d+ 字/);
});

test('变异 c：纯散文 / 仅 #dN 锚点的已定路由列 = 红', () => {
  for (const refs of ['用户拍板', '[D40](#d40)']) {
    const rows = Array.from({ length: 56 }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n)).map((n) => (n === 8 ? GOOD_ROW(8, '短', refs) : GOOD_ROW(n)));
    assert.match(validateDecisionsLedger(ledger({ rows }), FS_OK).join('\n'), /D8 路由列无可解析的活载体/, refs);
  }
});

test('变异 d：仅链冻结 notes/archived 或未跟踪/不存在文件 = 红', () => {
  const mk = (refs) => Array.from({ length: 56 }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n)).map((n) => (n === 8 ? GOOD_ROW(8, '短', refs) : GOOD_ROW(n)));
  assert.match(validateDecisionsLedger(ledger({ rows: mk('[旧](../notes/archived/x.md)') }), FS_OK).join('\n'), /D8 路由列无可解析的活载体/);
  assert.match(validateDecisionsLedger(ledger({ rows: mk('[x](./a.md)') }), { exists: () => true, isTracked: () => false }).join('\n'), /D8 路由列无可解析的活载体/);
  assert.match(validateDecisionsLedger(ledger(), { exists: () => false, isTracked: () => true }).join('\n'), /链接目标不存在/);
});

test('变异 e：缺号 / 重复号 / 未转义竖线多列 / 末号不足 = 红', () => {
  const nums = Array.from({ length: 56 }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n));
  const gap = validateDecisionsLedger(ledger({ rows: nums.filter((n) => n !== 20).map((n) => GOOD_ROW(n)) }), FS_OK).join('\n');
  assert.match(gap, /缺 D20/);
  const dup = validateDecisionsLedger(ledger({ rows: [...nums.map((n) => GOOD_ROW(n)), GOOD_ROW(10)] }), FS_OK).join('\n');
  assert.match(dup, /D 号重复：D10/);
  const pipe = validateDecisionsLedger(ledger({ rows: nums.map((n) => (n === 5 ? GOOD_ROW(5, 'a | b') : GOOD_ROW(n))) }), FS_OK).join('\n');
  assert.match(pipe, /列数 ≠ 3/);
  const escaped = validateDecisionsLedger(ledger({ rows: nums.map((n) => (n === 5 ? GOOD_ROW(5, 'a \\| b') : GOOD_ROW(n))) }), FS_OK);
  assert.deepEqual(escaped, [], '转义竖线不分列');
  assert.match(validateDecisionsLedger(ledger({ last: 40 }), FS_OK).join('\n'), /最大 D 号 40 < 56/);
});

test('变异 f：> 16KB、版本横幅、表内空行、退役行缺取代者锚点 = 红', () => {
  assert.match(validateDecisionsLedger(`${ledger()}\n${'x'.repeat(BYTE_CEILING)}`, FS_OK).join('\n'), /超过 16384 硬顶/);
  assert.match(validateDecisionsLedger(ledger({ extra: '> **当前安装事实**：x' }), FS_OK).join('\n'), /引用块/);
  const nums = Array.from({ length: 56 }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.includes(n));
  const rows = nums.map((n) => GOOD_ROW(n));
  rows.splice(10, 0, '');
  assert.match(validateDecisionsLedger(ledger({ rows }), FS_OK).join('\n'), /孤立管道行/);
  const retired = RETIRED_NUMBERS.map((n) => `| <a id="d${n}"></a>D${n} | 旧 | 去向 [Note](./a.md) |`);
  assert.match(validateDecisionsLedger(ledger({ retired }), FS_OK).join('\n'), /退役行缺 #dN/);
});
