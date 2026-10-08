# 代码审查（只读）：`hooks/register.tsx` 与 `pet.test.ts`

> 范围：`hooks/register.tsx`（v0.3.1 构建，1249 行，我通读了全部代码，内嵌的 base64 图片除外）、`pet.test.ts`、`types/index.d.ts`、`hooks/hooks.json`。
> 方法：读代码；跑 `claude plugin validate .` 和 `claude plugin test .`；在**临时目录里的副本**上写探针测试验证怀疑点（探针没有放进仓库，核心片段见附录）。**没有修改仓库里的任何代码。**
> 标记：**已确认** = 读代码确认，或我跑过、复现了；**未验证** = 只是推断，或需要真实的 Claude Code 才能确认。
> 严重程度：**高** = 日常使用就会坏或丢数据；**中** = 有条件触发的功能缺陷或数据不一致；**低** = 轻微、罕见，或只影响展示 / 测试。

## 结论（先看这个）

- **没有"高"。** 3 个"中"、12 个"低"。
- 你问的重点逐项结论：
  1. **日历日 / 夏令时 / 午夜翻日：没有发现问题。** `dayBefore` 我用 7 个时区（含夏令时和半小时夏令时）、3 年、每 15 分钟共 105,264 个时间点对拍，0 处错误（已确认）。
  2. **电脑休眠恢复：基本稳。** 番茄钟有"迟到 5 分钟不算"（`:691`）和 30 秒兜底检查；唯一的坑是休息奖励没有对应的迟到判定（A-8）。
  3. **多个对话共用存档：`locked()` 只在本对话内有效，跨对话仍然是"读-改-写"，可能丢更新或重复发奖（A-3）；另有 2 处没按"先读再加、放进 locked()"的约定写（A-4 摸头上限、A-5 连续天数）。**
  4. **定时器和异步竞态：** 摸头每日上限能被并发点击绕过（A-4，已复现：并发 10 次摸头加了 10 点，上限是 5）；其余竞态只是结构上存在，没复现（A-9、A-10）。
  5. **成就：没有无限循环，没有同一对话内重复触发，没有发现漏触发的路径**；但演示命令 `/pet rest` 会计入"不听劝"（A-6）。
  6. **数字：** 存档被写坏时好感度会变成 `null`（A-7，已复现）；其余数值运算我没找到越界或 NaN 传播。
  7. **最值得先修的一条：A-1。** 一轮任务超过 15 分钟（比如一次长时间的自动任务），"连续工作一小时"的休息提醒就永远不会出现（已复现）。
- 测试：**默认设置下 41 个里 40 个通过、1 个失败**（`streak`，5 秒超时，3 次运行都失败）；给它加 `{ timeoutMs: 60000 }` 后 41/41 通过（A-12）。`claude plugin validate .` 通过（`Validation passed with warnings`）：1 条正式警告 + 3 条提示。

## 1. 运行结果（如实）

环境：Claude Code 2.1.294（CLAUDE.md 里写的测试版本是 2.1.286，这里版本不同），Linux，时区 UTC。

| 命令 | 结果 |
|---|---|
| `claude plugin validate .` | `Validation passed with warnings`。1 条正式警告：根目录的 `CLAUDE.md` 不会被当作项目上下文加载（说明性提示，对维护文档无影响）。另有 3 条提示：`classic.PermissionRequest`、`tool.call`、`session.compact` 三个"门控钩子"没有 `.catch`（见 A-2） |
| `claude plugin test .`（原样） | 40 通过，**1 失败**：`streak: a session left open overnight counts the next day on its first prompt`，`Error: timed out after 5000 ms`。连续跑 3 次都失败 |
| 给该测试加 `{ timeoutMs: 60000 }`（在临时副本里） | **41/41 通过**，该测试耗时约 8.4 秒（已确认）。用 `{ timeout: 60000 }` 这个写法无效 |

## 2. 发现的问题

### 中

#### A-1　一轮任务超过 15 分钟，"连续工作一小时"提醒永远不触发（中）　【已确认，已复现】

