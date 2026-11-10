# 第六轮复查：桌宠 v0.6.0

- 日期：2026-11-10　版本：v0.6.0（标签 `v0.6.0`，`main` 提交 `6402e90`，已合并进 `claude/review-reports`）
- 环境：Claude Code 2.1.322（云端 Linux，命令行版）。**桌面端的显示我看不到。**
- 标注：**读代码** / **实际运行**（`claude plugin test` 的测试环境里挂载真实的 `register.tsx`，探针和变异都在临时目录的副本上）/ **宿主类型**（这个 2.1.322 构建自己生成的插件 API 类型声明，引擎随插件开发技能写出的那份 `claude-code.d.ts`；它说明这个版本的接口长什么样，**不等于**你桌面端那个版本的实际行为）/ **推断**。
- 没有改 `register.tsx`、`pet.test.ts` 和任何文档；只新增这份报告，以及同目录下的 `round6-probes.txt`（本报告的 13 个探针；存成 `probe.test.ts`、和插件放在一个临时文件夹里才会运行，故意不用 `.test.ts` 结尾，免得 `claude plugin test .` 在审核分支上把它当成正式测试）和 `round6-mutate.py`（25 个变异的脚本）。
- 位置一律写"文件 + 函数名"，不写行号。

## 结论

- **有 1 个中危（R6-1），就是你补充的"工作流时还是敲键盘"。** 原因已在测试环境复现：子 agent 自己的 `tool.call` 和 `turn.start` 仍然会把她的模式切成"工作"/"思考"（`tool.call` 里 `setMode($, 'work')` 不分是谁调用的；`turn.start` 只有前半段判断了 `agentId`）。只有她自己的 Agent 调用还开着（`blocked`）时，"等助手汇报"才能盖过去，所以：
  - 前台子 agent：Agent 调用一直开着 → 正常显示等待（与你看到的一致）；
  - 工作流：在 2.1.322 上 `Workflow` 工具**立刻返回**（结果是 `status: "async_launched"`，宿主类型），`blocked` 只开了一瞬间；之后工作流里的 agent 一调用工具，她就变回敲键盘，而且**助手全部结束后也一直敲下去**，直到你下一次发消息；不会犯困；"15 分钟没动静算休息"也被它破坏。后台运行的子 agent（`run_in_background`）同理。
  - README 和 CHANGELOG 写的"助手们自己调用工具不算她在工作，也不会再让她显示敲键盘"因此与代码不符。
  - 我试了一个两行的修法（子 agent 的事件不改她的模式），在副本上跑：原来的 122 个测试全过，复现 R6-1 的探针全部翻转（§1.3）。**这是建议，要你在本机模板里改；我没有改仓库里的构建产物。**
- 低危 6 个、提示 6 个，见下表。
- `claude plugin test .`：**122 通过、0 失败**；`claude plugin validate .`：通过，带的提示和以前一样（README 没有从 marketplace 安装的那一行）【实际运行】。
- 第五轮的 P5-1：用同样的变异（去掉"是不是真的在担心"），**新加的两条测试都失败**，其余 120 条通过；真实代码上全过。**这两条测试有效**【实际运行】。
- 隐私重扫：干净（§8）。

## 新发现

