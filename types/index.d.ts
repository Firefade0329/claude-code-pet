declare module 'claude-code' {
  interface PluginState {
    pet: {
      mode: PetMode
      since: number
      isHidden: boolean
      affection: number
      ctx: number | null
      five: number | null
      seven: number | null
      fiveReset: string | null
      sevenReset: string | null
      stale: boolean
      cacheHit: number | null
      cacheRead: number
      cacheAll: number
      cacheOld: boolean
      cost: number | null
      today: Today
      stats: Stats
      streak: Streak
      achieved: string[]
      showAch: boolean
      openGroup: string
      reactKind: ReactKind
      reactAt: number
      reactToken: number
      flashText: string
      flashSprite: Sprite
      greetText: string
      workStart: number
      lastActive: number
      nextRemind: number
      remindDue: boolean
      focusEnd: number
      breakEnd: number
      showSum: boolean
      armed5: boolean
      armedC: boolean
      warnKind: '' | '5h' | 'ctx'
      warnUntil: number
      tick: number
    }
  }
}
export type PetMode = 'idle' | 'work' | 'think' | 'wait' | 'done' | 'sleep' | 'worry' | 'greet' | 'compact'
export type Sprite = PetMode | 'shy' | 'surprised' | 'proud' | 'heart' | 'long' | 'rest' | 'focus' | 'up0' | 'up1' | 'up2' | 'start' | 'giveup'
export type ReactKind = 'none' | 'pat' | 'poke' | 'flash'
export type Today = { d: string; turns: number; tools: number; pats: number; focus: number }
export type Stats = { turns: number; tools: number; pats: number; focus: number; night: number; longest: number; pokes: number; compacts: number; breaks: number; errors: number; wakes: number; bursts: number; ignored: number; peak: number }
export type Streak = { last: string; n: number; max: number }
