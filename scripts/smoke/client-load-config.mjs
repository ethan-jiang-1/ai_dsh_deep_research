// client-load-config.mjs — client-load 冒烟的「研究配置」面两相位（smoke 层支援件）。
// 被谁消费：scripts/smoke/client-load-smoke.mjs（唯一消费方，静态 import 调用两相位函数；
// 消费形态先例 = client-load-reference.mjs）。为什么独立成件（2026-10-21 相位化重构）：
// 这两相位验证的是**「研究配置」页签**（配置管理中继面 + 抛弃型自测例库），与主件的
// 渐进面/活动流/终稿相位不同面；单一 boot 入口与端口 3109 不变，不新增 smoke 面、不动
// route 表。怎么不改坏：两相位断言集 = client-load-smoke 的 pass-4/pass-6 原样搬迁（零
// 增删）；env 契约 = 主件传入的 { page, step, wait, root, rpc, base, cookie, sessionTitleArg,
// boundSession, unboundSession, awaitAppReady, openGuideCapsule, clickRowByText, paneTextOf,
// dialogTextOf }（主件文件级 helper 经 env 注入——本件不反向 import 主件，
// 防环；lib 依赖直接 import ../lib/）。keyless 契约同主件：零提示零发送——dev home 持
// 凭据，任何 session/prompt 都会唤醒真模型 lead（2026-10-13 事故实录）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandGroup, openSessionById, SIDEBAR_GROUP_CANDIDATES } from '../lib/web-ui-nav.mjs'
import { SELFTEST_LIBRARY } from '../lib/selftest-library.mjs'
import { METHOD_PRESETS_SKILL_PATH, methodPresetsFromSkillFile } from '../lib/method-presets.mjs'

/**
 * pass-4：「研究配置」页签（D25 期 1 管理中继面）——guide 胶囊在场 + 页签体渲染
 * （内置偏好只读表 + 偏好库空态/条目）。防"拼错不报错、永不渲染"（company 坑 1 的
 * 渲染级对账；keyed 字面量另由 client-keys 门禁静态对账）。
 * @param env - 主件注入的相位环境（契约见文件头注）；boundSession/unboundSession 为
 *   调用时刻的快照（主件 pass-1/pass-2 可能已改写它们）。
 */
