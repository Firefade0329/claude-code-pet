#!/usr/bin/env python3
"""桌宠好感度模型 v2 的独立复核模拟（v0.5.0；只用标准库，不联网）。

用法:
    python3 -I affection_sim_v2.py            # 打印全部表格（Markdown）
    python3 -I affection_sim_v2.py --check    # 只核对本脚本里的常量与 hooks/register.tsx 是否一致

规则来自 hooks/register.tsx（v0.5.0）:
    升级门槛   THRESH 数组（Lv.7 = 250, Lv.14 = 1000, Lv.20 = 1975）
    对话       当天第 n 轮: n<=10 → 1 点, n<=30 → 0.5, n<=80 → 0.1, 之后 0（每天最多 25）
    摸头       每天前 5 次 +1
    番茄钟     每天前 4 个 +2
    完整休息   每天前 4 次 +1（只有番茄钟结束后的休息才计）
    每日签到   3 + min(连续天数-1, 5); 周一接在周五之后也算连续
    成就奖励   Math.round(原奖励 * 1.3)
用户行为（每天几轮、出错率……）是假设，不是代码里的事实，集中在 PROFILES 和 RATES。
"""
import math, os, re, sys
from dataclasses import dataclass, field

MAX_LEVEL = 20
THRESH = [0, 10, 35, 72, 121, 180, 250, 330, 419, 517, 625, 741, 866, 1000, 1142, 1292, 1451, 1618, 1792, 1975]
PATS_PER_DAY, FOCUS_PAID, REST_PAID = 5, 4, 4
REWARD_SCALE = 1.3
EXCITED_TURNS = 30
rhu = lambda x: int(math.floor(x + 0.5))        # JS Math.round（正数）


def turn_points(n):
    return 1 if n <= 10 else 0.5 if n <= 30 else 0.1 if n <= 80 else 0


def level_of(n):
    l = 1
    for i in range(1, len(THRESH)):
        if n >= THRESH[i]:
            l = i + 1
    return l


# id, 原始奖励 rw, 目标 goal, 隐藏
RAW = [
    ('first', 2, 1, 0), ('t100', 3, 100, 0), ('t500', 5, 500, 0), ('t1000', 8, 1000, 0), ('t3000', 12, 3000, 0), ('day50', 5, 50, 0),
    ('busy10', 4, 10, 0), ('tool1k', 4, 1000, 0), ('tool5k', 8, 5000, 0),
    ('str3', 3, 3, 0), ('str7', 5, 7, 0), ('str14', 6, 14, 0), ('str30', 10, 30, 0), ('str100', 20, 100, 0),
    ('lv5', 3, 5, 0), ('lv7', 4, 7, 0), ('lv10', 5, 10, 0), ('lv14', 6, 14, 0), ('lv20', 0, 20, 0),
    ('pat50', 3, 50, 0), ('pat200', 6, 200, 0), ('pat500', 10, 500, 0), ('poke50', 3, 50, 0),
    ('foc1', 2, 1, 0), ('foc10', 5, 10, 0), ('foc50', 10, 50, 0), ('brk1', 2, 1, 0), ('brk10', 6, 10, 0),
    ('owl', 3, 1, 0), ('long', 4, 10, 0), ('long30', 8, 30, 0), ('cmp1', 2, 1, 0), ('cmp10', 6, 10, 0), ('recover', 4, 10, 0),
    ('peak', 5, 1, 0), ('err10', 4, 10, 0),
    ('wake', 5, 10, 1), ('burst', 5, 1, 1), ('ignore', 5, 5, 1), ('comfort', 4, 5, 1), ('all', 10, 0, 1),
]
ACHS = [(i, rhu(rw * REWARD_SCALE), g, h) for i, rw, g, h in RAW]
assert len(ACHS) == 41 and sum(a[3] for a in ACHS) == 5
NON_HIDDEN = [a[0] for a in ACHS if not a[3]]

RATES = dict(tools_per_turn=6.0, error_per_turn=0.02, night_per_turn=0.01, compact_per_turn=1 / 200, long10_per_turn=0.003,
             long30_per_turn=0.0005, break_done_per_pomodoro=0.5, recover_per_error=0.8, comfort_per_error=0.1)


