// verdict-audit-core.mjs — claim 级裁决（`review/claims.json` / `review/verdicts-r<N>.json`）的纯判据层。
//
// 为什么存在：交付判据过去只有 `review.md` 的一段 `readiness: PASS`（报告级 prose）。要机械回答
// 「每条关键结论都被独立核过吗、核成什么、裁决有没有被改」，需要 claim 级 typed 工件 + 覆盖门。
// 契约正本 = `_backlog/research/quality-loop/2026-11-10-verdict-contract.md` §5（本文件是唯一解析/判据实现，
// 改形状 = 同 diff 改契约与测试；模板 `content/templates/run/claims.json|verdicts.json` 与解析键由测试钉死）。
//
// 边界（写进报告页脚，防过度声称）：
//   · 只核**工件完整性**——覆盖、值域、原文一致、表内条目真实（claim 必须是 final 原句）、child 身份；
//   · **不核** quote 是否真支持 claim、claim 表是否漏了关键句、source tier 配不配、readiness 整篇判断；
//   · 会话日志不可读时只核文件自洽并打 warning（`session-missing`），不假装核过原文。
//
// 分层同 evidence-audit-core：本文件**无 fs / 无子进程 / 无网络**——会话事实与文件文本由 CLI 壳注入，
// tests 直调（keyless）。哈希由本层算、由门禁记；模型不填哈希（本仓 Lead 没有 bash）。
import { createHash } from 'node:crypto'
import { readinessOf } from './node-gate-contracts.mjs'

/** 四值裁决（contract §4.2）。 */
export const VERDICT_VALUES = ['supported', 'partially_supported', 'unsupported', 'unverifiable']
/** 结论性裁决：有它就算覆盖（`unverifiable` 不算）。 */
export const CONCLUSIVE_VERDICTS = new Set(['supported', 'partially_supported', 'unsupported'])
/** 复核轮次上限：r1 首验、r2 复验；超限升级，不加轮（contract §4.5）。 */
export const MAX_ROUNDS = 2
/** 新契约 run 的 claim 覆盖强制日（epoch 豁免：此日前的 bundle 与 quick_factual 不判）。 */
export const CLAIMS_CONTRACT_DATE = '2026-11-11'
/** 验证者不该有的手（critic 有 fs 写能力，靠审计事后核）。 */
export const WRITE_TOOLS = /^(write|edit|bash)$/

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')
const nonEmptyString = (v) => typeof v === 'string' && v.trim() !== ''

/** 空白归一（claim↔final 的包含判据）。 */
export const normalizeText = (s) => String(s ?? '').replace(/\s+/gu, ' ').trim()

/** 去掉 `[来源: …]` 标记再归一——claim 是从 final 抄的句子，标记不该影响「表内条目真实」。 */
export const stripCitations = (text) => normalizeText(String(text ?? '').replace(/\[来源\s*:[^\]]*\]/gu, ' '))

/** 原文一致口径：只去**结尾**空白（文件尾随换行不是「改了」；内部一个字节都不许动）。 */
export const normalizeVerbatim = (s) => String(s ?? '').replace(/\s+$/u, '')

/** 文本 sha256（claims / verdicts 文件哈希的唯一实现；门禁报告消费）。 */
export const sha256Text = (text) => createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex')

const parseJson = (text, code) => {
  if (typeof text !== 'string' || text.trim() === '') return { value: null, problems: [{ code, detail: '文件为空' }] }
  try {
    return { value: JSON.parse(text), problems: [] }
  } catch (error) {
    return { value: null, problems: [{ code, detail: `JSON 不可解析：${String(error?.message ?? error)}` }] }
  }
}

/**
 * 解析并校验 claim 表。
 * @param text `review/claims.json` 全文。@returns {{value:{finalRef:number,claims:object[]}|null, problems:Array<{code,detail}>}}
 */
