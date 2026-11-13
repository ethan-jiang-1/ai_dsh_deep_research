// tests/probe-status-tab.spec.mjs —— cdp-probe 页签选择/打开判据的 keyless 契约
// （scripts/lib/probe-status-tab.mjs；2026-10-19 run-driver 落地时实测的假阳/假红正修）。
//
// 立红记录（反证）：①旧实现用 `textContent.includes('研究状态')` 选按钮——本测试的
// 「描述串入」用例在旧判据下会被选中（假阳）而新判据拒绝；②旧 `paneText` 取
// body.innerText 里「研究状态」首现处——会话正文提到该词即假阳，本测试的「会话正文含词、
// 页签体未渲染」用例在旧实现下调出正文（假阳），新判据返回 body 兜底空面 + statusPaneOpened
// 判 false。实现前跑本文件：import 失败即红（模块缺席）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickStatusTab, statusPaneOpened } from '../../scripts/lib/probe-status-tab.mjs';

const btn = (title, guideEntry = null, label = '') => ({ title, guideEntry, label });

test('pickStatusTab：guide-entry 胶囊按标题 span 精确命中（描述串不影响）', () => {
  const r = pickStatusTab({
    buttons: [
      btn('研究配置', 'research-config'),
      btn('研究状态', 'research-status'),
      btn('Workspace files', null),
    ],
    title: '研究状态',
  });
  assert.equal(r.pickedIndex, 1);
  assert.equal(r.reason, 'guide-entry');
});

test('pickStatusTab：拒绝描述串入——标题+描述整串不是标题', () => {
  // 旧判据（textContent.includes）会命中这条；新判据要求标题 span 逐字相等
  const r = pickStatusTab({
    buttons: [btn('研究状态研究 run 的步骤、等待与证据状态', 'research-status')],
    title: '研究状态',
  });
  assert.equal(r.pickedIndex, null);
  assert.equal(r.reason, 'not-found');
});

test('pickStatusTab：前缀/后缀近似标题也不命中（防止 "研究状态页" 之类误点）', () => {
  for (const near of ['研究状态页', '旧研究状态', '研究状态 ']) {
    const r = pickStatusTab({ buttons: [btn(near, 'research-status')], title: '研究状态' });
    assert.equal(r.pickedIndex, null, `近似标题「${near}」不该命中`);
  }
});

test('pickStatusTab：无 guide-entry 钩子时退化为 title-span 匹配（页签已渲染在别处）', () => {
  const r = pickStatusTab({
    buttons: [btn('New session'), btn('研究状态')],
    title: '研究状态',
  });
  assert.equal(r.pickedIndex, 1);
  assert.equal(r.reason, 'title-span');
});

test('pickStatusTab：空按钮表 → not-found（防空语料：扫不到不许当命中）', () => {
  assert.equal(pickStatusTab({ buttons: [], title: '研究状态' }).reason, 'not-found');
  assert.equal(pickStatusTab({ buttons: undefined, title: '研究状态' }).reason, 'not-found');
});

test('pickStatusTab：稳定 guide-entry id 优先于本地化标题（英文界面也能选中）', () => {
  // 2026-11-05 实测：DSH 界面 locale 跟随浏览器（headless = en-US），右栏胶囊标题变成
  // Research Status/Research Graph；按中文标题匹配会假红。vendor 的 data 钩子值是稳定的
  // research-status / research-graph，与语言无关——它才是身份，标题只用来做断言。
  const r = pickStatusTab({
    buttons: [btn('Research Config', 'research-config'), btn('Research Status', 'research-status')],
    title: ['研究状态', 'Research Status'],
    entry: 'research-status',
  });
  assert.equal(r.pickedIndex, 1);
  assert.equal(r.reason, 'guide-entry-id');
  assert.equal(r.title, 'Research Status');
});

test('pickStatusTab：entry id 命中同标题的另一个胶囊时按 id 而不是标题选', () => {
  const r = pickStatusTab({
    buttons: [btn('研究状态', 'research-graph'), btn('研究状态', 'research-status')],
    title: '研究状态',
    entry: 'research-status',
  });
  assert.equal(r.pickedIndex, 1);
});

test('pickStatusTab：title 接受多语言候选（英文界面回退命中）', () => {
  const r = pickStatusTab({
    buttons: [btn('Research Status', 'research-status')],
    title: ['研究状态', 'Research Status'],
  });
  assert.equal(r.pickedIndex, 0);
  assert.equal(r.reason, 'guide-entry');
});

test('statusPaneOpened：只认页签体在场，不认会话正文', () => {
  assert.equal(statusPaneOpened({ tabBodies: ['研究状态\n🎯 尚未确认'] }), true);
  // 会话正文提到「研究状态」≠ 页签打开——旧 paneText 会在这里假阳
  assert.equal(statusPaneOpened({ tabBodies: [] }), false);
  assert.equal(statusPaneOpened({ tabBodies: ['', ''] }), false);
  assert.equal(statusPaneOpened({}), false);
});