@dataclass
class Profile:
    name: str
    turns: int
    pats: int = 5
    pomodoros: float = 0.0
    week: tuple = (1,) * 7          # 第 0 天是星期一
    pokes: float = 2.0
    wakes: float = 0.3
    bursts: float = 0.02
    ignored: float = 0.0
    peak5h: float = 0.0
    short: str = ''


EVERY, WEEKDAYS, FOUR_DAYS = (1,) * 7, (1, 1, 1, 1, 1, 0, 0), (1, 1, 0, 1, 1, 0, 0)
EVERY_OTHER = (1, 0, 1, 0, 1, 0, 0)
PROFILES = [
    Profile('轻度（5 轮/天, 摸头 3, 每周 4 天, 无番茄钟）', 5, 3, 0, FOUR_DAYS, 1, 0.1, 0.01, 0, 0, '轻度'),
    Profile('普通（15 轮/天, 摸头 5, 工作日, 番茄钟 0.3/天）', 15, 5, 0.3, WEEKDAYS, 2, 0.3, 0.02, 0.2, 0.005, '普通·工作日'),
    Profile('认真（30 轮/天, 摸头 5, 天天用, 无番茄钟）', 30, 5, 0, EVERY, 3, 0.3, 0.02, 0.5, 0.01, '认真'),
    Profile('认真+番茄钟（同上, 番茄钟 0.5/天）', 30, 5, 0.5, EVERY, 3, 0.3, 0.02, 0.5, 0.01, '认真+番茄'),
    Profile('认真·工作日（30 轮/天, 摸头 5, 周一到周五）', 30, 5, 0, WEEKDAYS, 3, 0.3, 0.02, 0.5, 0.01, '认真·工作日'),
    Profile('重度（100 轮/天, 摸头 5, 天天用, 无番茄钟）', 100, 5, 0, EVERY, 3, 0.3, 0.02, 3.0, 0.05, '重度'),
    Profile('重度+番茄钟（同上, 番茄钟 3/天）', 100, 5, 3.0, EVERY, 3, 0.3, 0.02, 3.0, 0.05, '重度+番茄'),
]


@dataclass
class Result:
    name: str
    day_lv: dict = field(default_factory=dict)
    unlock_day: dict = field(default_factory=dict)
    income: dict = field(default_factory=dict)
    reward_before_max: float = 0
    n_ach_at_max: int = 0
    days_run: int = 0
    max_streak: int = 0
    aff_by_day: dict = field(default_factory=dict)      # 日历日 -> 当天结束时的累计点数（用来和真实插件逐日对照）


