// tests/run/probe-index.test.mjs — 探针索引纯函数（scripts/lib/probe-index.mjs）的 keyless 契约。
// 为什么住这里：索引是生成物，门禁 probe-registry 只比较字节；解析/渲染/域分组/缺字段判定必须有直测，
// 否则门禁只能证明「文件与它自己一致」，不能证明「头注被正确理解」。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  domainOf,
  listProbeFiles,
  missingProbeFields,
  parseProbeHeader,
  renderProbeIndex,
  scanProbeEntries,
} from '../../scripts/lib/probe-index.mjs';

const HEADER = [
  '#!/usr/bin/env node',
  '// 探针：demo-probe',
  '// 状态：常驻',
  '// 一句话：演示 | 管道要转义',
  '// 何时跑：改 X 后',
  '// 档位：真模型（REAL_MODEL）',
  '// 判据：C1 甲；C2 乙',
  '// 不证明：丙',
  '// 为什么存在：丁',
  '',
].join('\n');

test('parseProbeHeader：六字段 + 可选 why；只认前 16 行与首次出现', () => {
  const f = parseProbeHeader(HEADER);
  assert.equal(f['探针'], 'demo-probe');
  assert.equal(f['状态'], '常驻');
  assert.equal(f['一句话'], '演示 | 管道要转义');
  assert.equal(f['何时跑'], '改 X 后');
  assert.equal(f['档位'], '真模型（REAL_MODEL）');
  assert.equal(f['判据'], 'C1 甲；C2 乙');
  assert.equal(f['不证明'], '丙');
  assert.equal(f['为什么存在'], '丁');
  const late = parseProbeHeader(`${'\n'.repeat(20)}// 状态：常驻\n`);
  assert.deepEqual(late, {}, '16 行之后不解析——头注必须是真头注');
});

test('missingProbeFields：保持必填顺序，缺一即报', () => {
  assert.deepEqual(missingProbeFields(parseProbeHeader(HEADER)), []);
  const partial = parseProbeHeader(HEADER.replace('// 何时跑：改 X 后\n', ''));
  assert.deepEqual(missingProbeFields(partial), ['何时跑']);
  assert.deepEqual(missingProbeFields({}), ['状态', '一句话', '何时跑', '档位', '判据', '不证明']);
});

test('domainOf：第一段 = 域；根文件归未分组', () => {
  assert.equal(domainOf('behavior/a-probe.mjs'), 'behavior');
  assert.equal(domainOf('stream/tee.cjs'), 'stream');
  assert.equal(domainOf('root-probe.mjs'), '（未分组）');
});

test('renderProbeIndex：按域分组、组内排序、只投影摘要、转义表格管道', () => {
  const out = renderProbeIndex([
    { file: 'browser/b-probe.mjs', fields: { 一句话: 'B', 档位: 'GUI', 何时跑: 'b', 状态: '常驻' } },
    { file: 'behavior/c-probe.mjs', fields: { 一句话: 'C', 档位: '真模型', 何时跑: 'c', 状态: '常驻' } },
    { file: 'behavior/a-probe.mjs', fields: { 一句话: 'A | 竖线', 档位: '真模型', 何时跑: 'a', 状态: '常驻' } },
  ]);
  assert.ok(out.indexOf('## behavior/') < out.indexOf('## browser/'), '域按名称排序');
  assert.ok(out.indexOf('a-probe.mjs') < out.indexOf('c-probe.mjs'), '组内按文件名排序');
  assert.match(out, /A \\\| 竖线/, '管道必须转义，否则表格破列');
  assert.match(out, /\[a-probe\.mjs\]\(behavior\/a-probe\.mjs\)/);
  assert.ok(out.includes('| 探针 | 一句话 | 档位 | 何时跑 | 状态 |'));
});

test('listProbeFiles / scanProbeEntries：递归收探针，跳过 _index.mjs 与生成物', () => {
  const dir = mkdtempSync(join(tmpdir(), 'probe-index-'));
  try {
    mkdirSync(join(dir, 'behavior'));
    mkdirSync(join(dir, 'browser'));
    writeFileSync(join(dir, 'behavior', 'a-probe.mjs'), HEADER);
    writeFileSync(join(dir, 'browser', 'tee.cjs'), '#!/usr/bin/env node\n');
    writeFileSync(join(dir, 'root-probe.mjs'), HEADER);
    writeFileSync(join(dir, '_index.mjs'), '// tool\n');
    writeFileSync(join(dir, 'behavior', '_index.mjs'), '// nested tool\n');
    writeFileSync(join(dir, 'INDEX.generated.md'), '# index\n');
    writeFileSync(join(dir, 'notes.txt'), 'x\n');
    assert.deepEqual(listProbeFiles(dir), [
      'behavior/a-probe.mjs',
      'browser/tee.cjs',
      'root-probe.mjs',
    ]);
    const entries = scanProbeEntries(dir);
    assert.equal(entries.length, 3);
    assert.equal(entries.find((e) => e.file === 'behavior/a-probe.mjs').fields['一句话'], '演示 | 管道要转义');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('listProbeFiles：目录缺席返回空集（防空语料由调用方判红）', () => {
  assert.deepEqual(listProbeFiles(join(tmpdir(), 'definitely-missing-probe-dir-xyz')), []);
});
