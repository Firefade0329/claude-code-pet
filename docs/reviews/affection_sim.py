#!/usr/bin/env python3
"""桌宠好感度 / 成就经济模型模拟（只用标准库，不联网）。

用法:
    python3 affection_sim.py            # 打印全部表格（Markdown）
    python3 affection_sim.py --check    # 只核对本脚本里的数字与 hooks/register.tsx 是否一致

数值来源（全部来自 hooks/register.tsx，2026-10 的 v0.3.1 构建）:
    升级门槛   THRESH[L] = round(8 * (L-1) ** 1.8)               L = 2..20
    对话       turn.complete 且 reason == 'answer'     +1, 没有每日上限
    摸头       每天前 PATS_PER_DAY(=5) 次 +1, 之后 0
    番茄钟     finishFocus 完整走完 25 分钟             +2, 没有每日上限
    每日签到   dailyCheck 每个日历日第一次使用        +3 + min(连续天数 - 1, 5)   (3..8)
    成就奖励   ACHS 表里的 rw, 解锁后立刻加到好感度, 再检查一次成就 (递归)
    休息完成 / 戳一下 / 压缩上下文 / 出错: 不加好感度, 只计入统计

模型里「用户行为」的数字（每天几轮、几次工具、出错率……）是假设, 不是从代码读出来的,
都集中在 PROFILES 和 RATES 里, 想换假设直接改这两处。
"""
import math
import os
import re
import sys
from dataclasses import dataclass, field

# --------------------------------------------------------------------------- 代码里的常量
MAX_LEVEL = 20
PATS_PER_DAY = 5
TURN_POINTS = 1
FOCUS_POINTS = 2
MAX_DAILY_ROUNDS = 5   # checkAchLocked 里 for (round < 5)


def round_half_up(x: float) -> int:
    """JS 的 Math.round（正数时四舍五入, 不是 Python 的银行家舍入）。"""
    return int(math.floor(x + 0.5))


THRESH = [0] + [round_half_up(8 * (L - 1) ** 1.8) for L in range(2, MAX_LEVEL + 1)]
# 用 node 跑同一条公式得到的值, 用来防止这里的 Python 舍入和 JS 不一致
THRESH_FROM_JS = [0, 8, 28, 58, 97, 145, 201, 266, 338, 418, 505, 599, 701, 809, 925, 1047, 1176, 1312, 1454, 1603]
assert THRESH == THRESH_FROM_JS, (THRESH, THRESH_FROM_JS)


def level_of(n: float, thr=None) -> int:
    thr = thr or THRESH
    lvl = 1
    for i in range(1, len(thr)):
        if n >= thr[i]:
            lvl = i + 1
    return lvl


def stage_of(lvl: int) -> int:
    return 0 if lvl <= 6 else 1 if lvl <= 13 else 2


# id, 分组, 奖励 rw, 目标 goal, 是否隐藏 —— 与 ACHS 逐行对应（--check 会和源码核对）
ACHS = [
    ('first', 'chat', 2, 1, False), ('t100', 'chat', 3, 100, False), ('t500', 'chat', 5, 500, False),
    ('t1000', 'chat', 8, 1000, False), ('t3000', 'chat', 12, 3000, False), ('day50', 'chat', 5, 50, False),
    ('tool1k', 'chat', 4, 1000, False), ('tool5k', 'chat', 8, 5000, False),
    ('str3', 'bond', 3, 3, False), ('str7', 'bond', 5, 7, False), ('str14', 'bond', 6, 14, False),
    ('str30', 'bond', 10, 30, False), ('str100', 'bond', 20, 100, False),
    ('lv5', 'love', 3, 5, False), ('lv7', 'love', 4, 7, False), ('lv10', 'love', 5, 10, False),
    ('lv14', 'love', 6, 14, False), ('lv20', 'love', 0, 20, False),
    ('pat50', 'play', 3, 50, False), ('pat200', 'play', 6, 200, False), ('pat500', 'play', 10, 500, False),
    ('poke50', 'play', 3, 50, False),
    ('foc1', 'focus', 2, 1, False), ('foc10', 'focus', 5, 10, False), ('foc50', 'focus', 10, 50, False),
    ('brk1', 'focus', 2, 1, False), ('brk10', 'focus', 6, 10, False),
    ('owl', 'misc', 3, 1, False), ('long', 'misc', 4, 10, False), ('long30', 'misc', 8, 30, False),
    ('cmp1', 'misc', 2, 1, False), ('cmp10', 'misc', 6, 10, False), ('peak', 'misc', 5, 1, False),
    ('err10', 'misc', 4, 10, False),
    ('wake', 'secret', 5, 10, True), ('burst', 'secret', 5, 1, True), ('ignore', 'secret', 5, 5, True),
    ('all', 'secret', 10, 0, True),
]
assert len(ACHS) == 38
NON_HIDDEN = [a[0] for a in ACHS if not a[4]]

