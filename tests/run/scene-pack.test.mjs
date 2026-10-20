// scene-pack.test.mjs — 场景包读取回归（2026-10-21 卫生轮 维度6 高项）。
// scene-capture 的抓取半边自落地后，场景包全仓零消费者（grep 实证——"看见当时页面"只完成了
// 抓取半边，抓了只能人肉逐文件开）。本测试钉读取半边契约：概要如实（缺件标记 / meta 不可
// 解析降级报因，不静默）、mtime 降序、散件与点目录跳过。
// 负例留证 2026-10-21：①模块缺席即红（先写本测试，lib/scene-pack.mjs 后落地）；
//   ②sabotage consoleProblems 计数恒 0 →「概要如实」红；③sabotage 排序方向 →「mtime 降序」红；
//   均还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listScenePacks, readScenePack, PACK_FILES } from '../../scripts/lib/scene-pack.mjs';

const fullPack = (dir, { at = '2026-10-21T00:00:00Z', url = 'http://x/?token=REDACTED' } = {}) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'page.png'), 'png');
  writeFileSync(join(dir, 'page.html'), '<html></html>');
  writeFileSync(join(dir, 'body.txt'), '页面正文');
  writeFileSync(join(dir, 'console.txt'), '');
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ url, at, screenshot: 'page.png', consoleProblems: ['a', 'b'], exceptions: ['boom'] }, null, 2));
};

test('readScenePack：五件套概要如实（字节/meta 计数/url 脱敏形态），缺件与坏 meta 不静默', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sp-'));
  try {
    const good = join(dir, 'scene-good');
    fullPack(good);
    const p = readScenePack(good);
    assert.equal(p.name, 'scene-good');
    for (const f of PACK_FILES) assert.ok(p.files[f].present, `${f} 应在场`);
    assert.ok(p.files['page.png'].bytes > 0, 'page.png 字节数应 >0');
    assert.equal(p.consoleProblems, 2, 'consoleProblems 计数');
    assert.equal(p.exceptions, 1, 'exceptions 计数');
    assert.equal(p.meta.url, 'http://x/?token=REDACTED');

    // 缺件：只造 meta.json——其余四件如实标缺席
    const poor = join(dir, 'scene-poor');
    mkdirSync(poor);
    writeFileSync(join(poor, 'meta.json'), '{}');
    const q = readScenePack(poor);
    assert.equal(q.files['page.png'].present, false, '缺件应如实标记（不装在场）');
    assert.equal(q.consoleProblems, null, 'meta 无 consoleProblems → null（不猜 0）');

    // meta 不可解析：降级 + 原因，不静默吞掉
    const bad = join(dir, 'scene-bad');
    mkdirSync(bad);
    writeFileSync(join(bad, 'meta.json'), '{oops');
    const r = readScenePack(bad);
    assert.equal(r.meta, null);
    assert.ok(r.metaError, 'meta 不可解析应报原因');

    assert.equal(readScenePack(join(dir, 'absent')), null, '目录缺席 → null（CLI 壳负责 fail-loud 提示）');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('listScenePacks：mtime 降序；散件与点目录跳过；根缺席 = 空数组', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spl-'));
  try {
    const a = join(dir, 'scene-a');
    const b = join(dir, 'scene-b');
    fullPack(a);
    fullPack(b);
    utimesSync(a, new Date('2026-10-19T00:00:00Z'), new Date('2026-10-19T00:00:00Z'));
    utimesSync(b, new Date('2026-10-20T00:00:00Z'), new Date('2026-10-20T00:00:00Z'));
    writeFileSync(join(dir, 'loose-file.txt'), 'x'); // 散件不是场景包
    mkdirSync(join(dir, '.hidden')); // 点目录跳过
    const list = listScenePacks(dir);
    assert.deepEqual(list.map((p) => p.name), ['scene-b', 'scene-a'], 'mtime 降序（最新先看）');
    assert.equal(list.length, 2, '散件与点目录不得计入');
    assert.deepEqual(listScenePacks(join(dir, 'nope')), [], '根缺席 = 空数组（CLI 壳负责提示先抓）');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