export function parseClaims(text) {
  const { value, problems } = parseJson(text, 'claims-invalid')
  if (value === null) return { value: null, problems }
  if (!isPlainObject(value)) return { value: null, problems: [{ code: 'claims-invalid', detail: '顶层必须是对象' }] }
  for (const key of Object.keys(value)) {
    if (!['version', 'finalRef', 'claims'].includes(key)) problems.push({ code: 'claims-invalid', detail: `未知字段 ${key}（形状 = version/finalRef/claims）` })
  }
  if (value.version !== 1) problems.push({ code: 'claims-invalid', detail: `version 必须是 1（实际 ${JSON.stringify(value.version)}）` })
  if (!Number.isSafeInteger(value.finalRef) || value.finalRef < 1) problems.push({ code: 'claims-invalid', detail: 'finalRef 必须是 final/v<N> 的正整数 N' })
  if (!Array.isArray(value.claims) || value.claims.length === 0) {
    problems.push({ code: 'claims-invalid', detail: 'claims 必须是非空数组' })
    return { value: null, problems }
  }
  const ids = new Set()
  const claims = []
  for (const [i, raw] of value.claims.entries()) {
    const where = `claims[${i}]`
    if (!isPlainObject(raw)) { problems.push({ code: 'claims-invalid', detail: `${where} 必须是对象` }); continue }
    for (const key of Object.keys(raw)) {
      if (!['id', 'text', 'critical', 'topics', 'evidence', 'urls'].includes(key)) problems.push({ code: 'claims-invalid', detail: `${where} 未知字段 ${key}` })
    }
    if (!nonEmptyString(raw.id)) problems.push({ code: 'claims-invalid', detail: `${where}.id 必须是非空字符串` })
    else if (ids.has(raw.id)) problems.push({ code: 'claims-invalid', detail: `${where}.id 重复：${raw.id}` })
    else ids.add(raw.id)
    if (!nonEmptyString(raw.text)) problems.push({ code: 'claims-invalid', detail: `${where}.text 必须是非空字符串` })
    if (raw.critical !== undefined && typeof raw.critical !== 'boolean') problems.push({ code: 'claims-invalid', detail: `${where}.critical 必须是布尔` })
    for (const key of ['topics', 'evidence', 'urls']) {
      if (raw[key] !== undefined && !isStringArray(raw[key])) problems.push({ code: 'claims-invalid', detail: `${where}.${key} 必须是字符串数组` })
    }
    claims.push({
      id: raw.id,
      text: raw.text,
      critical: raw.critical === true,
      topics: raw.topics ?? [],
      evidence: raw.evidence ?? [],
      urls: raw.urls ?? [],
    })
  }
  if (problems.length > 0) return { value: null, problems }
  return { value: { finalRef: value.finalRef, claims }, problems }
}

/**
 * 解析一轮裁决文件。
 * @param text `review/verdicts-r<N>.json` 全文。
 * @returns {{value:{round:number,batches:object[],verdicts:object[]}|null, problems:Array}}
 */
