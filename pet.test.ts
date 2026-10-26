import { test, expect, mock } from 'claude-code/testing'

const PROPS = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120, scroll: { offset: 0, bodyRows: 20 }, view: {} } as any
const mount = ($: any, surface: 'desktop' | 'terminal') => $.ui.mount({ plugin: 'pet', surface, component: 'AbovePrompt', props: PROPS })

let toastSink: string[] | null = null
// everything beneath the plugin that a real session would answer
async function engine($: any, on: any, entries?: Record<string, unknown>) {
  const clock = mock.clock(on)
  mock.store(on, entries)
  on('ui.toast', (_: any, e: any) => { toastSink?.push(e.text); return { value: undefined } as any })
  on('fs.read', () => ({ value: { base64: 'AAAA' } } as any))
  on('session.start', () => ({ cwd: '/test' } as any))
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId } as any))
  on('turn.complete', () => ({ text: '' } as any))
  on('tool.call', () => ({ result: 'ok' } as any))
  on('classic.PermissionRequest', () => ({}))
  await clock.set(1_700_000_000_000)      // a realistic time of day (the mock clock would start at 0)
  return clock
}
const count = async (m: any, text: RegExp | string) => (await m.findAll({ type: 'Text', text })).length
const countBtn = async (m: any, text: RegExp | string) => (await m.findAll({ type: 'Button', text })).length

for (const surface of ['desktop', 'terminal'] as const) {
  test(`band draws on ${surface}`, async ($, on) => {
    engine($, on)
    expect(await mount($, surface)).toBeDefined()
  })
}

test('pat: reacts, adds affection (capped per day), then clears by itself', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  const patLine = /这、这样不太合规矩|谢、谢谢主人|请不要这样，主人|主人的手好温暖/
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  expect(await count(m, patLine)).toBe(1)
  await clock.advance(3000)
  expect(await count(m, patLine)).toBe(0)
  for (let i = 0; i < 6; i++) {
    await $.ui.press({ plugin: 'pet', key: 'pat' })
    await clock.advance(3000)
  }
  // 7 pats in total, only the first 5 add affection
  expect(await count(m, 'Lv.1 · 5')).toBe(1)
})

test('poke: shows its reaction, then returns to the normal line', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  const pokeLine = /呀！主人有何吩咐|请问有什么事吗|请不要吓我|（探头）/
  await $.ui.press({ plugin: 'pet', key: 'poke' })
  expect(await count(m, pokeLine)).toBe(1)
  await clock.advance(3000)
  expect(await count(m, pokeLine)).toBe(0)
})

test('wait: only a real permission dialog makes the pet wait; the tool call that follows ends it', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  const waitLine = /需要您确认|请您过目|等候您的指示/
  expect(await count(m, waitLine)).toBe(0)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } } as any)
  expect(await count(m, waitLine)).toBe(1)
  await $.tool.call({ tool: 'Bash', tool_use_id: 't1', command: 'ls' } as any)
  expect(await count(m, waitLine)).toBe(0)
})

test('sleep: falls asleep after 5 quiet minutes, wakes up on a poke', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  const sleepLine = /轻轻打盹|稍微休息一下|Zzz/
  await clock.advance(4 * 60 * 1000)
  expect(await count(m, sleepLine)).toBe(0)
  await clock.advance(2 * 60 * 1000)
  expect(await count(m, sleepLine)).toBe(1)
  await $.ui.press({ plugin: 'pet', key: 'poke' })
  expect(await count(m, sleepLine)).toBe(0)
})

test('rest: after an hour of steady work the pet asks for a break, "知道啦" quiets it', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  const restLine = /连续工作一小时|休息一下对身体好|已工作一小时/
  for (let i = 0; i < 5; i++) {
    await $.turn.start({ text: 'hi', turnId: 't' + i } as any)
    await clock.advance(10 * 60 * 1000)
  }
  expect(await count(m, restLine)).toBe(0)
  await $.turn.start({ text: 'hi', turnId: 'tx' } as any)
  await clock.advance(10 * 60 * 1000 + 30000)
  expect(await count(m, restLine)).toBe(1)
  await $.ui.press({ plugin: 'pet', key: 'rest' })
  expect(await count(m, restLine)).toBe(0)
})

test('focus: 25 minute timer counts down, finishes by itself and counts a tomato', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.ui.press({ plugin: 'pet', key: 'focus' })
  expect(await countBtn(m, /放弃 · 剩25分/)).toBe(1)
  await clock.advance(26 * 60 * 1000)
  expect(await countBtn(m, /放弃 · 剩/)).toBe(0)
  expect(await countBtn(m, /1 番茄/)).toBe(1)
})

test('achievements: the first finished turn unlocks one', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  expect(await countBtn(m, /成就 0\/\d+/)).toBe(1)
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 't1' } as any)
  expect(await countBtn(m, /成就 1\/\d+/)).toBe(1)
})



test('greet: the pet greets right after the start, then settles to idle', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  const hello = /早上好|中午好|下午好|晚上好|夜深了|欢迎回来|主人，您来了/
  expect(await count(m, hello)).toBe(1)
  await clock.advance(9000)
  expect(await count(m, hello)).toBe(0)
})

test('streak: a session left open overnight counts the next day on its first prompt', { timeoutMs: 60000 }, async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(24 * 60 * 60 * 1000 + 60000)
  expect(await count(m, /连续第 2 天/)).toBe(0)
  await $.turn.start({ text: 'hi', turnId: 'n1' } as any)
  expect(await count(m, /连续第 2 天/)).toBe(1)
})



test('long task: a 3 minute turn leaves a pose and a line that stay until the next prompt', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 180000, isAborted: false, turnId: 'L1' } as any)
  await clock.advance(60000)
  expect(await count(m, /3 分钟/)).toBe(1)
  await $.turn.start({ text: 'next', turnId: 'L2' } as any)
  expect(await count(m, /3 分钟/)).toBe(0)
})

test('demo command: /pet rest shows the reminder button', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await $.command.run({ command: 'pet', args: 'rest', origin: { kind: 'composer' }, presentation: {} } as any)
  expect(await countBtn(m, /知道啦/)).toBe(1)
})


test('shared store: points earned in another conversation are not overwritten', async ($, on) => {
  await engine($, on, { affection: 100 })      // this conversation has not loaded it (its own value is still 0)
  const m = await mount($, 'desktop')
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  expect(await count(m, /Lv\.4/)).toBe(1)      // 100 + 1 = 101 points (Lv.4 = 72..120 on the 0.4.0 curve), not 0 + 1
})

