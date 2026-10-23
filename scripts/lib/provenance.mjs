// provenance.mjs — evidence/<id>.md 的离线来源证明（C-lite；keyless 纯 fs）。
//
// 为什么存在：审计的真相根是会话语料；语料缺席时 bundle 只能自述。provenance/<id>.json
// 让一条证据可离线复核：来源类型（web / local-file / command）+ URL/路径 + sha256 + 时间 +
// 通道 + 原文切片。它不是批准证据，也不替代 audit；只把“来源是什么”从散文变成可校对的声明。
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

export const PROVENANCE_KINDS = ['web', 'local-file', 'command']

/** 文件 sha256（缺席/不可读 → null，不抛）。 */
export function sha256OfFile(path) {
  try { return createHash('sha256').update(readFileSync(path)).digest('hex') } catch { return null }
}

/**
 * 读并校验 provenance/：返回 { records, findings }。
 * records: Map<evidenceId, record>（只含 JSON 可解析且 kind 合法的项）；findings: evidence-audit 同形。
 * 校验：kind 闭集 / local-file 的 path+sha256 必须匹配 / 对应 evidence/<id>.md 必须在场 /
 *       orphan JSON / 非法 JSON / 缺 retrieved_at 或 channel。
 */
export function provenanceOf(bundleDir) {
  const dir = join(bundleDir, 'provenance')
  const records = new Map()
  const findings = []
  if (!existsSync(dir)) return { records, findings }
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const id = basename(f, '.json')
    let rec
    try { rec = JSON.parse(readFileSync(join(dir, f), 'utf8')) } catch {
      findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 不可解析', detail: 'JSON 解析失败' })
      continue
    }
    if (!existsSync(join(bundleDir, 'evidence', `${id}.md`))) {
      findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 孤儿', detail: `没有 evidence/${id}.md` })
    }
    if (!PROVENANCE_KINDS.includes(rec?.kind)) {
      findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 非法 kind', detail: `kind=${String(rec?.kind)}（允许 ${PROVENANCE_KINDS.join('/')}）` })
      continue
    }
    if (typeof rec.retrieved_at !== 'string' || rec.retrieved_at.trim() === '') {
      findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 缺时间', detail: 'retrieved_at 缺席' })
    }
    if (typeof rec.channel !== 'string' || rec.channel.trim() === '') {
      findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 缺通道', detail: 'channel 缺席' })
    }
    if (rec.kind === 'local-file') {
      if (typeof rec.path !== 'string' || rec.path.trim() === '') {
        findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 缺路径', detail: 'local-file 需要 path' })
      } else if (/^([a-zA-Z]:)?[\\/]/.test(rec.path)) {
        findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 绝对路径', detail: 'local-file path 必须相对 run 根/仓根' })
      } else {
        const actual = sha256OfFile(join(bundleDir, rec.path))
        if (actual === null) findings.push({ level: 'CRITICAL', file: `provenance/${f}`, kind: 'local-file 缺席', detail: `读不到 ${rec.path}` })
        else if (typeof rec.sha256 !== 'string' || rec.sha256.toLowerCase() !== actual) {
          findings.push({ level: 'CRITICAL', file: `provenance/${f}`, kind: 'local-file 哈希不符', detail: `声明 ${String(rec.sha256).slice(0, 12)}… / 实际 ${actual.slice(0, 12)}…` })
        }
      }
    }
    if (rec.kind === 'web' && typeof rec.url !== 'string') {
      findings.push({ level: 'MAJOR', file: `provenance/${f}`, kind: 'provenance 缺 URL', detail: 'web 需要 url' })
    }
    records.set(id, rec)
  }
  return { records, findings }
}
