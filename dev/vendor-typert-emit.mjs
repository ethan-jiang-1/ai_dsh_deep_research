// dev/vendor-typert-emit.mjs —— 本仓驱动的 typert host/client 产物生成（不改 vendor 内容）。
//
// 背景（详见 notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md）：0.1.7 起启动需要各贡献包
// 的 `lib/typert.<face>.js`（`typert-loader` 会 import 包的 `./typert` 子路径）。vendor 自己的
// 全量构建在干净树上会先红在 tsdown 的**根单元**（root 包无 `lib/types/{index,invariant,startup}.js`
// 入口）——那是上游构建链在干净树上的自不自洽处，与本仓无关。
//
// 本脚本复刻 vendor 插件 workspace 模式的生成路径（`tsdown-plugin.ts` 的 `emitWorkspace`）：
//   ① `discover(faces)` 找出贡献包 → ② **按 manifest 的 `./typert` / `./client/typert` / `./remote`
//   导出过滤**（缺导出的包跳过——这正是 package 模式漏掉的一步，漏掉就会撞
//   `must export ./typert` 校验错）→ ③ `generate(packages, faces)` → ④ 写进各包 `lib/`。
// 产物落 gitignored 的 `lib/`，vendor 的 tracked 内容一字不动（vendor-clean 门禁把守）。
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WorkspaceTypertGenerator } from '../vendor/dsh/packages/typert/generator/lib/types/workspace.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, 'vendor', 'dsh')
// vendor 插件同款：本脚本消费 tsc 已产出的 lib/types，故跳过逐包诊断遍。
const TSC_VERIFIED_INPUT = { checkDiagnostics: false }
const FACES = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['host', 'client']

const readManifest = (packageDir) => JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
const hasTypertExport = (exportsField) => {
  if (exportsField === null || typeof exportsField !== 'object' || Array.isArray(exportsField)) return false
  return Object.hasOwn(exportsField, './typert')
    || Object.hasOwn(exportsField, './client/typert')
    || Object.hasOwn(exportsField, './remote')
}

const generator = new WorkspaceTypertGenerator(VENDOR, TSC_VERIFIED_INPUT)
let total = 0
for (const face of FACES) {
  const discovered = generator.discover([face])
  const packages = discovered
    .filter((candidate) => hasTypertExport(readManifest(join(VENDOR, candidate.root)).exports))
    .map((candidate) => candidate.package)
  const skipped = discovered.filter((candidate) => !packages.includes(candidate.package))
  console.log(`[${face}] 贡献包 ${discovered.length} 个；按 manifest 过滤后生成 ${packages.length} 个` +
    (skipped.length > 0 ? `（跳过 ${skipped.length} 个缺 typert 导出的：${skipped.map((s) => s.package).join(', ')}）` : ''))
  if (packages.length === 0) continue
  for (const artifact of generator.generate(packages, [face])) {
    const output = join(VENDOR, artifact.packageRoot, 'lib')
    mkdirSync(output, { recursive: true })
    writeFileSync(join(output, `typert.${artifact.face}.js`), artifact.js)
    writeFileSync(join(output, `typert.${artifact.face}.d.ts`), artifact.dts)
    if (artifact.remote !== undefined) {
      writeFileSync(join(output, 'typert.remote-client.js'), artifact.remote.js)
      writeFileSync(join(output, 'typert.remote-client.d.ts'), artifact.remote.dts)
      writeFileSync(join(output, 'typert.remote-client.d.ts.map'), artifact.remote.dtsMap)
    } else if (artifact.face === 'host') {
      for (const file of ['typert.remote-client.js', 'typert.remote-client.d.ts', 'typert.remote-client.d.ts.map']) {
        rmSync(join(output, file), { force: true })
      }
    }
    total += 1
  }
}
console.log(`typert 产物已写入（${total} 件）`)