test('usage warning: shows once when 5H crosses 80%, can be dismissed, goes away by itself after 5 minutes', async ($, on) => {
  const clock = await engine($, on)
  on('session.measure', (_: any, e: any) => ({ changed: e.changed } as any))
  const m = await mount($, 'desktop')
  const warnLine = /五小时额度/
  const measure = (p: number, at = '2030-01-01T00:00:00Z') => $.session.measure({ context: { window: 1000000 }, rateLimits: [{ kind: 'five_hour', percentUsed: p, resetsAt: at }], changed: ['rateLimits'] } as any)
  await measure(70)
  expect(await count(m, warnLine)).toBe(0)
  await measure(82)
  expect(await count(m, warnLine)).toBe(1)
  await $.ui.press({ plugin: 'pet', key: 'warnok' })
  expect(await count(m, warnLine)).toBe(0)
  await measure(85)                       // still above: no second warning
  expect(await count(m, warnLine)).toBe(0)
  await measure(60)                       // clearly below: armed again
  await measure(90)                       // ...but it is the same reset cycle, already warned about
  expect(await count(m, warnLine)).toBe(0)
  await measure(60, '2030-01-01T05:00:00Z')
  await measure(90, '2030-01-01T05:00:00Z')      // a new cycle warns again
  expect(await count(m, warnLine)).toBe(1)
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(6 * 60 * 1000)      // not dismissed: gone after 5 minutes
  expect(await count(m, warnLine)).toBe(0)
})


test('level up: crossing a level shows its line and pose', async ($, on) => {
  await engine($, on, { affection: 9 })
  const m = await mount($, 'desktop')
  await $.ui.press({ plugin: 'pet', key: 'pat' })      // 9 + 1 = 10 points = level 2
  expect(await count(m, /提升到 Lv\.2/)).toBe(1)
})

test('usage warning: a cycle already warned about in another conversation stays quiet', async ($, on) => {
  await engine($, on, { warned5: Date.parse('2030-01-01T00:00:00Z') })
  on('session.measure', (_: any, e: any) => ({ changed: e.changed } as any))
  const m = await mount($, 'desktop')
  await $.session.measure({ context: { window: 1000000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 90, resetsAt: '2030-01-01T00:00:00Z' }], changed: ['rateLimits'] } as any)
  expect(await count(m, /五小时额度/)).toBe(0)
})

test('narrow window: the right-hand info columns are dropped', async ($, on) => {
  await engine($, on)
  const wide = await mount($, 'desktop')
  expect(await count(wide, /5H 重置/)).toBe(1)
  const narrow = await $.ui.mount({ plugin: 'pet', surface: 'desktop', component: 'AbovePrompt', props: { ...PROPS, bodyColumns: 60 } })
  expect(await count(narrow, /5H 重置/)).toBe(0)
  expect(await countBtn(narrow, /成就 \d+\/\d+/)).toBe(1)      // the achievements button moved into the button row
  expect(await countBtn(narrow, /今日 \d+ 轮/)).toBe(1)
})

test('break: a finished focus timer starts a 5 minute break; pats do not end it, a prompt does', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  const brk = /请放松一下|请稍作休息|休息中休息中|五分钟，什么都不用想|好好歇一会儿|喝口水/
  await $.ui.press({ plugin: 'pet', key: 'focus' })
  await clock.advance(26 * 60 * 1000)
  expect(await countBtn(m, /结束休息/)).toBe(1)
  await clock.advance(10000)
  expect(await count(m, brk)).toBe(1)
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(5000)
  expect(await countBtn(m, /结束休息/)).toBe(1)
  await $.turn.start({ text: 'hi', turnId: 'b1' } as any)
  expect(await countBtn(m, /结束休息/)).toBe(0)
})

test('break: ends by itself after 5 minutes', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.ui.press({ plugin: 'pet', key: 'focus' })
  await clock.advance(26 * 60 * 1000)
  expect(await countBtn(m, /结束休息/)).toBe(1)
  await clock.advance(5 * 60 * 1000)
  expect(await countBtn(m, /结束休息/)).toBe(0)
})

test('summary: the today button opens a panel with the numbers', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 's1' } as any)
  expect(await count(m, /今日小结/)).toBe(0)
  await $.ui.press({ plugin: 'pet', key: 'sum' })
  expect(await count(m, /今日小结/)).toBe(1)
  expect(await count(m, /对话 1 轮/)).toBe(1)
})

test('compact: the pet shows the compaction while it runs, and says when it is done', async ($, on) => {
  const during = /整理对话记录|压缩中，请勿打扰|整理中整理中|把记忆压一压|在帮你整理记忆|重要的我都会留着/
  let m: any
  let seen = -1
  on('session.compact', async () => {
    seen = await count(m, during)
    return { messages: [{ role: 'user', text: 'summary', toolUses: [], toolResults: [] }], tokensBefore: 100000, tokensAfter: 20000 } as any
  })
  await engine($, on)
  m = await mount($, 'desktop')
  await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'hi', toolUses: [], toolResults: [] }] } as any)
  expect(seen).toBe(1)
  expect(await count(m, /整理完毕|压缩完成|整理好啦|腾出好多空间|整理好了|轻松多啦|轻装上阵/)).toBe(1)
  expect(await count(m, during)).toBe(0)
})

test('compact button: shows from 80% context, fills /compact for the person to confirm', async ($, on) => {
  let filled = ''
  on('prompt.fill', (_: any, e: any) => { filled = e.text; return { isFilled: true } as any })
  on('session.measure', (_: any, e: any) => ({ changed: e.changed } as any))
  await engine($, on)
  const m = await mount($, 'desktop')
  const measure = (p: number) => $.session.measure({ context: { window: 1000000, percent: p }, rateLimits: [], changed: ['context'] } as any)
  await measure(60)
  expect(await countBtn(m, /压缩上下文/)).toBe(0)
  await measure(82)
  expect(await countBtn(m, /压缩上下文/)).toBe(1)
  await $.ui.press({ plugin: 'pet', key: 'compact' })
  expect(filled).toBe('/compact ')
})


// ---------- achievements ----------
const press = ($: any, key: string) => $.ui.press({ plugin: 'pet', key })
const hasText = async (m: any, re: RegExp) => (await count(m, re)) > 0