- 位置：`hooks/register.tsx:912-914`（30 秒检查里 `now - la > WORK_GAP_MS` 就把 `workStart` 清零），`:954`、`:988`（`lastActive` 只在 `turn.start` 和 `turn.complete` 更新），`:971-981`（`tool.call` 不更新）。
- 场景：用户发出一个要跑 40 分钟的任务。`turn.start` 在 0 分钟更新 `lastActive`；15 分钟后 30 秒检查发现"15 分钟没活动"，把 `workStart` 和 `remindDue` 清零，把这当成一次休息。任务结束后下一次 `turn.start` 才重新开始计时。结果：长时间跑 agent 的人（这正是最需要休息提醒的人）永远收不到提醒。
- 复现：探针 P4——一次 `turn.start` 后每 5 分钟一次 `tool.call`，共 70 分钟：提醒出现 **0 次**；对照组（每 10 分钟一个新提示，共 70 分钟）出现 **1 次**。
- 同一个根因的连带问题：番茄钟结束后的 5 分钟休息（`startBreak`）在一轮长任务进行中也会照常走完，并记一次"完整休息"（`:717-726`），见 A-8。
- 建议：用一个 `turnActive` 标志，`turn.start` 设为 true、`turn.complete` 设为 false；30 秒检查在 `turnActive` 为 true 时不清零 `workStart`，也不判定休息。或者在 `tool.call` 里更新 `lastActive`（只改内存里的 atom，不写存档，开销很小）。
- 需要维护者在本机改源码并重新构建。

#### A-2　宠物自己的存档 / 界面出错，可能连带阻断宿主事件（中）　【validate 提示已确认；实际影响未验证】

- 位置：`:944-961`（`turn.start`）、`:983-1027`（`turn.complete`）、`:966-969`、`:971-981`、`:1031-1053`（`session.compact`）；`claude plugin validate .` 对 `classic.PermissionRequest`、`tool.call`、`session.compact` 给出提示 `gating hook without .catch`。
- 场景：这些处理函数先做一串 `await $.store.get/set`、`update`，最后才 `return next(e)`。任何一步抛错（磁盘满、存档文件被占用、写权限），`next(e)` 就没被调用。最差的一个是 `session.compact`：压缩已经成功，`:1046` 的 `bumpStats`（只是个统计）抛错，被 `:1049-1052` 的 `catch` 重新抛出，宿主看到的是"压缩失败"，压缩结果 `r` 可能被丢掉。
- 没能验证的部分：我想用测试框架模拟存档故障，但框架会把抛错的 hook 当作"跳过"，得不到有意义的结果；宿主遇到插件 hook 抛错时是吞掉还是中断，我没验证过。
- 建议：把所有"只为了统计 / 界面"的副作用包进 `try { ... } catch {}`，保证 `next(e)` 和 `return r` 一定会执行。
- 需要维护者在本机改源码。

#### A-3　跨对话的存档是"读-改-写"，`locked()` 管不到别的对话，可能丢更新或重复发奖（中）　【代码结构已确认；发生概率、`$.store` 是否带原子性：未验证】

- 位置：
  - `:518-525`（`affection`：读 `stored`，加，写）；
  - `:555-562`（`stats`）；`:540-548`（`today`）；
  - `:481-495`（`achieved`：读，算出新解锁，写）。
- `locked()`（`:294-299`）是模块里的一条 Promise 链，注释也写明"inside this conversation"。如果每个对话各有一份模块实例（我没法在测试里验证），两个对话同时做"读 `stats` → 加 → 写"，后写的会盖掉先写的，另一个对话的一次增量就丢了。
- 最麻烦的是成就：A、B 两个对话几乎同时越过同一个门槛，各自读到旧的 `achieved`，各自判定"新解锁"，各自 `addAffection(奖励)`——**奖励发两次**；或者 B 写回的 `achieved` 不含 A 刚解锁的那个，之后再被当成"新解锁"重发一遍。
- 触发条件：两个对话在几毫秒内同时做存档读写。作者在 `:737-738` 的注释里说"app 重启时几个对话同时启动"是真实场景，所以并发不是纯理论。
- 现有保护：①"先存档再读"的顺序（`Math.max(stored, atom)`，`:520`）已经保证了**顺序**发生的两个对话不会互相覆盖（测试 `shared store` 也验证了）；②每日签到用 `dayClaim` 认领（`:747-757`）。缺的是同一毫秒级的真并发。
- 建议：先确认 `$.store` 有没有原子更新（比如 compare-and-set / update 回调）。有就用；没有，则给每条会发奖励的记录加幂等标记（例如发奖时同时写 `rewarded:<成就id>`，发之前再读一次），把"重复发奖"降到极小概率；统计的丢更新可以接受并在 README 里说明。

### 低

#### A-4　摸头每日上限：先检查、后执行，并发点击能绕过（低）　【已确认，已复现】　⚠ 违反"先读再加、放进 locked()"约定