| 编号 | 严重程度 | 标注 | 位置 | 问题 | 建议 |
|---|---|---|---|---|---|
| R6-1 | **中** | 实际运行 + 宿主类型 | `register.tsx`：`tool.call` 钩子（`setMode($, 'work')`）、`turn.start` 钩子、`ui.render` 的 `waiting` 条件 | 后台子 agent 和工作流 agent 的工具调用把她切成敲键盘；助手结束后也一直敲（不回待机、不犯困、"15 分钟算休息"失效）；README / CHANGELOG 写反了 | `tool.call` 里只对主循环 `setMode`；`turn.start` 开头 `if (e.agentId) return next(e)`。详见 §1 |
| R6-2 | 低 | 实际运行 | `turn.start` 钩子（`agentId` 判断之外的部分） | 子 agent 的一轮开始会跑主循环的记账：结束你的 5 分钟休息、提醒亮着时给"不听劝"计数（5 个助手一起开工就直接解锁）、每日签到、开始/续上工作时段、切到"思考" | 与 R6-1 同一行修法（宿主文档本身也建议"只管主循环时，`agentId` 存在就先 `return next(e)`"） |
| R6-3 | 低 | 实际运行 | `noteKind`；`ui.render` 里 `KIND_SPRITE` 那一行 | ① 1.5 秒内被挡掉的那一类**永远不会补上**：先读文件、1 秒后开始跑一个几分钟的命令，这几分钟一直是"拿书看资料"。② 读/搜/联网的专属姿势那一行在 `waiting` 之后执行，会**盖掉**等待姿势：读完文件 0.5 秒内调 Agent，等待期间是"拿书"的脸配"等候汇报"的台词 | ① 记下"待显示的一类"，渲染时满 1.5 秒就换上；② 那一行加 `!waiting` |
| R6-4 | 低（行为与文档） | 实际运行 | `ui.render` 里 `slot` 的算法（`from = max(kindAt, t)`） | "20 分钟后一半台词说跑了多久"只在**一直是同一类工具**时成立。`slot` 从最近一次换类算起，类一变就回到 0（偶数）：每 2 分钟换一次类时，第 22–60 分钟 **39/39** 分钟都是"已经跑了多久"，各类工具的台词再也不出现；每 4 分钟换一次时是 29/39 | `slot` 改从 `turnStart` 算；或者文档改成"多数时候" |
| R6-5 | 低 | 读代码 + 推断（宿主类型） | `turn.start` 里的 `if (e.text !== '') await touched($)` | 后台任务完成通知（工作流、后台 agent 跑完）、定时任务开始的一轮，提示词大概率不是空的，会被当成"你回来了"：你人不在，工作流一结束就把 `lastHuman` 刷新，45 分钟规则失效，提醒照弹。另：隐藏/显示、成就面板、今日小结、结束休息、用量警告的"知道啦"、压缩按钮这些点击**不算**"点过她" | 用 `prompt.submit` 的 `origin.kind` 判断：`task-notification`、`scheduled-trigger`、`peer*`、`auto-continuation` 等不算人；文档写明哪些点击算 |
| R6-6 | 提示 | 实际运行 | `ui.render` 的等待台词 `say('watch', …, { n: na })` | `na` 为 0 时会出现"**0 位助手**尚在处理"。测试环境里让 Agent 调用开着、一直不来 `agent.spawn`，15 个三分钟时段里出现 3 次。真实使用中 `agent.spawn` 紧跟着到，`agentN` 一变就重画，所以大概只会一闪而过；旧版本的 `TaskOutput` 等一个后台命令时会一直是 0（推断） | `na === 0` 时不用带 `{n}` 的句子 |
| R6-7 | 低（测试） | 实际运行 | `pet.test.ts` | 25 个变异里有 8 个没被抓到（其中 1 个基本等价），缺口集中在：自动继续（空提示词）、回合开始清 `blocked`、工作流 agent 的 3 小时过期、恢复的 agent 不重复计数、`AWAY_MS` 往大改、被拒绝的 spawn、`AGENT_TOOLS` 只剩 `Agent`。详见 §5 | 按 §5 的表补；最该补的是 R6-1 的场景（后台 agent 在主回合结束后调用工具） |
| R6-8 | 低 | 实际运行 | `agentsChanged` | 先读 `agentN`、再写进调用开始时记下的 `n`。几个 agent 同时开始和结束时，后写的可能是旧数：模拟"结束 ag4、派出 ag6、结束 ag5"同时到达，3 次里 3 次最后显示 0 个小助手，而 ag6 还在跑（她也因此不显示等待）。反方向（多显示一个）同理可能，那时 `liveAgents` 已空、半分钟对照不再运行，幻影小助手会留到下一次变化 | `update($, agentN, () => liveAgents.size)`：写入那一刻再取数。我在副本上改了这一行，同一探针不再出错，全部测试通过（§1.4） |
| R6-9 | 提示 | 实际运行 + 宿主类型 | `reconcileAgents` 的 `running` 集合 | 队友（teammate）在两轮之间状态是 `idle`，不在集合里，约一分钟后被当作被杀掉清掉 | 如果要支持队友，把 `idle` 也算活着；不打算支持就不用改 |
| R6-10 | 提示 | 读代码 + 实际运行（图片计算） | `MINI_SLOTS`；`assets/mini_search.webp` | 左边两个槽 `x = -4`、右边两个槽 `x + 56 = 205`，超出 201 宽的画布；按 SVG 默认裁剪，小助手左/右会被切掉 1–5 列像素。`mini_search` 的放大镜和左脸本身就贴着图块边（左边 12 行、右边 9 行不透明像素在最边上），切得最多 | 槽位改成 `x = 0` 和 `x = 145`；切图时左右各留 2 像素透明边 |
| R6-11 | 提示（文档） | 读代码 | README、CHANGELOG 0.6.0；`AGENT_TOOLS`、`TOOL_KIND` | 在 2.1.322 上内置工具里没有 `Task`、`TaskOutput`（宿主类型的工具表只有 `Agent`），`Workflow` 立刻返回，所以"对 Agent、Task、Workflow、TaskOutput 这类工具的调用还没返回"实际只对 `Agent` 生效。`Workflow` 也不在 `TOOL_KIND` 里，发起工作流那一下显示的是通用的敲键盘台词 | `TOOL_KIND` 加 `Workflow: 'agent'`；文档写成"Agent 调用还没返回（旧版本的 Task 也算）" |
| R6-12 | 提示（文档） | 读代码 | SECURITY.md"读取的数据" | 工具调用、一轮开始/结束还会读事件里的 `agentId`（这次调用是不是子 agent 发起的），文档写的是"只看工具的名字" | 补半句"以及是不是子 agent 发起的（只看编号）" |
| R6-13 | 提示（测试） | 读代码 | `pet.test.ts`：`toolGate`；`achievement rewards are scaled…` | ① `toolGate` 是测试文件的模块变量，`watch` 测试中途断言失败时不会被置回 `null`，之后任何调用 `Agent` 的测试会一直卡到超时（插件自己的模块变量不会串：我实测每个测试都是新的，见 §5.3）。② 奖励总和那条测试仍然是自己抄的一份表（第三轮已提过），现在 312 / 1975 = **15.8%**，比"七分之一"（14.3%）多，离测试上限 0.16 只差约 4 点 | ① 用 `try/finally` 置回；② 文档写"约六分之一"或调奖励；测试改成从界面读 |

