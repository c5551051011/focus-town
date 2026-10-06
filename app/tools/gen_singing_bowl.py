"""싱잉볼 소리 루프 생성: python3 tools/gen_singing_bowl.py → assets/music/singing-bowl.wav
직접 합성한 소리라 저작권 문제가 없다. 60초 루프에 두 개의 볼을 번갈아 15초 간격으로 울리고,
꼬리가 처음으로 이어지도록(원형으로) 합쳐서 반복해도 끊기지 않는다."""
import math, struct, wave

R = 22050
DUR = 60
N = R * DUR
# 싱잉볼의 배음은 정수배가 아니다. 살짝 어긋난 쌍(맥놀이)이 있어서 소리가 일렁인다.
PARTIALS = [  # (배율, 세기, 감쇠 시간 초, 맥놀이 Hz)
    (1.00, 1.00, 9.0, 0.45),
    (2.76, 0.55, 6.0, 0.80),
    (5.40, 0.28, 3.6, 1.30),
    (8.93, 0.12, 2.0, 1.90),
]

def strike(f0):
    out = [0.0] * N
    for ratio, amp, tau, beat in PARTIALS:
        f1, f2 = f0 * ratio, f0 * ratio + beat
        w1, w2 = 2 * math.pi * f1 / R, 2 * math.pi * f2 / R
        for i in range(N):
            t = i / R
            env = math.exp(-t / tau) * (1 - math.exp(-t / 0.03))  # 부드러운 시작 + 긴 감쇠
            if env < 1e-4:
                break
            out[i] += amp * env * (math.sin(w1 * i) + math.sin(w2 * i)) * 0.5
    return out

def place(dst, src, at):
    shift = int(at * R)
    for i, v in enumerate(src):
        if v == 0.0 and i > R * 40:
            continue
        dst[(i + shift) % N] += v  # 끝을 넘어가면 처음으로 이어 붙인다

mix = [0.0] * N
bowl_a, bowl_b = strike(196.0), strike(246.9)
for t, bowl in [(0, bowl_a), (15, bowl_b), (30, bowl_a), (45, bowl_b)]:
    place(mix, bowl, t)

peak = max(abs(v) for v in mix) or 1.0
w = wave.open('assets/music/singing-bowl.wav', 'wb')
w.setnchannels(1); w.setsampwidth(2); w.setframerate(R)
w.writeframes(b''.join(struct.pack('<h', int(32767 * 0.7 * v / peak)) for v in mix))
w.close()
print('ok')
