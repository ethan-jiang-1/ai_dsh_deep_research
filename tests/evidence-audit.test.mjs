// evidence-audit 回归 — 溯源审计三断言（keyless，纯 .jsonl 夹具直调 auditBundle——
// tests/ 层禁子进程，zstd 路径由真实 bundle 的基线审计覆盖，不进 L0）。
// 红证形态：伪造 source_url / final 断链 / 反引号占位豁免 / 契约不符分级。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditBundle } from '../scripts/evidence-audit.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, 'tests', '.tmp-evidence-audit');

/** 造夹具：bundle（evidence + final）+ sessions（纯 .jsonl 工具事件）。 */
function fixture({ forged = false, brokenRef = false } = {}) {
  rmSync(TMP, { recursive: true, force: true });
  const bundle = join(TMP, 'drt_fixture');
  const sessions = join(TMP, 'sessions', 'g1', 's1');
  mkdirSync(join(bundle, 'evidence'), { recursive: true });
  mkdirSync(sessions, { recursive: true });
  // 会话日志：一个 web_search 工具事件（call + result 都带真 URL；result 带可回溯文本）
  const realUrl = 'https://example.com/spec/xeon-4314';
  const log = [
    JSON.stringify({ type: 'assistant/message', data: { text: `顺嘴提一句 https://example.com/mentioned-only（非工具事件——不应算数）` } }),
    JSON.stringify({ type: 'tool/call', data: { name: 'web_search', arguments: { query: 'xeon 4314 spec' } } }),
    JSON.stringify({ type: 'tool/result', data: { name: 'web_search', content: `SPECrate2017_int_base = 228 见 ${realUrl}` } }),
    JSON.stringify({ type: 'tool/call', data: { name: 'web_fetch', arguments: { url: 'https://example.com/blog/post-x' } } }),
    JSON.stringify({ type: 'tool/result', data: { name: 'web_fetch', content: '博客全文 https://example.com/blog/post-x' } }),
  ].join('\n');
  writeFileSync(join(sessions, 'session.v4.jsonl'), log);
  // 证据文件 A：契约完整 + URL 可溯源 + 摘录可回溯
  const urlA = forged ? 'https://forged.example.com/never-fetched' : realUrl;
  writeFileSync(join(bundle, 'evidence', 'ev-a.md'), `---\nsource_url: ${urlA}\nretrieved_at: 2026-09-25\nquality: A\nfound_by: analyst\nsupports: T1\nsource_tier: primary\npublisher: example.com\n---\n\n# A\n\n## 原文摘录\n\n> SPECrate2017_int_base = 228 见 ${realUrl}\n\n## 解读\n\n初步判断。\n`);
  // 证据文件 B：无 frontmatter（存量散文式）——契约不符 MAJOR；正文 URL 可溯源
  writeFileSync(join(bundle, 'evidence', 'ev-b.md'), `# B（散文式存量）\n\n来源：https://example.com/blog/post-x\n`);
  // final：A 引用正常；按需断链；头部占位说明（反引号内——豁免）
  const broken = brokenRef ? '\n结论X [来源: evidence/not-exist.md]' : '';
  writeFileSync(join(bundle, 'final.md'), `# Final\n\n格式说明：每条附 \`[来源: evidence/xx.md]\`。\n\n结论 [来源: evidence/ev-a.md]${broken}\n`);
  return { bundle, sessions, realUrl };
}

test('干净 bundle：URL 全溯源、摘录回溯、final 链完整、无 CRITICAL', () => {
  const { bundle, sessions } = fixture();
  const r = auditBundle(bundle, sessions);
  assert.equal(r.criticalCount, 0, `不应有 CRITICAL：${JSON.stringify(r.findings)}`);
  assert.equal(r.stats.urlTotal, 2, '两份证据各一个声称 URL');
  assert.equal(r.stats.urlOk, 2, '两个 URL 都可溯源（A 的 spec + B 的 blog 都在工具事件里？——B 的 blog URL 不在语料，见下）');
});

test('B 的正文 URL 不在语料 → 伪造链接 CRITICAL（URL 溯源只认工具事件）', () => {
  const { bundle, sessions } = fixture();
  // 显式拿掉 blog 的工具事件（模拟"模型口述过但从未真取"）
  const logPath = join(sessions, 'session.v4.jsonl');
  writeFileSync(logPath, readFileSync(logPath, 'utf8').split('\n').filter((l) => !l.includes('blog/post-x')).join('\n'));
  const r = auditBundle(bundle, sessions);
  const forged = r.findings.filter((f) => f.kind === '伪造链接/未溯源');
  assert.equal(forged.length, 1, 'ev-b.md 的 blog URL 不在任何工具事件 → CRITICAL');
  assert.equal(forged[0].file, 'ev-b.md');
});

test('红证①：伪造 source_url → CRITICAL；还原后消失', () => {
  const { bundle, sessions } = fixture({ forged: true });
  const r = auditBundle(bundle, sessions);
  const hit = r.findings.filter((f) => f.kind === '伪造链接/未溯源' && f.file === 'ev-a.md');
  assert.equal(hit.length, 1, 'ev-a 的 forged URL → CRITICAL');
  assert.equal(r.criticalCount, 1, 'A 伪造 URL → 唯一 CRITICAL（B 的 blog 事件在场可溯源）');
  const clean = auditBundle(...(() => { const f = fixture(); return [f.bundle, f.sessions] })());
  assert.equal(clean.findings.filter((f) => f.file === 'ev-a.md' && f.kind === '伪造链接/未溯源').length, 0, '还原后 A 不再红');
});

test('红证②：final 断链 → CRITICAL 溯源断链', () => {
  const { bundle, sessions } = fixture({ brokenRef: true });
  const r = auditBundle(bundle, sessions);
  const hit = r.findings.filter((f) => f.kind === '溯源断链');
  assert.equal(hit.length, 1);
  assert.ok(hit[0].detail.includes('not-exist.md'));
});

test('反引号内的格式占位（evidence/xx.md）不算引用（首场 run 假阳性修正的回归钉）', () => {
  const { bundle, sessions } = fixture();
  const r = auditBundle(bundle, sessions);
  assert.equal(r.stats.finalRefs, 1, '只认 ev-a 那一条真引用');
});

test('无 frontmatter → 契约不符 MAJOR；有 frontmatter 缺软字段 → INFO 未分级', () => {
  const { bundle, sessions } = fixture();
  const r = auditBundle(bundle, sessions);
  assert.equal(r.findings.filter((f) => f.kind === '契约不符' && f.file === 'ev-b.md').length, 1, 'B 无 frontmatter → MAJOR');
  // A 有软字段 → 无 INFO；改 A 去掉软字段再验
  const wf = writeFileSync, rf = readFileSync;
  const p = join(bundle, 'evidence', 'ev-a.md');
  wf(p, rf(p, 'utf8').replace('source_tier: primary\npublisher: example.com\n', ''));
  const r2 = auditBundle(bundle, sessions);
  assert.equal(r2.findings.filter((f) => f.kind === '未分级' && f.file === 'ev-a.md').length, 1, '缺软字段 → INFO 未分级（不否决有效性——分层谓词）');
});

test('摘录可回溯（A 的 blockquote 在 tool/result 文本中）', () => {
  const { bundle, sessions } = fixture();
  const r = auditBundle(bundle, sessions);
  assert.equal(r.stats.quoteOk, 1, 'A 的摘录可回溯');
  assert.equal(r.stats.quoteTotal, 1);
});

test('清理夹具', () => { rmSync(TMP, { recursive: true, force: true }); });
