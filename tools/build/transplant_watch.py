import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import transplant as t
from PIL import Image, ImageChops, ImageDraw

T = sys.argv[1]
t.S = T
t.B = T
FACE = (380, 300, 900, 570)
# only the two eyes may change: the bangs and the earring of GPT's closed-eye picture are not in quite the same place as in the open one
ZONES = [(455, 395, 635, 525), (640, 365, 835, 495)]
orig = t.components


def only_eyes(mask, minarea):
    z = Image.new('L', mask.size, 0)
    dr = ImageDraw.Draw(z)
    for x0, y0, x1, y1 in ZONES:
        dr.rectangle((x0 - FACE[0], y0 - FACE[1], x1 - FACE[0], y1 - FACE[1]), fill=255)
    return orig(ImageChops.multiply(mask, z), minarea)


t.components = only_eyes
o, out, full = t.run('watch', FACE)
out.save(os.path.join(T, 'watch_blink.webp'), 'WEBP', quality=95, method=6)
ow = t.on_white(o)
bw = t.on_white(out)
d = ImageChops.difference(ow, bw).convert('L').point(lambda v: 255 if v > 30 else 0)
print('diff bbox', d.getbbox())
big = Image.new('RGB', (1080, 570), (255, 255, 255))
big.paste(ow.crop((380, 300, 920, 585)).resize((540, 285)), (0, 0))
big.paste(bw.crop((380, 300, 920, 585)).resize((540, 285)), (540, 0))
dd = d.crop((380, 300, 920, 585)).convert('RGB')
big.paste(dd.resize((540, 285)), (0, 285))
big.save(os.path.join(T, 'diff2.png'))
pair = [im.crop((330, 230, 930, 830)).resize((380, 380), Image.LANCZOS) for im in (ow, bw)]
tile = Image.new('RGB', (770, 380), (255, 255, 255))
tile.paste(pair[0], (0, 0))
tile.paste(pair[1], (390, 0))
tile.save(os.path.join(T, 'preview2.png'))
print('done')