# --------------------------------------------------------------------------- 假设: 用户行为
# 下面这些比例 / 次数是「我假设」的, 代码里读不出来; 改这里看敏感度。
RATES = {
    'tools_per_turn': 6.0,       # 每轮平均工具调用数（假设）
    'error_per_turn': 0.02,      # 每轮出错概率（假设）。出错的轮不计 +1, 这里忽略这点差别
    'night_per_turn': 0.01,      # 每轮发生在 0–5 点的概率（假设）
    'compact_per_turn': 1 / 200,  # 每轮触发一次压缩上下文的概率（假设）
    'long10_per_turn': 0.003,    # 每轮耗时超过 10 分钟的概率（假设）
    'long30_per_turn': 0.0005,   # 每轮耗时超过 30 分钟的概率（假设）
    'break_done_per_pomodoro': 0.5,  # 番茄钟结束后真的歇满 5 分钟、没提前发消息的比例（假设）
}


@dataclass
class Profile:
    name: str
    turns: int                 # 活跃日每天完成的对话轮数
    pats: int = 5              # 活跃日每天点「摸摸头」的次数
    pomodoros: float = 0.0     # 活跃日平均每天完成的番茄钟个数（小数用累积器处理）
    week: tuple = (1, 1, 1, 1, 1, 1, 1)   # 一周七天哪些天打开（第 0 天 = 第一次使用）
    pokes: float = 2.0         # 活跃日每天戳几下（假设）
    wakes: float = 0.3         # 活跃日每天「把睡着的她戳醒」几次（假设）
    bursts: float = 0.02       # 活跃日每天触发「10 秒戳 5 下」的次数（假设, 约 50 天一次）
    ignored: float = 0.0       # 活跃日每天「休息提醒出现后没点知道啦又发消息」的条数（假设）
    peak5h: float = 0.0        # 活跃日每天 5H 额度冲到 95% 以上的概率（假设）
    turn_cap: int = 0          # 0 = 不封顶（现状）; >0 = 提案: 每天最多这么多轮按 1 点计
    turn_tail: float = 0.0     # 提案: 超过 turn_cap 的轮数, 每轮只给这么多点（0 = 不给）
    scale: float = 1.0         # 提案: 把所有升级门槛乘这个系数（1.0 = 现状）
    short: str = ''            # 表格里用的简称


EVERY = (1, 1, 1, 1, 1, 1, 1)
WEEKDAYS = (1, 1, 1, 1, 1, 0, 0)
FOUR_DAYS = (1, 1, 0, 1, 1, 0, 0)       # 周一二四五: 永远连不成 3 天
EVERY_OTHER = (1, 0, 1, 0, 1, 0, 0)     # 隔天: 没有连续奖励


def profiles(turn_cap: int = 0, turn_tail: float = 0.0, scale: float = 1.0):
    def P(name, short, turns, pats, pomodoros, week, pokes, wakes, bursts, ignored, peak5h):
        return Profile(name, turns, pats, pomodoros, week, pokes, wakes, bursts, ignored, peak5h, turn_cap, turn_tail, scale, short)
    return [
        P('轻度（5 轮/天, 摸头 3 次, 每周 4 天, 不开番茄钟）', '轻度', 5, 3, 0.0, FOUR_DAYS, 1, 0.1, 0.01, 0.0, 0.0),
        P('普通（15 轮/天, 摸头 5 次, 工作日, 偶尔番茄钟 0.3/天）', '普通', 15, 5, 0.3, WEEKDAYS, 2, 0.3, 0.02, 0.2, 0.005),
        P('认真（30 轮/天, 摸头 5 次, 天天用, 番茄钟 0.5/天）', '认真', 30, 5, 0.5, EVERY, 3, 0.3, 0.02, 0.5, 0.01),
        P('认真·只用工作日（同上, 周末不开）', '认真·工作日', 30, 5, 0.5, WEEKDAYS, 3, 0.3, 0.02, 0.5, 0.01),
        P('重度（100 轮/天, 摸头 5 次, 天天用, 番茄钟 3 个/天）', '重度', 100, 5, 3.0, EVERY, 3, 0.3, 0.02, 3.0, 0.05),
    ]


