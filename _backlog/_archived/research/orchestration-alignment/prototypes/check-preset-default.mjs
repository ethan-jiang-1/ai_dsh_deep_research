#!/usr/bin/env node
// check-preset-default.mjs — 只读 vendor 源码的 keyless 机制检查：
//   部署默认 agentPreset 会让“省略 agent_preset”解析成该默认，而不是继承父 preset。
// 用法：node --import tsx/esm _backlog/research/orchestration-alignment/prototypes/check-preset-default.mjs
import { SubagentPresetSelection } from '../../../../vendor/dsh/packages/subagent/tool-subagent/src/preset-selection.ts'

const withDefault = new SubagentPresetSelection({
  agentPreset: 'research-worker',
  allowedAgentPresets: ['scout', 'analyst', 'critic', 'research-worker'],
})
const noDefault = new SubagentPresetSelection({
  allowedAgentPresets: ['scout', 'analyst', 'critic'],
})
const out = {
  omissionWithDefault: withDefault.resolve({}),
  omissionWithoutDefault: noDefault.resolve({}),
  explicitCritic: withDefault.resolve({ agent_preset: 'critic' }),
  descriptionWithDefault: withDefault.description,
  descriptionWithoutDefault: noDefault.description,
}
console.log(JSON.stringify(out, null, 2))
console.log(out.omissionWithDefault === 'research-worker'
  && out.omissionWithoutDefault === undefined
  && out.explicitCritic === 'critic'
  ? 'PASS: 省略默认 = research-worker；无默认 = 继承父；显式 critic 正常'
  : 'FAIL: 默认解析不符合预期')
