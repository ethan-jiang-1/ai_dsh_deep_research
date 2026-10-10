// scripts/lib/egress-proxy.mjs — 自旋本地 HTTP 代理核心（CONNECT 隧道 + 绝对 URI 转发）。
// 用途：TUN/fake-IP 态给 DSH web_fetch 设代理出口——代理侧经 OS 解析（fake-IP → TUN 透明
// 路由，OS 级 HTTP 通则本代理必通），DSH 的 SSRF 守卫在代理路由下不再做本地公网校验
// （vendor util/http-proxy proxyRouteFor 读 http_proxy/https_proxy；机理见 issue 卡）。
// 家与验收 = _backlog/_archived/settled_issues/2026-10-10-egress-mode-probe.md；CLI = dev/egress-proxy.mjs。
// 回环机制测试 = tests/egress-proxy.test.mjs（证明隧道转发；不证明真实外网可达）。

import { createServer, request as httpRequest } from 'node:http';
import { connect as netConnect } from 'node:net';

/**
 * 起一个只绑回环的转发代理。
 *
 * @param {{port?: number, host?: string}} options - port 0 = 临时端口（由返回值报告）。
 * @returns {Promise<{server: object, port: number, close: () => Promise<void>}>}
 */
export function createEgressProxy({ port = 0, host = '127.0.0.1' } = {}) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // 绝对 URI 形式（http 代理的普通转发；https 由 CONNECT 承担）
      if (!/^http:\/\//.test(req.url ?? '')) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('egress-proxy: 仅接受 http:// 绝对 URI 或 CONNECT');
        return;
      }
      const target = new URL(req.url);
      const headers = { ...req.headers };
      delete headers['proxy-connection'];
      const upstream = httpRequest(
        {
          hostname: target.hostname,
          port: target.port || 80,
          path: target.pathname + target.search,
          method: req.method,
          headers,
        },
        (up) => {
          res.writeHead(up.statusCode ?? 502, up.headers);
          up.pipe(res);
        },
      );
      upstream.on('error', () => {
        try { res.writeHead(502, { 'content-type': 'text/plain' }); res.end('egress-proxy: upstream error'); } catch { /* 响应头已发则无法重写——pipe 已断 */ }
      });
      req.pipe(upstream);
    });

    server.on('connect', (req, clientSocket, head) => {
      const [targetHost, targetPort] = String(req.url ?? '').split(':');
      const upstream = netConnect({ host: targetHost, port: Number(targetPort) || 443 }, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length > 0) upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
      });
      upstream.on('error', () => { clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); });
      clientSocket.on('error', () => upstream.destroy());
    });

    server.on('error', reject);
    server.listen(port, host, () => {
      resolve({
        server,
        port: server.address().port,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}
