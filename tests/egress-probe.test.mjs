// tests/egress-probe.test.mjs — egress 三态判定核心的注入式契约测试。
// 家 = scripts/lib/egress.mjs（核心）；设计与验收矩阵 = _backlog/_archived/settled_issues/2026-10-10-egress-mode-probe.md；
// 真 IO 的 CLI = dev/egress-probe.mjs（dev 工具态，不进回归层）。分类语义与 vendor SSRF 守卫同款：
// 逐主机**全部**答案公网才算该主机可过（守卫对混合答案集整体拒绝——network.ts 逐答案校验）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIp, classifyAnswers, probeEgressMode } from '../scripts/lib/egress.mjs';

test('isPublicIp：公网 / 保留段 / 回环 / fake-IP 段判定', () => {
  assert.equal(isPublicIp('93.184.216.34'), true);
  assert.equal(isPublicIp('151.101.131.42'), true);
  assert.equal(isPublicIp('2606:4700::1'), true);
  assert.equal(isPublicIp('198.18.0.7'), false); // fake-IP 段（TUN 态标志，RFC 2544 benchmark 段）
  assert.equal(isPublicIp('198.19.255.1'), false);
  assert.equal(isPublicIp('10.1.2.3'), false);
  assert.equal(isPublicIp('172.16.0.1'), false);
  assert.equal(isPublicIp('192.168.1.1'), false);
  assert.equal(isPublicIp('127.0.0.1'), false);
  assert.equal(isPublicIp('169.254.1.1'), false);
  assert.equal(isPublicIp('100.64.0.1'), false);
  assert.equal(isPublicIp('224.0.0.1'), false);
  assert.equal(isPublicIp('::1'), false);
  assert.equal(isPublicIp('fe80::1'), false);
  assert.equal(isPublicIp('fd00::1'), false);
  assert.equal(isPublicIp('::ffff:10.0.0.1'), false); // v4-mapped 按内嵌 v4 判
  assert.equal(isPublicIp('::ffff:93.184.216.34'), true);
  assert.equal(isPublicIp('not-an-ip'), false);
  assert.equal(isPublicIp('999.1.1.1'), false);
});

test('classifyAnswers：守卫同款语义——任一答案非公网，整集判 walled', () => {
  assert.equal(classifyAnswers([{ address: '93.184.216.34', family: 4 }]), 'public');
  assert.equal(classifyAnswers([{ address: '198.18.0.7', family: 4 }]), 'reserved');
  // 混合集：守卫逐答案校验会拒——分类必须同样保守
  assert.equal(
    classifyAnswers([{ address: '2606:4700::1', family: 6 }, { address: '198.18.0.7', family: 4 }]),
    'reserved',
  );
  assert.equal(classifyAnswers([]), 'empty');
  assert.equal(classifyAnswers(null), 'empty');
});

test('probeEgressMode：三态注入判定（direct / tun / offline）', async () => {
  const lookupPublic = async () => [{ address: '93.184.216.34', family: 4 }];
  const lookupFake = async () => [{ address: '198.18.0.7', family: 4 }];
  const httpOk = async () => true;
  const httpDown = async () => false;

  assert.equal((await probeEgressMode({ lookup: lookupPublic, checkHttp: httpOk })).mode, 'direct');
  assert.equal((await probeEgressMode({ lookup: lookupFake, checkHttp: httpOk })).mode, 'tun');
  // offline 优先于 DNS 判定：OS 层不通即无网，DNS 形态无关
  assert.equal((await probeEgressMode({ lookup: lookupPublic, checkHttp: httpDown })).mode, 'offline');
  assert.equal((await probeEgressMode({ lookup: lookupFake, checkHttp: httpDown })).mode, 'offline');
});

test('probeEgressMode：双主机混合与异常回落', async () => {
  const httpOk = async () => true;
  // 任一主机全部答案公网 → direct（该主机证明守卫可过）
  const mixed = async (host) =>
    host === 'example.com' ? [{ address: '93.184.216.34', family: 4 }] : [{ address: '198.18.0.7', family: 4 }];
  assert.equal((await probeEgressMode({ lookup: mixed, checkHttp: httpOk })).mode, 'direct');
  // HTTP 通但解析全错 → 回落 direct（零变化默认）+ anomaly 标记
  const lookupThrow = async () => {
    throw Object.assign(new Error('lookup failed'), { code: 'EAI_AGAIN' });
  };
  const result = await probeEgressMode({ lookup: lookupThrow, checkHttp: httpOk });
  assert.equal(result.mode, 'direct');
  assert.equal(result.detail.anomaly, 'all-lookup-error');
});