- 位置：`:582-592`。`react()` 在锁**外面**读 `today.pats` 判断 `< PATS_PER_DAY`，然后才调用 `bumpToday`（锁里）和 `addAffection`。判断和增加之间有多个 `await`，别的点击 / 别的对话可以插进来。
- 复现：探针 P1——并发触发 10 次"摸摸头"，好感度 +10（`Lv.2 · 10`）；顺序点 10 次是 +5（`Lv.1 · 5`，对照组）。
- 实际影响小（最多多几点），真人点击能不能这么快我没验证。但它正是你要我查的那一类。
- 建议：把"读 `today.pats` → 判断 → `pats+1`"合成一个 `locked` 函数，返回"这次要不要加点"，加点（`addAffection`）放在锁外面（`addAffection` 自己也要拿锁，不能嵌套）。

#### A-5　连续天数的读-改-写没放进 `locked()`，`turn.start` 路径没有认领保护（低）　【代码已确认；真实触发未验证】　⚠ 违反约定

- 位置：`:741-762`（`dailyCheck` 里读 `streak`、写 `streak`），`:957`（`turn.start` 调用 `dailyCheck($, now)`，`settleMs` 为 0）。
- 场景：`session.start` 路径有 `dayClaim` 保护（150 毫秒认领，`:747-757`，我用探针 P8 验证了"启动后立刻发第一条提示"只记一次、只弹一次问候，是对的）。但**长时间开着的对话在新的一天发第一条提示**走的是 `turn.start` 路径，没有认领。两个这样的对话在同一刻跨日发消息，会各发一次 `3 + min(n-1,5)`（3～8）点的签到奖励，并各弹一次问候。
- 另一个小点：认领等待用 `$.clock.after(settleMs, …)` 包成 Promise（`:750`）；如果宿主在重载时丢掉这个定时器，Promise 永远不 resolve，`restoreSaved` 就卡住（不会阻塞启动，但问候和签到都不会发生）。未验证。
- 建议：`turn.start` 路径也用同样的认领，或把"读 `streak` → 判断是否已记今天 → 写 `streak`"放进 `locked()`，判断结果再决定是否 `addAffection`。

#### A-6　演示命令 `/pet rest` 会累计"不听劝"成就（低）　【已确认】

- 位置：`:832`（`/pet rest` 把 `remindDue` 设为 true）、`:946`（`turn.start` 只要 `remindDue` 就 `ignored+1`）；演示说明 `:890` 写着"只是演示，不计入任何统计"。
- 场景：发一条消息 → `/pet rest` → 再发 5 条消息，隐藏成就"不听劝"解锁并发 +5 好感度。现有测试 `pet.test.ts:344-353` 正是用这个办法解锁的，所以这可能是作者有意走的捷径，但和 `/pet break` 刻意不计数（`:722`、测试 `:477-487`）的做法不一致。
- 相关：`ignored` 是**终身累计**，成就描述写"又发了 5 条消息"（`:352`），实际是"所有提醒加起来累计 5 条"。
- 建议：演示用一个独立标志（如 `demoRemind`），`turn.start` 里只在非演示提醒时才计数；或者把说明改成实话。

#### A-7　存档数据损坏时，好感度变成 `null` 并写回（低）　【已确认，已复现】

- 位置：`:519-520`（`Number(stored ?? 0)` 得到 NaN，`Math.max(NaN, x)` 仍是 NaN），`:774-775`（`restoreSaved`）；同类写法还有 `streak.n`（`:759`）、`today.*`（`:543-545`）。只有 `stats` 做了 NaN 保护（`normStats`，`:285-290`）。
- 复现：探针 P6——存档里 `affection: 'abc'`，点一次摸头后界面显示 `♥ Lv.1 · null/8`；`NaN` 写回存档会变成 `null`，下次读取 `?? 0` 变成 0，**全部好感度清零**。
- 触发条件：存档被手改或被别的版本写坏。罕见。
- 建议：统一用 `const num = (x: unknown) => (Number.isFinite(Number(x)) ? Number(x) : 0)` 读取所有数值型存档字段。

#### A-8　"完整休息"没有迟到判定（低）　【已确认（读代码）】

- 位置：`:717-726`（`finishBreak`），对照 `:687-691`（`finishFocus` 有 `LATE_FOCUS_MS`）。
- 场景：番茄钟结束后合上电脑睡了一晚；醒来 30 秒检查发现 `now >= breakEnd`，记一次 `breaks+1`、弹"休息结束"、可能解锁"好好休息 / 懂得休息"。此外，A-1 提到的长任务进行中，休息也会被判完成。
- 建议：`finishBreak` 里同样判断 `now - end > LATE`，迟到就静默结束、不计数。

