// bundle-composition — 组合层断言：我们 bundle 里每一条 `- id:` override 都必须真的命中一行。
//
// 为什么不是「读我们自己的 YAML 里有没有那两行」：那只证明我们写了，证明不了 DSH 认。Loader 对
// 「目标行不存在」的 patch 是**警告后跳过**（vendor/dsh/vendor/include/src/index.ts
// `applyEntryPatches` 头注：「A patch that matches nothing warns and is skipped」）。上游改一个
// row id，关闭行就静默失效、产品面悄悄长回 Trajectory——而源文件断言仍然全绿。
//
// 本文件用 Loader 自己的 applyEntryPatches + entryListSchema（与 `dsh --dump-config` 同一套方言）
// 按 profile 的层序组合 base → web-app → pack（bundle 行 + 全部 presets），断言两件事：
//   ① 零跳过：任何一条 patch 落空即红——覆盖我们 bundle 里每一条 `- id:` override，不是只盯这两行；
//   ② 出厂面契约：该藏的行 disabled，该留的行在场且未 disabled（防「收窄收过头」）。
//
// 反证（2026-11-03 实录，先红后绿）：把 web-app 层的 `ui-trajectory` 改名后重跑 →
//   `patch: entry %C not found ui-trajectory` + 目标行缺席 + 改名后的行仍可挂载 → ① 与 ② 同时红；
//   还原即绿。红配方 = 临时改 `vendor/dsh/packages/bundle/web-app/cordis.patch.yml` 的那条 id
//   （vendor 只读，只在本地验证时改、验完还原，不入 diff）。
//
// 边界：树层证明的是**挂载状态**；「主区只剩两个页签、右栏无终端入口」的像素面由真 Web 证据承担
// （卡片 §证据 / run-driver 浏览器面）。两者不合一——客户端页签注册在浏览器半，不在 entry 树里。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyEntryPatches, entryListSchema } from '../../vendor/dsh/vendor/include/src/index.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')

// 解析器取**加载器自己的** js-yaml（vendor 树内那份）：方言必须与 `dsh --dump-config` 同源，
// 不能用仓里另一份 YAML 实现——方言漂移会让本测试证明的东西悄悄变样。
const includeRequire = createRequire(join(ROOT, 'vendor', 'dsh', 'vendor', 'include', 'package.json'))
const yaml = includeRequire('js-yaml')

/** 出厂面契约：DSH 出厂面里，研究产品明确不提供的入口（每一条都必须在组合树里"在场且 disabled"）。 */
const SURFACE_HIDDEN = [
  // 主区 Trajectory 页签：展示 harness 内部事件流，不是研究证据；证据在 run bundle（drt_<slug>/）。
  'ui-trajectory',
  // 右栏 New Terminal：研究产品的逃生口不是 shell；工作区是文件面的。
  'ui-sidebar-terminal',
]

/** 出厂面契约的另一半：必须留下的出厂面（真被误关就红——收窄不等于把界面掏空）。 */
const SURFACE_REQUIRED = [
  // 主区对话：研究的入口与出口。
  'ui-chat',
  // 主区/右栏的会话容器：方法库页签与右栏页签都挂在它上面。
  'ui-conversation',
  // 右栏容器：驾驶舱四个页签的宿主。
  'ui-sidebar-right',
  // 右栏文件树：终稿页签读的就是 workspaceFiles，砍掉等于让人看不见盘上真东西。
  'ui-sidebar-files',
]

function loadPatchList(rel) {
  const doc = yaml.load(readFileSync(join(ROOT, rel), 'utf8'), { schema: entryListSchema })
  assert.ok(Array.isArray(doc), `${rel}: 顶层不是 patch 列表（Loader 方言要求列表）`)
  return doc
}

/** 按 profile 的层序组合 entry 树；返回组合结果与被跳过的 patch。 */
function composeLayers() {
  const packPkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
  const packPatches = packPkg?.dsh?.bundle?.patch
  assert.ok(packPatches, 'pack 的 dsh.bundle.patch 未声明')

  // 层序 = profile 的 dsh.profile.bundles 顺序（vendor/dsh/packages/boot/app-boot/src/profile.ts：
  // 「applying each bundle's patch lists in dsh.profile.bundles order」）。
  // 只组合仓内可解析的三层：base → web-app → pack（含 cordis.patch.yml + 全部 presets）。
  // 边界：agent-team-profile 层是装进 profile 的 npm 包、不在本仓，故不进图；它不触碰本文件
  // 断言的行（团队机制行 + 三态），改它不会让这里的结论失真。
  const layers = [
    ['vendor/dsh/packages/bundle/base/cordis.patch.yml'],
    ['vendor/dsh/packages/bundle/web-app/cordis.patch.yml'],
    (Array.isArray(packPatches) ? packPatches : [packPatches]).map((rel) => `packages/deep-research-pack/${rel.replace(/^\.\//, '')}`),
  ]

  const skipped = []
  const warn = (message, ...rest) => skipped.push([message, ...rest].join(' '))
  let tree = []
  for (const files of layers) {
    for (const rel of files) tree = applyEntryPatches(tree, loadPatchList(rel), warn)
  }
  return { tree, skipped }
}

test('① 零跳过：bundle 的每一条 - id: override 都命中了组合树里的行', () => {
  const { skipped } = composeLayers()
  assert.deepEqual(
    skipped, [],
    '有 patch 落空（Loader 警告后静默跳过）：上游改了 row id 或删了行——关闭/覆盖行已失效，'
    + '产品面会悄悄长回出厂形态。修法：按 vendor 现行 id 改 packages/deep-research-pack/cordis.patch.yml，'
    + '或确认该面已不需要后删掉那条 patch。',
  )
})

test('② 出厂面契约：该藏的出厂入口 disabled，该留的出厂面仍在且未 disabled', () => {
  const { tree } = composeLayers()
  const row = (id) => tree.find((entry) => entry.id === id)

  const notHidden = SURFACE_HIDDEN.filter((id) => row(id)?.disabled !== true)
  assert.deepEqual(
    notHidden, [],
    `这些出厂入口没有被真关闭（行缺席或 disabled !== true）：${notHidden.join(', ')}——`
    + '产品面收窄失效；CSS 隐藏或改名不算关闭，Loader 的 disabled 才是第一类语义。',
  )

  const missing = SURFACE_REQUIRED.filter((id) => row(id) === undefined)
  assert.deepEqual(missing, [], `这些出厂面在组合树里缺席：${missing.join(', ')}——上游删行或层序变了`)
  const wronglyOff = SURFACE_REQUIRED.filter((id) => row(id).disabled === true)
  assert.deepEqual(wronglyOff, [], `这些出厂面被关掉了：${wronglyOff.join(', ')}——收窄收过头，研究界面被掏空`)
})
