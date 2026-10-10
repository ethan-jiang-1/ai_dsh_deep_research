#!/usr/bin/env node
// dev/egress-probe.mjs — egress 模式判定 CLI（真 IO；核心 = scripts/lib/egress.mjs 注入式，tests 可测核心）。
// 家与验收 = _backlog/issues/2026-10-10-egress-mode-probe.md；boot-run 自检消费 stdout 首行。
// 用法：node dev/egress-probe.mjs [--json] → stdout 首行 = direct|tun|offline（exit 0——模式是事实不是错误）。
// 探针自身故障兜底：任何异常打印 direct + stderr 说明——回落零变化默认，不拦 boot。
import { lookup } from 'node:dns/promises';
import { probeEgressMode } from '../scripts/lib/egress.mjs';

const json = process.argv.includes('--json');

// OS 级可达性：与 DSH fetch 同为 node 栈——TUN 态下 fake-IP 连接被透明路由（与 curl 同理可达），
// 直连态直连可达；双探针任一拿到响应（任意状态码）即算通。
const checkHttp = async () => {
  for (const url of ['https://example.com/', 'https://www.cloudflare.com/']) {
    try {
      await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(4000) });
      return true;
    } catch { /* 换下一个探针主机 */ }
  }
  return false;
};

try {
  const result = await probeEgressMode({ lookup, checkHttp });
  console.log(json ? JSON.stringify(result) : result.mode);
} catch (error) {
  console.error(`egress-probe: 探针自身故障，回落 direct（零变化默认）：${String(error?.message ?? error)}`);
  console.log('direct');
}