# --------------------------------------------------------------------------- 模拟
@dataclass
class Result:
    name: str
    day_lv: dict = field(default_factory=dict)       # 等级 -> 第几个日历日第一次达到
    active_lv: dict = field(default_factory=dict)    # 等级 -> 第几个活跃日
    unlock_day: dict = field(default_factory=dict)   # 成就 id -> 日历日
    income: dict = field(default_factory=dict)       # 来源 -> 到满级为止累计点数
    income_total: dict = field(default_factory=dict)  # 来源 -> 模拟结束时累计点数
    reward_before_max: float = 0
    reward_after_max: float = 0
    days_run: int = 0
    aff_end: float = 0


def simulate(p: Profile, max_days: int = 2000, stop_at_max: bool = False) -> Result:
    R = Result(p.name)
    thr = [round_half_up(t * p.scale) for t in THRESH]
    aff = 0.0
    S = dict(turns=0.0, tools=0.0, pats=0.0, focus=0.0, night=0.0, pokes=0.0, compacts=0.0, breaks=0.0,
             errors=0.0, wakes=0.0, bursts=0.0, ignored=0.0, peak=0.0, long10=0.0, long30=0.0)
    streak_last, streak_n, streak_max = -10, 0, 0
    have = set()
    inc = dict(签到=0.0, 对话=0.0, 摸头=0.0, 番茄钟=0.0, 成就奖励=0.0)
    cur_day = [0]
    active_days = [0]
    today = dict(turns=0)
    maxed = [False]

    def cur(aid: str, lvl: int) -> float:
        if aid in ('first', 't100', 't500', 't1000', 't3000'):
            return S['turns']
        if aid == 'day50':
            return today['turns']
        if aid in ('tool1k', 'tool5k'):
            return S['tools']
        if aid.startswith('str'):
            return streak_max
        if aid.startswith('lv'):
            return lvl
        if aid.startswith('pat'):
            return S['pats']
        if aid == 'poke50':
            return S['pokes']
        if aid.startswith('foc'):
            return S['focus']
        if aid.startswith('brk'):
            return S['breaks']
        if aid == 'owl':
            return S['night']
        if aid == 'long':
            return 10 if S['long10'] >= 1 or S['long30'] >= 1 else 0
        if aid == 'long30':
            return 30 if S['long30'] >= 1 else 0
        if aid.startswith('cmp'):
            return S['compacts']
        if aid == 'peak':
            return S['peak']
        if aid == 'err10':
            return S['errors']
        if aid == 'wake':
            return S['wakes']
        if aid == 'burst':
            return S['bursts']
        if aid == 'ignore':
            return S['ignored']
        if aid == 'all':
            return sum(1 for x in NON_HIDDEN if x in have) - len(NON_HIDDEN)
        raise KeyError(aid)

    def check():
        """checkAchLocked + checkAch: 最多 5 轮找出新解锁的, 再把奖励当作一次 addAffection 加上去。"""
        lvl = level_of(aff, thr)
        fresh = []
        for _ in range(MAX_DAILY_ROUNDS):
            new = [a for a in ACHS if a[0] not in have and cur(a[0], lvl) >= a[3]]
            if not new:
                break
            fresh += new
            for a in new:
                have.add(a[0])
        for a in fresh:
            R.unlock_day[a[0]] = cur_day[0]
        reward = sum(a[2] for a in fresh)
        if reward > 0:
            add(reward, '成就奖励')

    def add(n: float, src: str, check_after: bool = True):
        nonlocal aff
        before = aff
        aff += n
        inc[src] += n
        l0, l1 = level_of(before, thr), level_of(aff, thr)
        for L in range(l0 + 1, l1 + 1):
            R.day_lv.setdefault(L, cur_day[0])
            R.active_lv.setdefault(L, active_days[0])
        if l1 >= MAX_LEVEL and not maxed[0]:
            maxed[0] = True
            R.income = dict(inc)
            R.reward_before_max = inc['成就奖励']
        if check_after:
            check()

    pom_acc = 0.0
    for d in range(max_days):
        if not p.week[d % 7]:
            continue
        cur_day[0] = d + 1
        active_days[0] += 1
        today['turns'] = 0
        # 1) 每日签到: dailyCheck
        streak_n = streak_n + 1 if streak_last == d - 1 else 1
        streak_last = d
        streak_max = max(streak_max, streak_n)
        add(3 + min(streak_n - 1, 5), '签到')
        # 2) 对话: turn.complete(answer)
        paid = p.turns if not p.turn_cap else min(p.turns, p.turn_cap)
        for i in range(p.turns):
            S['turns'] += 1
            today['turns'] += 1
            S['tools'] += RATES['tools_per_turn']
            S['night'] += RATES['night_per_turn']
            S['errors'] += RATES['error_per_turn']
            S['compacts'] += RATES['compact_per_turn']
            S['long10'] += RATES['long10_per_turn']
            S['long30'] += RATES['long30_per_turn']
            if i < paid:
                add(TURN_POINTS, '对话')
            elif p.turn_tail > 0:
                add(p.turn_tail, '对话')
            else:
                check()
        # 3) 摸头: 每天前 5 次才加点
        for i in range(p.pats):
            S['pats'] += 1
            if i < PATS_PER_DAY:
                add(1, '摸头', check_after=True)
            else:
                check()
        # 4) 番茄钟
        pom_acc += p.pomodoros
        while pom_acc >= 1 - 1e-9:
            pom_acc -= 1
            S['focus'] += 1
            S['breaks'] += RATES['break_done_per_pomodoro']
            add(FOCUS_POINTS, '番茄钟')
        # 5) 其它统计
        S['pokes'] += p.pokes
        S['wakes'] += p.wakes
        S['bursts'] += p.bursts
        S['ignored'] += p.ignored
        S['peak'] += p.peak5h
        check()
        if maxed[0] and (stop_at_max or len(have) == len(ACHS)):
            break
    R.days_run = cur_day[0]
    R.aff_end = aff
    R.income_total = dict(inc)
    R.reward_after_max = 213 - R.reward_before_max if maxed[0] else 0
    if not maxed[0]:
        R.income = dict(inc)
    return R


