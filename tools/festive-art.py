#!/usr/bin/env python3
"""Draws the holiday art for the email library (2026-11-14, Samantha: "could you make them more festive? ... visually").

Custom drawings, no stock art and no emoji. For each holiday it writes two pictures:
  <theme>-top.png   the band across the top of the email, 1200 x 160 (shown 600 wide)
  <theme>-sprig.png the small ornament under the heading, 480 x 80 (shown 240 wide), on the holiday's tint

  python3 tools/festive-art.py <out folder>            writes the .svg files
  python3 tools/festive-art.py <out folder> --png      also makes the .png files with Google Chrome (headless)

The pictures live on the website (email-assets/festive/) because a mail program can only show a picture from the web.
The same seed is used every time, so running it again draws the same pictures.
"""
import math, os, random, subprocess, sys

W, H = 1200, 160


def rot(inner, x, y, deg=0, s=1.0):
    return '<g transform="translate(%.1f %.1f) rotate(%.1f) scale(%.3f)">%s</g>' % (x, y, deg, s, inner)


# ---- motifs, each drawn around (0,0), roughly 40 units tall ----------------------------------------------------
def leaf(fill, vein):
    return ('<path d="M0 -22 C13 -12 13 10 0 22 C-13 10 -13 -12 0 -22 Z" fill="%s"/>'
            '<path d="M0 -17 L0 26" stroke="%s" stroke-width="1.6" stroke-linecap="round" fill="none"/>'
            '<path d="M0 -6 L6 -11 M0 2 L7 -4 M0 10 L6 5 M0 -6 L-6 -11 M0 2 L-7 -4 M0 10 L-6 5" stroke="%s" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".8"/>') % (fill, vein, vein)


def oak(fill, vein):
    return ('<path d="M0 -24 C5 -22 7 -17 5 -13 C11 -14 14 -9 10 -5 C16 -4 17 3 11 5 C16 9 13 16 7 14 C8 20 3 23 0 24 '
            'C-3 23 -8 20 -7 14 C-13 16 -16 9 -11 5 C-17 3 -16 -4 -10 -5 C-14 -9 -11 -14 -5 -13 C-7 -17 -5 -22 0 -24 Z" fill="%s"/>'
            '<path d="M0 -18 L0 30" stroke="%s" stroke-width="1.6" stroke-linecap="round" fill="none"/>') % (fill, vein)


def maple(fill, vein):
    return ('<path d="M0 -26 L5 -15 L13 -19 L11 -8 L22 -9 L15 0 L21 6 L10 8 L11 17 L2 13 L0 22 L-2 13 L-11 17 L-10 8 L-21 6 L-15 0 L-22 -9 L-11 -8 L-13 -19 L-5 -15 Z" fill="%s" stroke="%s" stroke-width="1" stroke-linejoin="round"/>'
            '<path d="M0 -16 L0 30 M0 6 L12 -4 M0 6 L-12 -4" stroke="%s" stroke-width="1.3" stroke-linecap="round" fill="none"/>') % (fill, fill, vein)


def pumpkin(body='#E0862D', shade='#C96B1C', stem='#6B7A34'):
    return ('<ellipse cx="-15" cy="4" rx="13" ry="19" fill="%s"/><ellipse cx="15" cy="4" rx="13" ry="19" fill="%s"/>'
            '<ellipse cx="-7" cy="4" rx="12" ry="21" fill="%s"/><ellipse cx="7" cy="4" rx="12" ry="21" fill="%s"/>'
            '<ellipse cx="0" cy="4" rx="8" ry="22" fill="#EE9A3F"/>'
            '<path d="M-2 -17 C-3 -24 0 -29 6 -30 L7 -25 C4 -24 3 -21 3 -17 Z" fill="%s"/>'
            '<path d="M5 -26 C13 -30 17 -24 12 -21" stroke="%s" stroke-width="1.5" fill="none" stroke-linecap="round"/>') % (shade, shade, body, body, stem, stem)


def acorn():
    return ('<path d="M-8 -3 C-8 12 -3 18 0 20 C3 18 8 12 8 -3 Z" fill="#B9793A"/>'
            '<path d="M-10 -3 C-10 -11 10 -11 10 -3 Z" fill="#7A4A22"/><path d="M0 -10 L0 -15" stroke="#7A4A22" stroke-width="2" stroke-linecap="round"/>')