## 1. R6-1：后台助手、工作流时她在敲键盘（你补充的现象）

### 1.1 原因（读代码 + 宿主类型）

`tool.call` 钩子：

```ts
await quietly(async () => {
  await setMode($, 'work')                       // ← 不论是谁调用的工具
  if (!e.agentId) await noteKind($, kindOfTool(e.tool), await $.clock.now())
})
if (e.agentId || !AGENT_TOOLS.includes(e.tool)) return next(e)
```

`turn.start` 钩子里只有 `touched`、`turnStart`、`workKind`、`blocked` 这几行包在 `if (!e.agentId)` 里，其余的（前面的"不听劝"计数，后面的 `workStart`/`lastActive`、`endBreak`、`dailyCheck`、`setMode($, 'think')`）对子 agent 的一轮也执行。

渲染时：

```ts
const waiting = … && ((blockedNow && (m === 'work' || m === 'think')) || (na > 0 && m === 'idle'))
```

后台 agent 一调用工具，`m` 就是 `'work'`；这时 `blocked` 是 `false`（她自己的调用早就返回了），`na > 0 && m === 'idle'` 也不成立，所以显示敲键盘（两个以上时配"指挥官"台词）。子 agent 的 `turn.complete` 只删 `liveAgents`，**不改模式**；`POSE_MS` 里没有 `work`，30 秒检查也不会把 `work` 放回待机。于是助手都结束后她一直停在 `work`。

宿主类型（2.1.322）里能对上的几条：
- `Workflow` 工具的结果类型是 `status: "async_launched" | "remote_launched"` 加 `taskId`，也就是**发起后立刻返回**，工作流在后台跑，完成时发一条任务通知。
- `agent.spawn`："Fires when the Agent tool, or a workflow script's `agent()` (`e.workflow`), is about to start an agent"——工作流里的 agent **会**触发 `agent.spawn`，带 `e.workflow = { runId, agentIndex }`。
- `AgentLoop.agentId`："A workflow's agents … carry ids no list names"——工作流 agent 的 `tool.call` 带 `agentId`，但不在 `$.agent.list()` 里（和你代码里 3 小时过期的设计一致）。
- `turn.start`："Fires when a model turn begins, main's or a subagent's (`e.agentId`) … For the main loop alone, return `next(e)` first when `e.agentId !== undefined`."
- `Agent` 工具的参数说明："Agents run in the background by default"。这是我这个云端会话的配置，**你桌面端的默认值我不知道**；你说子 agent 正常，说明你那边用的是前台调用。如果哪天默认变成后台，子 agent 也会出现同样的现象。

### 1.2 复现（实际运行，探针在临时目录）

| 探针 | 做法 | 结果 |
|---|---|---|
| P1a | 主回合结束 → 派 2 个 agent → 等 20 秒（显示等待，和 0.6.0 的测试一样）→ 其中一个 agent 开始一轮、调用一次 `Read` | 姿势变成 `work`（敲键盘） |
| P1b | 同上，agent 调用一次 `Bash` 后结束，再等 10 分钟 | 10 分钟后**仍是 `work`**，没有回待机、没有犯困 |
| P1c | 主回合里调用 `Workflow`（像 `async_launched` 一样立刻返回）→ 主回合结束 → 2 个 agent 开工、调用 `Grep` | `work` 姿势 +"助手们各司其职，共 2 位，请放心。" |
| P7 | T0 发消息开始计时 → T0+30 摸一次头（表示人在，避开 45 分钟规则）→ 主回合结束，后台 agent 调一次工具、1 分钟后结束 → 你离开 20 分钟（超过 15 分钟的"算休息"）→ T0+51 回来发消息 → 再过 10.5 分钟 | **提醒弹了**（应该从 T0+51 重新计时、T0+111 才提醒）。原因：她停在 `work`，30 秒检查每次都刷新 `lastActive`，20 分钟的休息没被看到 |