# --------------------------------------------------------------------------- 输出
def fmt_day(x):
    return '—' if x is None else str(x)


def md_table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join('---' for _ in head) + '|']
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def section_thresholds():
    rows = []
    for L in range(1, MAX_LEVEL + 1):
        step = THRESH[L - 1] - THRESH[L - 2] if L >= 2 else 0
        stage = ['主仆', '朋友', '家人'][stage_of(L)]
        rows.append((f'Lv.{L}', THRESH[L - 1], f'+{step}' if L >= 2 else '', stage))
    return md_table(['等级', '累计点数门槛', '比上一级多', '台词阶段'], rows)


def section_achievements():
    tot = sum(a[2] for a in ACHS)
    hid = sum(a[2] for a in ACHS if a[4])
    by = {}
    for a in ACHS:
        by.setdefault(a[1], [0, 0])
        by[a[1]][0] += 1
        by[a[1]][1] += a[2]
    names = dict(chat='对话与工具', bond='陪伴', love='好感度', play='互动', focus='专注与休息', misc='其他', secret='隐藏')
    rows = [(names[g], n, rw) for g, (n, rw) in by.items()]
    rows.append(('合计', len(ACHS), tot))
    s = md_table(['分组', '成就数', '奖励合计'], rows)
    s += f'\n\n- 满级所需累计点数 = {THRESH[-1]}; 奖励总和 {tot} = **{100 * tot / THRESH[-1]:.1f}%**（含隐藏 {hid} 点）。'
    s += f'\n- 到 Lv.7（{THRESH[6]}）、Lv.14（{THRESH[13]}）时, 奖励总和分别相当于 {100 * tot / THRESH[6]:.0f}%、{100 * tot / THRESH[13]:.0f}%（只是量级对比, 实际要解锁后才拿得到）。'
    return s


