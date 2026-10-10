#!/usr/bin/env node
// dev/egress-proxy.mjs — 自旋本地转发代理 CLI（TUN 态 DSH fetch 出口；核心 = scripts/lib/egress-proxy.mjs）。
// 家与验收 = _backlog/issues/2026-10-10-egress-mode-probe.md。用法：node dev/egress-proxy.mjs [--port 14200]
// → 打印 LISTENING 行后常驻。boot-run 以本 shell 子进程方式拉起，其 cleanup 的 pkill -P $$ 随 web 一并回收；
// 端口缺省 14200（port-exclusive 门禁认领——单文件独占）。
import { createEgressProxy } from '../scripts/lib/egress-proxy.mjs';

const argv = process.argv.slice(2);
const argOf = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; }
const PORT = Number(argOf('port', '14200'))

const { port } = await createEgressProxy({ port: PORT })
console.log(`egress-proxy: LISTENING 127.0.0.1:${port}`)
process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
await new Promise(() => {})