test('achievements: the panel is grouped; unlocked and locked ones are listed apart, locked ones show progress', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'a1' } as any)
  await press($, 'ach')
  expect(await countBtn(m, /对话与工具 1\/9/)).toBe(1)
  expect(await countBtn(m, /隐藏 0\/5/)).toBe(1)
  await press($, 'ag-chat')
  expect(await hasText(m, /✓ 初次见面/)).toBe(true)
  expect(await hasText(m, /· 小有成就.*1\/100/)).toBe(true)
})

test('achievements: hidden ones are not revealed until unlocked', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /别吵醒我|戳戳戳|不听劝|贴心安慰|全部收集/)).toBe(false)
  expect(await hasText(m, /还有 5 个隐藏成就/)).toBe(true)
})

test('achievements: an unlock gives its affection reward once (first = +3)', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'r1' } as any)
  expect(await count(m, /Lv\.1 · 4\//)).toBe(1)      // a finished turn gives 1, the "first" achievement round(2 * 1.3) = 3
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'r2' } as any)
  expect(await count(m, /Lv\.1 · 5\//)).toBe(1)
})

test('achievements: 5 quick pokes unlock the hidden 戳戳戳, 50 pokes unlock 戳戳乐', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  for (let i = 0; i < 5; i++) await press($, 'poke')
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /✓ 戳戳戳/)).toBe(true)
  for (let i = 0; i < 45; i++) {
    await clock.advance(11000)
    await press($, 'poke')
  }
  await press($, 'ag-play')
  expect(await hasText(m, /✓ 戳戳乐/)).toBe(true)
})

test('achievements: poking her awake 10 times unlocks 别吵醒我', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  for (let i = 0; i < 10; i++) {
    await clock.advance(6 * 60 * 1000)
    await press($, 'poke')
  }
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /✓ 别吵醒我/)).toBe(true)
})

test('achievements: carrying on 5 times while a real rest reminder is on unlocks 不听劝', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await $.turn.start({ text: 'hi', turnId: 'w0' } as any)      // a stretch of work starts
  for (let i = 0; i < 7; i++) await clock.advance(10 * 60 * 1000)      // an hour later the real reminder is on
  await clock.advance(30000)
  expect(await countBtn(m, /知道啦/)).toBe(1)
  for (let i = 0; i < 5; i++) await $.turn.start({ text: 'hi', turnId: 'i' + i } as any)
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /✓ 不听劝/)).toBe(true)
})

test('achievements: errors, 95% usage and a full break unlock theirs', async ($, on) => {
  const clock = await engine($, on)
  on('session.measure', (_: any, e: any) => ({ changed: e.changed } as any))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 10; i++) await $.turn.complete({ reason: 'error', answer: '', durationMs: 1000, isAborted: false, turnId: 'e' + i } as any)
  await $.session.measure({ context: { window: 1000000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 96, resetsAt: '2030-01-01T00:00:00Z' }], changed: ['rateLimits'] } as any)
  await press($, 'focus')
  await clock.advance(26 * 60 * 1000)
  await clock.advance(5 * 60 * 1000 + 2000)
  await press($, 'ach')
  await press($, 'ag-misc')
  expect(await hasText(m, /✓ 屡败屡战/)).toBe(true)
  expect(await hasText(m, /✓ 极限操作/)).toBe(true)
  await press($, 'ag-focus')
  expect(await hasText(m, /✓ 好好休息/)).toBe(true)
})

test('achievements: old saved stats without the newer counters still load and count on', async ($, on) => {
  await engine($, on, { stats: { turns: 99, tools: 5, pats: 0, focus: 0, night: 0, longest: 0 }, achieved: ['first'] })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'o1' } as any)
  await press($, 'ach')
  await press($, 'ag-chat')
  expect(await hasText(m, /✓ 小有成就/)).toBe(true)      // 99 + 1 = 100
})

test('achievements: many unlocked at once give one toast, not a flood', async ($, on) => {
  const toasts: string[] = []
  toastSink = toasts
  await engine($, on, { stats: { turns: 600, tools: 1200, pats: 60, focus: 12, night: 1, longest: 700000 }, achieved: [] })
  await mount($, 'desktop')
  await press($, 'poke')
  expect(toasts.filter(t => /一口气解锁了/.test(t)).length).toBe(1)
  expect(toasts.filter(t => /^达成成就|^成就解锁|^新成就/.test(t)).length).toBe(0)
})

test('achievements: unlocking the last ordinary one unlocks 全部收集', async ($, on) => {
  await engine($, on, {
    stats: { turns: 3000, tools: 5000, pats: 500, focus: 50, night: 1, longest: 31 * 60000, pokes: 50, compacts: 10, breaks: 10, errors: 10, peak: 1, wakes: 0, bursts: 0, ignored: 0, recoveries: 10, busyDays: 10 },
    streak: { last: '2000-1-1', n: 100, max: 100 },
    affection: 1975,
    today: { d: dayKey(new Date(1_700_000_000_000)), turns: 50, tools: 0, pats: 0, focus: 0 },
    achieved: [],
  })
  const m = await mount($, 'desktop')
  await press($, 'poke')
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /✓ 全部收集/)).toBe(true)
})

// ---------- real time, several conversations, arithmetic ----------
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

test('time: yesterday means the previous calendar day, whatever the length of today', async ($, on) => {
  const y = new Date(1_700_000_000_000)
  y.setDate(y.getDate() - 1)
  await engine($, on, { streak: { last: dayKey(y), n: 4, max: 4 } })
  const m = await mount($, 'desktop')
  await $.turn.start({ text: 'hi', turnId: 'd1' } as any)
  expect(await count(m, /连续第 5 天/)).toBe(1)
})

