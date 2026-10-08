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
  expect(await countBtn(m, /放弃专注 · 剩 25 分/)).toBe(1)
  await clock.advance(26 * 60 * 1000)
  expect(await countBtn(m, /放弃专注/)).toBe(0)
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
  expect(await countBtn(m, /对话与工具 1\/8/)).toBe(1)
  expect(await countBtn(m, /隐藏 0\/4/)).toBe(1)
  await press($, 'ag-chat')
  expect(await hasText(m, /✓ 初次见面/)).toBe(true)
  expect(await hasText(m, /· 小有成就.*1\/100/)).toBe(true)
})

test('achievements: hidden ones are not revealed until unlocked', async ($, on) => {
  await engine($, on)
  const m = await mount($, 'desktop')
  await press($, 'ach')
  await press($, 'ag-secret')
  expect(await hasText(m, /别吵醒我|戳戳戳|不听劝|全部收集/)).toBe(false)
  expect(await hasText(m, /还有 4 个隐藏成就/)).toBe(true)
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
    stats: { turns: 3000, tools: 5000, pats: 500, focus: 50, night: 1, longest: 31 * 60000, pokes: 50, compacts: 10, breaks: 10, errors: 10, peak: 1, wakes: 0, bursts: 0, ignored: 0 },
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
  expect(await countBtn(m, /对话与工具 0\/8/)).toBe(1)
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
  expect(await countBtn(m, /放弃专注/)).toBe(1)
})

test('break: the button row stays short (no focus button next to the break button)', async ($, on) => {
  const clock = await engine($, on)
  const m = await mount($, 'desktop')
  await press($, 'focus')
  await clock.advance(26 * 60 * 1000)
  expect(await countBtn(m, /结束休息/)).toBe(1)
  expect(await countBtn(m, /专注 25 分钟|放弃专注/)).toBe(0)
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
  expect(await countBtn(m, /放弃专注/)).toBe(1)
  await press($, 'focus')
  expect(await countBtn(m, /放弃专注/)).toBe(0)
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
  expect(await countBtn(m, /成就 1\/38/)).toBe(1)
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
  // the same arithmetic as the code: Math.round(rw * 1.3) over the 38 base rewards
  const base = [2, 3, 5, 8, 12, 5, 4, 8, 3, 5, 6, 10, 20, 3, 4, 5, 6, 0, 3, 6, 10, 3, 2, 5, 10, 2, 6, 3, 4, 8, 2, 6, 5, 4, 5, 5, 5, 10]
  const total = base.reduce((n, r) => n + Math.round(r * 1.3), 0)
  expect(base.length).toBe(38)
  expect(total).toBeGreaterThan(250)
  expect(total / 1975).toBeLessThan(0.16)
})
