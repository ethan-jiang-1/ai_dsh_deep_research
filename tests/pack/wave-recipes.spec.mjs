// tests/pack/wave-recipes.spec.mjs —— `content/waves/lens-fanout.js` 的 keyless 契约。
//
// 为什么是 keyless：配方是**随包的脚本 body**，不是模型每次现写的散文。它必须能被
// `vm.Script` 解析、对 args 做显式校验、在 mock 的 `agent()/pipeline()` 下产出每个 cell 的
// 结果，并且**不得**把 `null` cell 静默过滤掉。真实模型行为归 wave 卡 P3/P4；本测试只证
// 配方本身的确定面。
//
// 反证（同 diff 实测）：删 `args.cells` 校验 → 缺参用例红；把 `row.result === null` 分支
// 改成过滤 → null 保留用例红；还原 → 绿。负例留证 2026-11-10。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RECIPE = join(ROOT, 'packages', 'deep-research-pack', 'content', 'waves', 'lens-fanout.js');

const source = () => readFileSync(RECIPE, 'utf8');
const cell = (over = {}) => ({
  id: 'T1-official',
  topic: 'T1',
  question: 'T1 的关键结论是什么？',
  lens: 'official',
  lens_path: '/pack/content/lenses/official.md',
  output_path: '/bundle/evidence/t1-official.md',
  lens_digest: 'seek: 官方文件；verify: 逐字核；refuse: 不把二手当一手',
  budget: '最多 3 次搜索、6 次抓取',
  boundaries: '只按 official 证据面取证；不合成',
  ...over,
});
const args = (cells) => ({ wave: 'W2', bundle_dir: '/bundle', cells });

/** Run the recipe body in a VM with fake hooks; returns the promise + captured prompts. */
function runRecipe({ input = args([cell()]), respond = () => ({ status: 'ok', path: '/bundle/evidence/t1-official.md', evidence_count: 1, gaps: [] }) } = {}) {
  const prompts = [];
  const context = vm.createContext({
    args: input,
    agent: (prompt, opts) => {
      prompts.push({ prompt, opts });
      return Promise.resolve(respond(prompt, opts));
    },
    pipeline: async (items, ...stages) => Promise.all(items.map(async (item, index) => {
      let value = item;
      for (const stage of stages) value = await stage(value, item, index);
      return value;
    })),
    phase: () => {},
    log: () => {},
  });
  const script = new vm.Script(`(async () => {\n${source()}\n})()`, { filename: 'workflow:lens-fanout' });
  return { result: script.runInContext(context), prompts };
}

test('配方可被 vm 解析（plain JS body，不含 meta statement）', () => {
  assert.doesNotMatch(source(), /^\s*export\s+const\s+meta\b/m);
  assert.doesNotThrow(() => new vm.Script(`(async () => {\n${source()}\n})()`));
});

test('args 校验：缺 wave/cells、空 cells、超过 8、cell 缺 output_path 都抛错', async () => {
  await assert.rejects(runRecipe({ input: {} }).result, /args\.wave|args\.cells/);
  await assert.rejects(runRecipe({ input: args([]) }).result, /cells must be 1\.\.8/);
  await assert.rejects(runRecipe({ input: args(Array.from({ length: 9 }, (_, i) => cell({ id: `T${String(i)}-official` }))) }).result, /cells must be 1\.\.8/);
  await assert.rejects(runRecipe({ input: args([cell({ output_path: undefined })]) }).result, /cells\[0\]\.output_path/);
});

test('两个 cell：返回每个 cell 的 id/path，prompt 带 lens/output/八字段/structured_output 顺序', async () => {
  const cells = [cell(), cell({ id: 'T1-quant', lens: 'quant', output_path: '/bundle/evidence/t1-quant.md' })];
  const { result, prompts } = runRecipe({
    input: args(cells),
    respond: (_prompt, opts) => ({ status: 'ok', path: opts.label.endsWith('T1-quant') ? '/bundle/evidence/t1-quant.md' : '/bundle/evidence/t1-official.md', evidence_count: 2, gaps: [] }),
  });
  const value = await result;
  assert.equal(value.recipe, 'lens-fanout');
  assert.equal(value.wave, 'W2');
  assert.equal(value.requested, 2);
  assert.deepEqual({ ...value.counts }, { ok: 2, partial: 0, failed: 0 });
  assert.deepEqual(value.cells.map((c) => c.id), ['T1-official', 'T1-quant']);
  assert.deepEqual(value.cells.map((c) => c.path), ['/bundle/evidence/t1-official.md', '/bundle/evidence/t1-quant.md']);
  assert.equal(prompts.length, 2);
  const prompt = prompts[0].prompt;
  for (const token of ['/bundle/evidence/t1-official.md', '/pack/content/lenses/official.md', 'source_url', 'retrieved_at', 'quality', 'found_by', 'supports', 'source_tier', 'publisher', 'lens', 'structured_output', 'Do not call workflow', 'Do not call subagent']) {
    assert.ok(prompt.includes(token), `brief 缺 ${token}`);
  }
});

test('null cell 保留为 failed，不静默过滤（研究造假的轻量版防线）', async () => {
  const cells = [cell(), cell({ id: 'T1-quant', lens: 'quant', output_path: '/bundle/evidence/t1-quant.md' })];
  let calls = 0;
  const { result } = runRecipe({
    input: args(cells),
    respond: () => (++calls === 2 ? null : { status: 'ok', path: '/bundle/evidence/t1-official.md', evidence_count: 1, gaps: [] }),
  });
  const value = await result;
  assert.equal(value.cells.length, 2);
  assert.equal(value.cells[1].id, 'T1-quant');
  assert.equal(value.cells[1].status, 'failed');
  assert.equal(value.cells[1].child_status, null);
  assert.deepEqual({ ...value.counts }, { ok: 1, partial: 0, failed: 1 });
});

test('配方 body 不引用 fs/network/Node API（脚本沙箱合同）', () => {
  const text = source();
  assert.doesNotMatch(text, /\brequire\s*\(/);
  assert.doesNotMatch(text, /^\s*import\s+/m);
  assert.doesNotMatch(text, /\bfetch\s*\(/);
  assert.doesNotMatch(text, /\bprocess\./);
  assert.doesNotMatch(text, /\bnode:/);
});
