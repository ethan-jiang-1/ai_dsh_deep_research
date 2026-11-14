// 真模型档可触发通道契约（W3-7）——model-smoke 只能手动触发，且缺 secret 时 preflight 硬失败。
// 这是静态形状契约；真实运行由有凭据的人手动触发后记录，不在 PR/required 里。
// BUG-163：白名单是「on: 的键集合恰为 workflow_dispatch」，不是只禁 pull_request/push 两个词。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eventKeys, parseWorkflow } from '../../scripts/lib/ci-workflow.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TEXT = readFileSync(join(ROOT, '.github', 'workflows', 'model-smoke.yml'), 'utf8')

test('model-smoke：只 workflow_dispatch，不进 PR/push', () => {
  assert.deepEqual(eventKeys(parseWorkflow(TEXT)), ['workflow_dispatch'], 'model-smoke 的 on: 只能有 workflow_dispatch（pull_request_target/workflow_run/release 等都不行）')
  assert.doesNotMatch(TEXT, /^  pull_request:/m, 'model-smoke 不得进 PR')
  assert.doesNotMatch(TEXT, /^  push:/m, 'model-smoke 不得进 push')
})

test('on: 键集合解析：额外事件（含 pull_request_target）必须可见', () => {
  const synthetic = `on:
  workflow_dispatch:
  pull_request_target:
`
  assert.deepEqual(eventKeys(parseWorkflow(synthetic)), ['workflow_dispatch', 'pull_request_target'])
})

test('model-smoke：用 secret 注入 key，跑 l4-lite.e2e（缺 key 由脚本 preflight exit 2 拦）', () => {
  assert.match(TEXT, /DEEPSEEK_API_KEY:\s*\$\{\{\s*secrets\.DEEPSEEK_API_KEY\s*\}\}/, '必须从 secret 注入 key')
  assert.match(TEXT, /scripts\/smoke\/l4-lite\.e2e\.mjs/, '必须跑 l4-lite.e2e')
  assert.doesNotMatch(TEXT, /continue-on-error|allowFailure|--install-only/, '真模型档不得降级/跳过')
})
