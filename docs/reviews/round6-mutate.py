#!/usr/bin/env python3
"""Round-6 mutation runner: for each mutation, copy the plugin, apply one text change to
hooks/register.tsx, run `claude plugin test`, and record which tests fail.
Usage: python3 -I mutate.py <plugin-src> <work-dir> [ids...]"""
import json, os, re, shutil, subprocess, sys

SRC, WORK = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])

M = [
  ('M01', 'P5-1: drop "is she really worried" from the comfort check',
   "if (!(await reallyWorried($, now)) || (await read($, moodComforted))) return false",
   "if ((await read($, moodComforted))) return false"),
  ('M02', 'rest: drop the 45-minute away condition from the reminder',
   " && !(lastHuman > 0 && now - lastHuman >= AWAY_MS)) {", ") {"),
  ('M03', 'rest: touched() no longer restarts the stretch after an absence',
   "  if (away && (await read($, workStart)) > 0) {", "  if (false && away && (await read($, workStart)) > 0) {"),
  ('M04', 'rest: a turn.start with an empty text also counts as the person',
   "if (e.text !== '') await touched($)", "await touched($)"),
  ('M05', 'rest: pat/poke no longer counts as the person (react)',
   "async function react($: any, kind: 'pat' | 'poke') {\n  await touched($)", "async function react($: any, kind: 'pat' | 'poke') {"),
  ('M06', 'sleep: she falls asleep although helpers are working',
   "if (m === 'idle' && !focusing && liveAgents.size === 0 && now - t", "if (m === 'idle' && !focusing && now - t"),
  ('M07', 'tools: a subagent\'s calls change her kind too',
   "if (!e.agentId) await noteKind($, kindOfTool(e.tool), await $.clock.now())", "await noteKind($, kindOfTool(e.tool), await $.clock.now())"),
  ('M08', 'tools: no 1.5 s hold', "const KIND_HOLD_MS = 1500", "const KIND_HOLD_MS = 0"),
  ('M09', 'watch: the open-call count is never lowered (no finally)',
   "      blockedCalls = Math.max(0, blockedCalls - 1)\n      await quietly(() => update($, blocked, () => blockedCalls > 0))",
   "      await quietly(async () => {})"),
  ('M10', 'watch: turn.start no longer clears blocked',
   "        blockedCalls = 0\n        await update($, blocked, () => false)\n      }\n      const ws",
   "      }\n      const ws"),
  ('M11', 'swarm: no half-minute reconcile', "if (liveAgents.size > 0) await quietly(() => reconcileAgents($, now))", ""),
  ('M12', 'swarm: no one-minute grace', "const AGENT_GRACE_MS = 60 * 1000", "const AGENT_GRACE_MS = 0"),
  ('M13', 'swarm: workflow agents reconciled like the others (no 3 h expiry)',
   "const gone = a.wf ? now - a.at > WF_AGENT_MAX_MS : running", "const gone = running"),
  ('M14', 'swarm: a resumed agent counts as a new one',
   "agentsMade: e.resume ? 0 : 1", "agentsMade: 1"),
  ('M15', 'watch: the "own call open" half of the condition removed',
   "((blockedNow && (m === 'work' || m === 'think')) || (na > 0 && m === 'idle'))", "((na > 0 && m === 'idle'))"),
  ('M16', 'watch: the "background agents" half of the condition removed',
   "((blockedNow && (m === 'work' || m === 'think')) || (na > 0 && m === 'idle'))", "((blockedNow && (m === 'work' || m === 'think')))"),
  ('M17', 'mood: the waiting state can take a mood',
   "fe === 0 && be === 0 && !waiting) {", "fe === 0 && be === 0) {"),
  ('M18', 'long run: the other parity', "runMs >= LONG_RUN_MS && slot % 2 === 0", "runMs >= LONG_RUN_MS && slot % 2 === 1"),
  ('M19', 'long run: threshold 30 min instead of 20', "const LONG_RUN_MS = 20 * 60 * 1000", "const LONG_RUN_MS = 30 * 60 * 1000"),
  ('M20', 'away: 30 min instead of 45', "const AWAY_MS = 45 * 60 * 1000", "const AWAY_MS = 30 * 60 * 1000"),
  ('M21', 'away: 60 min instead of 45', "const AWAY_MS = 45 * 60 * 1000", "const AWAY_MS = 60 * 60 * 1000"),
  ('M22', 'kinds: turn.complete no longer forgets the kind',
   "      await update($, turnStart, () => 0)\n      await update($, workKind, () => '' as WorkKind)", "      await update($, turnStart, () => 0)"),
  ('M23', 'swarm: a denied spawn still counts', "const id = r && !r.deny ? (r.agentId as string | undefined) : undefined", "const id = r ? (r.agentId as string | undefined) : undefined"),
  ('M24', 'fmtDur: hours never shown', "  if (m < 60) return `${m} 分钟`", "  return `${m} 分钟`"),
  ('M25', 'tools: Workflow is not an agent tool', "const AGENT_TOOLS = ['Agent', 'Task', 'Workflow', 'TaskOutput']", "const AGENT_TOOLS = ['Agent']"),
]

os.makedirs(WORK, exist_ok=True)
results = {}
for mid, desc, old, new in M:
    if ONLY and mid not in ONLY:
        continue
    d = os.path.join(WORK, mid)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    for x in ['.claude-plugin', 'hooks', 'assets', 'types']:
        shutil.copytree(os.path.join(SRC, x), os.path.join(d, x))
    shutil.copy(os.path.join(SRC, 'pet.test.ts'), d)
    p = os.path.join(d, 'hooks', 'register.tsx')
    s = open(p, encoding='utf-8').read()
    n = s.count(old)
    if n != 1:
        results[mid] = {'desc': desc, 'error': f'old text found {n} times'}
        print(mid, 'ERROR', n, flush=True)
        continue
    open(p, 'w', encoding='utf-8').write(s.replace(old, new))
    r = subprocess.run(['claude', 'plugin', 'test', d], capture_output=True, text=True, timeout=600)
    out = r.stdout + r.stderr
    fails = re.findall(r'^\(fail\) (.*?) \[', out, re.M)
    m = re.search(r'(\d+) pass\s+(\d+) fail', out)
    results[mid] = {'desc': desc, 'pass': int(m.group(1)) if m else None, 'fail': int(m.group(2)) if m else None, 'failing': fails}
    print(mid, results[mid]['pass'], results[mid]['fail'], fails[:4], flush=True)
    shutil.rmtree(d, ignore_errors=True)
json.dump(results, open(os.path.join(WORK, 'results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