现有测试 `watch: the turn is over and agents go on in the background…` 只派了 agent、没让它们调用工具，所以没碰到这个情形。

### 1.3 建议的修法，以及我在副本上的验证

两处（伪代码，请在本机模板里改）：

```ts
on('turn.start', async ($, e, next) => {
  if (e.agentId) return next(e)        // 子 agent 的一轮：不碰她的模式、休息、签到、工作时段
  …
})

on('tool.call', async ($, e, next) => {
  …
  await quietly(async () => {
    if (!e.agentId) await setMode($, 'work')
    if (!e.agentId) await noteKind($, kindOfTool(e.tool), await $.clock.now())
  })
  …
})
```

在副本上实际跑的结果（副本同时改了 R6-8 的一行）：

| 检查 | 原代码 | 修法副本 |
|---|---|---|
| 原有 122 个测试 | 122 通过 | **122 通过** |
| 下面建议新增的测试 | **失败** | 通过 |
| P1a 后台 agent 调用工具 | 敲键盘 | 等待（抱写字板） |
| P1b 助手结束 10 分钟后 | 仍在敲键盘 | 睡着 |
| P1c 工作流 | 敲键盘 + 指挥官台词 | 不再敲键盘（这一刻显示的是首个成就的闪现） |
| P5a 子 agent 开工时你在休息 | 休息被结束 | 休息保留 |
| P5b 提醒亮着时 5 个子 agent 开工 | 解锁"不听劝" | 不计 |
| P7 20 分钟休息后回来 | 10 分钟后弹提醒 | 不弹（重新计时） |
| 其余探针（R6-3、R6-4、R6-6、R6-9） | — | 不变（是别的问题） |

修完以后的行为（推断，按代码）：前台子 agent 不变（她自己的 Agent 调用开着 → 等待）；后台子 agent 和工作流：主回合结束 → 完成 → 待机 → `na > 0` → 等待；助手都结束 → 待机 → 5 分钟后犯困；后台 agent 不再续上你的工作时段。工作流 agent 若真的不触发 `agent.spawn`（与宿主类型说的相反），修完后她会是普通待机而不是敲键盘，也比现在好。

还需要一条测试，建议的写法（**我在副本上跑过**，修前失败、修后通过）：

```ts
test('watch: background agents that use tools after her turn ended: she waits, and settles when they are done', async ($, on) => {
  agentSeq = 0
  const clock = await engine($, on)
  withAgents(on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await finishTurn($, clock, 'bg1')
  await spawn($)
  await clock.advance(20000)
  await $.turn.start({ text: 'p', turnId: 'a1', agentId: 'ag1' } as any)
  await callTool($, 'Read', { file_path: '/x', agentId: 'ag1' })
  expect(await faces(m)).toEqual(['pet: watch'])
  await endAgent($, 'ag1')
  for (let i = 0; i < 12; i++) await clock.advance(30000)
  expect(await faces(m)).toEqual(['pet: sleep'])
})
```

### 1.4 并发下小助手数（R6-8 的依据）

探针 P8（实际运行）：先派 2 个、同时结束 2 个；再派 2 个，同时"派 1 个、结束 1 个"；再同时"结束 1 个、派 1 个、结束 1 个"。前两组都对，第三组**3 次运行 3 次**最后显示 0 个小助手（应为 1）。原因是 `agentsChanged` 里 `const n = liveAgents.size` 在 `await read(agentN)` 之前取值：派出 ag6 的那次读到 `agentN` 已经是 1（结束 ag4 写的），于是不写；结束 ag5 的那次随后把它在更早时刻记下的 0 写了进去。把写入改成 `() => liveAgents.size` 后，同一探针不再出错，其余测试照常通过。真实宿主里事件会不会这样交错，我没验证；多个后台 agent 几乎同时结束、又有新的派出时最可能碰到。

## 2. 休息提醒的新规则（B）

**读代码**，加上 §1 的探针和 §5 的变异。

规则本身（`touched()`、30 秒检查里的 `!(lastHuman > 0 && now - lastHuman >= AWAY_MS)`）在单个对话、主循环里是对的，三个新测试也真的在测它（变异 M02、M03 都被抓到）。逐项回答你点名的几种情况：

