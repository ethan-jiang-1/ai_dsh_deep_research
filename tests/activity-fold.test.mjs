// activity-fold 回归 — journal 事件 → 人性化活动行（keyless；四类出行 + 噪音过滤）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldActivityRows } from '../packages/deep-research-pack/src/lib/activity-fold.ts';

const ev = (type, data = {}, time) => ({ type, data, time });
const call = (name, args, time) => ev('tool/call', { name, arguments: JSON.stringify(args) }, time);

test('四类出行事件 → 四类行', () => {
  const rows = foldActivityRows([
    call('web_search', { queries: ['国产CPU性能对比'] }, 't1'),
    call('spawn_teammate', { name: 'probe-scout', description: '广度侦察' }, 't2'),
    ev('assistant/message', { message: { content: [{ type: 'text', text: '已完成 T1 的取证，三条证据全部可溯源。' }] } }, 't3'),
    call('present', {}, 't4'),
  ]);
  assert.deepEqual(rows.map((r) => r.icon), ['🔍', '👥', '💬', '📦']);
  assert.match(rows[0].text, /国产CPU性能对比/);
  assert.match(rows[1].text, /probe-scout.*广度侦察/);
  assert.match(rows[2].text, /已完成 T1 的取证/);
  assert.equal(rows[3].text, '交付声明');
});

test('web_search 多词入参（queries 数组——wire 权威形状，录制流实证）', () => {
  const rows = foldActivityRows([call('web_search', { queries: ['DSH harness', 'DeepSeek plugin'] })]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].text, /DSH harness · DeepSeek plugin/);
});

test('wait_agent → 队员作业中行（G2：静默区页签不全静）；连续重复折叠为一行', () => {
  const rows = foldActivityRows([
    call('spawn_teammate', { name: 'scout', description: '广度侦察' }, 't1'),
    call('wait_agent', {}, 't2'),
    call('wait_agent', {}, 't3'),
    call('wait_agent', {}, 't4'),
  ]);
  assert.deepEqual(rows.map((r) => r.text), ['派出 scout：广度侦察', '队员作业中——等待返回']);
});

test('活动行剥 markdown 强调符（G3 同款：源标记不出正文）', () => {
  const rows = foldActivityRows([ev('assistant/message', { message: { content: [{ type: 'text', text: '组队决策：**两线并行**，`核查` 后置进场' }] } })]);
  assert.equal(rows[0].text, '组队决策：两线并行，核查 后置进场');
});

test('噪音事件不出行（step/turn/session/system/permission/user/其他工具）', () => {
  const rows = foldActivityRows([
    ev('step/start'), ev('step/end'), ev('turn/start'), ev('turn/end'),
    ev('session/title'), ev('session'), ev('system/message'), ev('permission/preset'),
    ev('user/message', { message: { content: [{ type: 'text', text: '用户消息' }] } }),
    call('tool-todo', {}), call('tool-fs', {}), call('list_agents', {}),
    ev('assistant/message', { message: { content: [] } }),  // 空正文 → 不出行
    call('web_search', { queries: [] }),                     // 空数组 → 不出行
    call('web_search', { queries: ['   '] }),                // 全空白词 → 不出行
  ]);
  assert.equal(rows.length, 0, `噪音应全过滤，得到 ${rows.length} 行`);
});

test('尾部保留 30 行（一屏能扫完）', () => {
  const events = Array.from({ length: 50 }, (_, i) => call('web_search', { queries: [`q${i}`] }));
  const rows = foldActivityRows(events);
  assert.equal(rows.length, 30);
  assert.match(rows[0].text, /q20/);
  assert.match(rows[rows.length - 1].text, /q49/);
});

test('畸形输入 fail-soft 不崩', () => {
  assert.equal(foldActivityRows([]).length, 0);
  assert.equal(foldActivityRows([null, undefined, 'x', 42, {}]).length, 0);
  // arguments 是截断 JSON → 不出行不崩
  assert.equal(foldActivityRows([ev('tool/call', { name: 'web_search', arguments: '{"queries":["截' })]).length, 0);
  // queries 非字符串成员 → 过滤后空 → 不出行
  assert.equal(foldActivityRows([call('web_search', { queries: [42, null] })]).length, 0);
});