#### A-9　定时器可能重复注册；`finishFocus` 是"先检查后清零"（低）　【结构已确认；未复现，实际影响未验证】

- 位置：`:901`、`:930`（`session.start` 里 `clock.every` 没有取消 / 去重）；`:688-690`（`finishFocus`：读 `focusEnd` 比对 → 再 `update(focusEnd, 0)`，两步之间有 `await`）。
- 场景：如果宿主在 `/clear`、恢复会话或 `/reload-plugins` 时再次触发 `session.start`（我没验证），同一模块会有多套 30 秒检查，再加上 `clock.after` 的定时器，几个调用者同时通过 `focusEnd === endedAt` 的比对，一个番茄钟就可能记多次。
- 探针 P2：连发 1 / 2 / 3 次 `session.start` 后跑完一个番茄钟，**都只记 1 个番茄**，所以没复现。
- 建议：用模块级标志避免重复注册定时器；`finishFocus` 先在内存里"认领"（`if (finishing === endedAt) return; finishing = endedAt`），再做异步操作。

#### A-10　`setMode` 分两步写 `mode` 和 `since`（低）　【未验证】

- 位置：`:437-442`，30 秒检查读取处 `:902-908`。
- 场景：30 秒检查恰好在 `mode` 已更新、`since` 还没更新的间隙读取，会拿新的 `mode` 配旧的 `since`，`now - t > lim` 立刻成立，临时姿势（done / worry / greet）被提前改回 idle。窗口只有一个 `await`，我没有复现。
- 建议：先写 `since` 再写 `mode`，或合成一个 atom。

#### A-11　`isAborted` 和 `e.args` 没处理（低）　【未验证】

- 位置：`isAborted` 在 `register.tsx` 里一次都没出现（我 grep 过，0 处），而测试里每次 `turn.complete` 都传了；`:941` 的 `e.args.trim()`。
- 场景：如果用户按 Esc 中断一轮，宿主给的是 `reason: 'answer'` 加 `isAborted: true`，会被当成一次完成的对话（+1 点，`turns+1`，可能触发成就）。`/pet` 不带参数时如果宿主传 `args: undefined`，`trim()` 会抛错。这两点都取决于宿主的真实行为，我没验证。
- 建议：确认宿主在中断时给什么 `reason`；`(e.args ?? '').trim()`。

#### A-12　测试：`streak` 测试在默认 5 秒超时下失败（低）　【已确认，已复现】

- 位置：`pet.test.ts:128-136`。
- 原因：`clock.advance(24 * 60 * 60 * 1000 + 60000)` 要触发 2880 次 30 秒检查，每次十几次状态读取；我在这台机器上量到 1 小时约 0.7 秒、23 小时约 4.0 秒，加上启动，总共约 8.4 秒，超过默认的 5 秒。逻辑没问题（加长超时后通过）。
- 建议：给这个测试加 `{ timeoutMs: 60000 }`（注意是 `timeoutMs`，`timeout` 无效），或者想办法不推进整整 24 小时（比如用 `clock.set` 直接跳到次日，我没试过 `clock.set` 会不会触发定时器）。
- 影响：CLAUDE.md 说"当前共 41 个测试"，在慢一点的机器上默认设置不一定全绿。

#### A-13　测试：夏令时断言是"自证"的（低）　【已确认】

- 位置：`pet.test.ts:410-417`。期望值用和实现一模一样的 `setDate(getDate() - 1)` 算出来，而且 CI / 沙盒时区通常是 UTC（没有夏令时），所以这条测试实际上测不到夏令时。
- 实现本身是对的：我用 `dayBefore` 的原样代码，在 UTC、America/New_York、Europe/London、Australia/Lord_Howe、Asia/Shanghai、America/Sao_Paulo、Pacific/Auckland 七个时区、2024–2026 共 105,264 个时间点，对拍"本地日历上的前一天"，**0 处不一致**；而朴素的"减 24 小时"在有夏令时的四个时区各错 12～24 个点。
- 建议：测试里写死几组夏令时前后的毫秒值，期望的日期字符串也写死；或在测试里设置 `process.env.TZ`。

#### A-14　测试覆盖空白（低）　【已确认（读测试代码 + grep）】

目前 41 个测试（39 个顶层 `test(`，加上 `for` 循环里的 1 个、跑 desktop / terminal 两遍）没有覆盖下列分支：

