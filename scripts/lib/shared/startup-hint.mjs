// startup-hint.mjs — host 启动失败的人话归因（纯函数；web-harness 的 banner 超时消费）。
//
// 为什么存在（BUG-066）：profile 未随 pin 重钉时 dsh 不退出、只是拒绝服务，boot 只看到
// 120s/240s 后「等待启动横幅超时」；真正的 `incompatible ... Exact-version exemption: not active`
// 埋在被截断的日志尾里，归因被误导成主机慢/网络挂。

/** 从 boot 输出里识别「profile 未随 pin 重钉」；命中 → 可执行的归因句，否则 ''。 */
export function startupFailureHint(output, profile = 'unknown') {
  const text = String(output ?? '')
  if (!/incompatible|Exact-version exemption: not active/i.test(text)) return ''
  const line = text.split(/\r?\n/).reverse().find((item) => /incompatible|Exact-version exemption/i.test(item)) ?? ''
  return `profile ${profile} 未随 pin 重钉：插件版本不兼容——先重建该 profile（dev/boot-run.sh / guides/60 §2），不是主机慢。`
    + (line.trim() === '' ? '' : `\n证据：${line.trim().slice(0, 240)}`)
}
