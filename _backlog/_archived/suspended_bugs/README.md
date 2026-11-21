# _suspended_bugs/ · 暂停的缺陷卡（已查明、修复未确认）

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入：调查过、**修复未确认**的缺陷卡，
> 编号保留（不释放 BUG id）。文件名不变、内容不重写。规矩手册 =
> [`../../README.md`](../../README.md)；编号规则权威 = [../../bugs/README](../../bugs/README.md)。
>
> **纪律**：暂停需有用户明示；重启 = `git mv` 回活跃区，并按记录的重启条件重新判断。
> 词汇对照：历史卡状态行的「活跃」= 现行「排查中」（D24 前旧枚举，历史卡不回改）。

## 索引

2026-11-21 批（用户直派：这些卡已不是待修缺陷；不按缺陷修，也不制造修复证据）：

| 卡 | 迁入原因（事实） |
|---|---|
| [BUG-320](BUG-320-boot-run-drift-only-lock-regression.md) | `--drift-only` 已免服务锁（`start-channel` + `channel-start.e2e`） |
| [BUG-321](BUG-321-boot-run-stale-lock-no-recovery.md) | 实现已入树（`71010fef`）；最终入口反控因沙箱未跑，修复未确认 |
| [BUG-322](BUG-322-start-lock-stale-reclaim-race.md) | stale 回收分支已不存在 |
| [BUG-323](BUG-323-start-lock-future-timestamp-blocks.md) | 无 age/TTL 判据 |
| [BUG-324](BUG-324-start-lock-10min-steals-long-boot.md) | 无 10min TTL |
| [BUG-325](BUG-325-start-lock-release-removes-new-owner.md) | release 只删自身 identity、非递归 rmdir |
| [BUG-326](BUG-326-run-driver-boot-run-two-locks.md) | 统一 supervisor 取 home/state 双锁；旧锁残留显式拒绝 |
| [BUG-331](BUG-331-start-lock-owner-write-failure-leaks.md) | owner 写失败路径已回滚自己的目录 |
| [BUG-332](BUG-332-start-lock-no-pid-liveness.md) | 获批合同：不按 TTL/PID/坏 owner 在线接管 |
| [BUG-337](BUG-337-boot-run-port-invalid.md) | 公开入口经 `start-channel` 校验 `DSH_RUN_PORT` 1–65535 |
| [BUG-339](BUG-339-boot-run-trap-removes-new-lock.md) | 入口仅 exec supervisor；body 无锁、无锁相关 trap；最终反控未跑，修复未确认 |

重启条件：后续变更重新引入同类机制时，由用户决定是否复活（`git mv` 回活跃区并按新证据重判）；不要为了「已修」计数复活它们。

（BUG-022 已于 2026-10-20 重判：根因假设被 2026-10-13 postmortem 推翻、由 BUG-024 socket 隔离修复，
卡已迁 [fixed 池](../fixed_bugs/BUG-022-provider-stream-malformed-turn-kill.md)。）
