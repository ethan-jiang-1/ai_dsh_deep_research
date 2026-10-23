# Run — drt_<slug>

<!-- 状态头（D28）。3–5 行 + 机器可读键；lead 在阶段转换时写；ops 可写交付/停放回执。
     这是声明，不是真理：与文件事实冲突时以事实为准，门禁判红；不自证批准/交付。 -->

- contract: YYYY-MM-DD        # 契约纪元（新 run 创建时写；旧 run 无本文件 = epoch 豁免）
- phase: briefing             # briefing | research | synthesis | review | delivery | accepted | parked
- next: HITL1                 # 下一步（可执行；终态写 none）
- delivered: none             # 交付回执指针：vN @ ISO 时间 · present callId（非交付期 none）
- parked: none                # 停放原因/复活条件（非停放期 none）