def simulate(p: Profile, max_days=2500, stop_at_max=False, weekend_rule=True) -> Result:
    R = Result(p.name)
    aff = 0.0
    S = dict(turns=0.0, tools=0.0, pats=0.0, focus=0.0, night=0.0, pokes=0.0, compacts=0.0, breaks=0.0, errors=0.0, wakes=0.0,
             bursts=0.0, ignored=0.0, peak=0.0, long10=0.0, long30=0.0, recoveries=0.0, busyDays=0.0, comforts=0.0)
    inc = dict(签到=0.0, 对话=0.0, 摸头=0.0, 番茄钟=0.0, 休息=0.0, 成就=0.0)
    have, st = set(), dict(last=None, n=0, mx=0, today_turns=0, day=0)
    maxed = [False]

    def cur(aid, lvl):
        if aid in ('first', 't100', 't500', 't1000', 't3000'): return S['turns']
        if aid == 'day50': return st['today_turns']
        if aid == 'busy10': return S['busyDays']
        if aid in ('tool1k', 'tool5k'): return S['tools']
        if aid.startswith('str'): return st['mx']
        if aid.startswith('lv'): return lvl
        if aid.startswith('pat'): return S['pats']
        if aid == 'poke50': return S['pokes']
        if aid.startswith('foc'): return S['focus']
        if aid.startswith('brk'): return S['breaks']
        if aid == 'owl': return S['night']
        if aid == 'long': return 10 if S['long10'] >= 1 or S['long30'] >= 1 else 0
        if aid == 'long30': return 30 if S['long30'] >= 1 else 0
        if aid.startswith('cmp'): return S['compacts']
        if aid == 'recover': return S['recoveries']
        if aid == 'peak': return S['peak']
        if aid == 'err10': return S['errors']
        if aid == 'wake': return S['wakes']
        if aid == 'burst': return S['bursts']
        if aid == 'ignore': return S['ignored']
        if aid == 'comfort': return S['comforts']
        if aid == 'all': return sum(1 for x in NON_HIDDEN if x in have) - len(NON_HIDDEN)
        raise KeyError(aid)

    goals = {i: g for i, _, g, _ in RAW}

    def check():
        lvl = level_of(aff)
        fresh = []
        for _ in range(5):
            new = [a for a in ACHS if a[0] not in have and cur(a[0], lvl) >= goals[a[0]]]
            if not new: break
            fresh += new
            for a in new: have.add(a[0])
        for a in fresh: R.unlock_day[a[0]] = st['day']
        r = sum(a[1] for a in fresh)
        if r > 0: add(r, '成就')

    def add(n, src, chk=True):
        nonlocal aff
        before = aff
        aff = round((aff + n) * 10) / 10
        inc[src] += n
        for L in range(level_of(before) + 1, level_of(aff) + 1): R.day_lv.setdefault(L, st['day'])
        if level_of(aff) >= MAX_LEVEL and not maxed[0]:
            maxed[0] = True
            R.income = dict(inc); R.reward_before_max = inc['成就']; R.n_ach_at_max = len(have)
        if chk: check()

    pom_acc = rest_acc = 0.0
    for d in range(max_days):
        if not p.week[d % 7]: continue
        st['day'] = d + 1
        wd = d % 7
        cont = st['last'] is not None and (d - st['last'] == 1 or (weekend_rule and wd == 0 and d - st['last'] == 3))
        st['n'] = st['n'] + 1 if cont else 1
        st['last'] = d
        st['mx'] = max(st['mx'], st['n'])
        add(3 + min(st['n'] - 1, 5), '签到')
        st['today_turns'] = 0
        for i in range(1, p.turns + 1):
            st['today_turns'] = i
            S['turns'] += 1
            S['tools'] += RATES['tools_per_turn']; S['night'] += RATES['night_per_turn']
            S['errors'] += RATES['error_per_turn']; S['compacts'] += RATES['compact_per_turn']
            S['long10'] += RATES['long10_per_turn']; S['long30'] += RATES['long30_per_turn']
            S['recoveries'] += RATES['error_per_turn'] * RATES['recover_per_error']
            S['comforts'] += RATES['error_per_turn'] * RATES['comfort_per_error']
            if i == EXCITED_TURNS: S['busyDays'] += 1
            pay = turn_points(i)
            if pay > 0: add(pay, '对话')
            else: check()
        for i in range(p.pats):
            S['pats'] += 1
            if i < PATS_PER_DAY: add(1, '摸头')
            else: check()
        pom_acc += p.pomodoros
        f_today = r_today = 0
        while pom_acc >= 1 - 1e-9:
            pom_acc -= 1; f_today += 1; S['focus'] += 1
            if f_today <= FOCUS_PAID: add(2, '番茄钟')
            else: check()
            rest_acc += RATES['break_done_per_pomodoro']
            if rest_acc >= 1 - 1e-9:
                rest_acc -= 1; r_today += 1; S['breaks'] += 1
                if r_today <= REST_PAID: add(1, '休息')
                else: check()
        S['pokes'] += p.pokes; S['wakes'] += p.wakes; S['bursts'] += p.bursts; S['ignored'] += p.ignored; S['peak'] += p.peak5h
        check()
        R.aff_by_day[st['day']] = aff
        if maxed[0] and (stop_at_max or len(have) == len(ACHS)): break
    R.days_run = st['day']; R.max_streak = st['mx']
    return R


def md(head, rows):
    return '\n'.join(['| ' + ' | '.join(head) + ' |', '|' + '|'.join('---' for _ in head) + '|'] + ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows])


