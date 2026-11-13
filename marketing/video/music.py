"""Original background tune, synthesized here: soft pad chords, a gentle pluck pattern and a quiet bass."""
import numpy as np, wave
SR, DUR, BPM = 48000, 39.2, 96
beat = 60 / BPM; bar = 4 * beat
n = int(SR * DUR); t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
def hz(m): return 440 * 2 ** ((m - 69) / 12)
# Cmaj7 - Am7 - Fmaj7 - G(add9): warm, neutral, no tension
chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 69]]
bass = [36, 33, 29, 31]
def add(sig, start, pan=0.5, gain=1.0):
    i = int(start * SR); j = min(n, i + len(sig))
    if i >= n: return
    L[i:j] += sig[: j - i] * gain * (1 - pan); R[i:j] += sig[: j - i] * gain * pan
def pad(m, length):
    x = np.arange(int(length * SR)) / SR; f = hz(m)
    s = np.sin(2*np.pi*f*x) + 0.5*np.sin(2*np.pi*f*1.003*x) + 0.25*np.sin(2*np.pi*2*f*x)
    env = np.minimum(1, x / 0.9) * np.minimum(1, (length - x) / 1.2)
    return s * np.clip(env, 0, 1)
def pluck(m, length=0.9):
    x = np.arange(int(length * SR)) / SR; f = hz(m)
    s = np.sin(2*np.pi*f*x) + 0.35*np.sin(2*np.pi*2*f*x)*np.exp(-x*9) + 0.12*np.sin(2*np.pi*3*f*x)*np.exp(-x*14)
    return s * np.exp(-x * 4.2) * np.minimum(1, x / 0.004)
def low(m, length):
    x = np.arange(int(length * SR)) / SR; f = hz(m)
    return np.sin(2*np.pi*f*x) * np.minimum(1, x/0.03) * np.exp(-x*0.9)
pattern = [0, 2, 1, 3, 2, 1, 3, 2]   # eighth notes through the chord tones
b = 0
while b * bar < DUR:
    c = chords[b % 4]; t0 = b * bar
    for k, m in enumerate(c): add(pad(m, bar + 1.0), t0, pan=0.3 + 0.13 * k, gain=0.05)
    add(low(bass[b % 4], bar), t0, gain=0.16)
    if b >= 1:                                   # plucks enter after one bar
        for e, idx in enumerate(pattern):
            add(pluck(c[idx] + 12), t0 + e * beat / 2, pan=0.35 if e % 2 else 0.65, gain=0.11 if e % 4 else 0.14)
    b += 1
def echo(x, d=0.3125, fb=0.32, mix=0.28):
    k = int(d * SR); y = x.copy()
    for i in range(1, 5): y[i*k:] += x[:-i*k] * (fb ** i) * mix / fb
    return y
L, R = echo(L), echo(R, d=0.3125 * 1.5)
env = np.minimum(1, t / 1.2) * np.minimum(1, (DUR - t) / 3.0)
st = np.stack([L, R], 1) * env[:, None]
st = st / np.abs(st).max() * 0.5
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ok', round(float(np.sqrt((st**2).mean())), 4))
