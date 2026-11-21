// port.mjs — 端口参数的唯一解析正本（BUG-333–336）。
// 规则：只接受十进制整数 1–65535（去首尾空白）；0 / 负数 / 小数 / 科学计数 / 空 / 非数字
// 一律红。调用方负责把 error 打到入口并 exit 2（本函数不退出进程）。
export function parsePort(raw) {
  const text = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim()
  if (!/^[0-9]+$/.test(text)) return { ok: false, error: `端口必须是 1–65535 的整数（收到 ${JSON.stringify(raw)}）` }
  const port = Number(text)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: `端口必须是 1–65535 的整数（收到 ${JSON.stringify(raw)}）` }
  }
  return { ok: true, port }
}
