# 스토어 그래픽(Google Play 피처 그래픽 1024x500)을 다시 만든다.
# 사용: python3 app/tools/gen_store_graphics.py   (결과: store/graphics/play-feature-graphic-1024x500.png)
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
FONT = glob.glob(os.path.join(ROOT, 'app/node_modules/@expo-google-fonts/press-start-2p/400Regular/*.ttf'))[0]
SPRITES = os.path.join(ROOT, 'app/assets/pixel')
OUT = os.path.join(ROOT, 'store/graphics/play-feature-graphic-1024x500.png')

W, H = 1024, 500
BG, PINK, GOLD, SHADOW = (30, 28, 42), (255, 121, 198), (241, 250, 140), (15, 14, 23)
GRASS, GRASS_TOP = (56, 124, 70), (95, 184, 95)
GROUND_Y = 447

img = Image.new('RGB', (W, H), BG)
d = ImageDraw.Draw(img)
d.rectangle([0, GROUND_Y, W, H], fill=GRASS)
d.rectangle([0, GROUND_Y, W, GROUND_Y + 6], fill=GRASS_TOP)


def centered(text, size, color, y, shadow=6):
    f = ImageFont.truetype(FONT, size)
    w = d.textlength(text, font=f)
    x = (W - w) / 2
    d.text((x + shadow, y + shadow), text, font=f, fill=SHADOW)
    d.text((x, y), text, font=f, fill=color)


centered('TOWNY', 104, PINK, 40)
centered('BUILD A TOWN WHILE YOU FOCUS', 22, GOLD, 168, shadow=2)

for i, name in enumerate(['hut', 'house', 'tower', 'library', 'castle']):
    sp = Image.open(os.path.join(SPRITES, f'{name}.png')).convert('RGBA')
    bbox = sp.getbbox()
    sp = sp.resize((150, 150), Image.NEAREST)
    bottom = int(bbox[3] * 150 / 128)
    cx = 185 + i * 164
    img.paste(sp, (cx - 75, GROUND_Y + 3 - bottom), sp)

img.save(OUT)
print('saved', OUT)
