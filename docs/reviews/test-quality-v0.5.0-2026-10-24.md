# 测试质量审查：v0.5.0（2026-10-24）

> 范围：`pet.test.ts`（982 行、84 个测试）。已先把 `main`（v0.5.0）合并进 `claude/review-reports`。**没有改任何代码或测试。**
> 依据标记：**实际运行** = 我在 Linux 沙盒里（Claude Code 2.1.294，时区 UTC）跑出来的；**读代码** = 读了测试和源码；**推断** = 没跑过。
> 你问的是："84 个测试里，有没有名字和实际检查对不上、或者在坏代码上也能通过的"。

## 结论（先看这个）

1. **默认设置下 84 个测试里 83 个通过、1 个失败**（`busy days` 超时，要 7.5 秒，默认 5 秒；加长超时后 84/84 通过）。【实际运行】
2. **变异测试：我对源码做了 46 处有针对性的小破坏（每次只改一处），跑完整套测试：24 处被抓到，22 处没被抓到。**【实际运行】没被抓到的 22 处里，我判断 19 处是**真缺口**，1 处是等价变异（M23，我只改了一条分支，改两条分支的 M36 被抓到了），1 处在单线程模拟里测不到（M44），1 处低价值（M45）。下表逐条写了判断。
3. **最大的盲区有两块：**
   - **点数的小数部分**：对话的 1 / 0.5 / 0.1 三档、第 80 轮的截止、取整到 0.1 —— 这些在界面上都被 `Math.floor` 取整了（`register.tsx:1353`），所以测试读到的是整数，把 0.5 档改成 0.6 档、把第 11 轮改成 1 点、让第 81 轮多给 0.1 点，**都不会让任何测试失败**（M01、M02、M03、M40、M26）。
   - **窗口宽度的排版启发式**：`NARROW_COLS`（97）、"今日"文字变长时阈值提高、按钮行变长时阈值提高，三个部分**没有任何测试**（M19、M20、M21、M38、M39），只有一个 60 列的窄窗口测试。更早的一次排版事故就出在这一块。
4. **名字和检查对不上的有 4 个**（见 §3），其中最明显的是"achievement rewards are scaled"那条：它自己重写了一遍奖励算术，不碰代码里的任何常量。
5. 好的一面：新增的心情、迁移、周末连续天数、番茄钟每日上限等测试，在对应的变异上都能抓到（M04、M07–M09、M11–M16、M18、M25、M27–M29、M31、M36、M37、M41、M43、M46）。每一类行为至少有一个测试在守着。

## 1. 方法

- 在一份临时副本里，每次只改 `hooks/register.tsx` 的一处（改的位置和内容见下表第二列；每次替换前我都确认被替换的原文恰好出现一次，M36 是两处），然后运行 `claude plugin test .`。为了避免变异测试在并行运行时因为超时而被误判成"抓到"，我把副本里所有测试的超时放宽到 120 秒；未改动的副本（M00）84/84 通过，作为对照。
- "被抓到" = 至少一个测试失败；"没被抓到" = 84 个测试全部通过。
- 变异测试只能说明"这个具体的改动没人发现"，不能证明代码没问题；我选的改动集中在这次新增和调整的逻辑上（点数、迁移、连续天数、心情、排版阈值、每日上限、迟到判断）。

## 2. 结果