export async function pass4ConfigTabPhase(env) {
  const { page, step, wait, root, sessionTitleArg, boundSession, unboundSession,
    awaitAppReady, openGuideCapsule, clickRowByText, paneTextOf, dialogTextOf } = env
  await awaitAppReady(page, 5_000)
  const targetTitle = sessionTitleArg ?? boundSession?.title ?? unboundSession?.title
  const openedC = targetTitle !== null && await clickRowByText(page, targetTitle)
  if (openedC) {
    await wait(3_000)
    // 胶囊在 guide 页（dock「New tab」打开）；已停靠的芯片也可点——两条路都试。
    const capOkC = await openGuideCapsule(page, 4_000, 10_000, 3_000)
    step(capOkC, '「研究配置」guide 胶囊在场（tab 类型注册成功 + guide 页可达）')
    if (capOkC) {
      const tc = await paneTextOf(page)
      const segC = tc.slice(tc.indexOf('研究配置'))
      // 内置名单从 skill 表**解析派生**（2026-10-18：原为手写四条字面量——skill 加一行而
      // 面板没渲染时它照样绿〔子集检查〕，是第四份手写副本；总卡发现 14）。解析器 =
      // scripts/lib/method-presets.mjs（与 tests/library-fold 共用同一入口）。
      const builtinNames = methodPresetsFromSkillFile(join(root, METHOD_PRESETS_SKILL_PATH)).map((row) => row.name)
      const missingBuiltin = builtinNames.filter((n) => !segC.includes(n))
      step(missingBuiltin.length === 0, '研究配置页签体：内置偏好全部在场（名单从 skill 表派生）',
        missingBuiltin.length > 0 ? `缺 ${missingBuiltin.join('、')}` : `${builtinNames.length} 条`)
      // 库区断言随库状态走（盘侧 method-library.md 真值）：空库 → 引导文案；有条目 → 条目名/默认徽标在场。
      const libFile = join(root, 'research-workspace', 'method-library.md')
      const hasEntries = existsSync(libFile) && /^## /m.test(readFileSync(libFile, 'utf8'))
      // 空态文案 2026-10-18 分两支（外部状态文案准则：无结果 ≠ 失败）：文件不在 = 「本工作区还没有
      // 偏好库」；文件在但空 = 「偏好库是空的」；读不回 = 「读不到 method-library.md」。
      const libOk = segC.includes('我的偏好库') && (hasEntries
        ? (segC.includes('格局调研') || segC.includes('默认偏好'))
        : (segC.includes('本工作区还没有偏好库') || segC.includes('偏好库是空的')))
      step(libOk, '研究配置页签体：偏好库区 = 盘侧库状态真值（空态引导 / 条目投影）', hasEntries ? '库有条目' : '库为空')
      // 显式化三面（子卡① ①-3／①-4，2026-10-18）——呈现位在场：
      //   ①「本次研究」区：五态之一如实在场（绑定会话多为 recorded，未绑定/旧 run 走其余态）
      //   ② 六条共同底线一行（正本 = skill 的共同底线句，同钉 = tests/library-fold）
      //   ③ 两个定制入口按钮 ＋ 推荐规则说明位 ＋ 每卡「什么时候用它」
      const zoneStateOk = ['本次研究：', '本会话暂无研究', 'question.md 不在', '未记录，不替你回填', '面板不猜']
        .some((s) => segC.includes(s))
      step(segC.includes('本次研究') && zoneStateOk, '「本次研究」区在场：本次采用/来源或四态如实文案')
      const baselineOk = ['任何打法都改不掉', '来源链', '逐字摘录', '独立信源', '日期校准', '缺口显式', 'readiness']
        .every((s) => segC.includes(s))
      step(baselineOk, '底线条：六条共同底线逐字在场（改不掉的边界显式化）')
      const entriesOk = ['让 Lead 帮我起草', '从本次 run 沉淀'].every((s) => segC.includes(s))
      step(entriesOk, '底线条：两个定制入口按钮在场')
      const ruleHintOk = segC.includes('推荐怎么算出来的') && segC.includes('什么时候用它：')
      step(ruleHintOk, '推荐规则说明位 ＋ 每卡「什么时候用它」在场（判型→打法可见）')
      // 回执区在场（①-2）：keyless 档禁止发送（2026-10-13 事故实录），三态**渲染**由
      // tests/receipt-fold 纯函数钉；此处只证回执区在场且三态词汇面向用户可辨。
      const receiptZoneOk = segC.includes('改动的回执会显示在这里') && segC.includes('已发送') && segC.includes('已回话') && segC.includes('已落盘')
      step(receiptZoneOk, '回执区在场（空闲态）：三态词汇可辨（已发送／已回话／已落盘）')
      const demoOk = segC.includes('领域示范（只读）') && segC.includes('投研尽调（示范）') && segC.includes('抄体例，不抄内容')
      step(demoOk, '领域示范（只读）：厚条目在场（四字段颗粒度可对照）')
      // 零上下文探针（2026-10-18）点出的三处高风险错读，逐条钉在场：
      //   ①「保存」类按钮必须写明是发给 Lead（面板不写文件）——否则用户以为已生效；
      //   ② 术语一句话表（研究偏好＝打法）与"指令 vs 回执"的机制说明；
      //   ③ 改动影响范围（之后的研究 vs 正在跑的那场）。
      const glossaryOk = segC.includes('一条「研究偏好」＝一条打法') && segC.includes('都是给 Lead 发一条指令')
      step(glossaryOk, '术语表在场：研究偏好＝打法 ＋ 指令/回执机制一行说清')
      // 详情 Modal（detail-ux 期 1.5）：点内置条目名称 → 四分区 + 内置操作在场 → 关闭。
      const nameBtn = page.getByRole('button', { name: /事实核查 ›/ }).first()
      if (await nameBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
        await nameBtn.click({ timeout: 5_000 }).catch(() => {})
        await wait(1_500)
        const modalText = (await dialogTextOf(page)) ?? ''
        const modalOk = ['找来源', '怎么核实', '报告怎么写', '不承诺', '基于此自定义', '用于本次研究'].every((s) => modalText.includes(s))
          && !modalText.includes('编辑内容')
        step(modalOk, '研究配置详情 Modal：四分区 + 内置操作在场（读态；内置无编辑入口）')
        const explicitOk = ['谁读它', '管不到', '任何打法都改不掉（共同底线）', '偏好只能往上加要求', '产出长这样', '什么时候会推荐它', '「基于此自定义」新建的副本同样受这六条约束', '「来源链」管的是']
          .every((s) => modalText.includes(s))
        step(explicitOk, '研究配置详情：执行面表（谁读它/在哪生效/管不到）＋ 底线块 ＋ 标本骨架 ＋ 推荐说明在场')
        await page.getByRole('button', { name: '关闭详情' }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_000)
      } else {
        step(false, '研究配置详情 Modal：条目名称钮不可见（渲染回归）')
      }
      // 库条目详情/编辑草稿/删除二次确认（detail-ux 期 1.5 验收行补全；库有条目才有对象）：
      // 编辑只到草稿层即放弃、删除只到确认层即取消——本组零发送；发送回执单独走下方
      // 抛弃型探针会话。
      if (hasEntries) {
        const libName = page.getByRole('button', { name: /格局调研 ›/ }).first()
        if (await libName.isVisible({ timeout: 6_000 }).catch(() => false)) {
          await libName.click({ timeout: 5_000 }).catch(() => {})
          await wait(1_500)
          let t = (await dialogTextOf(page)) ?? ''
          // 「无基于此自定义」按**角色**判按钮在场，不按文本判——2026-10-18 实测假红：
          // 底线块的说明句里合法地提到了「基于此自定义」这四个字（讲"自定义副本同样受底线约束"）。
          const builtinBtn = await page.getByRole('button', { name: '基于此自定义' }).count().catch(() => -1)
          const libModalOk = ['找来源', '怎么核实', '报告怎么写', '不承诺', '编辑内容', '用于本次研究', '来源：'].every((s) => t.includes(s))
            && builtinBtn === 0
          step(libModalOk, '研究配置详情 Modal（库条目）：四分区 + 编辑入口在场（读态，无「基于此自定义」）')
          // 编辑态：四分区草稿预填 + 单保存钮 + 放弃；放弃不发送
          await page.getByRole('button', { name: '编辑内容' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          // 作用域收窄（2026-10-16）：原为全页 `page.locator('textarea')`——页面里任何别的
          // textarea（实测：一个空 textarea 排在四分区之前）都会把计数顶成 5，断言红而产品正确。
          // 判据意图 = "编辑态恰有四分区草稿 + 单保存钮"，故锚在 Modal（role=dialog）内。
          const drafts = page.locator('[role="dialog"] textarea')
          const draftCount = await drafts.count().catch(() => 0)
          const draftPrefill = draftCount === 4 ? await drafts.first().inputValue().catch(() => '') : ''
          t = await paneTextOf(page)
          const editOk = draftCount === 4 && draftPrefill.includes('官方域优先')
            && ['把修改交给 Lead', '放弃'].every((s) => t.includes(s))
          step(editOk, '研究配置编辑态：四分区草稿预填 + 单保存钮在场', draftCount === 4 ? '草稿 4 区，首区预填' : `textarea ${draftCount} 区`)
          await page.getByRole('button', { name: '放弃' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          // 删除二次确认：⋯ 菜单 → 删除… → 确认 Modal → 取消（不发送）
          await page.getByRole('button', { name: '格局调研 的操作' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          const hasSetDefault = await page.getByRole('menuitem', { name: '设为默认' }).isVisible({ timeout: 4_000 }).catch(() => false)
          await page.getByRole('menuitem', { name: '删除…' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
          t = await paneTextOf(page)
          const confirmOk = t.includes('删除「格局调研」？') && t.includes('确认删除') && t.includes('取消')
          step(confirmOk && hasSetDefault, '研究配置删除：⋯ 菜单 → 二次确认 Modal 在场（取消不发送）', hasSetDefault ? '' : '「设为默认」菜单项缺席')
          // （2026-10-21 相位化搬迁时缩进修正：这两行原在主件贴片区缩进错位，语义与
          // 执行序不变——仍在「库条目名称钮可见」分支内、删除确认断言之后、取消点击之前。）
          const affectOk = segC.includes('改动影响的是') && segC.includes('结果看下面的回执')
          step(affectOk, '影响范围与指令机制在场：改动影响之后的研究 ＋ 换一条=发指令')
          await page.getByRole('button', { name: '取消' }).first().click({ timeout: 5_000 }).catch(() => {})
          await wait(1_000)
        } else {
          step(false, '研究配置库条目：名称钮不可见（渲染回归）')
        }

        // 发送链路断言（2026-10-13 自测轮移除）：面板→session/prompt→回执曾以「发给抛弃型
        // 探针会话」为安全假设——实测推翻：dev home 持有凭据，任何 session/prompt 都会唤醒
        // 真模型 lead（事故实录：探针壳里的 lead 读写了 research-workspace 用户数据）。本冒烟
        // keyless 档契约 = 无模型调用——发送链路的浏览器断言整体移除，载荷逻辑由
        // tests/library-fold 例库电池钉（editInstruction 逐字），面板编辑态草稿断言保留在上块。
      } else {
        console.log('  note  研究配置库条目断言：盘侧库为空（跳过——先有库条目再验）')
      }
    }
  } else {
    console.log('  note  研究配置页签探针：无会话可开（跳过——先有任一会话再验）')
  }
}

/**
 * pass-6：自测例库工作区（2026-10-13 用户委托自测轮 → 固化为常驻断言）——抛弃型工作区 +
 * 12 形态例库（单一正本 = scripts/lib/selftest-library.mjs，与 tests/library-fold 电池共用）
 * 驱动真面板逐例对账——含 BUG-025 修复面（legacy 单块渲染 / 混居双块 / 编辑预填 / 整段载荷
 * 回执）。种子与探针会话自产自销（runtime/smoke-workspace/ 下覆盖写），不触
 * research-workspace 用户库；探针会话残留与渐进面探针同规（定期清理正本 = 录制器头注）。
 * @param env - 主件注入的相位环境（契约见文件头注；本相位还需 rpc/base/cookie）。
 */
export async function pass6SelftestLibraryPhase(env) {
  const { page, step, wait, root, rpc, base, cookie, awaitAppReady, openGuideCapsule, paneTextOf, dialogTextOf } = env
  const SELFTEST_DIR = join(root, 'runtime', 'smoke-workspace', 'lib-selftest')
  mkdirSync(SELFTEST_DIR, { recursive: true })
  writeFileSync(join(SELFTEST_DIR, 'method-library.md'), SELFTEST_LIBRARY)
  const ws2 = await rpc(base, cookie, 'workspace/create', { request: { path: SELFTEST_DIR } })
  const ws2Id = ws2?.workspace?.workspaceId ?? ws2?.workspaceId
  // 绑定路径 = 最新会话默认视图：session/create 一个 lib-selftest 工作区的会话（不重命名、
  // 不发消息、不点侧栏行——空白会话被侧栏隐藏且搜索排除，但 web 重载后默认打开最新会话，
  // 两轮探针实证）→ active 会话 cwd = 种子目录 →「研究配置」页签按会话工作区读
  // method-library.md → 12 形态例库投影。零提示零唤醒（keyless 档契约 = 无模型调用；
  // 2026-10-13 自测轮事故实录：dev home 持有凭据，session/prompt 会唤醒真模型 lead）。
  const created2 = typeof ws2Id === 'string' ? await rpc(base, cookie, 'session/create', { request: { workspaceId: ws2Id, agentPreset: 'lead' } }) : null
  const probe2Id = created2?.sessionId ?? created2?.id
  const probe2Ok = typeof ws2Id === 'string' && typeof probe2Id === 'string'
  step(probe2Ok, '自测工作区 + 最新会话已建（抛弃型，12 形态例库种子）', probe2Ok ? 'lib-selftest' : 'workspace/session RPC 未返回 id')
  if (probe2Ok) {
    // 清持久化布局态（上轮 pass 点开的会话会在重载时恢复为 active——清 storage 后 web
    // 回落默认视图 = 最新会话 = 本探针；两轮探针实证默认视图行为）
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }).catch(() => {})
    await awaitAppReady(page, 5_000)
    // BUG-034 选定修法（2026-10-18）：**不再依赖"重载后默认视图＝最新会话"**——那句假设在会话
    // 数量增长后不成立（本块偶发红即此）。改为按 session id 显式打开本块刚建的会话（直达
    // data-row-key，行不在 DOM 时走搜索兜底）；打不开就如实报红，不静默跳过整块。
    //
    // 2026-10-19 补：上面"行不在 DOM 时走搜索兜底"当时**并不成立**——调用传的 title 是 null，
    // 而 openSessionById 的搜索兜底需要标题（locateSessionStrategy 对 null title 直接 give-up）。
    // 于是本块在"探针会话的组被折叠"时稳定假红，且 `if (openedSelf.found)` 把整块 12 形态例库
    // 断言一起吞掉（覆盖损失 > 报错本身）。侧栏只展开 active 组（见上方 boundSessionId 同款
    // 注释），探针会话住在 lib-selftest 工作区组，故必须**逐组展开后重试**才能直达。
    let openedSelf = await openSessionById(page, probe2Id, null)
    if (!openedSelf.found) {
      for (const g of SIDEBAR_GROUP_CANDIDATES) {
        await expandGroup(page, g)
        openedSelf = await openSessionById(page, probe2Id, null)
        if (openedSelf.found) break
      }
    }
    step(openedSelf.found, '自测例库：本块会话按 id 显式打开（不依赖默认视图）', `via=${openedSelf.via}`)
    if (openedSelf.found) {
      if (await openGuideCapsule(page, 6_000, 6_000, 2_500)) {
        // 条目加载是异步 readFile——轮询至尾条目按钮在场。innerText 对滚动折叠区不含尾条目
        // 文本（Chromium innerText 只取滚动容器可视区——首版文本断言实红：尾两名缺席）；
        // 按钮可见性（Playwright isVisible 判 display/visibility，不判视口）是正确判据。
        let ts = await paneTextOf(page)
        const tailBtn = page.getByRole('button', { name: /^缩进行条目 ›/ }).first()
        for (let i = 0; i < 10 && !(await tailBtn.isVisible().catch(() => false)); i++) {
          await wait(1_000)
        }
        // ① 列表全形态投影：12 例名按钮齐 + 重名两钮 + 摘要/徽标真值（文本面）
        const entryNames = ['全量四字段', '部分字段', '空值分区', '旧格式条目', '混合条目', '名称', '同名条目', '空条目', '杂项行条目', '旧格式续行', '缩进行条目']
        const missing = []
        for (const n of entryNames) {
          const ok = await page.getByRole('button', { name: new RegExp(`^${n} ›`) }).first().isVisible({ timeout: 1_500 }).catch(() => false)
          if (!ok) missing.push(n)
        }
        const dupCount = await page.getByRole('button', { name: /^同名条目 ›/ }).count().catch(() => 0)
        const seg = ts.slice(ts.indexOf('研究配置'))
        const summaryOk = seg.includes('官方域优先') && seg.includes('广度优先铺方向') && seg.includes('新字段在场')
        const badgeOk = seg.includes('默认偏好')
        step(missing.length === 0 && dupCount === 2 && summaryOk && badgeOk, '自测例库·列表投影：12 形态全名按钮 + 重名两钮 + 摘要真值 + 默认徽标',
          [missing.length === 0 ? '' : `例名缺席：${missing.join('、')}`, dupCount === 2 ? '' : `重名 ${dupCount} 钮`, summaryOk ? '' : '摘要不符', badgeOk ? '' : '徽标缺席'].filter((s) => s !== '').join('；') || '全中')
        // ② BUG-025·纯旧格式条目：单块「自定义要求」，无 4×（未设置）噪音
        await page.getByRole('button', { name: /旧格式条目 ›/ }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_500)
        ts = (await dialogTextOf(page)) ?? ''
        const legacyReadOk = ts.includes('自定义要求') && ts.includes('广度优先铺方向') && ts.includes('地图类问题适用') && ts.includes('来源：') && !ts.includes('（未设置）')
        step(legacyReadOk, '自测例库·BUG-025 修复面：纯旧格式详情 = 单块「自定义要求」（无未设置噪音）')
        // ③ BUG-025·编辑预填（4 分区 + 1 旧正文；不发送——载荷文本由 tests/library-fold
        // 电池逐字钉，发送链路断言因 keyless 契约移除，见上块注）
        await page.getByRole('button', { name: '编辑内容' }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_000)
        const ta = page.locator('[role="dialog"] textarea')
        const taCount = await ta.count().catch(() => 0)
        const legacyDraft = taCount === 5 ? await ta.nth(4).inputValue().catch(() => '') : ''
        step(taCount === 5 && legacyDraft.includes('广度优先铺方向'), '自测例库·BUG-025 修复面：编辑态旧正文预填（4 分区 + 1 旧正文）', `textarea ${taCount} 区`)
        await page.getByRole('button', { name: '放弃' }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_000)
        // ④ 混居条目：四分区 + 「自定义要求（旧）」双块；编辑预填分区与旧正文并存
        await page.getByRole('button', { name: /混合条目 ›/ }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_500)
        ts = (await dialogTextOf(page)) ?? ''
        const mixedReadOk = ts.includes('找来源') && ts.includes('新字段在场') && ts.includes('自定义要求（旧）') && ts.includes('旧文残留')
        step(mixedReadOk, '自测例库·混居条目：四分区 + 自定义要求（旧）双块（内容零丢失）')
        await page.getByRole('button', { name: '编辑内容' }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_000)
        const ta2 = page.locator('[role="dialog"] textarea')
        const c2 = await ta2.count().catch(() => 0)
        const firstDraft = c2 === 5 ? await ta2.first().inputValue().catch(() => '') : ''
        const lastDraft = c2 === 5 ? await ta2.nth(4).inputValue().catch(() => '') : ''
        step(c2 === 5 && firstDraft.includes('新字段在场') && lastDraft.includes('旧文残留'), '自测例库·混居编辑：分区预填 + 旧正文预填并存', `textarea ${c2} 区`)
        await page.getByRole('button', { name: '放弃' }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_000)
        // ⑤ 空值分区：缺席分区显式「（未设置）」，在场分区有内容
        await page.getByRole('button', { name: /空值分区 ›/ }).first().click({ timeout: 5_000 }).catch(() => {})
        await wait(1_500)
        ts = await paneTextOf(page)
        step((await dialogTextOf(page) ?? '').includes('逐字转写') && ((await dialogTextOf(page)) ?? '').includes('（未设置）'), '自测例库·空值分区：缺席显式未设置、在场有内容')
        await page.getByRole('button', { name: '关闭详情' }).first().click({ timeout: 5_000 }).catch(() => {})
      } else {
        step(false, '自测例库：lib-selftest 新会话上「研究配置」胶囊不可见')
      }
    }
  }
}
