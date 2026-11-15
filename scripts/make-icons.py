"""Draws the Liftbook icon set: a lime barbell rising on the app's dark background.
Run from the repo root with Pillow installed:  python3 scripts/make-icons.py
The PNGs it writes are committed, so this only needs running when the mark changes."""
from PIL import Image, ImageDraw, ImageFilter

BG = (13, 16, 16)
LIME = (200, 255, 80)
LIME_SOFT = (233, 255, 176)
S = 2048  # drawn large, then scaled down for clean edges


def mark(scale=1.0):
    """The barbell on a transparent square, centred. `scale` shrinks it for icons that get cropped to a circle."""
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = S // 2, S // 2
    u = S * 0.01 * scale
    # bar
    d.rounded_rectangle([cx - 37 * u, cy - 2.2 * u, cx + 37 * u, cy + 2.2 * u], radius=2.2 * u, fill=LIME_SOFT)
    for side in (-1, 1):
        # inner big plate, outer small plate, end collar
        for off, half_h, w, col in ((17.5, 21, 7.5, LIME), (27.5, 14.5, 6.5, LIME), (35.5, 6.5, 3.2, LIME_SOFT)):
            x = cx + side * off * u
            d.rounded_rectangle([x - w / 2 * u, cy - half_h * u, x + w / 2 * u, cy + half_h * u], radius=2.6 * u, fill=col)
    return layer.rotate(24, resample=Image.BICUBIC)


def icon(size, scale=1.0, background=True):
    base = Image.new('RGBA', (S, S), BG + (255,) if background else (0, 0, 0, 0))
    m = mark(scale)
    if background:
        glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        g = ImageDraw.Draw(glow)
        r = S * 0.34 * scale
        g.ellipse([S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r], fill=LIME + (46,))
        base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * 0.09)))
    base.alpha_composite(m)
    out = base.resize((size, size), Image.LANCZOS)
    return out.convert('RGB') if background else out


icon(1024).save('assets/icon.png')
icon(48).save('assets/favicon.png')
icon(1024, scale=0.62, background=False).save('assets/splash-icon.png')
# Android adaptive icon: the launcher crops to its own shape, so the mark sits inside the safe middle.
icon(512, scale=0.62, background=False).save('assets/android-icon-foreground.png')
Image.new('RGB', (512, 512), BG).save('assets/android-icon-background.png')
mono = icon(512, scale=0.62, background=False)
white = Image.new('RGBA', mono.size, (255, 255, 255, 0))
white.putalpha(mono.getchannel('A'))
white.save('assets/android-icon-monochrome.png')
# Home-screen web app
icon(180).save('public/icons/apple-touch-icon.png')
icon(192).save('public/icons/icon-192.png')
icon(512).save('public/icons/icon-512.png')
icon(512, scale=0.72).save('public/icons/icon-maskable-512.png')
print('icons written')
