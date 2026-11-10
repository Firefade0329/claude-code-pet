"""Take only the eyes from the ChatGPT closed-eye pictures and paste them onto our own open-eye sprites, so everything
else (hair, hands, dress) stays pixel-identical and nothing shimmers when the two are swapped."""
from PIL import Image, ImageChops, ImageFilter
import os
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))      # this script lives in <project>/build; the pictures are in <project>/source
S = os.path.join(HERE, '..', 'source')
B = HERE


def prep(path):
    im = Image.open(path).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 4 else (255 if v >= 240 else v))
    im.putalpha(a)
    return im


def on_white(im):
    w = Image.new('RGBA', im.size, (255, 255, 255, 255))
    w.alpha_composite(im)
    return w.convert('RGB')


def shifted(im, dx, dy):
    c = Image.new('RGBA', im.size, (0, 0, 0, 0))
    c.paste(im, (dx, dy))
    return c


def best_shift(o, g, box):
    """small translation of g that best matches o inside the face box, ignoring the eyes themselves (robust: use median-ish via threshold)"""
    ow = on_white(o).crop(box).convert('L')
    best = None
    for dx in range(-8, 9):
        for dy in range(-8, 9):
            gw = on_white(shifted(g, dx, dy)).crop(box).convert('L')
            d = ImageChops.difference(ow, gw).point(lambda v: 255 if v > 50 else 0)
            score = sum(d.histogram()[1:])
            if best is None or score < best[0]:
                best = (score, dx, dy)
    return best[1], best[2]


def components(mask, minarea):
    w, h = mask.size
    px = mask.load()
    seen = [[False] * w for _ in range(h)]
    keep = Image.new('L', mask.size, 0)
    kp = keep.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] and not seen[y][x]:
                q = deque([(x, y)]); seen[y][x] = True; cells = []
                while q:
                    cx, cy = q.popleft(); cells.append((cx, cy))
                    for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny][nx]:
                            seen[ny][nx] = True; q.append((nx, ny))
                if len(cells) >= minarea:
                    for cx, cy in cells: kp[cx, cy] = 255
    return keep


def run(name, face_box):
    o = prep(os.path.join(S, name + '.webp'))
    g = prep(os.path.join(S, name + '_gpt.webp'))
    # coarse scale/offset from the bounding boxes, then a small search on the face
    bb = lambda im: im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    bo, bg = bb(o), bb(g)
    s = ((bo[2] - bo[0]) / (bg[2] - bg[0]) + (bo[3] - bo[1]) / (bg[3] - bg[1])) / 2
    gs = g.resize((round(g.size[0] * s), round(g.size[1] * s)), Image.LANCZOS)
    g2 = Image.new('RGBA', o.size, (0, 0, 0, 0))
    g2.paste(gs, (round(bo[0] - bg[0] * s), round(bo[1] - bg[1] * s)))
    dx, dy = best_shift(o, g2, face_box)
    g2 = shifted(g2, dx, dy)
    # where do the two faces really differ? (the eyes: big blobs; hair-edge jitter: thin lines, removed by opening)
    d = ImageChops.difference(on_white(o), on_white(g2)).convert('L').point(lambda v: 255 if v > 22 else 0)
    d = d.crop(face_box)
    d = d.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MaxFilter(5))
    d = components(d, 1500)
    full = Image.new('L', o.size, 0)
    full.paste(d, face_box[:2])
    full = full.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(3.5))     # grow a little and feather
    out = o.copy()
    out.paste(g2, (0, 0), full)
    out.save(os.path.join(S, name + '_blink_gpt.webp'), 'WEBP', quality=95, method=6)
    print(name, 'shift', (dx, dy), 'scale %.4f' % s, 'mask pixels', sum(1 for v in full.getdata() if v > 128))
    return o, out, full


if __name__ == '__main__':
    boxes = {'idle': (380, 300, 900, 640), 'work': (380, 330, 900, 660), 'wait': (380, 300, 900, 640), 'think': (380, 260, 900, 620)}
    tiles = []
    for n, bx in boxes.items():
        o, out, full = run(n, bx)
        pair = []
        for im in (o, out):
            pair.append(on_white(im).crop((330, 230, 930, 830)).resize((380, 380), Image.LANCZOS))
        t = Image.new('RGB', (770, 380), (255, 255, 255))
        t.paste(pair[0], (0, 0)); t.paste(pair[1], (390, 0))
        tiles.append(t)
    sheet = Image.new('RGB', (770, 390 * len(tiles)), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, (0, 390 * i))
    sheet.save(os.path.join(B, 'transplant_preview.png'))