def check_against_source(path):
    src = open(path, encoding='utf-8-sig').read()
    bad = 0
    m = re.search(r'const THRESH: number\[\] = \[([^\]]*)\]', src)
    if not m or [int(x) for x in m[1].split(',')] != THRESH: print('THRESH 不一致'); bad += 1
    rows = re.findall(r"^  A\('(\w+)', '\w+', '[^']*', '[^']*', (\d+), (\d+), .*?(, true)?\),$", src, re.M)
    mine = {i: (rw, g, h) for i, rw, g, h in RAW}
    if len(rows) != len(RAW): print('成就条数不一致', len(rows), len(RAW)); bad += 1
    for i, rw, g, h in rows:
        if mine.get(i) != (int(rw), int(g), 1 if h else 0): print('成就不一致', i); bad += 1
    for pat, what in ((r'const turnPoints = \(n: number\) => \(n <= 10 \? 1 : n <= 30 \? 0\.5 : n <= 80 \? 0\.1 : 0\)', '对话分段'),
                      (r'const FOCUS_PAID_PER_DAY = 4', '番茄钟每天 4'), (r'const REST_PAID_PER_DAY = 4', '休息每天 4'),
                      (r'const REWARD_SCALE = 1\.3', '奖励 ×1.3'), (r'const PATS_PER_DAY = 5', '摸头 5'),
                      (r'addAffection\(\$, 3 \+ Math\.min\(n - 1, 5\)\)', '签到'), (r'if \(day\.focus <= FOCUS_PAID_PER_DAY\) await addAffection\(\$, 2\)', '番茄钟 +2'),
                      (r'if \(day\.rests <= REST_PAID_PER_DAY\) await addAffection\(\$, 1\)', '休息 +1'),
                      (r'busyDays: day\.turns === EXCITED_TURNS \? 1 : 0', 'busyDays'), (r'const EXCITED_TURNS = 30', '30 轮')):
        if not re.search(pat, src): print('找不到:', what); bad += 1
    print('与源码核对:', '全部一致' if bad == 0 else f'{bad} 处不一致')
    return bad


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    src = os.path.join(here, '..', '..', 'hooks', 'register.tsx')
    if '--check' in sys.argv: sys.exit(1 if check_against_source(src) else 0)
    if os.path.exists(src): check_against_source(src)
    tot = sum(a[1] for a in ACHS)
    print(f'## 成就奖励（×1.3 取整后）\n\n- 41 个成就合计 {tot} 点，占满级所需 {THRESH[-1]} 点的 {100 * tot / THRESH[-1]:.1f}%（原奖励合计 {sum(r[1] for r in RAW)} 点）。')
    print(f'- 三个新成就（busy10 / recover / comfort）合计 {sum(a[1] for a in ACHS if a[0] in ("busy10","recover","comfort"))} 点。\n')
    res = [simulate(p) for p in PROFILES]
    print('## 各画像到 Lv.7 / Lv.14 / Lv.20 的天数（日历日，第 1 天 = 首次使用）\n')
    print(md(['画像', 'Lv.7', 'Lv.14', 'Lv.20', '满级时已解锁成就', '点数来源（到满级为止）'],
             [(p.name, r.day_lv.get(7), r.day_lv.get(14), r.day_lv.get(20), f'{r.n_ach_at_max}/41',
               ' '.join(f'{k}{v:.0f}' for k, v in r.income.items())) for p, r in zip(PROFILES, res)]))
    print('\n## 每天对话轮数 N 的敏感度（天天用，摸头 5，无番茄钟）\n')
    rows = []
    for n in (1, 5, 10, 15, 20, 30, 50, 80, 100, 200, 500):
        r = simulate(Profile(f'N={n}', n, 5, 0, EVERY, ignored=0.5 if n >= 20 else 0, peak5h=0.01), stop_at_max=True)
        rows.append((n, r.day_lv.get(7), r.day_lv.get(14), r.day_lv.get(20)))
    print(md(['每天轮数 N', 'Lv.7', 'Lv.14', 'Lv.20'], rows))
    print('\n## 周末规则的作用（只用工作日 / 隔天用 / 周一到周六用）\n')
    rows = []
    for name, wk in (('周一到周五', WEEKDAYS), ('周一到周六', (1, 1, 1, 1, 1, 1, 0)), ('周二、周四、周六、周日', (0, 1, 0, 1, 0, 1, 1)), ('天天', EVERY), ('隔天', EVERY_OTHER)):
        a = simulate(Profile(name, 30, 5, 0, wk), stop_at_max=True); b = simulate(Profile(name, 30, 5, 0, wk), stop_at_max=True, weekend_rule=False)
        rows.append((name, a.max_streak, f'{a.day_lv.get(7)}/{a.day_lv.get(14)}/{a.day_lv.get(20)}', b.max_streak, f'{b.day_lv.get(7)}/{b.day_lv.get(14)}/{b.day_lv.get(20)}'))
    print(md(['使用日', '最长连续（现规则）', 'Lv.7/14/20 天数（现规则）', '最长连续（若无周末规则）', '（若无周末规则）'], rows))


if __name__ == '__main__':
    main()
