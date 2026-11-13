// release-copies — live install docs must name the current pack version only.
//
// Why: 0.3.1's tarball was built after the 0.3.1 tag while HEAD moved on; the version
// strings in README / pack README / decisions / guides were the only signal. This guard
// makes a stale copy red before a release.
//
// Red recipe: change any listed doc's `0.3.x` or tarball name to another patch → red;
// restore → green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pack = JSON.parse(readFileSync(join(ROOT, 'packages', 'deep-research-pack', 'package.json'), 'utf8'));
const version = pack.version;
const liveDocs = [
  'README.md',
  'docs/00-index.md',
  'docs/decisions.md',
  'docs/guides/64-release-versioning.md',
  'packages/deep-research-pack/README.md',
  'packages/deep-research-pack/README.zh.md',
];

test('live install docs name only the current tarball version', () => {
  for (const rel of liveDocs) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    for (const match of text.matchAll(/dsh-deep-research-pack-(\d+\.\d+\.\d+)\.tgz/g)) {
      assert.equal(match[1], version,
        `${rel} 指名 tarball ${match[1]}，当前 ${version}——重导出/改版时同步`);
    }
  }
});

test('live install docs carry no stale release-line version', () => {
  const line = version.split('.').slice(0, 2).join('\\.');
  const re = new RegExp(`\\b${line}\\.\\d+\\b`, 'g');
  for (const rel of liveDocs) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    for (const match of text.matchAll(re)) {
      assert.equal(match[0], version,
        `${rel} 出现旧版本 ${match[0]}，当前 ${version}——live 文档只写当前版本`);
    }
  }
});