| 情况 | 结论 |
|---|---|
| 多个对话同时开着 | `lastHuman` 是模块变量。桌面端每个对话应该是各自的进程（**推断，没验证**），那么在 B 对话里打字**不算**你在 A 对话前。A 自己跑长任务时不提醒，你回到 A 发消息时 A 重新计时；B 按 B 自己的时段提醒。不会卡住，只是"你在电脑前"是按对话分开判断的。如果宿主其实是一个进程跑多个对话，那么 `lastHuman`、`liveAgents`、`blockedCalls` 都会跨对话共用：`liveAgents` 会被别的对话的半分钟检查误删（那个对话的 `agentN` 因此不再更新，小助手可能一直不消失），`blockedCalls` 会被别的对话的回合开始清零。我认为可能性小，但这是本轮最大的未验证假设（H18） |
| `e.text` 为空的自动继续 | 不算你（设计如此）。**没有测试**：把条件去掉（M04）122 个全过 |
| 任务完成通知、定时任务开始的一轮 | 大概率**算**你（R6-5）。宿主类型：`turn.start` 的 `text` 只在"没有输入的提示词，例如继续"时是空字符串；`prompt.submit` 的来源里有 `task-notification`、`scheduled-trigger` 等。没实测 |
| 和 `WORK_GAP_MS`（15 分钟）的交互 | 主循环里没问题：回合在跑时 30 秒检查续 `lastActive`；回合结束后超过 15 分钟没动静，下一条消息照旧开新时段。**但** R6-1 让她停在 `work` 时，15 分钟的休息检测不到（P7） |
| 坐在电脑前一直看、不动 | 45 分钟后被当作不在，不提醒；回来发第一条消息时重新计时。所以"一直看着一个 2 小时任务"的人第一次提醒会推迟到下一条消息之后一小时。CHANGELOG 写了"坐在电脑前只看不动超过 45 分钟，也会被当作不在"，README 没写这半句，建议补上 |
| 提醒在你离开前已经亮了 | 你离开 45 分钟以上回来发消息，`turn.start` 先给"不听劝"计 1 次，再由 `touched()` 关掉提醒。你其实是离开了（大概就是去休息了），却记成"不听劝"。这是旧逻辑和新规则的交界，**提示级**，可以把 `touched()` 放到"不听劝"计数之前，离开过就不计 |
| `lastHuman === 0`（刚 `/reload-plugins`，或会话恢复后还没发消息） | 不会被当作不在，提醒照常；第一次 `touched()` 也不会重置时段。偏保守，没问题 |
| README / CHANGELOG 的描述 | "45 分钟没发消息、也没点过她"：代码里算"点过她"的是摸头、戳、提醒上的"知道啦"、开始/放弃番茄钟；其余按钮不算（R6-5）。"回来发第一条消息时重新开始计时"：摸头/戳也会重新计时。都是措辞精度，不影响结论 |

## 3. 并发和状态（A）

| 项目 | 结论 | 标注 |
|---|---|---|
| `blockedCalls` 归零 | 增加在 `next` 之前，`finally` 里减一并写回 `blocked`；回合开始和结束都清零。回合被中止时宿主会发 `reason: 'aborted'` 的 `turn.complete`（宿主类型），走 `else` 分支回待机并清零。变异 M09（去掉 `finally`）被抓到；M10（回合开始不清零）**没被抓到**，因为回合结束也清零 | 读代码 + 实际运行 |
| 上一轮遗留的调用晚到 | 理论上：旧回合里一个 Agent 调用没返回，新回合开始清零，新回合又开了一个，旧的那个这时才返回，`finally` 会把计数减到 0、`blocked` 写成 `false`，新回合的等待提前结束。需要宿主在中止后很久才结算旧调用，我认为不现实，不列为问题 | 读代码 |
| `liveAgents` | 子 agent 的 `turn.complete` 删除；被杀掉的靠半分钟对照 `$.agent.list()`（状态 `killed`/`completed` 不在 `running` 集合里，宿主类型确认了状态值有 `pending/running/waiting/idle/completed/failed/killed`）。工作流 agent 不在列表里，3 小时过期（**没有测试**，M13）。队友见 R6-9 | 读代码 + 宿主类型 |
| `agentN` 与 `liveAgents` 不一致 | 见 §1.4 | 实际运行 |
| `noteKind` 先读后写 | 两次调用同时到，都读到旧值、都通过 1.5 秒检查，后写的赢；不会卡住，最多显示后到的那一类 | 读代码 |
| `touched()` | `lastHuman` 是同步赋值，先读后写之间没有 `await`；`workStart` 的重置在 `touched` 里，和 `turn.start` 后面的"15 分钟开新时段"判断不冲突（先重置再判断，结果一样） | 读代码 |
| 钩子抛错 | 记账都包在 `quietly` 里；`agent.spawn` 先 `next(e)` 再记账，不会挡住派助手；`tool.call` 的 `next` 抛错时 `finally` 仍执行 | 读代码 |
| 子 agent 的子 agent | `agent.spawn` 照样记一个，`turn.complete` 照样删，没问题 | 读代码 |