test('several conversations: pats already used up today in another conversation are not paid again', async ($, on) => {
  const clock = await engine($, on, { today: { d: dayKey(new Date(1_700_000_000_000)), turns: 0, tools: 0, pats: 5, focus: 0 }, affection: 10, streak: { last: dayKey(new Date(1_700_000_000_000)), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await count(m, /Lv\.2 · 10\//)).toBe(1)
  await press($, 'pat')
  expect(await count(m, /Lv\.2 · 10\//)).toBe(1)      // 10 stays 10: no point for a 6th pat of the day
})

test('several conversations: a day already counted by another conversation is not counted again', async ($, on) => {
  const toasts: string[] = []
  toastSink = toasts
  await engine($, on, { streak: { last: dayKey(new Date(1_700_000_000_000)), n: 3, max: 3 } })
  await mount($, 'desktop')
  await $.turn.start({ text: 'hi', turnId: 'c1' } as any)
  expect(toasts.filter(t => /连续第/.test(t)).length).toBe(0)
})

test('terminal: the same buttons work there (a reminder can be dismissed, pat and the achievements panel work)', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'terminal')
  await $.command.run({ command: 'pet', args: 'rest', origin: { kind: 'composer' }, presentation: {} } as any)
  expect(await countBtn(m, /知道啦/)).toBe(1)
  await press($, 'rest')
  expect(await countBtn(m, /知道啦/)).toBe(0)
  await press($, 'pat')
  expect(await count(m, /\(done|\(idle|♥Lv\.1/)).toBeGreaterThan(0)
  await press($, 'ach')
  expect(await countBtn(m, /对话与工具 0\/9/)).toBe(1)
})

test('focus: she does not fall asleep during a focus timer, and starting one wakes her', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  const sleepLine = /轻轻打盹|稍微休息一下|Zzz|主人不在的时候|再眯一会儿|打哈欠|睡着前最后一句|梦里也在等你|你回来了就叫我|靠着桌子睡着/
  await clock.advance(6 * 60 * 1000)
  expect(await count(m, sleepLine)).toBe(1)            // asleep after 5 quiet minutes
  await press($, 'focus')
  await clock.advance(1000)
  expect(await count(m, sleepLine)).toBe(0)            // starting the timer woke her
  await clock.advance(10 * 60 * 1000)
  expect(await count(m, sleepLine)).toBe(0)            // 10 quiet minutes later she is still awake
  expect(await countBtn(m, /放弃 · 剩/)).toBe(1)
})

test('break: the button row stays short (no focus button next to the break button)', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await press($, 'focus')
  await clock.advance(26 * 60 * 1000)
  expect(await countBtn(m, /结束休息/)).toBe(1)
  expect(await countBtn(m, /专注 25 分钟|放弃 · 剩/)).toBe(0)
  await press($, 'brk')
  expect(await countBtn(m, /专注 25 分钟/)).toBe(1)      // ending the break brings the focus button back
})

test('demo: /pet break is not counted as a real break', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.command.run({ command: 'pet', args: 'break', origin: { kind: 'composer' }, presentation: {} } as any)
  expect(await countBtn(m, /结束休息/)).toBe(1)
  await clock.advance(2 * 60 * 1000)
  expect(await countBtn(m, /结束休息/)).toBe(0)
  await press($, 'ach')
  await press($, 'ag-focus')
  expect(await hasText(m, /✓ 好好休息/)).toBe(false)
})

test('demo: /pet version tells which build is loaded', async ($, on) => {
  await engine($, on)
  await mount($, 'desktop')
  const r: any = await $.command.run({ command: 'pet', args: 'version', origin: { kind: 'composer' }, presentation: {} } as any)
  expect(JSON.stringify(r)).toMatch(/桌宠 v\d+\.\d+\.\d+ · built \d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
})

test('rest: one very long turn (70 minutes) still counts as continuous work, so the one-hour reminder comes', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  const restLine = /连续工作一小时|休息一下对身体好|已工作一小时/
  await $.turn.start({ text: 'big task', turnId: 'long1' } as any)
  for (let i = 0; i < 7; i++) await clock.advance(10 * 60 * 1000)      // no tool calls, no turn.complete: just one long turn
  await clock.advance(30000)
  expect(await count(m, restLine)).toBe(1)
})

test('rest: waiting for a permission answer for a long time does not count as work', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  const restLine = /连续工作一小时|休息一下对身体好|已工作一小时/
  await $.turn.start({ text: 'task', turnId: 'w1' } as any)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } } as any)
  for (let i = 0; i < 7; i++) await clock.advance(10 * 60 * 1000)
  await clock.advance(30000)
  expect(await count(m, restLine)).toBe(0)
})

test('demo: carrying on after /pet rest is not counted as ignoring a real reminder', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await $.turn.start({ text: 'hi', turnId: 'dr0' } as any)
  await $.command.run({ command: 'pet', args: 'rest', origin: { kind: 'composer' }, presentation: {} } as any)
  for (let i = 0; i < 6; i++) await $.turn.start({ text: 'hi', turnId: 'dr' + (i + 1) } as any)
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /✓ 不听劝/)).toBe(false)
})