def berries(c='#B4324F', n=3):
    pts = [(-6, 2), (6, 3), (0, -6), (-1, 9), (9, -5)][:n]
    return ''.join('<circle cx="%d" cy="%d" r="5.2" fill="%s"/><circle cx="%.1f" cy="%.1f" r="1.4" fill="#fff" opacity=".55"/>' % (x, y, c, x - 1.6, y - 1.8) for x, y in pts)


def wheat(c='#D9A441'):
    s = '<path d="M0 26 L0 -8" stroke="%s" stroke-width="1.6" stroke-linecap="round"/>' % c
    for i in range(5):
        y = -8 - i * 6
        s += '<ellipse cx="-4" cy="%d" rx="2.6" ry="5" fill="%s" transform="rotate(-28 -4 %d)"/><ellipse cx="4" cy="%d" rx="2.6" ry="5" fill="%s" transform="rotate(28 4 %d)"/>' % (y, c, y, y, c, y)
    return s + '<ellipse cx="0" cy="-40" rx="2.6" ry="5.5" fill="%s"/>' % c


def star(fill, r=12):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.44
        pts.append('%.1f,%.1f' % (rr * math.cos(a), rr * math.sin(a)))
    return '<polygon points="%s" fill="%s"/>' % (' '.join(pts), fill)


def sparkle(fill, r=10):
    return '<path d="M0 %d C2 -2 2 -2 %d 0 C2 2 2 2 0 %d C-2 2 -2 2 %d 0 C-2 -2 -2 -2 0 %d Z" fill="%s"/>' % (-r, r, r, -r, -r, fill)


def heart(fill, shine=True):
    return ('<path d="M0 18 C-26 0 -20 -20 -9 -20 C-3 -20 0 -15 0 -11 C0 -15 3 -20 9 -20 C20 -20 26 0 0 18 Z" fill="%s"/>' % fill
            + ('<path d="M-12 -12 C-10 -15 -7 -15 -6 -14" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".6"/>' if shine else ''))


def flower(petal, center='#F0A63A', n=5, r=11):
    s = ''
    for i in range(n):
        a = i * 360.0 / n
        s += '<ellipse cx="0" cy="%d" rx="%.1f" ry="%d" fill="%s" transform="rotate(%.1f)"/>' % (-r, r * 0.62, r, petal, a)
    return s + '<circle r="%.1f" fill="%s"/>' % (r * 0.5, center)


def ornament(fill, band='#ffffff'):
    return ('<path d="M0 -40 L0 -19" stroke="#B08A3C" stroke-width="1.4"/><rect x="-4" y="-21" width="8" height="6" rx="1.5" fill="#D9B45A"/>'
            '<circle cx="0" cy="0" r="16" fill="%s"/><path d="M-15 -4 C-6 1 6 1 15 -4" stroke="%s" stroke-width="2.4" fill="none" opacity=".75"/>'
            '<path d="M-9 -9 C-7 -12 -4 -13 -2 -13" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".6"/>') % (fill, band)


def holly(g='#1E5B45', b='#B4324F'):
    lf = '<path d="M0 0 C6 -9 4 -13 9 -15 C11 -10 16 -12 19 -9 C17 -5 22 -3 22 2 C17 3 18 8 14 10 C11 6 7 9 0 0 Z" fill="%s"/><path d="M1 0 L19 -3" stroke="#12402F" stroke-width="1" fill="none"/>' % g
    return rot(lf, 3, 2, 12) + rot(lf, -3, 2, 168) + '<g transform="translate(0 -1)">' + berries(b, 3) + '</g>'


def snow(c='#A9C8C0', r=11):
    s = ''
    for i in range(6):
        s += '<g transform="rotate(%d)"><path d="M0 0 L0 %d M0 %d L-3.5 %d M0 %d L3.5 %d" stroke="%s" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>' % (i * 60, -r, -r * 0.55, -r * 0.85, -r * 0.55, -r * 0.85, c)
    return s