## 4. 渲染逻辑（C）

| 项目 | 结论 |
|---|---|
| `slot` 奇偶 | 见 R6-4 |
| `say()` 的 NO_REPEAT 与 `{d}`、`{n}` | `lastPick` 存的是替换**之前**的模板，`arr.includes(lp.text)` 比的也是模板，所以 `{d}` 每分钟变化不影响"同一个种子保持同一句""不和上一句重复"。没问题 |
| `waiting` 的优先级 | 摸头/戳/闪现 > 提醒 > 番茄钟/休息 > 用量警告 > 等待 > 工作类别 > 心情。等待排除了提醒、警告、番茄钟、休息，心情又排除了等待（M17 被抓到）。问题只有 R6-3 ②：工作类别那一行在等待之后，会盖掉等待的**姿势**（台词仍是等待） |
| `T[...]` 取不到 | `'work_' + kindNow` 先用 `T[...]` 判断，`''` 和 `'other'` 回到 `'work'`；演示命令的 6 个名字都在表里；`'watch'`、`'swarm'`、`'workLong'` 都在 `NO_REPEAT` 和 `T` 里。没有会抛错的路径 |
| `fmtDur` | 59.5 分钟以上写小时；`192 分钟 → 3 小时 12 分`，`180 → 3 小时`；不足 1 分钟按 1 分钟。测试覆盖了"3 小时 3 分"和"3 小时 12 分"（M24 被抓到） |
| "0 位助手" | 见 R6-6 |

## 5. 测试质量（E）

### 5.1 变异结果（实际运行：每个变异在副本上跑完整的 122 个测试）

| 变异 | 改了什么 | 结果 |
|---|---|---|
| M01 | 去掉"是不是真的在担心"（P5-1 原样） | **抓到**：`comfort: a pat after the worry is over…`、`comfort: a pat when she was never worried…` 两条失败 |
| M02 | 去掉 45 分钟"不在"的条件 | 抓到（2 条） |
| M03 | 回来后不重新计时 | 抓到（1 条） |
| M04 | 空提示词也算你 | **没抓到** |
| M05 | 摸头/戳不算你 | 抓到（2 条） |
| M06 | 助手在跑也会犯困 | 抓到 |
| M07 | 子 agent 的调用也改她的工作类别 | 抓到 |
| M08 | 没有 1.5 秒停留 | 抓到 |
| M09 | 去掉 `finally`（计数不减） | 抓到 |
| M10 | 回合开始不清 `blocked` | **没抓到** |
| M11 | 不做半分钟对照 | 抓到 |
| M12 | 没有 1 分钟宽限 | 抓到 |
| M13 | 工作流 agent 也按列表对照（没有 3 小时过期） | **没抓到** |
| M14 | 恢复的 agent 也算新派出 | **没抓到** |
| M15 | 等待条件去掉"她的调用还开着"一半 | 抓到（CHANGELOG 说"去掉后第一个会失败，已实测"，我复现了） |
| M16 | 等待条件去掉"后台助手"一半 | 抓到 |
| M17 | 等待时也能显示心情 | 抓到 |
| M18 | 长任务台词换成另一半时段 | 抓到 |
| M19 | 长任务门槛 20 → 30 分钟 | 抓到 |
| M20 | `AWAY_MS` 45 → 30 分钟 | 抓到（2 条） |
| M21 | `AWAY_MS` 45 → 60 分钟 | **没抓到** |
| M22 | 回合结束不清工作类别 | **没抓到**（基本等价：下一回合开始也会清，中间她不在工作姿势） |
| M23 | 被拒绝的 spawn 也记成助手 | **没抓到** |
| M24 | 不写"小时" | 抓到（2 条） |
| M25 | `AGENT_TOOLS` 只剩 `Agent` | **没抓到** |

### 5.2 没被抓到的变异说明了什么

