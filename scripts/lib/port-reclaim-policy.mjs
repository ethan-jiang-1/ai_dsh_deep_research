// port-reclaim-policy.mjs — 端口 listener 身份判定的纯判据（keyless 直测；无子进程依赖）。
//
// 只认本仓 DSH web 进程：vendor 入口 / 本包 / 本仓路径。冒烟脚本不得对无关 listener SIGKILL
// （BUG-104）；命令读不到 = 身份未确认，同样不杀。
export const isOwnListener = (command) => typeof command === 'string'
  && /(?:vendor[\\/]dsh|apps[\\/]cli[\\/]src[\\/]bin\.ts|dsh-deep-research-pack|ai_dsh_deep_research)/i.test(command)