def section_profiles(turn_cap: int = 0, turn_tail: float = 0.0, scale: float = 1.0, full: bool = True):
    res = [simulate(p, stop_at_max=not full) for p in profiles(turn_cap, turn_tail, scale)]
    rows = []
    for r, p in zip(res, profiles()):
        rows.append((r.name, fmt_day(r.day_lv.get(7)), fmt_day(r.day_lv.get(14)), fmt_day(r.day_lv.get(20)),
                     fmt_day(r.active_lv.get(20)), fmt_day(r.unlock_day.get('all'))))
    t = md_table(['画像', 'Lv.7（天）', 'Lv.14（天）', 'Lv.20（天）', 'Lv.20 时的活跃日数', '「全部收集」（天）'], rows)
    rows2 = []
    for r, p in zip(res, profiles()):
        i = r.income
        tot = sum(i.values()) or 1
        rows2.append((p.short, *[f'{i[k]:.0f}（{100 * i[k] / tot:.0f}%）' for k in ('签到', '对话', '摸头', '番茄钟', '成就奖励')], f'{tot:.0f}'))
    t2 = md_table(['画像', '签到', '对话', '摸头', '番茄钟', '成就奖励', '合计'], rows2)
    rows3 = []
    for r, p in zip(res, profiles()):
        rows3.append((p.short, f'{r.reward_before_max:.0f} / 213', f'{r.reward_after_max:.0f}',
                      sum(1 for a in r.unlock_day if r.unlock_day[a] <= r.day_lv.get(20, 10 ** 9))))
    t3 = md_table(['画像', '满级时已拿到的成就奖励', '还没拿到的（满级后才可能拿到）', '满级当天已解锁的成就数（共 38）'], rows3)
    return t, t2, t3, res


def section_sweep(turn_cap: int = 0, turn_tail: float = 0.0, scale: float = 1.0):
    rows = []
    for n in (1, 5, 10, 20, 30, 50, 100, 200, 500):
        r = simulate(Profile(f'N={n}', n, 5, 0.5, EVERY, turn_cap=turn_cap, turn_tail=turn_tail, scale=scale,
                             ignored=0.5 if n >= 20 else 0, peak5h=0.01), stop_at_max=True)
        rows.append((n, fmt_day(r.day_lv.get(7)), fmt_day(r.day_lv.get(14)), fmt_day(r.day_lv.get(20))))
    return md_table(['每天对话轮数 N', 'Lv.7（天）', 'Lv.14（天）', 'Lv.20（天）'], rows)


def section_levels(res_list):
    """每一级花多少天（轻度 / 认真 / 重度）。"""
    rows = []
    a, b, c = res_list[0], res_list[2], res_list[4]
    for L in range(2, MAX_LEVEL + 1):
        def dur(r):
            prev = r.day_lv.get(L - 1, 0) if L > 2 else 0
            now = r.day_lv.get(L)
            if now is None:
                return '—'
            return '同一天' if now - prev <= 0 else str(now - prev)
        rows.append((f'Lv.{L - 1}→{L}', THRESH[L - 1] - THRESH[L - 2], dur(a), dur(b), dur(c)))
    return md_table(['升级', '需要点数', '轻度（天）', '认真（天）', '重度（天）'], rows)


def section_unlock_days(res_list):
    rows = []
    for a in ACHS:
        rows.append((a[0], a[2], a[3], *[fmt_day(r.unlock_day.get(a[0])) for r in (res_list[0], res_list[2], res_list[4])]))
    return md_table(['成就', '奖励', '目标', '轻度解锁日', '认真解锁日', '重度解锁日'], rows)