// ---------- audit follow-ups (0.3.4) ----------
test('pat: ten clicks at the same moment still pay only five', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await Promise.all(Array.from({ length: 10 }, () => press($, 'pat')))
  expect(await count(m, /Lv\.1 · 5\//)).toBe(1)
})

test('damaged saved numbers count as 0 instead of turning into null', async ($, on) => {
  await engine($, on, { affection: 'abc', streak: { last: 'x', n: 'z', max: null }, today: { d: 'x', turns: 'q', tools: null, pats: 'p', focus: {} } })
  const m = await mount($, 'desktop')
  await press($, 'pat')
  expect(await count(m, /null|NaN/)).toBe(0)
  expect(await count(m, /Lv\.\d+ · \d+\//)).toBe(1)
})

test('check-in: the reward grows with the streak (3 + days - 1, at most 8) and a broken streak starts again at 3', async ($, on) => {
  const day = (back: number) => {
    const d = new Date(1_700_000_000_000)
    d.setDate(d.getDate() - back)
    return dayKey(d)
  }
  // yesterday was day 4 of a streak: today is day 5 -> 3 + 4 = 7 points (the "three days" achievement is already counted: max 4)
  await engine($, on, { streak: { last: day(1), n: 4, max: 4 }, achieved: ['str3'] })
  const m = await mount($, 'desktop')
  await $.turn.start({ text: 'hi', turnId: 'ci1' } as any)
  expect(await count(m, /Lv\.1 · 7\//)).toBe(1)
})

test('check-in: a broken streak starts again and pays 3', async ($, on) => {
  const d = new Date(1_700_000_000_000)
  d.setDate(d.getDate() - 3)
  await engine($, on, { streak: { last: dayKey(d), n: 9, max: 9 }, achieved: ['str3', 'str7'] })
  const m = await mount($, 'desktop')
  await $.turn.start({ text: 'hi', turnId: 'ci2' } as any)
  expect(await count(m, /Lv\.1 · 3\//)).toBe(1)
})

test('focus: pressing the button again gives the timer up', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await press($, 'focus')
  expect(await countBtn(m, /放弃 · 剩/)).toBe(1)
  await press($, 'focus')
  expect(await countBtn(m, /放弃 · 剩/)).toBe(0)
  expect(await countBtn(m, /专注 25 分钟/)).toBe(1)
})

test('context warning: once at 85%, not again while it stays high, again after it fell clearly below', async ($, on) => {
  const toasts: string[] = []
  toastSink = toasts
  await engine($, on)
  on('session.measure', (_: any, e: any) => ({ changed: e.changed } as any))
  const measure = (p: number) => $.session.measure({ context: { window: 1000000, percent: p }, rateLimits: [], changed: ['context'] } as any)
  await mount($, 'desktop')
  await measure(70)
  const base = toasts.length
  await measure(86)
  expect(toasts.length).toBe(base + 1)
  await measure(90)
  expect(toasts.length).toBe(base + 1)
  await measure(60)
  await measure(88)
  expect(toasts.length).toBe(base + 2)
})

test('compaction: when it is skipped nothing is celebrated or counted', async ($, on) => {
  let m: any
  on('session.compact', async () => ({ skip: 'nothing to do' } as any))
  await engine($, on)
  m = await mount($, 'desktop')
  await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'hi', toolUses: [], toolResults: [] }] } as any)
  expect(await count(m, /整理完毕|压缩完成|整理好啦|腾出好多空间|整理好了|轻松多啦|轻装上阵/)).toBe(0)
  await press($, 'ach')
  await press($, 'ag-misc')
  expect(await hasText(m, /✓ 轻装上阵/)).toBe(false)
})

test('an achievement id that no longer exists is not counted in the shown total', async ($, on) => {
  await engine($, on, { achieved: ['first', 'removed-long-ago'] })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await $.turn.start({ text: 'hi', turnId: 'x1' } as any)
  expect(await countBtn(m, /成就 1\/41/)).toBe(1)
})

// ---------- affection model v2 (0.4.0) ----------
const todayKey = () => dayKey(new Date(1_700_000_000_000))
const heartOf = (m: any, re: RegExp) => count(m, re)

test('points: the first 10 turns of a day are worth 1, the next ones 0.5 (12 turns = 11, plus the first achievement)', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  for (let i = 0; i < 12; i++) await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'p' + i } as any)
  expect(await heartOf(m, /Lv\.2 · 14\/35/)).toBe(1)      // 10 + 0.5 + 0.5 = 11, "first" gives round(2 * 1.3) = 3
})

test('points: after the 80th turn of a day a turn is worth nothing', async ($, on) => {
  await engine($, on, { today: { d: todayKey(), turns: 80, tools: 0, pats: 0, focus: 0, rests: 0, pts: 25 }, achieved: ['first', 'day50'], stats: { turns: 80 } })
  const m = await mount($, 'desktop')
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'cap1' } as any)
  expect(await heartOf(m, /Lv\.1 · 0\/10/)).toBe(1)
})

test('points: a focus timer is worth 2 for the first four of a day, then nothing', async ($, on) => {
  const clock = await engine($, on, { achieved: ['foc1'] })
  const m = await mount($, 'desktop')
  await press($, 'focus')
  await clock.advance(26 * 60 * 1000)
  expect(await heartOf(m, /Lv\.1 · 2\/10/)).toBe(1)
})

test('points: the fifth timer of a day pays nothing', async ($, on) => {
  const clock = await engine($, on, { achieved: ['foc1'], today: { d: todayKey(), turns: 0, tools: 0, pats: 0, focus: 4, rests: 0, pts: 8 } })
  const m = await mount($, 'desktop')
  await press($, 'focus')
  await clock.advance(26 * 60 * 1000)
  expect(await heartOf(m, /Lv\.1 · 0\/10/)).toBe(1)
})

test('points: a full 5 minute rest is worth 1', async ($, on) => {
  const clock = await engine($, on, { achieved: ['foc1', 'brk1'] })
  const m = await mount($, 'desktop')
  await press($, 'focus')
  await clock.advance(26 * 60 * 1000)
  await clock.advance(5 * 60 * 1000 + 2000)
  expect(await heartOf(m, /Lv\.1 · 3\/10/)).toBe(1)      // 2 for the timer + 1 for the rest
})

test('streak: a weekend off does not break it (Friday -> Monday), a longer gap does', async ($, on) => {
  const friday = new Date(2023, 10, 17)
  const monday = new Date(2023, 10, 20, 12, 0, 0).getTime()
  const clock = await engine($, on, { streak: { last: dayKey(friday), n: 4, max: 4 }, achieved: ['str3'] })
  const m = await mount($, 'desktop')
  await clock.set(monday)
  await $.turn.start({ text: 'hi', turnId: 'wk1' } as any)
  expect(await heartOf(m, /Lv\.1 · 7\/10/)).toBe(1)      // day 5: 3 + 4
})

test('streak: Thursday -> Monday is a real gap and starts again at 3', async ($, on) => {
  const thursday = new Date(2023, 10, 16)
  const monday = new Date(2023, 10, 20, 12, 0, 0).getTime()
  const clock = await engine($, on, { streak: { last: dayKey(thursday), n: 4, max: 4 }, achieved: ['str3'] })
  const m = await mount($, 'desktop')
  await clock.set(monday)
  await $.turn.start({ text: 'hi', turnId: 'wk2' } as any)
  expect(await heartOf(m, /Lv\.1 · 3\/10/)).toBe(1)
})

test('migration: an old save keeps its level (old Lv.6 at 153 points becomes the new Lv.6 at 180), once', async ($, on) => {
  const clock = await engine($, on, { affection: 153, streak: { last: todayKey(), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.6 · 180\/250/)).toBe(1)
})

test('migration: a high old level is kept too (old Lv.10 at 418 becomes 517), and a migrated save is left alone', async ($, on) => {
  const clock = await engine($, on, { affection: 418, streak: { last: todayKey(), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.10 · 517\/625/)).toBe(1)
})

test('migration: a save already on the new model is not touched', async ($, on) => {
  const clock = await engine($, on, { affection: 153, model: 2, streak: { last: todayKey(), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.5 · 153\/180/)).toBe(1)
})

test('summary: shows today\'s points', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1000, isAborted: false, turnId: 'sm1' } as any)
  await press($, 'sum')
  expect(await heartOf(m, /今日心意 \+4/)).toBe(1)      // 1 for the turn + 3 for "first"
})

