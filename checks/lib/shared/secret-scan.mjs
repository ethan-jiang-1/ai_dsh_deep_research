/**
 * secret-scan — 交付物里的高置信凭据形态检测（纯文本，不读盘）。
 *
 * 为什么只收高置信模式：研究证据经常引用安全题材的示例代码/文档；`token=`、`api_key=` 这类
 * 泛化词会大面积误伤，把正常交付判红。这里只认**格式本身即凭据**的形态；报告只给
 * `path/line/kind`，不回显命中原文（否则扫描器自己成了泄漏面）。
 *
 * 边界：这是交付物的**最后一道**卫生检查，不是完整的秘密治理；证据卡里的引用由作者负责。
 */
const PATTERNS = [
  { kind: 'provider-key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { kind: 'github-token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/ },
  { kind: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { kind: 'slack-token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { kind: 'private-key', re: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/ },
  { kind: 'bearer-token', re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
]

/**
 * 单段文本的命中（行号 1-based；只给 kind/line）。
 * @param {string} text
 * @returns {Array<{kind: string, line: number}>}
 */
export function findSecrets(text) {
  const out = []
  const lines = String(text).split('\n')
  for (const [index, line] of lines.entries()) {
    for (const { kind, re } of PATTERNS) {
      if (re.test(line)) out.push({ kind, line: index + 1 })
    }
  }
  return out
}

/**
 * 扫描 `{path,text}` 列表；返回带路径的命中（按 path/line/kind 排序，去重同 kind 同行）。
 * @param {Array<{path: string, text: string}>} entries
 * @returns {Array<{path: string, kind: string, line: number}>}
 */
export function scanSecrets(entries) {
  const out = []
  for (const { path, text } of entries) {
    const seen = new Set()
    for (const hit of findSecrets(text)) {
      const key = `${String(hit.line)}:${hit.kind}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ path, ...hit })
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line))
}

/** 人类可读的一行（绝不带命中原文）。 */
export function formatSecretFinding(finding) {
  return `${finding.path}:${String(finding.line)}  ${finding.kind}（高置信凭据形态；值已隐去）`
}