def burst(c, r=30, n=14, w=2.2):
    s = ''
    for i in range(n):
        a = i * 2 * math.pi / n
        r0, r1 = r * 0.38, r * (1.0 if i % 2 == 0 else 0.74)
        s += '<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (r0 * math.cos(a), r0 * math.sin(a), r1 * math.cos(a), r1 * math.sin(a), c, w)
        if i % 2 == 0:
            s += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (r * 1.14 * math.cos(a), r * 1.14 * math.sin(a), w * 0.8, c)
    return s


def pine(c='#1E5B45', h=44):
    return ('<rect x="-2" y="%d" width="4" height="9" fill="#7A4A22"/>' % (h / 2 - 8)
            + '<path d="M0 %d L%d %d L%d %d Z" fill="%s"/>' % (-h / 2, h * 0.30, h / 2 - 8, -h * 0.30, h / 2 - 8, c)
            + '<path d="M0 %d L%d %d L%d %d Z" fill="%s"/>' % (-h / 2 - 6, h * 0.22, -h * 0.02, -h * 0.22, -h * 0.02, c))


def svg(w, h, bg, body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
            '<rect width="%d" height="%d" fill="%s"/>%s</svg>') % (w, h, w, h, w, h, bg, body)


# ---- the bands -------------------------------------------------------------------------------------------------
def thanksgiving(R):
    cols = [('#B4541A', '#7E3410'), ('#E0862D', '#A85A12'), ('#E8B23A', '#B07E12'), ('#8E2F24', '#5E1A12'), ('#7A8B3A', '#52601F')]
    b = '<path d="M-20 92 C200 66 400 112 600 88 C800 64 1000 110 1220 84" stroke="#8A5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>'
    def y(x): return 88 + 12 * math.sin((x - 100) / 1200.0 * 2 * math.pi * 1.5 + 2.2) * -1
    x = 14
    while x < W:
        f, v = R.choice(cols); kind = R.choice([leaf, leaf, oak, maple])
        up = R.choice([-1, 1])
        b += rot(kind(f, v), x, y(x) + up * R.uniform(8, 22), R.uniform(-70, 70) + (0 if up < 0 else 180), R.uniform(0.95, 1.35))
        x += R.uniform(26, 40)
    for px, s in ((180, 1.25), (600, 1.7), (1020, 1.25)):
        b += rot(wheat(), px - 62 * s / 1.3, y(px) + 6, -38, s * 0.9) + rot(wheat(), px + 62 * s / 1.3, y(px) + 6, 38, s * 0.9)
        b += rot(pumpkin(), px, y(px) + 4, 0, s)
        b += rot(pumpkin('#E8A04A', '#D0822A'), px + 40 * s, y(px) + 16, 6, s * 0.55)
    for ax in (95, 330, 470, 740, 880, 1110):
        b += rot(acorn(), ax, y(ax) + 26, R.uniform(-30, 30), 1.0) + rot(berries('#8E2F24'), ax + 30, y(ax) - 16, 0, 1.0)
    return svg(W, H, '#FBF1E2', b)