| 编号 | 把代码改成什么 | 结果 | 抓到它的测试（最多 2 个）/ 判断 |
|---|---|---|---|
| M01 | turnPoints: first tier boundary 10 -> 11 | **没被抓到** | 真缺口：第 11 轮改成值 1 点，界面取整后看不出来（见下文"取整盲区"） |
| M02 | turnPoints: 80th-turn cutoff 80 -> 81 | **没被抓到** | 真缺口：第 81 轮改成值 0.1 点，界面取整后看不出来 |
| M03 | turnPoints: middle tier 0.5 -> 0.6 | **没被抓到** | 真缺口：0.5 改成 0.6，界面取整后看不出来 |
| M04 | FOCUS_PAID_PER_DAY 4 -> 5 | 被抓到（1 个测试失败） | points: the fifth timer of a day pays nothing |
| M05 | REST_PAID_PER_DAY 4 -> 5 | **没被抓到** | 真缺口：只测了第 1 次休息的 +1，没测第 5 次不给分 |
| M06 | REWARD_SCALE 1.3 -> 1.0 | 被抓到（3 个测试失败） | achievements: an unlock gives its affection reward once (first = +3)；points: the first 10 turns of a day are worth 1, the next ones 0.5 (12 |
| M07 | continuesStreak: drop the Friday->Monday rule | 被抓到（1 个测试失败） | streak: a weekend off does not break it (Friday -> Monday), a longer g |
| M08 | continuesStreak: Monday -> Tuesday | 被抓到（2 个测试失败） | check-in: a broken streak starts again and pays 3；streak: a weekend off does not break it (Friday -> Monday), a longer g |
| M09 | migration: no lift (keep old points) | 被抓到（2 个测试失败） | migration: an old save keeps its level (old Lv.6 at 153 points becomes；migration: a high old level is kept too (old Lv.10 at 418 becomes 517) |
| M10 | migration: never marks model 2 (runs every start) | **没被抓到** | 真缺口：迁移标记 `model: 2` 不写也没有测试发现；这个标记正是防止迁移重复执行的唯一东西 |
| M11 | migration: guard >= 2 -> >= 3 | 被抓到（1 个测试失败） | migration: a save already on the new model is not touched |
| M12 | feel: a good thing cheers away a worry | 被抓到（1 个测试失败） | mood: worry wins over happiness, whichever came first |
| M13 | reallyWorried: demo worry counts as real | 被抓到（1 个测试失败） | recovery: the /pet mood worried demo does not count as a worry |
| M14 | busyDays: counts every turn from the 30th | 被抓到（1 个测试失败） | busy days: a day with 30 turns counts once, however many more follow;  |
| M15 | moodOf: sleepy only from 23:00 (not before 05:00) | 被抓到（1 个测试失败） | mood: sleepy from 23:00 until 05:00 (4:59) |
| M16 | moodOf: excited from 31 turns | 被抓到（2 个测试失败） | mood: a busy day (30 turns) makes her excited, and a good thing outran；mood: the face of a happy, an excited and a calm day |
| M17 | HAPPY_MS 15 -> 10 min | **没被抓到** | 真缺口：测试只在 16 分钟后检查"心情已结束"，10 分钟和 15 分钟之间的任何值都能通过 |
| M18 | WORRIED_MS 5 -> 10 min | 被抓到（1 个测试失败） | recovery: turns without a worry do not count, and neither does a worry |
| M19 | narrow: ignore a longer today label | **没被抓到** | 真缺口："今日"文字变长时窗口阈值要提高——没有测试 |
| M20 | narrow: ignore a longer button row | **没被抓到** | 真缺口：按钮行变长时窗口阈值要提高——没有测试 |
| M21 | NARROW_COLS 97 -> 90 | **没被抓到** | 真缺口：97 这个阈值本身——没有测试（只有一个 60 列的窄窗口测试） |
| M22 | pats: no daily cap | 被抓到（3 个测试失败） | pat: reacts, adds affection (capped per day), then clears by itself；several conversations: pats already used up today in another conversat |
| M23 | comforts never counted | **没被抓到** | 等价（部分变异）：这个变异只改了"计分的那一次摸头"这一条分支，而 comfort 测试走的是不计分的分支；改两条分支的 M36 被抓到了 |
| M24 | finishBreak: late break still counts | **没被抓到** | 真缺口：休息结束得太晚（电脑睡眠）不计数——没有测试 |
| M25 | /pet rest demo counts as ignoring | 被抓到（1 个测试失败） | demo: carrying on after /pet rest is not counted as ignoring a real re |
| M26 | affection: no rounding to 0.1 | **没被抓到** | 真缺口：点数取整到 0.1（避免浮点误差）——没有测试 |
| M27 | num(): accepts NaN | 被抓到（10 个测试失败） | pat: reacts, adds affection (capped per day), then clears by itself；achievements: an unlock gives its affection reward once (first = +3) |
| M28 | achievement rewards not scaled | 被抓到（3 个测试失败） | achievements: an unlock gives its affection reward once (first = +3)；points: the first 10 turns of a day are worth 1, the next ones 0.5 (12 |
| M29 | recoverMood: does not end the worry | 被抓到（1 个测试失败） | recovery: a good turn while she is worried ends the worry, makes her h |
| M30 | focus: late timer still counts | **没被抓到** | 真缺口：番茄钟结束得太晚不计数——没有测试（上一轮 A-14 就列过，仍未补） |
| M31 | daily check-in bonus capped at 5 instead of 8 | 被抓到（2 个测试失败） | check-in: the reward grows with the streak (3 + days - 1, at most 8) a；streak: a weekend off does not break it (Friday -> Monday), a longer g |
| M32 | mood only shows when plain idle: allow during timers | 被抓到（1 个测试失败） | break: a finished focus timer starts a 5 minute break; pats do not end |
| M33 | excited mood uses yesterday-safe turns: drop sameDay check | **没被抓到** | 真缺口："兴奋"心情只认当天的轮数（跨天不沿用）——没有测试 |
| M34 | level thresholds: Lv.14 1000 -> 1001 | **没被抓到** | 真缺口：Lv.14 = 1000 这个锚点——没有测试断言（只测了 Lv.5、Lv.6、Lv.10 附近的值） |
| M35 | check-in cap 8 -> 9 | **没被抓到** | 真缺口：签到封顶 8 点——没有测试（只测了第 5 天 = 7 点） |
| M36 | comforts never counted (both branches) | 被抓到（1 个测试失败） | comfort: five pats while she is worried unlock the hidden 贴心安慰; pats w |
| M37 | reward rounding: round -> floor | 被抓到（3 个测试失败） | achievements: an unlock gives its affection reward once (first = +3)；points: the first 10 turns of a day are worth 1, the next ones 0.5 (12 |
| M38 | SUM_LABEL_BASE 21 -> 30 | **没被抓到** | 真缺口：同 M19 |
| M39 | ROW_BASE_COST 40 -> 30 | **没被抓到** | 真缺口：同 M20 |
| M40 | turn pay off by one (turnPoints(day.turns - 1)) | **没被抓到** | 真缺口：同 M01–M03：第 81 轮给 0.1 点，界面显示不出来 |
| M41 | EXCITED_TURNS 30 -> 31 | 被抓到（3 个测试失败） | mood: a busy day (30 turns) makes her excited, and a good thing outran；mood: the face of a happy, an excited and a calm day |
| M42 | recoverMood ignores expiry of the worry | **没被抓到** | 真缺口：担心过期后成功完成一轮不算雨过天晴——测试里"过期"那条只检查了计数没增加，而变异把过期判断拿掉后，另一个条件（`reallyWorried`）仍然拦住，所以抓不到；这条保护在代码里是重复的，属于低价值缺口 |
| M43 | NIGHT_FROM 23 -> 22 | 被抓到（1 个测试失败） | mood: sleepy from 23:00 until 05:00 (22:59) |
| M44 | finishFocus single-settlement guard removed | **没被抓到** | 等价（单线程模拟测不到）：一个番茄钟只结算一次的保护，要两个调用者同时到才有区别；测试框架里是顺序的 |
| M45 | claimDay result ignored | **没被抓到** | 低价值：变异后 `nk` 为空会抛错，但调用方（`restoreSaved`、`turn.start`）都有 try/catch，现象上看不出区别 |
| M46 | worry demo marker ignored | 被抓到（1 个测试失败） | recovery: the /pet mood worried demo does not count as a worry |

### "取整盲区"是怎么回事

`heartText` 把点数用 `Math.floor` 取整后显示（`register.tsx:1353`）。测试大多靠找界面上的 `Lv.N · 点数/下一级` 文字来判断，例如 `points: the first 10 turns…` 期望 `Lv.2 · 14/35`。该测试的预期是 10 + 0.5 + 0.5 + 3（"初次见面"奖励）= 14；如果第 11 轮错给 1 点，实际是 10 + 1 + 0.5 + 3 = 14.5，取整后还是 14，测试通过。

`今日小结`里有一行"今日心意 +N"，用的是保留一位小数的值（`register.tsx` 的 `Math.round(gone.pts * 10) / 10`），**用它来断言就能看到小数**。我在临时副本里没有改测试，这只是建议。

## 3. 名字和检查对不上的测试【读代码；其中前两条有变异结果佐证】

| 测试（`pet.test.ts` 行号） | 名字说的 | 实际检查的 | 说明 |
|---|---|---|---|
| `check-in: the reward grows with the streak (3 + days - 1, at most 8) and a broken streak starts again at 3`（`:551`） | 随连续天数增长、最多 8、断了回到 3 | 只检查"第 5 天 = 7 点" | 没测"最多 8"（M35 没被抓到），"断了回到 3"实际在下一条测试（`:564`）里。名字应该只写第 5 天 = 7 |
| `achievement rewards are scaled: the total is about a seventh of what Lv.20 needs`（`:716`） | 奖励按比例放大、总和约占满级点数的七分之一 | 在测试里**自己写了一份 41 项的原始奖励表**，自己做 `Math.round(r * 1.3)` 后求和，再断言 > 250 且 < 0.16 | 完全不读代码里的 `REWARD_SCALE`、`ACHS`。把代码里的比例改掉，这条测试照样通过（其它测试抓到了 M06、M28，但不是靠这一条）。要测"代码里的奖励总和"，需要从界面里读（比如逐个解锁后看好感度）或者让代码导出这个数 |
| `migration: an old save keeps its level (…), once`（`:684`）和 `migration: a high old level is kept too (…), and a migrated save is left alone`（`:692`） | "只一次"、"迁移过的存档不再动" | 只运行了一次迁移，没有第二次 `session.start` | 迁移标记没人测（M10）。真正测"已迁移的存档不动"的是第三条（`:700`，预设 `model: 2`），它能抓到把判断条件改错（M11），抓不到"不写标记" |
| `mood: the face follows the mood (sleepy, worried, happy, excited, calm)`（`:831`） | 五种心情的脸 | 只检查了 sleepy 和 worried | happy / excited / calm 在下一条（`:840`）里检查，名字应该只写前两个 |

## 4. 速度【实际运行】

- 串行、默认设置运行一遍：`streak`（`:128`）10.0 秒（已经设了 `timeoutMs: 60000`，通过）；`busy days`（`:967`）要 7.5 秒，**默认 5 秒超时，失败**；其余都在 1.1 秒以内。
- `CLAUDE.md` 写的是"慢机器上 streak 测试已放宽超时"。现在需要放宽的是两条。建议给 `busy days` 也加 `{ timeoutMs: 60000 }`（`timeoutMs`，不是 `timeout`，上一轮已验证）。
- 这两条慢的原因相同：把时钟推进几十个 24 小时，每个小时触发 120 次 30 秒检查（见上一轮 A-12）。`busy days` 推进了 11 个整天加几百轮。

## 5. 建议补的测试（都有明确的预期值）

| 补什么 | 怎么写 | 预期 | 对应 |
|---|---|---|---|
| 点数的小数档 | 全新存档，连续完成对话（不推进时钟），打开"今日小结"，读 `今日心意 +N` | **我在临时探针里跑过，读到的值是**：10 轮 → +13，12 轮 → +14，30 轮 → +23，31 轮 → +23.1，80 轮 → +35，81 轮 → +35（这里面含"初次见面" +3 和"忙碌的一天" +7 两个成就奖励）。把第 11 轮改成 1 点会让 12 轮变成 +14.5，把 0.5 档改成 0.6 档会让 30 轮变成 +25，让第 81 轮多给 0.1 点会让 81 轮变成 +35.1，都能被发现 | M01、M02、M03、M40、M26 |
| 休息的第 5 次不给分 | 参照 `points: the fifth timer of a day pays nothing`（`:647`），预设 `rests: 4` | 好感度不变 | M05 |
| 迁移标记 | 预设旧存档，连续两次 `session.start` | 第二次后点数不变（我用探针跑过：旧 Lv.19 的 1500 → 1792，第二次仍是 1792；探针见本仓库报告 `code-review-v0.5.0-2026-10-24.md` 附录） | M10 |
| 排版阈值 | 在 `bodyColumns` 为 96、97 时各挂载一次；ctx 82% 时（不触发警告）在 109、110 挂载 | 我跑过：96 列隐藏右栏、97 列显示；有"压缩上下文"按钮时 109 隐藏、110 显示（与代码公式 97 + 13 完全一致） | M19–M21、M38、M39 |
| 迟到的番茄钟 / 休息 | 睡眠一段时间后（推进 6 分钟以上、不触发 30 秒检查之间的计时器）检查不计数 | 番茄数、完整休息数不变 | M24、M30 |
| 心情持续时间 | 摸头后推进 14 分钟仍开心、16 分钟后结束 | — | M17 |
| 兴奋心情跨天 | 前一天 30 轮，次日零点后开机 | 不应该是兴奋 | M33 |
| 签到封顶 | 预设连续天数 9 | 点数 = 8 | M35 |
| 锚点 | 断言 Lv.14 = 1000、Lv.20 = 1975 | — | M34 |

## 6. 需要维护者回答的问题

1. 是否愿意把"今日心意 +N"当作小数点数的断言入口？还是想让测试直接读存档里的 `affection`（现在的测试框架里 `mock.store` 能读吗？我没有验证）？
2. `achievement rewards are scaled` 那条，你的本意是"代码里的总和"还是"设计上的比例"？如果是后者，名字可以改成 `design check`，并且说明它不测代码。
3. 变异测试里"真缺口"的部分，你想自己补，还是要我把上面的补测试清单写成可直接粘贴的测试代码（放在 `docs/` 里，不改 `pet.test.ts`）？