test('achievement rewards are scaled: the total is about a seventh of what Lv.20 needs', async ($, on) => {
  await engine($, on, { achieved: [] })
  await mount($, 'desktop')
  // the same arithmetic as the code: Math.round(rw * 1.3) over the 41 base rewards
  const base = [2, 3, 5, 8, 12, 5, 4, 4, 8, 3, 5, 6, 10, 20, 3, 4, 5, 6, 0, 3, 6, 10, 3, 2, 5, 10, 2, 6, 3, 4, 8, 2, 6, 4, 5, 4, 5, 5, 5, 4, 10]
  const total = base.reduce((n, r) => n + Math.round(r * 1.3), 0)
  expect(base.length).toBe(41)
  expect(total).toBeGreaterThan(250)
  expect(total / 1975).toBeLessThan(0.16)
})

// ---------- mood: the face and the line she shows while plainly idle ----------
const at = (h: number, mi = 0, d = 15) => new Date(2023, 10, d, h, mi).getTime()      // local time; the mock clock only moves forward, so always after 14 Nov 2023
const MOODS: Record<string, RegExp> = {
  happy: /今天心情很好，主人|托主人的福|能为主人效劳|请放心，我状态很好/,
  sleepy: /夜深了，主人|已经很晚了|（轻轻打了个哈欠）失礼了|熬夜对身体不好/,
  worried: /情况似乎不太理想|有些状况需要留心|我有些担心，请主人多加留意/,
  excited: /今天事务颇多|今天进展不错|主人今天格外勤勉/,
}
const moodsShown = async (m: any) => {
  const r: string[] = []
  for (const k of Object.keys(MOODS)) if ((await count(m, MOODS[k])) > 0) r.push(k)
  return r
}
const finishTurn = async ($: any, clock: any, id: string, reason: string = 'answer') => {
  await $.turn.start({ text: 'hi', turnId: id } as any)
  await clock.advance(1000)
  await $.turn.complete({ reason, answer: '', durationMs: 1000, isAborted: false, turnId: id } as any)
  await clock.advance(8000)      // the short "done" or "worry" pose is over
}

test('mood: calm by day, no mood line shows', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  expect(await moodsShown(m)).toEqual([])
})

for (const [h, mi, d, want] of [[22, 59, 15, []], [23, 0, 15, ['sleepy']], [4, 59, 16, ['sleepy']], [5, 0, 16, []]] as [number, number, number, string[]][]) {
  test(`mood: sleepy from 23:00 until 05:00 (${h}:${String(mi).padStart(2, '0')})`, async ($, on) => {
    const clock = await engine($, on)
    await clock.set(at(h, mi, d))
    const m = await mount($, 'desktop')
    expect(await moodsShown(m)).toEqual(want)
  })
}

test('mood: a head pat makes her happy for a while, and then it is over', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  expect(await moodsShown(m)).toEqual(['happy'])
  await clock.advance(16 * 60 * 1000)
  await finishTurn($, clock, 'p1')
  expect(await moodsShown(m)).toEqual([])
})

test('mood: an error worries her, and it passes after five minutes', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await finishTurn($, clock, 'e1', 'error')
  expect(await moodsShown(m)).toEqual(['worried'])
  await clock.advance(6 * 60 * 1000)
  await finishTurn($, clock, 'e2')
  expect(await moodsShown(m)).toEqual([])
})

test('mood: worry wins over happiness, whichever came first', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  await finishTurn($, clock, 'w1', 'error')
  expect(await moodsShown(m)).toEqual(['worried'])
  await clock.advance(6 * 60 * 1000)      // the worry has passed, the pat has not (15 minutes)
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  await finishTurn($, clock, 'w2', 'error')
  await $.ui.press({ plugin: 'pet', key: 'pat' })      // a good thing while worried does not cheer her up
  await clock.advance(3000)
  expect(await moodsShown(m)).toEqual(['worried'])
})

test('mood: a busy day (30 turns) makes her excited, and a good thing outranks it', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 29; i++) await finishTurn($, clock, 'b' + i)
  await clock.advance(16 * 60 * 1000)      // whatever good thing happened on the way is over
  await finishTurn($, clock, 'b29')
  expect(await moodsShown(m)).toEqual(['excited'])
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  expect(await moodsShown(m)).toEqual(['happy'])
})

test('mood: only plain idle takes a mood; working keeps its own line', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(23, 30))
  const m = await mount($, 'desktop')
  await finishTurn($, clock, 'k0')      // (the first turn of a day shows the greeting first)
  await clock.advance(10000)      // the first turn of a new save unlocks an achievement: its message, then a happy mood (which outranks the sleepy one)
  expect(await moodsShown(m)).toEqual(['happy'])
  await $.turn.start({ text: 'hi', turnId: 'k1' } as any)
  expect(await moodsShown(m)).toEqual([])
  const own = /正在处理，请稍候|努力工作中|马上就好，主人|正在逐项办理|请放心，我会仔细完成|正在执行，请勿担心|手头的工作正在推进|请再给我一点时间|正在思考，请稍等|让我想一想|嗯……|容我斟酌片刻|请稍候，我在整理思路|这个问题需要仔细考虑|正在权衡，请稍等|请允许我想一想/
  expect(await count(m, own)).toBe(1)
})

const faces = async (m: any) => (await m.findAll({ type: 'Svg' })).map((n: any) => n.props.alt).filter((a: string) => a.startsWith('pet: '))

test('mood: the face follows the mood (sleepy, worried, happy, excited, calm)', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(23, 30))
  const m = await mount($, 'desktop')
  expect(await faces(m)).toEqual(['pet: sleepy'])
  await finishTurn($, clock, 'f1', 'error')
  expect(await faces(m)).toEqual(['pet: worry'])
})

test('mood: the face of a happy, an excited and a calm day', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  expect(await faces(m)).toEqual(['pet: idle'])
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  expect(await faces(m)).toEqual(['pet: proud'])
  await clock.advance(16 * 60 * 1000)
  for (let i = 0; i < 29; i++) await finishTurn($, clock, 'x' + i)
  await clock.advance(16 * 60 * 1000)
  await finishTurn($, clock, 'x29')
  expect(await faces(m)).toEqual(['pet: start'])
})

