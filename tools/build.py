"""Build the pet plugin: sprites (base64 WebP) are embedded into register.tsx.
Blinking does not need a second full picture: only the small area that really changes is embedded as a patch.
usage: python build.py <target plugin folder>"""
import base64, io, json, os, sys
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = sys.argv[1]
H = 220
QUALITY = 80
STATES = ['idle', 'work', 'think', 'wait', 'done', 'sleep', 'worry', 'greet', 'shy', 'surprised', 'proud', 'heart', 'long', 'rest', 'focus', 'up0', 'up1', 'up2', 'start', 'giveup', 'compact', 'sleepy', 'read', 'search', 'web', 'watch']
BLINKS = ['idle', 'work', 'wait', 'think', 'proud', 'rest', 'focus', 'worry', 'compact', 'sleepy', 'read', 'search', 'web', 'watch']
B = os.path.join(HERE, 'build')


def webp(im, q=QUALITY):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return base64.b64encode(b.getvalue()).decode()


src = open(os.path.join(HERE, 'src', 'register.template.tsx'), encoding='utf-8').read()
os.makedirs(os.path.join(TARGET, 'assets'), exist_ok=True)
for n in STATES:
    f = Image.open(os.path.join(B, n + '_full.png'))
    w = round(f.size[0] * H / f.size[1])
    f.resize((w, H), Image.LANCZOS).save(os.path.join(TARGET, 'assets', n + '.webp'), 'WEBP', quality=QUALITY, method=6)
# the little helpers of the swarm: four small creatures drawn side by side on one transparent sheet (source/helpers.webp: keyboard,
# book, magnifier, tablet), cut apart at the empty columns, feet on a common line, 64 px high
sheet = Image.open(os.path.join(HERE, 'source', 'helpers.webp')).convert('RGBA')
alpha = sheet.getchannel('A').point(lambda v: 255 if v > 8 else 0)
runs, start = [], None
for x in range(sheet.size[0]):
    filled = alpha.crop((x, 0, x + 1, sheet.size[1])).getbbox() is not None
    if filled and start is None:
        start = x
    if not filled and start is not None:
        runs.append((start, x))
        start = None
if start is not None:
    runs.append((start, sheet.size[0]))
assert len(runs) == 4, 'the helper sheet should hold four creatures, found %d' % len(runs)
parts = []
for x0, x1 in runs:
    piece = sheet.crop((x0, 0, x1, sheet.size[1]))
    parts.append(piece.crop(piece.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()))
cw, ch = max(p.size[0] for p in parts) + 4, max(p.size[1] for p in parts)      # (two transparent columns on each side: nothing is cut off at the edge)
for n, piece in zip(('work', 'read', 'search', 'web'), parts):
    c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    c.alpha_composite(piece, ((cw - piece.size[0]) // 2, ch - piece.size[1]))
    w = round(cw * 64 / ch)
    c.resize((w, 64), Image.LANCZOS).save(os.path.join(TARGET, 'assets', 'mini_' + n + '.webp'), 'WEBP', quality=QUALITY, method=6)

# blink patches: the box (on the 201x220 picture) where the closed-eye version differs from the open one
for n in BLINKS:
    o = Image.open(os.path.join(B, n + '_full.png')).convert('RGBA')
    c = Image.open(os.path.join(B, n + '_blink_full.png')).convert('RGBA')
    d = ImageChops.difference(o, c)
    m = d.convert('L').point(lambda v: 255 if v > 30 else 0)      # (lossy re-encoding leaves small noise everywhere; the eyes differ by much more)
    x0, y0, x1, y1 = m.getbbox()
    pad = 10
    box = (max(0, x0 - pad), max(0, y0 - pad), min(o.size[0], x1 + pad), min(o.size[1], y1 + pad))
    k = H / o.size[1]                       # full-size pixels -> viewBox units
    s2 = 2 * k                              # the patch is kept at twice the display resolution
    patch = c.crop(box)
    patch = patch.resize((max(1, round(patch.size[0] * s2)), max(1, round(patch.size[1] * s2))), Image.LANCZOS)
    src = src.replace('@@%s_blink@@' % n, webp(patch, 85))
    src = src.replace('@@%s_blink_box@@' % n, '%.2f, %.2f, %.2f, %.2f' % (box[0] * k, box[1] * k, (box[2] - box[0]) * k, (box[3] - box[1]) * k))

import datetime
VERSION = '0.6.1'
src = src.replace('@@version@@', VERSION).replace('@@build@@', datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))
assert '@@' not in src, 'unreplaced placeholder'

os.makedirs(os.path.join(TARGET, '.claude-plugin'), exist_ok=True)
os.makedirs(os.path.join(TARGET, 'hooks'), exist_ok=True)
os.makedirs(os.path.join(TARGET, 'types'), exist_ok=True)
json.dump({'name': 'pet', 'version': VERSION, 'description': 'Maid mascot in the prompt band: reacts to Claude state, shows CTX/5H/7D usage, keeps an affection counter.', 'types': './types/index.d.ts', 'author': {'name': 'Firefade0329'}, 'license': 'MIT', 'repository': 'https://github.com/Firefade0329/claude-code-pet'},
          open(os.path.join(TARGET, '.claude-plugin', 'plugin.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump({'modules': ['./register.tsx']}, open(os.path.join(TARGET, 'hooks', 'hooks.json'), 'w'), indent=2)
open(os.path.join(TARGET, 'hooks', 'register.tsx'), 'w', encoding='utf-8').write(src)
open(os.path.join(TARGET, 'types', 'index.d.ts'), 'w', encoding='utf-8').write(open(os.path.join(HERE, 'src', 'index.d.ts'), encoding='utf-8').read())
print('built', TARGET, 'register.tsx', len(src), 'chars')

