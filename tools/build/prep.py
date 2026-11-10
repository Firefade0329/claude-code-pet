from PIL import Image
import os
HERE = os.path.dirname(os.path.abspath(__file__))      # this script lives in <project>/build; the pictures are in <project>/source
SRC = os.path.join(HERE, '..', 'source')
OUT = HERE
states = ['idle', 'work', 'wait', 'done', 'sleep', 'surprised', 'shy', 'greet', 'worry', 'think', 'idle_blink', 'work_blink', 'wait_blink', 'think_blink', 'proud', 'heart', 'long', 'rest', 'focus', 'proud_blink', 'rest_blink', 'focus_blink', 'worry_blink', 'up0', 'up1', 'up2', 'start', 'giveup', 'compact', 'compact_blink', 'sleepy', 'sleepy_blink', 'read', 'read_blink', 'search', 'search_blink', 'web', 'web_blink', 'watch', 'watch_blink']
ims = {}
boxes = {}
for n in states:
    im = Image.open(os.path.join(SRC, n + '.webp')).convert('RGBA')
    # inside alpha is 253-254 (not quite opaque): make it fully opaque, keep soft edges
    a = im.getchannel('A').point(lambda v: 0 if v < 4 else (255 if v >= 240 else v))
    im.putalpha(a)
    ims[n] = im
    boxes[n] = a.point(lambda v: 255 if v > 8 else 0).getbbox()
# one common scale + common feet line so the character keeps its size when the state changes
bottom = max(b[3] for b in boxes.values())
top = min(b[1] for b in boxes.values())
left = min(b[0] for b in boxes.values()); right = max(b[2] for b in boxes.values())
print('common box', left, top, right, bottom)
canvas_w = right - left; canvas_h = bottom - top
for n in states:
    c = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    bx = boxes[n]
    # feet on the common bottom, horizontally centred on the common canvas
    ox = (canvas_w - (bx[2] - bx[0])) // 2
    oy = canvas_h - (bx[3] - top)
    c.alpha_composite(ims[n].crop(bx), (ox, oy))
    c.save(os.path.join(OUT, n + '_full.png'))
print('canvas', canvas_w, canvas_h)
# readability preview: each state at 3 display heights on a dark and a light background
H_LIST = [72, 110, 160]
sheet = Image.new('RGB', (5 * 190, 2 * 3 * 0 + 360 + 190 + 110), (0, 0, 0))
sheet = Image.new('RGB', (5 * 180, 2 * 200), (0, 0, 0))
for bg_i, bg in enumerate([(30, 30, 32), (245, 243, 238)]):
    for i, n in enumerate(states):
        f = Image.open(os.path.join(OUT, n + '_full.png'))
        s = 160 / f.size[1]
        sm = f.resize((max(1, round(f.size[0] * s)), 160), Image.LANCZOS)
        tile = Image.new('RGB', (180, 200), bg)
        tile.paste(sm, ((180 - sm.size[0]) // 2, 20), sm)
        sheet.paste(tile, (i * 180, bg_i * 200))
sheet.save(os.path.join(OUT, 'preview160.png'))
# very small: 72 px high, dark bg only
sheet2 = Image.new('RGB', (5 * 100, 100), (30, 30, 32))
for i, n in enumerate(states):
    f = Image.open(os.path.join(OUT, n + '_full.png'))
    s = 72 / f.size[1]
    sm = f.resize((max(1, round(f.size[0] * s)), 72), Image.LANCZOS)
    sheet2.paste(sm, (i * 100 + (100 - sm.size[0]) // 2, 14), sm)
sheet2.save(os.path.join(OUT, 'preview72.png'))