test('mood demo: /pet mood <name> shows that mood for two minutes; a wrong name explains the usage', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  const run = async (args: string) => (await $.command.run({ command: 'pet', args, origin: { kind: 'composer' }, presentation: {} } as any)) as any
  for (const [name, face] of [['sleepy', 'pet: sleepy'], ['worried', 'pet: worry'], ['happy', 'pet: proud'], ['excited', 'pet: start'], ['calm', 'pet: idle']] as [string, string][]) {
    await run('mood ' + name)
    expect(await faces(m)).toEqual([face])
  }
  await run('mood sleepy')
  expect(await moodsShown(m)).toEqual(['sleepy'])
  await clock.advance(3 * 60 * 1000)
  await finishTurn($, clock, 'd1')      // (the demo is over)
  await clock.advance(10000)      // the achievement message of the save's first turn goes away
  expect(await moodsShown(m)).toEqual(['happy'])      // (that turn was the first of the save: its achievement made her happy, which is the real mood)
  const bad = await run('mood nonsense')
  expect(JSON.stringify(bad)).toContain('/pet mood calm')
})

test('mood: worry as a mood shakes a few times and then keeps still; the reaction to the error itself keeps shaking while it lasts', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  const petSource = async () => ((await m.findAll({ type: 'Svg' })).find((n: any) => n.props.alt.startsWith('pet: ')) as any).props.source as string
  await $.turn.start({ text: 'hi', turnId: 'q1' } as any)
  await clock.advance(1000)
  await $.turn.complete({ reason: 'error', answer: '', durationMs: 1000, isAborted: false, turnId: 'q1' } as any)
  await clock.advance(2000)      // the pose of the error itself
  expect(await petSource()).toMatch(/<animateTransform[^>]*repeatCount="indefinite"/)
  await clock.advance(8000)      // it is over; what is left is the mood
  expect(await faces(m)).toEqual(['pet: worry'])
  const src = await petSource()
  expect(src).toMatch(/<animateTransform[^>]*repeatCount="8"/)
  expect(src).not.toMatch(/<animateTransform[^>]*repeatCount="indefinite"/)      // (the blink of the eyes goes on, of course)
})

// ---------- mood achievements and the recovery (0.5.0) ----------
const GROUP_NAME: Record<string, string> = { chat: '对话与工具', misc: '其他', secret: '隐藏' }
// opens the achievement panel (once: the button is a switch) and unfolds one group (once: that button is a switch too)
const openGroup = async ($: any, m: any, g: string) => {
  if ((await countBtn(m, /对话与工具 \d+\/\d+/)) === 0) await press($, 'ach')
  if ((await countBtn(m, new RegExp('▾ ' + GROUP_NAME[g] + ' '))) === 0) await press($, 'ag-' + g)
}

test('recovery: a good turn while she is worried ends the worry, makes her happy and counts', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await finishTurn($, clock, 'a0')      // (the first turn of a save: its achievement is over after this)
  await clock.advance(20 * 60 * 1000)
  await finishTurn($, clock, 'a1', 'error')
  expect(await moodsShown(m)).toEqual(['worried'])
  await finishTurn($, clock, 'a2')
  await clock.advance(10000)
  expect(await moodsShown(m)).toEqual(['happy'])
  await openGroup($, m, 'misc')
  expect(await hasText(m, /· 雨过天晴.*1\/10/)).toBe(true)
})

test('recovery: ten of them unlock 雨过天晴', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 10; i++) {
    await finishTurn($, clock, 'e' + i, 'error')
    await finishTurn($, clock, 's' + i)
  }
  await openGroup($, m, 'misc')
  expect(await hasText(m, /✓ 雨过天晴/)).toBe(true)
})

test('recovery: turns without a worry do not count, and neither does a worry that is over', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 5; i++) await finishTurn($, clock, 'n' + i)
  await finishTurn($, clock, 'late-e', 'error')
  await clock.advance(6 * 60 * 1000)      // the worry lasts five minutes
  await finishTurn($, clock, 'late-s')
  await openGroup($, m, 'misc')
  expect(await hasText(m, /· 雨过天晴.*0\/10/)).toBe(true)
})

test('recovery: the /pet mood worried demo does not count as a worry', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await $.command.run({ command: 'pet', args: 'mood worried', origin: { kind: 'composer' }, presentation: {} } as any)
  await finishTurn($, clock, 'demo-s')
  await openGroup($, m, 'misc')
  expect(await hasText(m, /· 雨过天晴.*0\/10/)).toBe(true)
})

test('comfort: five pats while she is worried unlock the hidden 贴心安慰; pats while she is fine do not count', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 5; i++) {
    await $.ui.press({ plugin: 'pet', key: 'pat' })
    await clock.advance(3000)
  }
  await openGroup($, m, 'secret')
  expect(await hasText(m, /✓ 贴心安慰/)).toBe(false)
  for (let i = 0; i < 5; i++) {
    await finishTurn($, clock, 'c' + i, 'error')
    await $.ui.press({ plugin: 'pet', key: 'pat' })
    await clock.advance(3000)
  }
  await openGroup($, m, 'secret')
  expect(await hasText(m, /✓ 贴心安慰/)).toBe(true)
})

test('busy days: a day with 30 turns counts once, however many more follow; ten such days unlock 精力旺盛', { timeoutMs: 60000 }, async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(10))
  const m = await mount($, 'desktop')
  const day = async (turns: number, tag: string) => {
    for (let i = 0; i < turns; i++) await finishTurn($, clock, tag + i)
    await clock.advance(24 * 60 * 60 * 1000)
  }
  await day(29, 'a')      // not a busy day
  await day(35, 'b')      // a busy day, counted once
  await openGroup($, m, 'chat')
  expect(await hasText(m, /· 精力旺盛.*1\/10/)).toBe(true)
  for (let d = 0; d < 9; d++) await day(30, 'd' + d + '-')
  await openGroup($, m, 'chat')
  expect(await hasText(m, /✓ 精力旺盛/)).toBe(true)
})

// ---------- 0.5.1: weekend, migration done twice, clamped counters, comfort once per worry, window thresholds ----------
const streakFrom = async ($: any, on: any, last: Date, now: Date, n: number = 4) => {
  const clock = await engine($, on, { streak: { last: dayKey(last), n, max: n }, achieved: ['str3'] })
  const m = await mount($, 'desktop')
  await clock.set(now.getTime())
  await $.turn.start({ text: 'hi', turnId: 'wkx' } as any)
  return m
}
const MON = new Date(2023, 10, 20, 12, 0, 0)      // 20 Nov 2023 is a Monday

