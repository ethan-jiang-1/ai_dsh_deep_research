// evidence-audit 回归 — 溯源审计三断言（keyless，纯 .jsonl 夹具直调 auditBundle——
// tests/ 层禁子进程，zstd 路径由真实 bundle 的基线审计覆盖，不进 L0）。
// 红证形态：伪造 source_url / final 断链 / 反引号占位豁免 / 契约不符分级。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, readFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditBundle } from '../scripts/lib/evidence-audit-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, 'tests', '.tmp-evidence-audit');

/** 造夹具：bundle（evidence + final）+ sessions（纯 .jsonl 工具事件）。 */
function fixture({ forged = false, brokenRef = false, derived = false } = {}) {
  rmSync(TMP, { recursive: true, force: true });
  const bundle = join(TMP, 'drt_fixture');
  const sessions = join(TMP, 'sessions', 'g1', 's1');
  mkdirSync(join(bundle, 'evidence'), { recursive: true });
  mkdirSync(sessions, { recursive: true });
  // 会话日志：一个 web_search 工具事件（call + result 都带真 URL；result 带可回溯文本）
  const realUrl = 'https://example.com/spec/xeon-4314';
  // 真实形态（2026-09-26 按真日志对齐）：call = {callId,name,arguments(JSON 字符串)}；
  // result = {message:{toolCallId,content:[{type:'text',text}]}}——**result 不带工具名**，靠 callId 反查；
  // web_fetch 成功时文本以 `Fetched <url> (HTTP 200)` 开头（失败则 `Error: …`）。
  const log = [
    JSON.stringify({ type: 'assistant/message', data: { text: `顺嘴提一句 https://example.com/mentioned-only（非工具事件——不应算数）` } }),
    // 本 run 立项写调用：真实 run 会话日志必含 bundle slug（语料窗过滤的锚点——件⑧）
    JSON.stringify({ type: 'tool/call', data: { callId: 'w0', name: 'write', arguments: JSON.stringify({ path: 'drt_fixture/question.md', content: '# Q' }) } }),
    JSON.stringify({ type: 'tool/call', data: { callId: 'c1', name: 'web_fetch', arguments: JSON.stringify({ url: realUrl }) } }),
    JSON.stringify({ type: 'tool/result', data: { message: { toolCallId: 'c1', role: 'tool', content: [{ type: 'text', text: `Fetched ${realUrl} (HTTP 200)\n\nSPECrate2017_int_base = 228 见 ${realUrl}` }] } } }),
    JSON.stringify({ type: 'tool/call', data: { callId: 'c2', name: 'web_fetch', arguments: JSON.stringify({ url: 'https://blog.example.org/post-x' }) } }),
    JSON.stringify({ type: 'tool/result', data: { message: { toolCallId: 'c2', role: 'tool', content: [{ type: 'text', text: 'Fetched https://blog.example.org/post-x (HTTP 200)\n\n博客全文 https://blog.example.org/post-x' }] } } }),
  ].join('\n');
  writeFileSync(join(sessions, 'session.v4.jsonl'), log);
  // 证据文件 A：契约完整 + URL 可溯源 + 摘录可回溯
  const urlA = forged ? 'https://forged.example.com/never-fetched' : realUrl;
  writeFileSync(join(bundle, 'evidence', 'ev-a.md'), `---\nsource_url: ${urlA}\nretrieved_at: 2026-09-25\nquality: A\nfound_by: analyst\nsupports: T1\nsource_tier: primary\npublisher: example.com\n---\n\n# A\n\n## 原文摘录\n\n> SPECrate2017_int_base = 228 见 ${realUrl}\n\n## 解读\n\n初步判断。\n`);
  // 证据文件 B：无 frontmatter（存量散文式）——契约不符 MAJOR；正文 URL 可溯源
  // derived=true → 同域但路径是派生态（域名抓过、该路径没抓过）——应判 MAJOR「仅域名可溯源」，不是伪造
  const urlB = derived ? 'https://blog.example.org/post-y-never-fetched' : 'https://blog.example.org/post-x';
  writeFileSync(join(bundle, 'evidence', 'ev-b.md'), `# B（散文式存量）\n\n来源：${urlB}\n`);
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
  assert.equal(r.stats.urlOk, 2, '两个 URL 都在 web 工具事件里（A 的 spec + B 的 blog）');
  assert.equal(r.stats.srcFetched, 1, 'A 的 source_url 真抓过（web_fetch 成功）');
  assert.equal(r.stats.srcNeverFetched, 0, '干净夹具里没有"声明却没抓"的 source_url');
});

test('B 的正文 URL 不在语料 → 伪造链接 CRITICAL（URL 溯源只认工具事件）', () => {
  const { bundle, sessions } = fixture();
  // 显式拿掉 blog 的工具事件（模拟"模型口述过但从未真取"）
  const logPath = join(sessions, 'session.v4.jsonl');
  writeFileSync(logPath, readFileSync(logPath, 'utf8').split('\n').filter((l) => !l.includes('blog.example.org/post-x')).join('\n'));
  const r = auditBundle(bundle, sessions);
  const forged = r.findings.filter((f) => f.kind === '伪造链接/未溯源');
  assert.equal(forged.length, 1, 'ev-b.md 的域名与 URL 都不在任何工具事件 → CRITICAL');
  assert.equal(forged[0].file, 'ev-b.md');
});

