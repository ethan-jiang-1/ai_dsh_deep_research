// decisions-now.test.mjs — 决策台账只写当前决定（2026-11-03 七维卫生审计 D1-7）。
//
// 背景：`docs/decisions.md` 曾是「当前决定 + 修订史 + 退役决策」混在一张表里——D35/D38/D39
// 已退役却以现在时叙述，最大行 3KB、带「2026-10-21 修订」式日期史。读者无法从文件形态判断
// 哪条还有效。合同改为：已定表只放现在有效的决定（决策正文 ≤800 字、无日期化修订标记、
// 无退役措辞）；退役决策单列在「## 已退役」，一行去向。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEXT = readFileSync(join(ROOT, 'docs', 'decisions.md'), 'utf8');

const section = (from, to) => {
  const start = TEXT.indexOf(from);
  assert.ok(start >= 0, `decisions.md 缺「${from}」节`);
  const end = to === null ? TEXT.length : TEXT.indexOf(to, start + 1);
  return TEXT.slice(start, end === -1 ? undefined : end);
};

const ACTIVE = section('## 已定', '## 已退役');
const RETIRED = section('## 已退役', '### 待定');

function activeRows(text) {
  return text.split('\n').filter((line) => line.startsWith('| <a id="d')).map((line) => {
    const parts = line.split(' | ');
    return { line, number: /^<a id="d(\d+)">/.exec(line.slice(2))?.[1], decision: parts[1] ?? '', refs: parts[2] ?? '' };
  });
}

test('已定表只放当前决定：决策正文 ≤800 字、无日期化修订标记、无退役措辞', () => {
  const rows = activeRows(ACTIVE);
  assert.ok(rows.length >= 35, `防空语料：已定表只有 ${rows.length} 行`);
  const problems = [];
  for (const { line, number, decision } of rows) {
    assert.ok(number !== undefined, `无法解析 D 号：${line.slice(0, 80)}`);
    if (decision.length > 800) problems.push(`D${number} 决策正文 ${decision.length} 字（上限 800）`);
    if (/20\d{2}-\d{2}-\d{2}\s*修订/.test(decision)) problems.push(`D${number} 含日期化修订标记`);
    if (/已退役/.test(decision)) problems.push(`D${number} 已退役却仍在已定表`);
    if (/(?:由|被) D\d+ 取代/.test(decision)) problems.push(`D${number} 已被取代却仍在已定表`);
  }
  assert.deepEqual(problems, [], `决策台账混入历史/退役内容（处置：压缩到当前决定、历史移 Note、退役移「## 已退役」）`);
});

test('已退役表：D35/D38/D39 各有锚点与一行去向，且不在已定表', () => {
  for (const n of ['35', '38', '39']) {
    assert.ok(RETIRED.includes(`<a id="d${n}"></a>D${n}`), `已退役表缺 D${n} 锚点（旧链接会断）`);
    assert.ok(!ACTIVE.includes(`<a id="d${n}"></a>D${n}`), `D${n} 仍在已定表`);
  }
  assert.match(RETIRED, /D40/, '已退役表应指向取代者 D40');
});

test('D 号唯一且连续：D1–D41 每个锚点恰好一次', () => {
  const anchors = [...TEXT.matchAll(/<a id="d(\d+)"><\/a>D\1/g)].map((m) => Number(m[1]));
  assert.ok(anchors.length >= 41, `锚点过少（${anchors.length}）——防空语料`);
  const counts = new Map();
  for (const n of anchors) counts.set(n, (counts.get(n) ?? 0) + 1);
  const dup = [...counts].filter(([, c]) => c > 1).map(([n]) => n);
  assert.deepEqual(dup, [], '同一 D 号出现多次（编号唯一）');
  const missing = [];
  for (let n = 1; n <= 41; n += 1) if (!counts.has(n)) missing.push(n);
  assert.deepEqual(missing, [], 'D 号不连续（缺号会让引用悬空）');
});
