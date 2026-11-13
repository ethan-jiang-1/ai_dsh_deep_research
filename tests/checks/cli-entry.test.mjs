// cli-entry 回归 — symlink-safe CLI 入口判定（keyless，纯 fs 临时夹具）。
// 为什么：macOS `/tmp` → `/private/tmp`；字面/`resolve` 比较在 symlink checkout 下
// 会让 `main()` 静默不执行，dev 工具假绿。本测试钉住 realpath 归一判据。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMain } from '../../scripts/lib/cli-entry.mjs';

test('isMain：symlink 指向同一文件 → true', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const real = join(dir, 'real.mjs');
    writeFileSync(real, '');
    const link = join(dir, 'link.mjs');
    symlinkSync(real, link);
    assert.equal(isMain(pathToFileURL(real).href, link), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('isMain：不同文件 / 缺 argv1 → false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const real = join(dir, 'real.mjs');
    writeFileSync(real, '');
    assert.equal(isMain(pathToFileURL(real).href, join(dir, 'other.mjs')), false);
    assert.equal(isMain(pathToFileURL(real).href, undefined), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
