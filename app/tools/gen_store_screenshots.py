# 아이폰에서 찍은 화면(screenshots/*.PNG)을 App Store 6.9형 규격(1290x2796)으로 가공한다.
# 위쪽에 캡션을 넣고, 그 아래에 둥근 모서리의 화면을 놓는다.
# 사용: python3 app/tools/gen_store_screenshots.py   (결과: store/screenshots/appstore-6.9/*.png)
#       IPAD=1 python3 app/tools/gen_store_screenshots.py   (iPad 13형 2064x2752)
import glob
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
FONT = glob.glob(os.path.join(ROOT, 'app/node_modules/@expo-google-fonts/press-start-2p/400Regular/*.ttf'))[0]
RAW = os.path.join(ROOT, 'screenshots')
# IPAD=1 python3 app/tools/gen_store_screenshots.py  → iPad 13형(2064x2752), 결과: store/screenshots/appstore-ipad-13
IPAD = os.environ.get('IPAD') == '1'
OUT = os.path.join(ROOT, 'store/screenshots/appstore-ipad-13' if IPAD else 'store/screenshots/appstore-6.9')
os.makedirs(OUT, exist_ok=True)

W, H = (2064, 2752) if IPAD else (1290, 2796)
PW = 1050 if IPAD else 1070  # 화면(폰 캡처)을 놓는 너비
BG, PINK, GOLD, SHADOW, LINE = (30, 28, 42), (255, 121, 198), (241, 250, 140), (15, 14, 23), (55, 51, 92)

# (원본 파일, 출력 이름, 캡션 두 줄). 새 빌드로 다시 찍은 화면은 아래에 추가한다.
SHOTS = [
    ('IMG_3792.PNG', '1-focus-session', ['BUILD WHILE', 'YOU FOCUS']),
    ('IMG_3798.PNG', '2-my-town', ['BUILD YOUR OWN', 'PIXEL TOWN']),
    ('IMG_3799.PNG', '3-stats', ['KEEP YOUR', 'STREAK ALIVE']),
    ('IMG_3801.PNG', '4-history', ['SEE EVERY', 'FOCUSED DAY']),
    ('IMG_3802.PNG', '5-profile', ['MAKE YOUR', 'CHARACTER']),
]


def caption(d, lines):
    f = ImageFont.truetype(FONT, 66)
    y = 120
    for i, line in enumerate(lines):
        w = d.textlength(line, font=f)
        x = (W - w) / 2
        color = PINK if i == 0 else GOLD
        d.text((x + 6, y + 6), line, font=f, fill=SHADOW)
        d.text((x, y), line, font=f, fill=color)
        y += 110


def build(src, name, lines):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    caption(d, lines)
    shot = Image.open(os.path.join(RAW, src)).convert('RGB')
    pw = PW
    ph = round(shot.height * pw / shot.width)
    shot = shot.resize((pw, ph), Image.LANCZOS)
    x, y = (W - pw) // 2, H - ph - 56
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw, ph], radius=70, fill=255)
    d.rounded_rectangle([x - 6, y - 6, x + pw + 6, y + ph + 6], radius=76, fill=LINE)
    img.paste(shot, (x, y), mask)
    path = os.path.join(OUT, f'{name}.png')
    img.save(path)
    print('saved', os.path.relpath(path, ROOT))


for src, name, lines in SHOTS:
    build(src, name, lines)