test('streak: Saturday -> Monday goes on (only the Sunday was skipped)', async ($, on) => {
  const m = await streakFrom($, on, new Date(2023, 10, 18), MON)
  expect(await heartOf(m, /Lv\.1 · 7\/10/)).toBe(1)
})

test('streak: Friday -> Sunday goes on (only the Saturday was skipped)', async ($, on) => {
  const m = await streakFrom($, on, new Date(2023, 10, 17), new Date(2023, 10, 19, 12, 0, 0))
  expect(await heartOf(m, /Lv\.1 · 7\/10/)).toBe(1)
})

test('streak: Sunday -> Tuesday is a real gap (the Monday was skipped)', async ($, on) => {
  const m = await streakFrom($, on, new Date(2023, 10, 19), new Date(2023, 10, 21, 12, 0, 0))
  expect(await heartOf(m, /Lv\.1 · 3\/10/)).toBe(1)
})

test('streak: Monday -> Wednesday is a real gap', async ($, on) => {
  const m = await streakFrom($, on, MON, new Date(2023, 10, 22, 12, 0, 0))
  expect(await heartOf(m, /Lv\.1 · 3\/10/)).toBe(1)
})

test('migration: the second run changes nothing, however it is started (old Lv.12: 599 -> 741 and it stays there)', async ($, on) => {
  const clock = await engine($, on, { affection: 599, streak: { last: todayKey(), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.12 · 741\/866/)).toBe(1)
  await $.session.start({ source: 'clear', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.12 · 741\/866/)).toBe(1)
})

test('migration: a conversation that arrives when another one has lifted the points already (but not set the marker yet) lifts nothing more', async ($, on) => {
  const clock = await engine($, on, { affection: 741, legacyAffection: 599, streak: { last: todayKey(), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.12 · 741\/866/)).toBe(1)      // (not 866: that would be the second lift)
})

test('migration: points earned between the two runs are not taken away', async ($, on) => {
  const clock = await engine($, on, { affection: 750, legacyAffection: 599, streak: { last: todayKey(), n: 1, max: 1 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await clock.advance(1000)
  expect(await heartOf(m, /Lv\.12 · 750\/866/)).toBe(1)
})

test('stats from the store: infinite and negative numbers count as nothing', async ($, on) => {
  await engine($, on, { achieved: ['first'], model: 2, stats: { turns: Infinity, tools: -10, pats: 'abc', focus: 1e308 * 10 } })
  const m = await mount($, 'desktop')
  await $.session.start({ source: 'startup', cwd: '/test' } as any)
  await $.turn.start({ text: 'hi', turnId: 'inf' } as any)
  expect(await countBtn(m, /成就 1\/41/)).toBe(1)
})

test('comfort: pats while she is worried count once per worry; five worries comforted unlock the hidden 贴心安慰', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 4; i++) {
    await finishTurn($, clock, 'w' + i, 'error')
    for (let k = 0; k < 3; k++) {
      await $.ui.press({ plugin: 'pet', key: 'pat' })
      await clock.advance(3000)
    }
  }
  await openGroup($, m, 'secret')
  expect(await hasText(m, /✓ 贴心安慰/)).toBe(false)      // twelve pats, but four worries
  await finishTurn($, clock, 'w4', 'error')
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  await openGroup($, m, 'secret')
  expect(await hasText(m, /✓ 贴心安慰/)).toBe(true)
})

// the window: the right-hand block goes when the band is narrower than the threshold (97 cells; longer button rows need more)
const mountCols = ($: any, cols: number) => $.ui.mount({ plugin: 'pet', surface: 'desktop', component: 'AbovePrompt', props: { ...PROPS, bodyColumns: cols } })
const rightBlock = (m: any) => count(m, /5H 重置/)
for (const [name, edge] of [['normal', 97], ['with the compact button', 110], ['while a focus timer runs', 98]] as [string, number][]) {
  for (const [cols, want] of [[edge - 1, 0], [edge, 1]] as [number, number][]) {
    test(`window: ${name}: ${cols} cells ${want ? 'keep' : 'drop'} the right-hand block`, async ($, on) => {
      on('session.measure', (_: any, e: any) => ({ changed: e.changed } as any))
      await engine($, on)
      const m = await mountCols($, cols)
      if (name === 'with the compact button') await $.session.measure({ context: { window: 1000000, percent: 82 }, rateLimits: [], changed: ['context'] } as any)
      if (name === 'while a focus timer runs') await $.ui.press({ plugin: 'pet', key: 'focus' })
      expect(await rightBlock(m)).toBe(want)
    })
  }
}

test('mood: a happy mood lasts the full fifteen minutes and is over after sixteen', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await finishTurn($, clock, 'h0')
  await clock.advance(20 * 60 * 1000)      // (the happiness of the first turn is over)
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  await clock.advance(14 * 60 * 1000)
  await finishTurn($, clock, 'h1')
  expect(await moodsShown(m)).toEqual(['happy'])
  await clock.advance(2 * 60 * 1000)
  await finishTurn($, clock, 'h2')
  expect(await moodsShown(m)).toEqual([])
})

test('mood: the busy day of yesterday does not make her excited today', async ($, on) => {
  const clock = await engine($, on)
  await clock.set(at(10))
  const m = await mount($, 'desktop')
  for (let i = 0; i < 30; i++) await finishTurn($, clock, 'y' + i)
  await clock.advance(24 * 60 * 60 * 1000)
  await finishTurn($, clock, 'today')
  await clock.advance(20 * 60 * 1000)
  await finishTurn($, clock, 'today2')
  expect(await moodsShown(m)).toEqual([])
})

test('comfort: two pats that arrive at the same moment count once', async ($, on) => {
  const clock = await engine($, on, { achieved: [], model: 2, stats: { comforts: 3 } })
  await clock.set(at(15))
  const m = await mount($, 'desktop')
  await finishTurn($, clock, 'cc0', 'error')
  await Promise.all([$.ui.press({ plugin: 'pet', key: 'pat' }), $.ui.press({ plugin: 'pet', key: 'pat' })])
  await clock.advance(3000)
  await openGroup($, m, 'secret')
  expect(await hasText(m, /✓ 贴心安慰/)).toBe(false)      // 3 + one comfort is 4, not 5
  await finishTurn($, clock, 'cc1', 'error')
  await $.ui.press({ plugin: 'pet', key: 'pat' })
  await clock.advance(3000)
  await openGroup($, m, 'secret')
  expect(await hasText(m, /✓ 贴心安慰/)).toBe(true)      // the next worry's comfort makes 5
})
