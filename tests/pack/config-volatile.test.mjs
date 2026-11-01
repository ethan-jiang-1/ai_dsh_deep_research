// config-volatile — 本包的 Settings 面（P3）：`enabled` 是唯一的 volatile 字段。
//
// 为什么这条要机械化：DSH 的设置页只投影 `Config` 里标了 `.volatile()` 的字段（投影函数 =
// 设置包自己的 `volatileForm`）。不标 = 设置页里本包一项都没有；标多了 = 把需要重建 provider
// 的字段暴露成"改了不生效"。本测试直接调 DSH 的投影函数，而不是复述它的规则。
//
// 反证：删掉 `enabled` 上的 `.volatile()` → `volatileForm` 返回 undefined → 本文件红；
// 给 `apiKeyEnv` 加 volatile → 字段集合变化 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { volatileForm } from '../../vendor/dsh/packages/settings/settings/src/schema.ts'
import { Config } from '../../packages/deep-research-pack/src/fetch-fallback/config.ts'

test('设置页只暴露一个开关：enabled（volatile），其余字段不进表单', () => {
  const form = volatileForm(Config)
  assert.ok(form !== undefined, '没有 volatile 字段——Settings 页不会有本包的可编辑项')
  assert.deepEqual(Object.keys(form.dict ?? {}), ['enabled'], `volatile 字段集合变了：${JSON.stringify(Object.keys(form.dict ?? {}))}`)
})
