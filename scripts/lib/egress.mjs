// scripts/lib/egress.mjs — egress 模式判定核心（纯函数 + 注入式 IO）。
// 家与验收矩阵 = _backlog/_archived/settled_issues/2026-10-10-egress-mode-probe.md；合同叙述 = guides/61 §0.1。
// 真 IO 的 CLI = dev/egress-probe.mjs（dev 工具态；本文件不调用 fetch，回归层可 import）。
// 为什么必须走 getaddrinfo 路径：DSH SSRF 守卫（vendor web-fetch-http/src/network.ts）用
// node:dns/promises 的 lookup({all:true, order:'verbatim'}) 逐答案校验公网性——探针注入的
// lookup 实现必须与该调用形状一致，dig/resolv.conf 直查的可见性可能不同，测错路径 = 判错态。
// 分类语义与守卫同款：任一答案非公网 → 该主机整体 walled（守卫对混合答案集整体拒绝）。

const V4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const v4ToLong = (a, b, c, d) => (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
const maskOf = (bits) => (bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0);

/** IPv4 保留/非单播段：[基址, 前缀长]——含 fake-IP 工具常用的 198.18/15（RFC 2544）。 */
const V4_RESERVED = [
  [v4ToLong(0, 0, 0, 0), 8], [v4ToLong(10, 0, 0, 0), 8], [v4ToLong(100, 64, 0, 0), 10],
  [v4ToLong(127, 0, 0, 0), 8], [v4ToLong(169, 254, 0, 0), 16], [v4ToLong(172, 16, 0, 0), 12],
  [v4ToLong(192, 0, 0, 0), 24], [v4ToLong(192, 0, 2, 0), 24], [v4ToLong(192, 88, 99, 0), 24],
  [v4ToLong(192, 168, 0, 0), 16], [v4ToLong(198, 18, 0, 0), 15], [v4ToLong(198, 51, 100, 0), 24],
  [v4ToLong(203, 0, 113, 0), 24], [v4ToLong(224, 0, 0, 0), 4], [v4ToLong(240, 0, 0, 0), 4],
];

/**
 * 地址是否公网单播。v4-mapped v6 按内嵌 v4 判；NAT64（64:ff9b::/96）保守判非公网
 * （守卫侧另做 NAT64 翻译校验，探针宁可保守判 tun 也不误判 direct）。
 *
 * @param {string} address - 文本 IPv4/IPv6 地址。
 * @returns {boolean} 仅公网单播返回 true。
 */
export function isPublicIp(address) {
  if (typeof address !== 'string') return false;
  const v4 = V4_RE.exec(address);
  if (v4 !== null) {
    const octets = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])];
    if (octets.some((n) => n > 255)) return false;
    const value = v4ToLong(...octets);
    return !V4_RESERVED.some(([base, bits]) => ((value & maskOf(bits)) >>> 0) === base);
  }
  const v6 = address.toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v6);
  if (mapped !== null) return isPublicIp(mapped[1]);
  if (!/^[0-9a-f:]+$/.test(v6) || !v6.includes(':')) return false; // 非 IP 文本不落穿
  if (v6 === '::' || v6 === '::1') return false;
  if (v6.startsWith('100:')) return false; // 丢弃前缀
  if (v6.startsWith('64:ff9b:')) return false; // NAT64——保守非公网
  if (/^fe[89ab]/.test(v6)) return false; // 链路本地 fe80::/10
  if (/^f[cd]/.test(v6)) return false; // ULA fc00::/7
  if (v6.startsWith('ff')) return false; // 组播
  if (v6.startsWith('2001:db8')) return false; // 文档段
  return true;
}

/**
 * 按 DSH 守卫同款语义分类一组 DNS 答案。
 *
 * @param {Array<{address: string, family: number}> | null} answers - lookup({all:true}) 的答案集。
 * @returns {'public' | 'reserved' | 'empty'} 全部答案公网 → public；任一非公网 → reserved；无答案 → empty。
 */
export function classifyAnswers(answers) {
  if (!Array.isArray(answers) || answers.length === 0) return 'empty';
  return answers.every((entry) => isPublicIp(entry?.address)) ? 'public' : 'reserved';
}

/** 探针缺省主机：稳定、全球任播、双主机防单点抖动。 */
export const DEFAULT_PROBE_HOSTS = ['example.com', 'www.cloudflare.com'];

/**
 * 判定 egress 模式。判定序：OS 级 HTTP 不通 → offline（DNS 形态无关）；否则按 DNS 分类——
 * 任一主机 public → direct；全主机 reserved → tun；解析全错 → 回落 direct（零变化默认，
 * anomaly 标记）。
 *
 * @param {{hosts?: string[], lookup?: Function, checkHttp?: Function}} deps - 注入式 IO（tests 传 mock）。
 * @returns {Promise<{mode: 'direct'|'tun'|'offline', detail: object}>}
 */
export async function probeEgressMode(deps = {}) {
  const hosts = deps.hosts ?? DEFAULT_PROBE_HOSTS;
  const httpOk = await deps.checkHttp();
  if (httpOk !== true) return { mode: 'offline', detail: { httpOk: false } };
  const perHost = [];
  for (const host of hosts) {
    try {
      const answers = await deps.lookup(host, { all: true, order: 'verbatim' });
      perHost.push({ host, kind: classifyAnswers(answers), addresses: answers.map((a) => a.address) });
    } catch (error) {
      perHost.push({ host, kind: 'error', error: String(error?.code ?? error?.message ?? error) });
    }
  }
  const anyPublic = perHost.some((r) => r.kind === 'public');
  const anyReserved = perHost.some((r) => r.kind === 'reserved');
  const mode = anyPublic || !anyReserved ? 'direct' : 'tun';
  return {
    mode,
    detail: {
      httpOk: true,
      perHost,
      anomaly: !anyPublic && !anyReserved ? 'all-lookup-error' : null,
    },
  };
}