def section_schemes():
    """几种调整方案对比（提案, 只在模拟里验证过）。"""
    schemes = [
        ('A 现状', dict()),
        ('B 对话每天最多 20 轮计 1 点', dict(turn_cap=20)),
        ('C 每天前 20 轮计 1 点, 之后每轮 0.2 点', dict(turn_cap=20, turn_tail=0.2)),
        ('D 在 C 的基础上, 所有门槛 ×1.5', dict(turn_cap=20, turn_tail=0.2, scale=1.5)),
    ]
    rows = []
    for name, kw in schemes:
        rs = [simulate(p, stop_at_max=True) for p in profiles(**kw)]
        cells = []
        for r in rs:
            cells.append('/'.join(fmt_day(r.day_lv.get(L)) for L in (7, 14, 20)))
        rows.append((name, *cells))
    heads = ['方案（单元格 = Lv.7 / Lv.14 / Lv.20 的天数）'] + [p.short for p in profiles()]
    return md_table(heads, rows)


def check_against_source(path: str) -> int:
    src = open(path, encoding='utf-8-sig').read()
    rows = re.findall(r"^  A\('(\w+)', '(\w+)', '[^']*', '[^']*', (\d+), (\d+), (c => [^\n]*?)(, true)?\),$", src, re.M)
    mine = {a[0]: a for a in ACHS}
    bad = 0
    if len(rows) != len(ACHS):
        print(f'成就条数不一致: 源码 {len(rows)} 条, 脚本 {len(ACHS)} 条')
        bad += 1
    for rid, g, rw, goal, _cur, hid in rows:
        m = mine.get(rid)
        if not m or m[1] != g or m[2] != int(rw) or m[3] != int(goal) or m[4] != bool(hid):
            print('不一致:', rid, g, rw, goal, bool(hid), '脚本里是', m)
            bad += 1
    t = re.search(r'Math\.round\(8 \* Math\.pow\(L - 1, ([\d.]+)\)\)', src)
    if not t or float(t.group(1)) != 1.8:
        print('升级门槛公式与脚本不一致')
        bad += 1
    for const, val in (('PATS_PER_DAY', PATS_PER_DAY), ('MAX_LEVEL', MAX_LEVEL)):
        m = re.search(rf'const {const} = (\d+)', src)
        if not m or int(m.group(1)) != val:
            print('常量不一致:', const)
            bad += 1
    for pat, what in ((r'addAffection\(\$, 3 \+ Math\.min\(n - 1, 5\)\)', '每日签到 3+min(n-1,5)'),
                      (r'await addAffection\(\$, 2\)', '番茄钟 +2'),
                      (r"await bumpStats\(\$, \{ turns: 1, tools, night: hour < 5 \? 1 : 0, longest: e\.durationMs \}, false\)\n\s+await addAffection\(\$, 1\)", '对话 +1')):
        if not re.search(pat, src):
            print('找不到:', what)
            bad += 1
    print('与源码核对:', '全部一致' if bad == 0 else f'{bad} 处不一致')
    return bad


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    src = os.path.join(here, '..', '..', 'hooks', 'register.tsx')
    if '--check' in sys.argv:
        sys.exit(1 if check_against_source(src) else 0)
    if os.path.exists(src):
        check_against_source(src)
    print('日期说明: 「第 N 天」= 日历日, 第 1 天 = 首次使用当天; 一周七天按画像里的 week 模式循环。\n')
    print('## 1. 升级门槛\n')
    print(section_thresholds())
    print('\n## 2. 成就奖励占比\n')
    print(section_achievements())
    t, t2, t3, res = section_profiles()
    print('\n## 3. 各画像多少天到 Lv.7 / Lv.14 / Lv.20（现状）\n')
    print(t)
    print('\n### 到满级为止, 点数来源\n')
    print(t2)
    print('\n### 成就奖励什么时候到手\n')
    print(t3)
    print('\n## 4. 每天对话轮数 N 的敏感度（天天用, 摸头 5, 番茄钟 0.5/天, 现状）\n')
    print(section_sweep())
    print('\n## 5. 每一级要几天（现状）\n')
    print(section_levels(res))
    print('\n## 6. 各成就的解锁日（日历日, 现状）\n')
    print(section_unlock_days(res))
    print('\n## 7. 调整方案对比（提案）\n')
    print(section_schemes())
    print('\n### 方案 C 下按 N 的敏感度\n')
    print(section_sweep(turn_cap=20, turn_tail=0.2))


if __name__ == '__main__':
    main()
