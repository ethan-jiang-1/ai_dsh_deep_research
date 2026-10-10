#!/usr/bin/env node
// scripts/smoke/egress-proxy-smoke.mjs — 自旋本地代理的回环机制冒烟（keyless，零外网、零凭据）。
// 为什么是 smoke 不是 tests/*.test.mjs：代理核心 import node:http/net——layering ③ 禁止 tests
// import 闭包引入网络内置（与 port-reclaim 之 spawnSync 同款归属：能力件住 smoke 道）。
// 家与验收 = _backlog/_archived/settled_issues/2026-10-10-egress-mode-probe.md（验收 #2）。
// verdict 契约：绿/红/未跑三态（数码正本 = scripts/AGENTS 冒烟脚本可靠性纪律，此处不复述）。

import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { createServer as createTcpServer, connect as tcpConnect } from 'node:net';
import { createEgressProxy } from '../lib/egress-proxy.mjs';

const once = (emitter, event) => new Promise((resolve) => emitter.once(event, resolve));
const results = [];
const check = (name, ok) => { results.push({ name, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`); };

const tunnelTest = async () => {
  const echo = createTcpServer((socket) => { socket.pipe(socket); });
  echo.listen(0, '127.0.0.1');
  await once(echo, 'listening');
  const echoPort = echo.address().port;
  const proxy = await createEgressProxy({ port: 0 });
  try {
    const client = tcpConnect({ host: '127.0.0.1', port: proxy.port });
    await once(client, 'connect');
    client.write(`CONNECT 127.0.0.1:${echoPort} HTTP/1.1\r\nHost: 127.0.0.1:${echoPort}\r\n\r\n`);
    const handshake = await new Promise((resolve) => {
      let buffer = '';
      const onData = (chunk) => {
        buffer += String(chunk);
        if (buffer.includes('\r\n\r\n')) { client.off('data', onData); resolve(buffer); }
      };
      client.on('data', onData);
    });
    const handshakeOk = /^HTTP\/1\.1 200/.test(handshake);
    client.write('ping-through-tunnel');
    const echoed = await new Promise((resolve) => {
      const onData = (chunk) => {
        const text = String(chunk);
        if (text.includes('ping-through-tunnel')) { client.off('data', onData); resolve(text); }
      };
      client.on('data', onData);
    });
    client.destroy();
    check('CONNECT 隧道握手 200 + 字节双向透传', handshakeOk && echoed.includes('ping-through-tunnel'));
  } finally {
    await proxy.close();
    echo.close();
  }
};

const unreachableTest = async () => {
  const proxy = await createEgressProxy({ port: 0 });
  try {
    const client = tcpConnect({ host: '127.0.0.1', port: proxy.port });
    await once(client, 'connect');
    client.write('CONNECT 127.0.0.1:1 HTTP/1.1\r\nHost: 127.0.0.1:1\r\n\r\n');
    const handshake = await new Promise((resolve) => {
      let buffer = '';
      const onData = (chunk) => {
        buffer += String(chunk);
        if (buffer.includes('\r\n\r\n')) { client.off('data', onData); resolve(buffer); }
      };
      client.on('data', onData);
      setTimeout(() => resolve(buffer), 3000);
    });
    client.destroy();
    check('CONNECT 上游不可达回 502（fail-loud）', /^HTTP\/1\.1 502/.test(handshake));
  } finally {
    await proxy.close();
  }
};

const forwardTest = async () => {
  let seenPath = '';
  const origin = createHttpServer((req, res) => {
    seenPath = req.url ?? '';
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('origin-hello');
  });
  origin.listen(0, '127.0.0.1');
  await once(origin, 'listening');
  const originPort = origin.address().port;
  const proxy = await createEgressProxy({ port: 0 });
  try {
    const result = await new Promise((resolve, reject) => {
      const req = httpRequest(
        { host: '127.0.0.1', port: proxy.port, path: `http://127.0.0.1:${originPort}/fwd?a=1`, method: 'GET' },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ status: res.statusCode, data }));
        },
      );
      req.on('error', reject);
      req.end();
    });
    check('绝对 URI GET 转发（路径/查询原样到达源站）', result.status === 200 && result.data === 'origin-hello' && seenPath === '/fwd?a=1');
  } finally {
    await proxy.close();
    origin.close();
  }
};

console.log('── egress-proxy-smoke（回环机制，keyless）──');
await tunnelTest();
await unreachableTest();
await forwardTest();
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`egress-proxy-smoke: ${failed.length} FAILURE(S)`);
  process.exit(1);
}
console.log('egress-proxy-smoke: ALL PASS（回环转发机制——真实外网可达性属 B 态现场验收）');
process.exit(0);