export function parseVerdicts(text) {
  const { value, problems } = parseJson(text, 'verdicts-invalid')
  if (value === null) return { value: null, problems }
  if (!isPlainObject(value)) return { value: null, problems: [{ code: 'verdicts-invalid', detail: '顶层必须是对象' }] }
  for (const key of Object.keys(value)) {
    if (!['version', 'round', 'batches', 'verdicts'].includes(key)) problems.push({ code: 'verdicts-invalid', detail: `未知字段 ${key}（形状 = version/round/batches/verdicts）` })
  }
  if (value.version !== 1) problems.push({ code: 'verdicts-invalid', detail: `version 必须是 1（实际 ${JSON.stringify(value.version)}）` })
  if (!Number.isSafeInteger(value.round) || value.round < 1) problems.push({ code: 'verdicts-invalid', detail: 'round 必须是正整数' })
  if (!Array.isArray(value.batches) || value.batches.length === 0) {
    problems.push({ code: 'verdicts-invalid', detail: 'batches 必须是非空数组（一个 child 一批）' })
    return { value: null, problems }
  }
  if (!Array.isArray(value.verdicts)) {
    problems.push({ code: 'verdicts-invalid', detail: 'verdicts 必须是数组' })
    return { value: null, problems }
  }
  const batches = []
  for (const [i, raw] of value.batches.entries()) {
    const where = `batches[${i}]`
    if (!isPlainObject(raw)) { problems.push({ code: 'verdicts-invalid', detail: `${where} 必须是对象` }); continue }
    for (const key of Object.keys(raw)) {
      if (!['session', 'preset', 'depth', 'raw'].includes(key)) problems.push({ code: 'verdicts-invalid', detail: `${where} 未知字段 ${key}` })
    }
    if (!nonEmptyString(raw.session)) problems.push({ code: 'verdicts-invalid', detail: `${where}.session 必须是非空字符串（child 会话 id）` })
    if (!nonEmptyString(raw.preset)) problems.push({ code: 'verdicts-invalid', detail: `${where}.preset 必须是非空字符串` })
    if (!Number.isSafeInteger(raw.depth) || raw.depth < 0) problems.push({ code: 'verdicts-invalid', detail: `${where}.depth 必须是 >=0 的整数` })
    if (typeof raw.raw !== 'string' || raw.raw.trim() === '') problems.push({ code: 'verdicts-invalid', detail: `${where}.raw 必须是 child 最终正文原文` })
    batches.push({ session: raw.session, preset: raw.preset, depth: raw.depth, raw: raw.raw })
  }
  const verdicts = []
  for (const [i, raw] of value.verdicts.entries()) {
    const where = `verdicts[${i}]`
    if (!isPlainObject(raw)) { problems.push({ code: 'verdicts-invalid', detail: `${where} 必须是对象` }); continue }
    for (const key of Object.keys(raw)) {
      if (!['claim_id', 'batch', 'verdict', 'quote', 'reason', 'rechecked_urls', 'source_tier_ok'].includes(key)) problems.push({ code: 'verdicts-invalid', detail: `${where} 未知字段 ${key}` })
    }
    if (!nonEmptyString(raw.claim_id)) problems.push({ code: 'verdicts-invalid', detail: `${where}.claim_id 必须是非空字符串` })
    if (!Number.isSafeInteger(raw.batch)) problems.push({ code: 'verdicts-invalid', detail: `${where}.batch 必须是整数批次下标` })
    if (raw.rechecked_urls !== undefined && !isStringArray(raw.rechecked_urls)) problems.push({ code: 'verdicts-invalid', detail: `${where}.rechecked_urls 必须是字符串数组` })
    if (raw.source_tier_ok !== undefined && typeof raw.source_tier_ok !== 'boolean') problems.push({ code: 'verdicts-invalid', detail: `${where}.source_tier_ok 必须是布尔` })
    verdicts.push({
      claim_id: raw.claim_id,
      batch: raw.batch,
      verdict: raw.verdict,
      quote: raw.quote,
      reason: raw.reason,
      rechecked_urls: raw.rechecked_urls ?? [],
      source_tier_ok: raw.source_tier_ok,
    })
  }
  if (problems.length > 0) return { value: null, problems }
  return { value: { round: value.round, batches, verdicts }, problems }
}

/** `raw` 里一条裁决的投影（只取受核字段；用于与文件里的 verdicts 比对）。 */
const projectRawVerdict = (item) => ({
  claim_id: item?.claim_id,
  verdict: item?.verdict,
  quote: item?.quote,
  reason: item?.reason,
  rechecked_urls: item?.rechecked_urls ?? [],
  source_tier_ok: item?.source_tier_ok,
})

/** 文件里一条裁决的投影（同形，便于逐字比较）。 */
const projectFileVerdict = (v) => ({
  claim_id: v.claim_id,
  verdict: v.verdict,
  quote: v.quote,
  reason: v.reason,
  rechecked_urls: v.rechecked_urls ?? [],
  source_tier_ok: v.source_tier_ok,
})

/**
 * 审计一个 bundle 的 claim 级裁决。
 * @param {object} input
 * @param {boolean} [input.required] 新契约 run（epoch 内、非 quick_factual）= true；false 时缺工件不判红。
 * @param {string|null} [input.claimsText] `review/claims.json` 全文。
 * @param {Array<{round:number,text:string}>} [input.rounds] 各轮 `review/verdicts-r<N>.json` 全文（乱序可）。
 * @param {number|null} [input.finalVersion] 盘上最高 `final/v<N>`；与 claims.finalRef 比对。
 * @param {string|null} [input.finalText] `final/v<claims.finalRef>.md` 全文。
 * @param {string|null} [input.reviewText] `review.md` 全文。
 * @param {Record<string,{preset:string|null,depth:number|null,parentSession:string|null,assistantTexts:string[],toolNames:string[]}>} [input.sessions] child 会话事实（CLI 注入）。
 * @returns {{problems:Array<{code:string,detail:string}>,warnings:Array<{code:string,detail:string}>,stats:object}}
 */