test('同域但路径未抓过 → MAJOR「仅域名可溯源」，不是伪造（三档判据的第二档）', () => {
  const { bundle, sessions } = fixture({ derived: true });
  const r = auditBundle(bundle, sessions);
  const derived = r.findings.filter((f) => f.kind === '仅域名可溯源');
  assert.equal(derived.length, 1, '域名在语料里、该路径不在 → MAJOR 而非 CRITICAL');
  assert.equal(r.criticalCount, 0, '域名抓过就不该判伪造');
});

test('source_url 只出现在搜索结果、没真抓过 → MAJOR（契约要"真实抓取过"，原审计只查"出现过"）', () => {
  const { bundle, sessions } = fixture();
  // 把 A 的 source_url 换成一个只在 web_search 结果里出现过的 URL（抓过的是另一个）
  const evA = join(bundle, 'evidence', 'ev-a.md');
  const raw = readFileSync(evA, 'utf8').replace(/^source_url: .*$/m, 'source_url: https://search-only.example.net/hit');
  writeFileSync(evA, raw);
  const logPath = join(sessions, 'session.v4.jsonl');
  writeFileSync(logPath, readFileSync(logPath, 'utf8') + '\n' + JSON.stringify({ type: 'tool/result', data: { message: { toolCallId: 'c1', role: 'tool', content: [{ type: 'text', text: '搜索结果含 https://search-only.example.net/hit' }] } } }));
  const r = auditBundle(bundle, sessions);
  const hit = r.findings.filter((f) => f.kind === 'source_url 未抓取' && f.file === 'ev-a.md');
  assert.equal(hit.length, 1, '未真抓过的 source_url → MAJOR 单列');
  assert.equal(r.criticalCount, 0, '它出现在 web 事件里，所以不是伪造（只是没抓）');
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

test('final.md 挪进 final/ → MAJOR 位置违约，但链检查仍执行（第五场 run 实测漂移的回归钉）', () => {
  const { bundle, sessions } = fixture();
  // 把根 final.md 挪进 final/ —— 第五场 lead 的真实形态
  mkdirSync(join(bundle, 'final'), { recursive: true });
  renameSync(join(bundle, 'final.md'), join(bundle, 'final', 'final.md'));
  const r = auditBundle(bundle, sessions);
  const hit = r.findings.filter((f) => f.kind === '当前版位置违约');
  assert.equal(hit.length, 1, '当前版不在 run 根 → MAJOR 单列（契约钉死在 run 根）');
  assert.equal(r.criticalCount, 0, '位置违约不是伪造');
  assert.ok(r.stats.finalRefs >= 1, '链检查不能因位置漂移而丢——仍要对实际位置执行');
});

test('final.md 两处都没有 → CRITICAL 防空语料（原版静默跳过 = 检查不存在）', () => {
  const { bundle, sessions } = fixture();
  rmSync(join(bundle, 'final.md'));
  const r = auditBundle(bundle, sessions);
  const hit = r.findings.filter((f) => f.kind === '防空语料');
  assert.equal(hit.length, 1, '没有 final.md 必须报，不许静默跳过');
  assert.equal(r.criticalCount, 1, 'final 缺席 = CRITICAL（不是"0/0 通过"）');
  assert.equal(r.stats.finalRefs, 0, '确实无对象可查');
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

test('语料窗：跨 run 会话的 URL 不得为本 run 作证（slug 窗过滤——审计 P3 件⑧）', () => {
  const { bundle } = fixture();
  // 另一个 run 的会话（日志不含 drt_fixture slug）：抓取了一个"只在此处出现"的 URL
  const crossSessions = join(TMP, 'sessions', 'g2', 's2');
  mkdirSync(crossSessions, { recursive: true });
  const crossUrl = 'https://crossrun.example.com/only-here';
  writeFileSync(join(crossSessions, 'session.v4.jsonl'), [
    JSON.stringify({ type: 'tool/call', data: { callId: 'x1', name: 'web_fetch', arguments: JSON.stringify({ url: crossUrl }) } }),
    JSON.stringify({ type: 'tool/result', data: { message: { toolCallId: 'x1', role: 'tool', content: [{ type: 'text', text: `Fetched ${crossUrl} (HTTP 200)\n\n跨 run 内容 ${crossUrl}` }] } } }),
  ].join('\n'));
  // 本 run 证据卡把跨 run URL 记为 source_url——窗外语料不得替它作证
  writeFileSync(join(bundle, 'evidence', 'ev-cross.md'), `---\nsource_url: ${crossUrl}\nretrieved_at: 2026-09-25\nquality: A\nfound_by: analyst\nsupports: T1\nsource_tier: primary\npublisher: crossrun.example.com\n---\n\n# 跨 run 引用\n\n## 原文摘录\n\n> 跨 run 内容 ${crossUrl}\n\n## 解读\n\n不应被窗外语料作证。\n`);
  const r = auditBundle(bundle, join(TMP, 'sessions'));
  const forged = r.findings.filter((f) => f.kind === '伪造链接/未溯源' && f.file === 'ev-cross.md');
  assert.equal(forged.length, 1, `窗外会话的 URL 不得作证（跨 run 污染面）：${JSON.stringify(r.findings)}`);
  assert.ok(r.stats.windowFiles >= 1 && !r.stats.windowFiles.toString().includes('2'), `窗内文件数应只含本 run 会话：${r.stats.windowFiles}`);
});
