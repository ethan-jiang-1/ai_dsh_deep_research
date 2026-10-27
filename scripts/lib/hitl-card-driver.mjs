/** Revalidate the target Session and ask card in the same DOM turn as each action. */
// hitl-card-driver.mjs — HITL 问询卡的**浏览器内**驱动片段（Playwright `page.evaluate` 的入参）。
//
// 从 dev/hitl-answer.mjs 原样搬出（2026-10-28 Phase C）：它本就是被序列化进页面的纯 DOM 函数
// ——不闭包任何模块变量（targetSessionId/expectedCardKey/action 等全部走参数），所以搬出来零
// 语义变化，只是让 717 行的驱动壳回到"编排"本职。
//
// 为什么住 lib 而不是 dev/：它是判据的**执行面**（问卡可见性、选项结构、提交/推进按钮的可用性），
// 与 lib/ask-drive（判据面）成对；dev/hitl-answer 只负责打开会话、按判据结果点击与对账。
//
// 契约：返回 `{ ready, reason, ...观察值 }`；**不得**在这里做业务判定（选哪个选项、能不能交付
// 由 lib/ask-drive 的决定函数给）。改动本函数即改浏览器行为，必须跑一次真实 HITL 卡验证。
export function operateOnTargetCard({ targetSessionId, expectedCardKey, action = 'identity', index, value, expectedLabels }) {
  // ⚠ expectedLabels 必须在这里绑定：click-option 分支的"题面未变"校验引用它，而它是**未绑定即抛
  // ReferenceError**（2026-10-16 实卡现场：`expectedLabels is not defined`）。存取自 e42155b 引入校验时
  // 漏绑，此后一直潜伏——只在"必须点选项"的卡上才被求值（预选推荐项的卡直接走 Submit 分支，故从未暴露）。
  const visible = (element) => {
    for (let current = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current)
      // `display: contents` 的元素**不生成盒子**——rect 恒 0×0 是布局语义，不是"隐藏"
      // （2026-10-16 实测根因：DSH web 的会话容器外有三层 display:contents 包装，旧判据据此把
      //  可见会话判成 `active-session-unavailable` → 拒绝代答 exit 3 → client-hitl-smoke ⑤b/⑤c
      //  连跑四次恒红。零盒祖先必须跳过尺寸检查，其余隐藏信号照查。）
      if (style.display === 'none' || style.visibility === 'hidden'
        || style.opacity === '0' || current.getAttribute('aria-hidden') === 'true') return false
      if (style.display === 'contents') continue
      const rect = current.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return false
    }
    return true
  }
  const active = [...document.querySelectorAll('[data-conversation-content]')].filter(visible)
  if (active.length !== 1) return { ready: false, reason: active.length === 0 ? 'active-session-unavailable' : 'active-session-ambiguous' }
  if (active[0].getAttribute('data-conversation-session') !== targetSessionId) return { ready: false, reason: 'active-session-mismatch' }
  const selected = [...document.querySelectorAll('[data-row-key^="session:"][aria-selected="true"]')].filter(visible)
  if (selected.length !== 1) return { ready: false, reason: selected.length === 0 ? 'session-row-not-selected' : 'session-row-ambiguous' }
  if (selected[0].getAttribute('data-row-key') !== `session:${targetSessionId}`) return { ready: false, reason: 'session-row-ambiguous' }
  if (action === 'session') return { ready: true, reason: null }
  const composers = [...active[0].querySelectorAll('[data-conversation-region="composer"]')].filter(visible)
  const cards = composers.flatMap((composer) => [...composer.querySelectorAll('[data-question-key], [data-plan-review-key]')].filter(visible))
  if (cards.length === 0) return { ready: false, reason: 'ask-card-unavailable' }
  if (cards.length !== 1) return { ready: false, reason: 'ask-card-ambiguous' }
  const card = cards[0]
  const cardKey = card.getAttribute('data-question-key') ?? card.getAttribute('data-plan-review-key')
  if (cardKey !== expectedCardKey) return { ready: false, reason: 'ask-card-mismatch' }
  if (action === 'identity') return { ready: true, reason: null, cardKey }
  const groups = [...card.querySelectorAll('[role="radiogroup"]')]
  if (groups.length > 1) return { ready: false, reason: 'radio-group-ambiguous' }
  // 锚点选择（2026-10-16 实卡修正）：radiogroup **真的含 radio** 时才以它为锚（选项题面，逐项校验用）；
  // 零 radio 题面（纯文本题 / 可选题）以 **card** 为锚——否则"向上找 Submit/Next/Skip"会从**已翻过去的
  // 旧题容器**出发，找不到当前题的按钮（实测：HITL2 Q2 可选文本题的 Skip 恒找不到 → 每次点击 ready=false
  // → 驱动静默空转到步数用尽，表现成"共作答 N 题 / 未走到 Submit"而盘侧仍挂起）。
  const radiosIn = (el) => [...el.querySelectorAll('button[role="radio"]')]
  const group = groups.length === 1 && radiosIn(groups[0]).length > 0 ? groups[0] : card
  const radios = group === card ? [] : radiosIn(group)
  const labels = radios.map((button) => (button.textContent ?? '').trim())
  // 纯文本题面（2026-10-16 实卡触发：HITL2 卡 Q1 = 自由文本题，逐题翻页形态——1 个 textarea +
  // 「Next」推进钮、零 radio）。旧实现要求恰一个 radiogroup 且从中取 radios，于是这题报
  // radioCount=0 → 判据层 abort「无选项可读」→ 整张卡答不了。现在：零 radio 一律按文本题面观察，
  // 由判据层（lib/ask-drive）决定填文本；推进钮认 Next/继续（**仅零 radio 时**，选项题面照旧只认 Submit）。
  if (radios.length === 0 && (action === 'observe' || action === 'custom')) {
    const fields = [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible)
    if (action === 'custom') {
      if (fields.length !== 1) return { ready: false, reason: fields.length === 0 ? 'custom-field-unavailable' : 'custom-field-ambiguous' }
      const field = fields[0]
      if (field.disabled) return { ready: false, reason: 'custom-field-disabled' }
      const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value)
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      return { ready: true, reason: null, filled: true }
    }
    // 终局提交（Submit/提交）与推进钮（Next/继续/Skip/跳过）**分开报**（2026-10-16 实卡修正）：
    // 旧版把两者并成一个集合，于是"Skip 可用 + Submit 禁用"被报成可提交，点击面又因两个匹配
    // 落空 → 驱动静默空转 8 轮（诊断实录：btns=[…, "Skip", "Submit(禁用)"]，submit=true/false）。
    const all = [...card.querySelectorAll('button')]
    const finals = all.filter((b) => /^(Submit|提交)$/i.test((b.textContent ?? '').trim()))
    const advances = all.filter((b) => /^(Next|继续|下一题|Skip|跳过)$/i.test((b.textContent ?? '').trim()))
    return {
      ready: true, reason: null, radioCount: 0, checkedCount: 0, checkedIndex: null,
      labels: [], checkedLabel: null,
      submitFound: finals.length === 1,
      submitDisabled: finals.length !== 1 || !!finals[0].disabled,
      advanceFound: advances.length >= 1,
      advanceDisabled: advances.length === 0 || advances.every((b) => b.disabled),
      textFieldAvailable: fields.length === 1,
      textValue: fields.length === 1 ? String(fields[0].value ?? '') : null,
    }
  }
  if (groups.length !== 1) return { ready: false, reason: 'radio-group-unavailable' }
  if (action === 'observe') {
    let scope = group
    let submits = []
    for (let up = 0; up < 4 && scope && submits.length === 0; up++) {
      scope = scope.parentElement
      if (scope === null || !card.contains(scope)) break
      submits = [...scope.querySelectorAll('button')].filter((button) => /^(Submit|提交)$/i.test((button.textContent ?? '').trim()))
    }
    if (submits.length > 1) return { ready: false, reason: 'submit-ambiguous' }
    const checkedRadios = radios.filter((button) => button.getAttribute('aria-checked') === 'true')
    const checked = checkedRadios[0] ?? null
    return {
      ready: true,
      reason: null,
      radioCount: radios.length,
      checkedCount: checkedRadios.length,
      checkedIndex: checked === null ? null : radios.indexOf(checked),
      labels: radios.map((button) => (button.textContent ?? '').trim()),
      checkedLabel: checked === null ? null : (checked.textContent ?? '').trim(),
      submitFound: submits.length === 1,
      submitDisabled: submits.length === 1 && !!submits[0].disabled,
      ...(() => {
        const adv = [...card.querySelectorAll('button')].filter((b) => /^(Next|继续|下一题|Skip|跳过)$/i.test((b.textContent ?? '').trim()))
        return { advanceFound: adv.length >= 1, advanceDisabled: adv.length === 0 || adv.every((b) => b.disabled) }
      })(),
      textFieldAvailable: [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible).length === 1,
      textValue: null,
    }
  }
  if (action === 'click-option') {
    if (Array.isArray(expectedLabels) && (expectedLabels.length !== radios.length
      || expectedLabels.some((label, i) => label !== labels[i]))) {
      return { ready: false, reason: 'question-options-changed' }
    }
    if (!Number.isInteger(index) || index < 0 || index >= radios.length) return { ready: false, reason: 'radio-index-unavailable' }
    const radio = radios[index]
    radio.scrollIntoView({ block: 'center' })
    radio.click()
    let prompt = group
    for (let up = 0; up < 4 && prompt.parentElement !== null && card.contains(prompt.parentElement); up++) prompt = prompt.parentElement
    return {
      ready: true,
      reason: null,
      label: (radio.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
      prompt: (prompt.textContent ?? '').replace(/\s+/g, ' ').slice(0, 140),
    }
  }
  if (action === 'click-advance') {
    // 推进钮可能**同时**有 Skip 与 Next（2026-10-16 实卡实测：两个都可用 → 旧版判 ambiguous 而停）。
    // 按 UI 自身语义定序，取第一个"在场且可用"的：**文本域有正文 → 先 Next（带正文推进）；
    // 空 → 先 Skip（跳过可选题）**。定序后不再有歧义分支。
    const field = [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible)[0] ?? null
    const hasText = field !== null && String(field.value ?? '').trim() !== ''
    const order = hasText ? ['Next', '继续', '下一题', 'Skip', '跳过'] : ['Skip', '跳过', 'Next', '继续', '下一题']
    // ⚠ 逐层搜、每层按序找（2026-10-16 自伤修正）：旧版从 radiogroup 起搜且"pool 非空即停"，
    // 于是只看到该题自身的选项钮——**卡片层的 Skip/Next 永远看不到**（实测 advance-unavailable）。
    let scope = group
    for (let up = 0; up < 5 && scope !== null; up++) {
      const buttons = [...scope.querySelectorAll('button')].filter((b) => !b.disabled)
      for (const want of order) {
        const hit = buttons.find((b) => (b.textContent ?? '').trim().toLowerCase() === want.toLowerCase())
        if (hit === undefined) continue
        hit.scrollIntoView({ block: 'center' })
        hit.click()
        return { ready: true, reason: null, clicked: true, kind: 'advance', label: want }
      }
      scope = scope.parentElement
      if (scope === null || !card.contains(scope)) break
    }
    return { ready: false, reason: 'advance-unavailable' }
  }
  if (action === 'click-submit') {
    const re = /^(Submit|提交)$/i // 推进钮（Next/Skip…）走 click-advance——此处只点终局提交
    const submits = []
    if (radios.length === 0) {
      // 零 radio 题面：锚点就是 card（见上面的锚点选择），而本函数是"从锚点**向上**找"——
      // 从 card 往上第一步就跳出卡片（`!card.contains(scope)`）⇒ 永远找不到按钮、静默空转。
      // 故零 radio 时**直接在 card 内找**（2026-10-17 自检卡实测：卡在 Q2 空转 7 轮）。
      submits.push(...[...card.querySelectorAll('button')].filter((button) => re.test((button.textContent ?? '').trim())))
    } else {
      let scope = group
      for (let up = 0; up < 4 && scope !== null && submits.length === 0; up++) {
        scope = scope.parentElement
        if (scope === null || !card.contains(scope)) break
        submits.push(...[...scope.querySelectorAll('button')].filter((button) => re.test((button.textContent ?? '').trim())))
      }
    }
    if (submits.length !== 1) return { ready: false, reason: submits.length === 0 ? 'submit-unavailable' : 'submit-ambiguous' }
    if (submits[0].disabled) return { ready: false, reason: 'submit-disabled' }
    const text = (submits[0].textContent ?? '').trim()
    // 逐题翻页形态（2026-10-16 实卡）：零 radio 时按钮可能是「Next/继续」——**翻页 ≠ 提交**，
    // 报 kind 让驱动继续循环（旧行为把翻页当终局提交 → 提前 break → answer 未落地）。
    const kind = /^(Next|继续|下一题|Skip|跳过)$/i.test(text) ? 'advance' : 'final'
    submits[0].scrollIntoView({ block: 'center' })
    submits[0].click()
    return { ready: true, reason: null, clicked: true, kind }
  }
  if (action === 'custom') {
    const fields = [...card.querySelectorAll('textarea, input[type="text"]')].filter(visible)
    if (fields.length !== 1) return { ready: false, reason: fields.length === 0 ? 'custom-field-unavailable' : 'custom-field-ambiguous' }
    const field = fields[0]
    if (field.disabled) return { ready: false, reason: 'custom-field-disabled' }
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value)
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    return { ready: true, reason: null, filled: true }
  }
  return { ready: false, reason: 'action-unavailable' }
}
