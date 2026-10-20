// llm-stream-tee-core 回归 — LLM 流透明 tee 预载壳的可提取纯函数面（keyless）。
// 反证（红先行实录，2026-10-21 卫生轮 维度6 件⑥）：模块未实现时本文件 import 即红
// （函数缺席即红）；还原后绿。预载壳本体（scripts/probe/llm-stream-tee.cjs）是活进程
// 仪器，无 keyless 自动测试（不硬凑——预载要挂进真目标进程才有意义），此处只钉壳依赖的
// 两个判据：捕获目标判定（fail-closed）与凭据头脱敏（证据包可外发）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCaptureTarget, redactHeaders } from '../../scripts/lib/llm-stream-tee-core.mjs'

test('isCaptureTarget：主机子串命中（缺省 api.deepseek.com）与不命中', () => {
  assert.equal(isCaptureTarget('https://api.deepseek.com/anthropic/v1/messages'), true)
  assert.equal(isCaptureTarget('https://api.deepseek.com/chat/completions'), true)
  assert.equal(isCaptureTarget('https://example.com/v1/messages'), false, '路径撞名不算主机命中外的豁免——判定只认子串')
  assert.equal(isCaptureTarget('https://other.example.com/'), false)
})

test('isCaptureTarget：自定义子串（LLM_STREAM_TEE_HOST 语义）', () => {
  assert.equal(isCaptureTarget('https://zai.example.com/v1/chat', 'zai.example.com'), true)
  assert.equal(isCaptureTarget('https://zai.example.com/v1/chat', 'api.deepseek.com'), false)
})

test('isCaptureTarget：空/非字符串输入 fail-closed（空子串 = 全捕获是脚枪，宁可漏抄不可误抄）', () => {
  assert.equal(isCaptureTarget('https://api.deepseek.com/v1/messages', ''), false, '空子串不许静默全捕获')
  assert.equal(isCaptureTarget('https://api.deepseek.com/v1/messages', '   '), false, '空白子串同判')
  assert.equal(isCaptureTarget('', 'api.deepseek.com'), false)
  assert.equal(isCaptureTarget(undefined, 'api.deepseek.com'), false)
  assert.equal(isCaptureTarget(12345, 'api.deepseek.com'), false, '壳侧 URL 归一化异常的兜底')
})

test('redactHeaders：authorization / x-api-key 脱敏（保留 scheme 与末 4 位），其余头原样', () => {
  const out = redactHeaders({
    'content-type': 'application/json',
    Authorization: 'Bearer sk-abcdefghijklmnop1234',
    'x-api-key': 'sk-xyzw9876',
  })
  assert.equal(out['content-type'], 'application/json')
  assert.equal(out.Authorization, 'Bearer ****1234', '保留 scheme 词 + 末 4 位')
  assert.equal(out['x-api-key'], '****9876', '无 scheme 前缀 → 只留末 4 位')
})

test('redactHeaders：短值全遮（≤8 字符不漏 4 位）、大小写不敏感、Headers 实例与空输入', () => {
  assert.equal(redactHeaders({ authorization: 'short' }).authorization, '****')
  assert.equal(redactHeaders({ AUTHORIZATION: 'Bearer sk-abcdefghijklmnop1234' }).AUTHORIZATION, 'Bearer ****1234')
  // Headers 实例迭代键统一小写（平台行为）——脱敏键判定大小写不敏感，须两个方向都中
  const h = new Headers({ Authorization: 'Bearer sk-abcdefghijklmnop1234', accept: '*/*' })
  const out = redactHeaders(h)
  assert.equal(out.authorization, 'Bearer ****1234', 'fetch 返回的 Headers 实例同规脱敏（键已小写化）')
  assert.equal(out.accept, '*/*')
  assert.deepEqual(redactHeaders(undefined), {})
  assert.deepEqual(redactHeaders(null), {})
})