- 25 个里 17 个被抓到；8 个没被抓到：M04、M10、M13、M14、M21、M22、M23、M25。
- 新功能的主要条件都有测试守着，而且守得准（M06–M09、M11、M12、M15–M18 都只让对应的那一条失败）。CHANGELOG 里"去掉调用还开着的记录后第一个会失败"属实（M09、M15）。
- 建议补的测试，按价值排序：
  1. R6-1 的场景（§1.3 那条，修前失败、修后通过，我跑过）。
  2. 自动继续不算你（M04）：`turn.start` 带 `text: ''`，45 分钟后不提醒。
  3. 恢复的 agent 不重复计"派遣官"（M14）、被拒绝的 spawn 不画小助手（M23）。
  4. 工作流 agent 不被半分钟对照清掉、3 小时后过期（M13）：现在的测试只有演示命令用到 `wf: true`。
  5. 45 分钟的上边界（M21）：44 分钟时提醒、46 分钟时不提醒。
- M10、M22、M25 价值低：M10 和 M22 有别处兜底；M25 在 2.1.322 上本来就只有 `Agent` 会一直开着（R6-11）。

### 5.3 时间依赖和测试之间的串扰

- 新测试全部用模拟时钟，没有依赖真实时间的断言；`long run` 那条依赖"没有换工具类别"的前提（这正是 R6-4 没被发现的原因）。
- 插件自己的模块变量（`liveAgents`、`lastHuman`、`blockedCalls`）**不会**串到下一个测试：我写了两条相邻的探针，前一条派了 2 个 agent 不结束，后一条 6 分钟后照常犯困（犯困的条件之一是 `liveAgents.size === 0`）【实际运行】。
- 测试文件自己的 `toolGate`、`agentSeq` 会留在文件里：`agentSeq` 每条测试开头都清零，没问题；`toolGate` 见 R6-13。

## 6. 构建（D）

- `build.py`、`prep.py`、`build/transplant_watch.py` **不在仓库里**（历史里也从来没有），所以按空白列切图、断言恰好四个、状态表、"只允许眼睛区域变化"这些逻辑**我审不了**。我只能检查它们的产物：
- **小助手**：4 张 `mini_*.webp` 都是 59×64，RGBA。`mini_work`、`mini_read`、`mini_web` 左右各有 2–3 列透明边；`mini_search` 的不透明像素贴着左右两边（放大镜伸到了右边缘），像是切图时没留边（推断：如果按空白列切，放大镜和旁边那只之间的空白很窄）。放大看轮廓基本完整。显示时的裁剪见 R6-10。
- **闭眼补丁**：`BLINK` 里有 `read`、`search`、`web`、`watch` 四个新条目，框都在画面内。我把补丁按框叠到原图上放大看：四个新姿势闭眼的位置、大小都对得上，没有看到错位或接缝；补丁边缘和原图的差异与已有的 `idle`、`work` 同一量级（这是重采样带来的）。这只说明产物没问题，不能代替审 `transplant_watch.py`。
- `types/index.d.ts` 的 `Sprite` 有 26 个成员，`assets/` 下除 `mini_*` 外正好 26 张，与"26 个姿势"一致。

## 7. 文档与代码（F）

| 文档说法 | 位置 | 代码 | 核对 |
|---|---|---|---|
| 45 分钟 | README、CHANGELOG | `AWAY_MS = 45 * 60 * 1000` | 一致（但取值本身没有测试，M20/M21 见 §5） |
| 1.5 秒 | README（"一秒半"）、CHANGELOG | `KIND_HOLD_MS = 1500` | 一致；"下一类在 1.5 秒后接上"只在有新调用时成立（R6-3） |
| 20 分钟、每三分钟、其中一半 | README、CHANGELOG | `LONG_RUN_MS`、`180000`、`slot % 2` | 数字一致；"一半"不准确（R6-4） |
| 3 小时 | CHANGELOG | `WF_AGENT_MAX_MS = 3 * 60 * 60 * 1000` | 一致 |
| 约一分半后清掉 | README、CHANGELOG | 宽限 60 秒 + 每 30 秒检查一次 → 60–90 秒 | 一致（是上限） |
| 44 个成就、5 个隐藏 | README、CHANGELOG | `ACHS` 44 项，`secret` 5 项 | 一致 |
| 26 个姿势 | CHANGELOG | `Sprite` 26 个成员 | 一致 |
| 122 个测试（新增 20 个） | CHANGELOG、CLAUDE.md | 实际 122（102 + 20） | 一致 |
| 奖励总和"约 Lv.20 所需点数的七分之一"以内 | CHANGELOG | 312 / 1975 = 15.8% | 偏多（R6-13） |
| "助手们自己调用工具不算她在工作，也不会再让她显示敲键盘" | README、CHANGELOG | 只有她自己的 Agent 调用开着时成立 | **不一致**（R6-1） |
| "对 Agent、Task、Workflow、TaskOutput 这类工具的调用还没返回" | README、CHANGELOG | 2.1.322 上只有 `Agent` 会一直开着 | 提示（R6-11） |
| SECURITY.md"读取的数据" | SECURITY.md | 另读 `agentId`；`agent.spawn` 只读结果的 `agentId`/`deny` 和输入的 `workflow`/`resume` 是否存在；`$.agent.list()` 只读 `id`/`status`；`turn.start` 只比较 `text` 是否为空字符串 | 基本一致（R6-12） |
| CLAUDE.md | CLAUDE.md | 测试数、母本位置（相对路径，不含用户名） | 一致 |