export function auditClaimVerdicts({
  required = false,
  claimsText = null,
  rounds = [],
  finalVersion = null,
  finalText = null,
  reviewText = null,
  sessions = {},
} = {}) {
  const problems = []
  const warnings = []
  const stats = {
    applicable: false, claims: 0, critical: 0, rounds: 0, verdicts: 0,
    covered: 0, unverified: 0, unsupported: 0, claimsSha256: null, verdictsSha256: [],
  }
  const add = (code, detail) => problems.push({ code, detail })
  const warn = (code, detail) => warnings.push({ code, detail })

  const claimsPresent = typeof claimsText === 'string' && claimsText.trim() !== ''
  const verdictsPresent = Array.isArray(rounds) && rounds.length > 0
  if (!required && !claimsPresent && !verdictsPresent) {
    warnings.push({ code: 'legacy-not-applicable', detail: '无 claims/verdicts 且不属新契约 run——claim 覆盖不判（旧 bundle / quick_factual）' })
    return { problems, warnings, stats }
  }
  stats.applicable = true
  if (!claimsPresent) {
    add('no-claims', required
      ? '新契约 run 缺 review/claims.json（claim 表是覆盖判据的唯一事实源）'
      : '有 verdicts 却没有 claims——裁决无处对照')
    return { problems, warnings, stats }
  }
  stats.claimsSha256 = sha256Text(claimsText)
  const claimsParsed = parseClaims(claimsText)
  problems.push(...claimsParsed.problems)
  if (claimsParsed.value === null) return { problems, warnings, stats }
  const { finalRef, claims } = claimsParsed.value
  const byId = new Map(claims.map((c) => [c.id, c]))
  stats.claims = claims.length
  stats.critical = claims.filter((c) => c.critical).length
  if (stats.critical === 0) warn('no-critical', 'claim 表没有一条 critical——「全都不关键」通常是表做漏了（覆盖判据只看 critical）')

  if (Number.isSafeInteger(finalVersion) && finalVersion !== finalRef) {
    add('claims-stale', `claims.finalRef = v${finalRef}，盘上最高 final = v${finalVersion}——claim 表对的是旧稿`)
  }
  if (typeof finalText === 'string' && finalText.trim() !== '') {
    const haystack = stripCitations(finalText)
    for (const claim of claims) {
      if (!haystack.includes(stripCitations(claim.text))) {
        add('claim-not-in-final', `${claim.id} 的 text 不是 final/v${finalRef}.md 里的原句（去 [来源:] 与空白后仍不匹配）——claim 必须是抄来的，不是编的`)
      }
    }
  } else {
    warn('final-missing', `final/v${finalRef}.md 不可读——claim 原文核对未做`)
  }

  if (!verdictsPresent) {
    if (required || claimsPresent) add('no-verdicts', '缺 review/verdicts-r<N>.json（有 claim 表就必须有裁决）')
    return { problems, warnings, stats }
  }

  const parsedRounds = []
  for (const item of rounds) {
    const parsed = parseVerdicts(item.text)
    problems.push(...parsed.problems)
    if (parsed.value === null) continue
    if (parsed.value.round !== item.round) {
      add('round-mismatch', `文件名轮次 ${item.round} ≠ 头字段 round ${parsed.value.round}`)
    }
    stats.verdictsSha256.push({ round: item.round, sha256: sha256Text(item.text) })
    parsedRounds.push(parsed.value)
  }
  if (parsedRounds.length === 0) return { problems, warnings, stats }
  parsedRounds.sort((a, b) => a.round - b.round)
  const seen = new Set()
  for (const round of parsedRounds) {
    if (seen.has(round.round)) add('duplicate-round', `第 ${round.round} 轮出现两次——裁决 append-only，不许覆盖`)
    seen.add(round.round)
  }
  if (!seen.has(1)) add('no-round-1', '缺第 1 轮裁决（verdicts-r1.json）')
  for (const round of parsedRounds) {
    if (round.round > MAX_ROUNDS) add('rounds-exceeded', `出现第 ${round.round} 轮 > 上限 ${MAX_ROUNDS}——超限要升级，不许自己加轮磨平分歧`)
  }
  stats.rounds = parsedRounds.length
  const latest = parsedRounds.at(-1)

  // 逐轮：形状纪律 + batch 对照 + 原文重解析。
  const cursor = new Map()
  for (const round of parsedRounds) {
    const where = `verdicts-r${round.round}.json`
    const seenClaims = new Set()
    for (const verdict of round.verdicts) {
      const claim = byId.get(verdict.claim_id)
      if (claim === undefined) {
        add('verdict-orphan', `${where}：裁决指向不存在的 claim ${verdict.claim_id}`)
      }
      if (seenClaims.has(verdict.claim_id)) warn('verdict-duplicate', `${where}：${verdict.claim_id} 有多条裁决（取并集判覆盖，冲突需语义审）`)
      seenClaims.add(verdict.claim_id)
      if (!VERDICT_VALUES.includes(verdict.verdict)) {
        add('verdict-invalid', `${where}：${verdict.claim_id} 的 verdict ${JSON.stringify(verdict.verdict)} 不是 ${VERDICT_VALUES.join('/')}`)
      }
      if ((verdict.verdict === 'supported' || verdict.verdict === 'partially_supported') && !nonEmptyString(verdict.quote)) {
        add('verdict-invalid', `${where}：${verdict.claim_id} 判 ${verdict.verdict} 但没有 quote（原文支持句）`)
      }
      if (verdict.verdict === 'unsupported' && !nonEmptyString(verdict.reason)) {
        add('verdict-invalid', `${where}：${verdict.claim_id} 判 unsupported 但没有 reason`)
      }
      if (claim !== undefined && claim.urls.length > 0 && (verdict.verdict === 'supported' || verdict.verdict === 'partially_supported')
        && verdict.rechecked_urls.length === 0) {
        add('verdict-invalid', `${where}：${verdict.claim_id} 带 URL 却没有任何 rechecked_urls——重抓记录是仲裁的锚`)
      }
      if (!Number.isSafeInteger(verdict.batch) || verdict.batch < 0 || verdict.batch >= round.batches.length) {
        add('batch-orphan', `${where}：${verdict.claim_id} 的 batch=${JSON.stringify(verdict.batch)} 越界（批次 ${round.batches.length} 个）`)
      }
    }
    for (const [bi, batch] of round.batches.entries()) {
      let rawParsed = null
      try {
        rawParsed = JSON.parse(batch.raw)
      } catch {
        add('raw-reparse', `${where}：batches[${bi}].raw 不是可解析 JSON——原文必须是 child 逐字正文`)
      }
      if (rawParsed !== null) {
        if (!Array.isArray(rawParsed)) {
          add('raw-reparse', `${where}：batches[${bi}].raw 必须是裁决数组`)
        } else {
          const fileItems = round.verdicts.filter((v) => v.batch === bi)
          const rawIds = new Set()
          for (const item of rawParsed) {
            if (!isPlainObject(item)) { add('raw-reparse', `${where}：batches[${bi}].raw 含非对象条目`); continue }
            rawIds.add(item.claim_id)
            const fileItem = fileItems.find((v) => v.claim_id === item.claim_id)
            if (fileItem === undefined) {
              add('raw-reparse', `${where}：raw 里的 ${String(item.claim_id)} 在 verdicts 里没有对应行（原文与解析投影不一致）`)
              continue
            }
            if (JSON.stringify(projectRawVerdict(item)) !== JSON.stringify(projectFileVerdict(fileItem))) {
              add('raw-reparse', `${where}：${String(item.claim_id)} 的解析投影与 raw 原文不一致——手改解析面即红`)
            }
          }
          for (const v of fileItems) {
            if (!rawIds.has(v.claim_id)) add('raw-reparse', `${where}：verdicts 里的 ${v.claim_id} 在 raw 原文里找不到`)
          }
        }
      }
      // 会话面：身份 / 只读 / 原文一致（跨轮单调向后）。
      const facts = sessions[batch.session]
      if (!facts) {
        warn('session-missing', `${where}：找不到会话 ${batch.session} 的日志——只核到文件自洽，原文与身份未核`)
        continue
      }
      if (facts.preset !== batch.preset) {
        add('session-preset', `${where}：会话实际 preset=${String(facts.preset)} ≠ 声称 ${batch.preset}（验的人不是做的人）`)
      }
      if (!(typeof facts.depth === 'number' && facts.depth >= 1) || !nonEmptyString(facts.parentSession)) {
        add('session-depth', `${where}：会话 depth=${String(facts.depth)} / parentSession=${String(facts.parentSession)}——不是一次独立 child activation`)
      }
      for (const tool of facts.toolNames ?? []) {
        if (WRITE_TOOLS.test(tool)) add('verifier-wrote', `${where}：验证者会话调过 ${tool}（只读纪律是任务形状，调用即红）`)
      }
      const texts = Array.isArray(facts.assistantTexts) ? facts.assistantTexts : []
      const key = normalizeVerbatim(batch.raw)
      let matched = -1
      for (let i = (cursor.get(batch.session) ?? -1) + 1; i < texts.length; i += 1) {
        if (normalizeVerbatim(texts[i]) === key) { matched = i; break }
      }
      if (matched < 0) {
        add('not-verbatim', `${where}：batches[${bi}].raw 与该会话第 ${String((cursor.get(batch.session) ?? -1) + 2)} 条起的助手正文都不逐字相等——裁决必须原文落盘，且按轮次先后对应`)
      } else {
        cursor.set(batch.session, matched)
      }
    }
  }

  // 覆盖：只看**最新一轮**（旧轮是历史，不拿来充数）。
  const latestVerdicts = latest.verdicts
  const verdictOf = new Map()
  for (const verdict of latestVerdicts) if (!verdictOf.has(verdict.claim_id)) verdictOf.set(verdict.claim_id, verdict)
  let covered = 0
  let unverified = 0
  let unsupported = 0
  for (const claim of claims) {
    if (!claim.critical) continue
    const verdict = verdictOf.get(claim.id)
    if (verdict === undefined) {
      add('coverage-gap', `${claim.id}（critical）在最新一轮 r${latest.round} 没有裁决`)
      continue
    }
    if (verdict.verdict === 'unverifiable') {
      unverified += 1
      warn('unverified-critical', `${claim.id}（critical）判 unverifiable——可以交付但 readiness 只能 FAIL，且 HITL2 必须显形缺口`)
      continue
    }
    if (!CONCLUSIVE_VERDICTS.has(verdict.verdict)) {
      // 非法值已在逐轮纪律里报 verdict-invalid；这里只补「它不算覆盖」，不冒充 unverifiable。
      add('coverage-gap', `${claim.id}（critical）的裁决值非法/不是四值之一，不算覆盖`)
      continue
    }
    covered += 1
    if (verdict.verdict === 'unsupported') unsupported += 1
  }
  stats.covered = covered
  stats.unverified = unverified
  stats.unsupported = unsupported
  stats.verdicts = latestVerdicts.length

  // 终局 PASS 的读法**不在这里另写一份**：判据正本 = 门禁同源的 readinessOf（末条行首判定行生效，历史引用不夺权）。
  const passClaimed = typeof reviewText === 'string' && readinessOf(reviewText).pass
  if (typeof reviewText !== 'string' || reviewText.trim() === '') {
    warn('review-missing', 'review.md 不可读——readiness 与轮次引用未核')
  } else {
    if (!new RegExp(`verdicts-r${latest.round}\\b`, 'u').test(reviewText)) {
      add('review-round-ref', `review.md 没有引用最新一轮 verdicts-r${latest.round}——终局块要指向当前裁决`)
    }
    if (!passClaimed && /readiness[^\n]{0,16}[:：]\s*\*{0,2}PASS/u.test(reviewText)) {
      warn('readiness-unparsed', 'review.md 出现 readiness…PASS，但不是门禁认的终局判定行（末条行首判定行）——pass 相关检查未做（形状口径 = node-gate readinessOf）')
    }
  }
  if (passClaimed && unverified > 0) {
    add('pass-with-unverified', `review.md 写 PASS，但 ${unverified} 条 critical 判 unverifiable——不能把「带缺口的 PASS」写成 PASS（readiness 只能 FAIL）`)
  }
  if (passClaimed && unsupported > 0) {
    add('pass-with-unsupported', `review.md 写 PASS，但 ${unsupported} 条 critical 判 unsupported——报告仍带着验证者判否的结论`)
  }
  return { problems, warnings, stats }
}
