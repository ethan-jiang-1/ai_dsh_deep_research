/**
 * version-range — 只实现本包 `engines.dsh` 需要的 SemVer 子集（exact / >= / > / <= / < / ^ / ||）。
 *
 * 为什么不引 semver：pack 的 preflight 是安装副本里的零依赖脚本；为一条兼容声明拖入运行时
 * 依赖会破坏 peers-only 发布形状。这里覆盖的语法就是本包声明会用的语法；扩语法时同 diff
 * 扩测试（tests/pack/version-range.test.mjs）。
 */
const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

function parse(version) {
  const m = VERSION.exec(String(version).trim())
  if (m === null) return null
  return {
    nums: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] === undefined ? [] : m[4].split('.'),
  }
}

function cmpPre(a, b) {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1 // release > prerelease
  if (b.length === 0) return -1
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i]
    const y = b[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) return Number(x) - Number(y) < 0 ? -1 : 1
    if (xn) return -1
    if (yn) return 1
    return x < y ? -1 : 1
  }
  return 0
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) return a.nums[i] < b.nums[i] ? -1 : 1
  }
  return cmpPre(a.pre, b.pre)
}

/** @returns {boolean} 版本是否满足范围；非法版本/范围一律 false（fail closed）。 */
export function satisfiesVersion(version, range) {
  const v = parse(version)
  if (v === null || typeof range !== 'string' || range.trim() === '') return false
  for (const alternative of range.split('||')) {
    const tokens = alternative.trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue
    let ok = true
    for (const token of tokens) {
      const m = /^(>=|<=|>|<|=|\^)?(.+)$/.exec(token)
      const op = m?.[1] ?? '='
      const target = parse(m?.[2] ?? '')
      if (target === null) { ok = false; break }
      const c = cmp(v, target)
      if (op === '=' && c !== 0) ok = false
      else if (op === '>=' && c < 0) ok = false
      else if (op === '>' && c <= 0) ok = false
      else if (op === '<=' && c > 0) ok = false
      else if (op === '<' && c >= 0) ok = false
      else if (op === '^') {
        if (c < 0) ok = false
        else if (target.nums[0] === 0 ? v.nums[0] !== 0 || v.nums[1] !== target.nums[1] : v.nums[0] !== target.nums[0]) ok = false
      }
      if (!ok) break
    }
    if (ok) return true
  }
  return false
}
