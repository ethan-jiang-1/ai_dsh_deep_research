// final-version.spec.mjs — 终稿版本文件名的单一判据（2026-11-03 七维卫生审计 D2-3）。
//
// 背景：`final/vN.md` 的识别曾在 scripts 里自写 8 处、宽窄不一（`/^v\d+\.md$/` 收 v0，
// 其它门再过滤 >=1/>=2），而 pack 的 `FINAL_VERSION_RE` 零消费者。本文件钉三件事：
//   ① 判据只认 v1–v999999（v0 / 前导零 / 超长号 = 非版本账）；
//   ② 目录扫描（final/ 与 readable-vN）与判据一致；
//   ③ scripts 里不再出现第二份 vN 正则（机械漂移锁，防空语料）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  finalVersionOf,
  finalVersionsIn,
  hasFinalVersion,
  readableVersionOf,
  readableVersionsIn,
} from '../../scripts/lib/final-version.mjs';
import { latestRunVersion } from '../../packages/deep-research-pack/src/lib/run-fold.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('finalVersionOf：只认 v1–v999999；v0 / 前导零 / 超长 / 非版本 → null', () => {
  assert.equal(finalVersionOf('v1.md'), 1);
  assert.equal(finalVersionOf('v12.md'), 12);
  assert.equal(finalVersionOf('v999999.md'), 999999);
  for (const name of ['v0.md', 'v01.md', 'v0001.md', 'v1234567.md', 'v.md', 'V1.md', 'v1.md.bak', 'readable-v1.md', 'notes.md']) {
    assert.equal(finalVersionOf(name), null, `${name} 不应被认成版本账`);
  }
  assert.equal(finalVersionOf(undefined), null);
});

test('readableVersionOf：只认 readable-vN.md，N 从 1 起', () => {
  assert.equal(readableVersionOf('readable-v1.md'), 1);
  assert.equal(readableVersionOf('readable-v0.md'), null);
  assert.equal(readableVersionOf('readable.md'), null);
  assert.equal(readableVersionOf('v1.md'), null);
});

test('目录扫描：final/ 只收版本账，升序；目录缺席 = 空（不抛）', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'final-version-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(finalVersionsIn(join(dir, 'final')), [], '目录缺席 = 空集');
  assert.equal(hasFinalVersion(join(dir, 'final')), false);
  mkdirSync(join(dir, 'final'));
  for (const name of ['v2.md', 'v1.md', 'v0.md', 'v01.md', 'readable-v2.md', 'v1-ledger.md', 'notes.md']) {
    writeFileSync(join(dir, 'final', name), 'x\n');
  }
  assert.deepEqual(finalVersionsIn(join(dir, 'final')), [1, 2]);
  assert.deepEqual(readableVersionsIn(join(dir, 'final')), [2]);
  assert.equal(hasFinalVersion(join(dir, 'final')), true);
});

test('run-fold.latestRunVersion 与单一判据同源（边界形态一致）', () => {
  assert.equal(latestRunVersion(['v1.md', 'v3.md', 'v0.md', 'v03.md', 'V4.md', 'notes.md']), 3);
  assert.equal(latestRunVersion(['v999999.md']), 999999);
  assert.equal(latestRunVersion(['v1234567.md']), 0, '超长号不是版本账');
  assert.equal(latestRunVersion([]), 0);
});

test('漂移锁：scripts/ 与 pack src/lib 不再自写 vN 正则（单一正本 = final-target）', () => {
  const LEGACY = [String.raw`^v\d`, String.raw`^v(\d`];
  const files = [];
  const walk = (dir, ext) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'fixtures' || ent.name === 'node_modules' || ent.name === '_tmp') continue;
      const path = join(dir, ent.name);
      if (ent.isDirectory()) walk(path, ext);
      else if (ent.name.endsWith(ext)) files.push(path);
    }
  };
  walk(join(ROOT, 'scripts'), '.mjs');
  walk(join(ROOT, 'packages', 'deep-research-pack', 'src', 'lib'), '.ts');
  assert.ok(files.length >= 80, `防空语料：只扫到 ${files.length} 个源文件（scripts + pack src/lib）`);
  const offenders = [];
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    for (const legacy of LEGACY) {
      if (text.includes(legacy)) offenders.push(`${path.slice(ROOT.length + 1)} 含 ${legacy}`);
    }
  }
  assert.deepEqual(offenders, [], '终稿版本判据只许从 pack final-target 取（scripts 经 final-version.mjs）；旧正则 = 第二份实现');
});