## 8. 隐私重扫（G，全部分支和标签的完整历史）

- 14 个远端引用（3 个分支、11 个标签）、30 个提交（其中 1 个是我这次的合并提交）。作者和提交者全部是项目作者名加 noreply 邮箱；2 个附注标签的打标签人也一样。提交信息里的邮箱只有 `noreply@anthropic.com`（署名行）。
- 历史里全部 132 个文件版本逐个扫了：非 noreply 邮箱 0；令牌形式 0；带用户名的路径 0。盘符路径只有通用示例 `D:\path\to`（README、以前的审查报告），与上一轮相同。
- 图片：历史里 159 张（含 `register.tsx` 各版本里内嵌的 base64 闭眼补丁），**全部没有 EXIF / XMP / ICC**，包括这一版新增的 `read`、`search`、`web`、`watch` 和 4 张 `mini_*`。
- 我这一轮写的报告里没有真实姓名、邮箱、本机路径。

## 9. 你列的"已知但没验证的事"

| 你的说法 | 我能补充的 |
|---|---|
| Workflow 工具的真实名字、会不会一直不返回 | 宿主类型（2.1.322）：名字就是 `Workflow`，结果是 `async_launched` / `remote_launched`，**立刻返回**。你桌面端的版本我不知道，但你看到的现象和"立刻返回"完全吻合 |
| 工作流里的 agent 是否都会触发 `agent.spawn` | 宿主类型说会（`e.workflow`）；`isolation: 'remote'`（只在内部构建）的远程 agent 没有本地循环，不会有 `turn.complete`，靠你的 3 小时过期兜底。我也只能在测试环境里模拟普通子 agent |
| 小团子和等待姿势在真实输入框上方的观感 | 我也只看了合成图（§6），另外发现了贴边裁剪（R6-10） |
| 45 分钟规则和 1.5 秒停留只在模拟时钟下验证过 | 我也一样，没有真的等过 |

## 10. 需要你在 Windows 上做的事

下面的步骤**我都没有在 Windows 上运行过**；预期结果是我按代码和测试环境推出来的。命令都很轻（`ping` 本机，不占 CPU）。

1. **确认 R6-1（后台子 agent）**。在桌面端新对话里发：
   > 用 Agent 工具在后台（run_in_background: true）派一个子 agent，让它用 Bash 运行 `ping -n 30 127.0.0.1`，派完你立刻结束这一轮，不要等它。

   预期（v0.6.0）：这一轮结束后她先显示"完成"，子 agent 一开始跑命令她就变成敲键盘（身边有 1 个小助手）；子 agent 结束、小助手消失后**她仍然在敲键盘**，5 分钟后也不犯困，直到你再发一条消息。
2. **确认工作流的同一现象**：你上次看到"工作流时还是敲键盘"时，请留意两点：那时主回合是不是已经结束了（输入框可用）；工作流结束之后她是不是继续敲到你下一次发消息。预期：两点都是"是"。
3. **确认 R6-3 ①（被挡掉的那一类不补上）**。发：
   > 先读一下 README.md，读完马上用 Bash 运行 `ping -n 60 127.0.0.1`。

   预期：跑命令的那一分钟里她一直是"拿书看资料"的姿势和台词，而不是敲键盘配"正在执行命令"。如果读和命令之间隔了超过 1.5 秒（模型思考得慢），就看不到这个现象，不算反例。
4. 改了 R6-1 之后：重复第 1 步。预期：这一轮结束后显示等待（抱写字板）+ 1 个小助手；子 agent 结束后回到待机，5 分钟后犯困。用 `/reload-plugins` 和 `/pet version` 确认加载的是新构建。

## 11. 需要你回答的问题

1. 第 10 节第 2 步的两点观察结果（工作流时主回合是否已结束；结束后是否继续敲）。
2. 你桌面端的 Claude Code 具体版本，以及子 agent 平时是前台还是后台跑（在 2.1.322 上 Agent 默认后台；如果你那边也是，子 agent 也会碰到 R6-1）。
3. 任务完成通知（工作流跑完自动开始的一轮）要不要算"你回来了"（R6-5）？
4. 队友（teammate）功能要不要支持（R6-9）？不支持就不用改。