| 没覆盖的分支 | 代码位置 |
|---|---|
| 番茄钟"迟到 5 分钟不算"；放弃专注（`cancelFocus`，没有测试按第二次 `focus` 键） | `:691`、`:679-684` |
| 签到奖励的**点数**（3 + min(n-1,5)）和断签后重置为 1、第 6 天起封顶 8（只测了"连续第 N 天"字样） | `:759-766` |
| 升级门槛：只测了 Lv.2 和 Lv.5；没测 Lv.7 / Lv.14 的阶段切换、Lv.20 的 `MAX` | `:102-111`、`:1148-1151` |
| 上下文 85% 警告（`warnCtx`）和重新上膛 | `:606-632` |
| 重启后恢复 5H / 7D（`stale`）和缓存命中率；`turn.complete` 的 `usage` 计算 | `:782-797`、`:989-1005` |
| `session.compact` 被跳过（`r.skip`）和抛错路径 | `:1038-1052` |
| `fillCompact` 的"输入框已有内容"和填充失败 | `:648-665` |
| 15 分钟断档重新开始工作计时（`WORK_GAP_MS`）；长任务期间的行为（A-1） | `:912-914` |
| 0–5 点的"夜猫子"（测试时钟是 UTC 22:13，到不了） | `:1009-1010` |
| 隐藏 / 显示按钮；`/pet` 其余演示（level、hello、warn、compact、long、ach） | `:1099-1105`、`:821-891` |
| 两个对话的真并发（测试里只有一个 `$`，天然测不了） | A-3、A-4、A-5 |
| 存档被写坏 / 字段缺失（只测了旧版缺少 `stats` 新字段） | A-7 |

#### A-15　其它小瑕疵（低）

- `:1149`：`const heart` 定义了但没用到（死代码）。【已确认】
- `:1156`：成就数显示 `${have.length}/${ACHS.length}`；如果存档里留着已删除的旧成就 id，会显示成 `40/38`。【已确认（读代码）】
- `:6-16`：`loadSprite` 读取失败不缓存，缺失的姿势每次渲染都会重读文件。目前 21 张图齐全，所以不会发生。【已确认】
- 如果存档 / 状态读取一直不返回，`locked()` 的链会卡住，之后所有 `bump*` 和 `addAffection` 都排在后面等（`:294-299`）。【未验证】

## 3. "先读再加、放进 `locked()`"约定检查

约定本身：对共享存档做"读 → 加 → 写"的地方，必须放在 `locked()` 里，且 `locked` 不能嵌套（会自己等自己）。

**嵌套检查：** `checkAch → locked(checkAchLocked)`、`addAffection → locked(addAffectionLocked)`、`bumpToday / bumpStats` 都是锁里不再调用别的 `locked` 函数；`addAffection` 在锁外面再调 `checkAch`，`checkAch` 在锁外面再调 `addAffection`（发奖励），没有嵌套（已确认）。`locked()` 对前一个任务抛错也能继续（`then(fn, fn)` 与 `run.then(…, …)`，已确认）。

所有 `$.store` 的读写位置：

| 位置 | 读 / 写什么 | 在 `locked()` 里？ | 判定 |
|---|---|---|---|
| `:471-482`、`:495` | `stats`、`streak`、`affection`、`today`、`achieved`（读），`achieved`（写） | 是 | 本对话内符合；跨对话见 A-3 |
| `:519-523` | `affection` 读 → 加 → 写 | 是 | 本对话内符合；跨对话见 A-3 |
| `:542-547` | `today` | 是 | 同上 |
| `:556-562` | `stats` | 是 | 同上 |
| **`:583`** | `today.pats`（读，用来判断上限） | **否** | **违反**：检查和增加之间不在同一把锁里（A-4，已复现） |
| **`:615-620`** | `warned5` 读 → 比较 → 写 | **否** | **违反**：两个对话几乎同时越过 80% 时会各弹一次警告（这是"每个周期只提醒一次"的去重，不是计数，后果只是多弹一次） |
| **`:741-742`、`:762`** | `streak` 读 → 判断 → 写 | **否** | **违反**：A-5；`session.start` 路径有 `dayClaim` 补救，`turn.start` 路径没有 |
| `:749-757` | `dayClaim` 写 / 读 | 否 | 认领协议本身，不是计数 |
| `:774-800` | `restoreSaved` 只读，写进本对话的 atom | 否 | 可以：不写回存档。但它在读取和写 atom 之间有 `await`，如果这期间别处刚加了点，atom 会被旧值覆盖，界面会短暂显示偏低的数字（存档是对的，下次 `addAffection` 取 `max(stored, atom)` 会纠正）。低，未验证 |
| `:1002`、`:1083` | `cacheHit`、`limits` 直接覆盖写 | 否 | 可以：最后写入者赢，不是累加 |