def christmas(R):
    b = ''
    for _ in range(26):
        b += rot(snow('#C9DCD6', R.uniform(6, 11)), R.uniform(0, W), R.uniform(70, 152), R.uniform(0, 60), 1)
    posts = [0, 240, 480, 720, 960, 1200]
    def sag(x):
        i = min(int(x // 240), 4); t = (x - posts[i]) / 240.0
        return 16 + 150 * t * (1 - t)
    greens = ['#1E5B45', '#2F7A5B', '#174836', '#3F8A68']
    x = -6
    while x < W + 6:
        yy = sag(max(0, min(W - 0.01, x)))
        for k in range(5):
            a = R.uniform(0, 360); L = R.uniform(15, 25)
            b += '<path d="M%.1f %.1f l%.1f %.1f" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (x, yy, L * math.cos(math.radians(a)), L * math.sin(math.radians(a)) * 0.8, R.choice(greens), R.uniform(3.2, 4.6))
        x += 4.5
    # a string of lights along the garland
    lights = ['#F5D061', '#B4324F', '#F5D061', '#ffffff']
    x = 14; i = 0
    while x < W:
        b += '<circle cx="%.1f" cy="%.1f" r="5" fill="%s" stroke="#B08A3C" stroke-width=".8"/>' % (x, sag(x) + R.uniform(-7, 9), lights[i % 4]); i += 1; x += 31
    for i in range(5):
        mx = posts[i] + 120
        b += rot(ornament(['#B4324F', '#D9B45A', '#B4324F', '#D9B45A', '#B4324F'][i], '#ffffff'), mx, sag(mx) + 48, 0, 1.25)
        b += rot(ornament('#1F7A8C'), mx - 46, sag(mx - 46) + 38, 0, 0.8) + rot(ornament('#D9B45A' if i % 2 == 0 else '#B4324F'), mx + 46, sag(mx + 46) + 38, 0, 0.8)
    for px in posts:
        bow = ('<path d="M0 0 C-22 -18 -34 -6 -30 8 C-22 14 -8 8 0 0 Z M0 0 C22 -18 34 -6 30 8 C22 14 8 8 0 0 Z" fill="#B4324F"/>'
               '<path d="M-3 2 L-14 34 L-5 28 L0 6 Z M3 2 L14 34 L5 28 L0 6 Z" fill="#96223C"/><circle r="6" fill="#96223C"/>')
        b += rot(bow, px, 18, 0, 1.25)
    return svg(W, H, '#F3F8F4', b)


def newyear(R):
    b = ''
    gold = ['#F5D061', '#E8C988', '#FFFFFF', '#8FD1C7', '#F0A63A']
    for _ in range(70):
        x, y = R.uniform(0, W), R.uniform(4, 156); c = R.choice(gold); k = R.random()
        if k < .35: b += '<rect x="%.1f" y="%.1f" width="9" height="4.5" rx="1" fill="%s" transform="rotate(%.0f %.1f %.1f)"/>' % (x, y, c, R.uniform(0, 180), x, y)
        elif k < .7: b += '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, R.uniform(1.6, 3.6), c)
        else: b += rot(sparkle(c, R.uniform(5, 9)), x, y)
    for x, y, r, c in ((150, 72, 46, '#F5D061'), (420, 52, 30, '#8FD1C7'), (600, 84, 56, '#F5D061'), (800, 50, 32, '#FFFFFF'), (1050, 76, 46, '#F5D061'), (290, 118, 20, '#F0A63A'), (930, 120, 22, '#F0A63A')):
        b += rot(burst(c, r, 16, 2.4) + burst(c, r * 0.5, 8, 2), x, y, R.uniform(0, 20))
    for x in (60, 510, 700, 1150):
        b += '<path d="M%d -4 c18 14 -18 26 0 40 c18 14 -18 26 0 40" stroke="%s" stroke-width="3" fill="none" stroke-linecap="round"/>' % (x, R.choice(['#E8C988', '#8FD1C7']))
    for x, y, s in ((230, 30, 1.2), (700, 132, 1.0), (980, 28, 1.3), (60, 130, 1.0), (1140, 132, 1.1), (510, 132, .9)):
        b += rot(star('#F5D061', 11), x, y, R.uniform(-15, 15), s)
    return svg(W, H, '#0D365F', b)


def valentine(R):
    b = '<path d="M-10 20 C200 60 400 6 600 40 C800 74 1000 10 1210 36" stroke="#C98A97" stroke-width="2" fill="none"/>'
    def y(x): return 34 + 17 * math.sin(x / 1200.0 * 2 * math.pi * 1.5 + 5.3)
    cols = ['#D9486A', '#F08FA2', '#B4324F', '#F7B6C2', '#E26D88']
    x = 36; i = 0
    while x < W - 10:
        s = [1.5, 0.95, 1.2, 0.8][i % 4]; drop = [46, 30, 60, 26][i % 4]
        yy = y(x)
        b += '<path d="M%.1f %.1f L%.1f %.1f" stroke="#C98A97" stroke-width="1.4"/>' % (x, yy, x, yy + drop)
        b += rot(heart(cols[i % 5]), x, yy + drop + 20 * s, R.uniform(-12, 12), s)
        x += 58 + 16 * s; i += 1
    for _ in range(40):
        xx, yy = R.uniform(0, W), R.uniform(8, 152)
        b += rot(heart(R.choice(['#F7B6C2', '#F3A3B3']), False), xx, yy, R.uniform(-25, 25), R.uniform(.16, .3))
    return svg(W, H, '#FDEFF1', b)


def mothers(R):
    b = '<path d="M-20 84 C200 60 400 108 600 82 C800 56 1000 106 1220 80" stroke="#6FA37E" stroke-width="3" fill="none" stroke-linecap="round"/>'
    def y(x): return 82 - 13 * math.sin((x - 100) / 1200.0 * 2 * math.pi * 1.5 + 2.2)
    x = 10
    while x < W:
        up = R.choice([-1, 1])
        b += rot(leaf(R.choice(['#6FA37E', '#8DBB98', '#4F8A66']), '#3F7453'), x, y(x) + up * 15, (R.uniform(-60, -20) if up < 0 else R.uniform(200, 240)) * R.choice([1, -1]), R.uniform(.75, 1.05))
        x += R.uniform(22, 32)
    pet = ['#E88BB0', '#9C3D6B', '#B79AD6', '#F4B7CE', '#F7D3A0']
    x = 46; i = 0
    while x < W:
        big = i % 3 == 0
        b += rot(flower(pet[i % 5], '#F0A63A' if pet[i % 5] != '#F7D3A0' else '#C96B1C', 6 if big else 5, 17 if big else 11), x, y(x) + R.uniform(-10, 10), R.uniform(0, 60), 1.35 if big else 1.2)
        if big:
            b += rot(flower('#FFFFFF', '#F0A63A', 5, 7), x + 36, y(x + 36) - 26, 0, 1) + rot(flower('#FFFFFF', '#F0A63A', 5, 7), x - 34, y(x - 34) + 28, 20, 1)
        x += 74 if big else 62; i += 1
    return svg(W, H, '#FBF0F5', b)


def fathers(R):
    b = '<circle cx="930" cy="62" r="34" fill="#F0A63A"/><circle cx="930" cy="62" r="46" fill="#F0A63A" opacity=".22"/>'
    b += '<path d="M0 160 L0 120 L120 58 L210 104 L330 34 L470 112 L560 76 L700 132 L820 70 L960 124 L1080 52 L1200 110 L1200 160 Z" fill="#A9C6D3"/>'
    b += '<path d="M330 34 L362 54 L344 58 L330 50 L314 60 L300 52 Z M1080 52 L1108 66 L1092 70 L1080 62 L1064 70 L1054 64 Z M120 58 L142 70 L128 74 L118 68 L104 74 L98 70 Z" fill="#FFFFFF" opacity=".9"/>'
    b += '<path d="M0 160 L0 136 L160 92 L300 132 L450 86 L620 138 L780 96 L940 140 L1100 100 L1200 128 L1200 160 Z" fill="#5F93A8"/>'
    b += '<path d="M0 160 L0 146 C200 120 400 152 600 136 C800 120 1000 150 1200 138 L1200 160 Z" fill="#1F5E7A"/>'
    x = 20
    while x < W:
        h = R.uniform(34, 62)
        yb = 146 + 6 * math.sin(x / 90.0)
        b += rot(pine(R.choice(['#103D47', '#14606F', '#174E5C']), h), x, yb - h / 2 + 6, 0, 1)
        x += R.uniform(26, 58)
    for x, y in ((240, 40), (268, 30), (640, 36), (668, 46), (700, 30)):
        b += '<path d="M%d %d q7 -8 14 0 q7 -8 14 0" stroke="#1F5E7A" stroke-width="2" fill="none" stroke-linecap="round"/>' % (x, y)
    return svg(W, H, '#E6F0F5', b)


def july4(R):
    b = ''
    for x, y, r, c in ((90, 96, 38, '#B22234'), (1110, 96, 38, '#1E3A6E'), (340, 126, 22, '#1E3A6E'), (860, 126, 22, '#B22234'), (600, 128, 26, '#B22234')):
        b += rot(burst(c, r, 16, 2.4) + burst(c, r * .5, 8, 2), x, y, R.uniform(0, 20))
    for _ in range(26):
        b += rot(star(R.choice(['#B22234', '#1E3A6E', '#C9D3E6']), R.uniform(4, 8)), R.uniform(0, W), R.uniform(70, 154), R.uniform(0, 70))
    posts = [0, 300, 600, 900, 1200]
    def sag(x):
        i = min(int(x // 300), 3); t = (x - posts[i]) / 300.0
        return 8 + 120 * t * (1 - t)
    b += '<path d="M0 8 ' + ' '.join('Q%d %d %d 8' % (posts[i] + 150, 68, posts[i + 1]) for i in range(4)) + '" stroke="#6B7689" stroke-width="2.2" fill="none"/>'
    x = 14; i = 0
    while x < W - 30:
        y0 = sag(x); y1 = sag(x + 40); ym = (y0 + y1) / 2 + 52
        kind = i % 3
        if kind == 0: b += '<path d="M%.1f %.1f L%.1f %.1f L%.1f %.1f Z" fill="#B22234"/>' % (x, y0, x + 40, y1, x + 20, ym)
        elif kind == 1:
            b += '<path d="M%.1f %.1f L%.1f %.1f L%.1f %.1f Z" fill="#FFFFFF" stroke="#C9D3E6" stroke-width="1.5"/>' % (x, y0, x + 40, y1, x + 20, ym)
            b += '<path d="M%.1f %.1f L%.1f %.1f M%.1f %.1f L%.1f %.1f" stroke="#B22234" stroke-width="4"/>' % (x + 6, (y0 + y1) / 2 + 10, x + 34, (y0 + y1) / 2 + 10, x + 12, (y0 + y1) / 2 + 24, x + 28, (y0 + y1) / 2 + 24)
        else:
            b += '<path d="M%.1f %.1f L%.1f %.1f L%.1f %.1f Z" fill="#1E3A6E"/>' % (x, y0, x + 40, y1, x + 20, ym)
            b += rot(star('#FFFFFF', 7), x + 20, (y0 + y1) / 2 + 17)
        x += 45; i += 1
    return svg(W, H, '#F4F6FB', b)


def autumn(R):
    cols = [('#B4541A', '#7E3410'), ('#E0862D', '#A85A12'), ('#E8B23A', '#B07E12'), ('#8E2F24', '#5E1A12'), ('#C9792B', '#8A4B12')]
    b = ''
    for x in (120, 420, 760, 1060):
        b += '<path d="M%d %d c40 -22 70 20 110 -4 s60 10 90 -8" stroke="#D9BE9C" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="2 9"/>' % (x - 100, R.randint(50, 110))
    x = 24; i = 0
    while x < W:
        f, v = R.choice(cols); kind = [maple, leaf, oak][i % 3]
        b += rot(kind(f, v), x, R.uniform(30, 128), R.uniform(0, 360), R.uniform(.7, 1.75))
        x += R.uniform(34, 58); i += 1
    return svg(W, H, '#FBF0E3', b)


def veterans(R):
    b = ''
    for i in range(4):
        b += '<rect x="0" y="%d" width="%d" height="9" fill="%s"/>' % (124 + i * 9, W, '#B22234' if i % 2 == 0 else '#FFFFFF')
    x = 60; i = 0
    while x < W:
        if abs(x - 600) > 110:
            b += rot(star('#FFFFFF', 13), x, 62 + (14 if i % 2 else -14), 0, 1)
        x += 60; i += 1
    def laurel(sign):
        s = ''
        for k in range(7):
            a = (245 - k * 19) if sign < 0 else (295 + k * 19)
            cx, cy = 600 + 62 * math.cos(math.radians(a)), 64 - 50 * math.sin(math.radians(a))
            s += '<ellipse cx="%.1f" cy="%.1f" rx="12" ry="5" fill="#E8C988" transform="rotate(%.0f %.1f %.1f)"/>' % (cx, cy, -a + 90 + (38 if sign < 0 else -38), cx, cy)
        return s
    b += laurel(-1) + laurel(1) + rot(star('#F5D061', 30), 600, 62)
    return svg(W, H, '#0D365F', b)


# ---- the small ornament under the heading ----------------------------------------------------------------------
def sprig(theme):
    line = {'thanksgiving': '#D9B48C', 'christmas': '#B9D2C4', 'newyear': '#C9B26A', 'valentine': '#EFB3BF', 'mothers': '#E3B5CC',
            'fathers': '#A9C6D3', 'july4': '#C9D3E6', 'autumn': '#E2BC92', 'veterans': '#C9D3E6'}[theme]
    mid = {
        'thanksgiving': rot(oak('#B4541A', '#7E3410'), 218, 34, -62, .95) + rot(leaf('#E8B23A', '#B07E12'), 262, 34, 62, .95) + rot(berries('#8E2F24'), 240, 32, 0, 1.0),
        'christmas': rot(holly(), 240, 34, 0, 1.25),
        'newyear': rot(star('#D9A72C', 9), 212, 34) + rot(star('#D9A72C', 14), 240, 30) + rot(star('#D9A72C', 9), 268, 34),
        'valentine': rot(heart('#F08FA2'), 214, 34, -12, .6) + rot(heart('#D9486A'), 240, 33, 0, .95) + rot(heart('#F08FA2'), 266, 34, 12, .6),
        'mothers': rot(leaf('#6FA37E', '#3F7453'), 212, 36, -70, .7) + rot(leaf('#6FA37E', '#3F7453'), 268, 36, 70, .7) + rot(flower('#E88BB0', '#F0A63A', 6, 13), 240, 32, 0, 1.0),
        'fathers': rot(pine('#14606F', 34), 222, 32, 0, .9) + rot(pine('#103D47', 46), 240, 30, 0, .95) + rot(pine('#14606F', 34), 258, 32, 0, .9),
        'july4': rot(star('#B22234', 10), 210, 34) + rot(star('#1E3A6E', 15), 240, 31) + rot(star('#B22234', 10), 270, 34),
        'autumn': rot(maple('#B4541A', '#7E3410'), 240, 32, 12, .95),
        'veterans': rot(star('#0D365F', 15), 240, 31),
    }[theme]
    # the background is the holiday's tint: the same colors as FESTIVE in email-template.js, which draws the panel behind it
    tint = {'thanksgiving': '#FBF1E2', 'christmas': '#F1F7F2', 'newyear': '#FBF5DF', 'valentine': '#FDEFF1', 'mothers': '#FBF0F5',
            'fathers': '#E6F0F5', 'july4': '#F1F4FA', 'autumn': '#FBF0E3', 'veterans': '#F1F4FA'}[theme]
    b = '<path d="M20 40 L166 40 M314 40 L460 40" stroke="%s" stroke-width="2" stroke-linecap="round"/>' % line
    b += '<circle cx="166" cy="40" r="3" fill="%s"/><circle cx="314" cy="40" r="3" fill="%s"/>' % (line, line)
    return svg(480, 80, tint, b + '<g transform="translate(240 40) scale(1.55) translate(-240 -33)">' + mid + '</g>')


THEMES = {'thanksgiving': thanksgiving, 'christmas': christmas, 'newyear': newyear, 'valentine': valentine, 'mothers': mothers,
          'fathers': fathers, 'july4': july4, 'autumn': autumn, 'veterans': veterans}
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def main():
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    jobs = []
    for i, (name, fn) in enumerate(THEMES.items()):
        jobs.append((name + '-top', fn(random.Random(20261114 + i)), W, H))
        jobs.append((name + '-sprig', sprig(name), 480, 80))
    for name, s, w, h in jobs:
        open(os.path.join(out, name + '.svg'), 'w').write(s)
        if '--png' in sys.argv:
            page = os.path.join(out, name + '.html')
            open(page, 'w').write('<!doctype html><html><body style="margin:0;overflow:hidden">' + s + '</body></html>')
            subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                            '--window-size=%d,%d' % (w, h), '--screenshot=' + os.path.join(out, name + '.png'), 'file://' + os.path.abspath(page)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            os.remove(page)
            try:
                from PIL import Image
                im = Image.open(os.path.join(out, name + '.png')).convert('RGB').crop((0, 0, w, h))
                im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(os.path.join(out, name + '.png'), optimize=True)
            except ImportError:
                pass
    print('drew', len(jobs), 'pictures in', out)


if __name__ == '__main__':
    main()