## 4. 检查过、没有发现问题的地方（已确认）

- **日期计算**：`dayOf`（`:420-423`）按本地日历；`dayBefore`（`:731-735`）用 `setDate(-1)`，实测正确（见 A-13）。`today` 计数器按日期字符串自动翻日（`:543-544`），界面用 `sameDay` 判断（`:1141`），午夜翻日后"今日小结"会自己归零。问候时段（`:277`）覆盖 0–23 点无空洞。
- **电脑休眠恢复**：番茄钟（`:691`）、15 分钟断档（`:912`）、临时姿势超时（`:907-908`）、`warnUntil`（`:923-927`）都由 30 秒检查兜底；睡过头的番茄钟不给奖励。
- **成就**：
  - 无限循环：`checkAch ↔ addAffection` 的递归每一层至少要有 1 个新成就才会继续，总共 38 个，所以有限；`checkAchLocked` 里的 `for (round < 5)` 有上界。
  - 同一对话内重复触发：`locked` + 与存档取并集（`:483`）+ 解锁后写回，保证每个成就只会在本对话里解锁一次（测试 `an unlock gives its affection reward once` 也覆盖了）。
  - 漏触发：每一条会改变成就计数的路径之后都调用了 `checkAch`（对话 / 摸头 / 番茄钟走 `addAffection`，其余走 `bumpStats` 的默认检查，签到走 `addAffection`）。唯一"晚一步"的是 `restoreSaved`（`:772`），它只恢复数据不检查，要等下一个事件才补检查，不影响结果。
  - "全部收集"（`:353`）的 `goal` 是 0、`cur` 为负时不满足，全部普通成就解锁后等于 0 触发；测试 `unlocking the last ordinary one` 覆盖。
- **数字**：`bar()` 对百分比做了 0–100 夹取（`:398`）；`untilText` 对非法时间返回 `--`（`:427-428`）；`normStats` 对 NaN 安全；缓存命中率分母大于 0 才计算（`:992`、`:997`）。探针 P7：`rateLimits` 里缺 `percentUsed` 时界面**没有崩溃**。
- **姿势文件**：`assets/` 里 21 张图与代码里用到的 21 个姿势一一对应，没有缺漏。

## 5. 未验证清单

1. `$.store` 是不是真的多个对话共用同一份文件、有没有原子更新（A-3 的前提）。
2. 每个对话是否各有一份模块实例（`locked()` 是否跨对话；A-3）。
3. 宿主对 hook 抛错是吞掉还是中断（A-2）。
4. 宿主在 `/clear`、恢复会话、`/reload-plugins` 时会不会再次触发 `session.start`，旧模块的定时器会不会被释放（A-9）。
5. 用户按 Esc 中断一轮时，`turn.complete` 的 `reason` 和 `isAborted` 是什么（A-11）。
6. 无界面模式（`claude -p`）下 hook 是否触发（影响"脚本刷分"，见 `affection-economy.md` B-1）。
7. 真人点击速度能不能快到触发 A-4。
8. 真实的 Claude Code 桌面端表现：我只跑了自动化测试，没有在桌面端或终端里实际使用过。

## 附录：探针测试（没有放进仓库）

探针放在一份临时副本里运行，用的是仓库测试里同样的 `engine / mount / count` 辅助函数。核心写法：

```ts
// A-4：并发摸头
await Promise.all(Array.from({ length: 10 }, () => $.ui.press({ plugin: 'pet', key: 'pat' })))
// 期望好感度 5（上限），实际 10

// A-1：70 分钟里一直在跑同一轮任务
await $.turn.start({ text: 'big job', turnId: 'long' })
for (let i = 0; i < 14; i++) {
  await clock.advance(5 * 60 * 1000)
  await $.tool.call({ tool: 'Bash', tool_use_id: 'b' + i, command: 'make' })
}
// 期望出现 1 次休息提醒，实际 0 次

// A-7：存档里 affection 是坏数据
await engine($, on, { affection: 'abc' })
await $.ui.press({ plugin: 'pet', key: 'pat' })
// 界面显示 "♥ Lv.1 · null/8"
```
