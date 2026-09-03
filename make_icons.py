"""
Idea Board PWA icon generator — pure standard library (no Pillow, no network).

Writes valid PNGs using only zlib + struct. Renders the brand mark:
an indigo rounded-square tile with a white lightbulb glyph, matching the
header brand-icon in ideaboard.html.

Outputs (in the same folder):
  icon-192.png          192x192, full-bleed rounded tile
  icon-512.png          512x512, full-bleed rounded tile
  icon-512-maskable.png 512x512, tile inset inside safe zone (for maskable)

Run:  python make_icons.py
"""
import struct
import zlib
import math

# Brand palette (from ideaboard.html :root)
PRIMARY = (99, 102, 241)       # #6366f1 indigo
PRIMARY_LIGHT = (129, 140, 248)  # #818cf8
ACCENT = (245, 158, 11)        # #f59e0b amber (bulb glow)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def new_canvas(size):
    # RGBA, transparent
    return [[(0, 0, 0, 0) for _ in range(size)] for _ in range(size)]


def rounded_rect(px, size, left, top, right, bottom, radius, color_fn):
    """Fill a rounded rectangle. color_fn(x, y) -> (r,g,b) or None to skip."""
    for y in range(top, bottom):
        for x in range(left, right):
            # rounded-corner test
            cx = None
            cy = None
            if x < left + radius and y < top + radius:
                cx, cy = left + radius, top + radius
            elif x >= right - radius and y < top + radius:
                cx, cy = right - radius - 1, top + radius
            elif x < left + radius and y >= bottom - radius:
                cx, cy = left + radius, bottom - radius - 1
            elif x >= right - radius and y >= bottom - radius:
                cx, cy = right - radius - 1, bottom - radius - 1
            if cx is not None:
                if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                    continue
            c = color_fn(x, y)
            if c is not None:
                px[y][x] = (c[0], c[1], c[2], 255)


def draw_tile(px, size, inset):
    """Indigo diagonal-gradient rounded tile filling (size - 2*inset)."""
    left = inset
    top = inset
    right = size - inset
    bottom = size - inset
    radius = round((right - left) * 0.22)
    span = float((right - left) + (bottom - top))

    def grad(x, y):
        t = ((x - left) + (y - top)) / span
        t = max(0.0, min(1.0, t))
        return lerp(PRIMARY, PRIMARY_LIGHT, t)

    rounded_rect(px, size, left, top, right, bottom, radius, grad)


def fill_circle(px, size, cx, cy, r, color):
    for y in range(max(0, int(cy - r)), min(size, int(cy + r) + 1)):
        for x in range(max(0, int(cx - r)), min(size, int(cx + r) + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                px[y][x] = (color[0], color[1], color[2], 255)


def fill_rect(px, size, left, top, right, bottom, color):
    for y in range(max(0, int(top)), min(size, int(bottom))):
        for x in range(max(0, int(left)), min(size, int(right))):
            px[y][x] = (color[0], color[1], color[2], 255)


def ring(px, size, cx, cy, r, thickness, color):
    """Draw a stroked circle (annulus) of given thickness."""
    outer = r + thickness / 2.0
    inner = r - thickness / 2.0
    o2, i2 = outer * outer, inner * inner
    for y in range(max(0, int(cy - outer)), min(size, int(cy + outer) + 1)):
        for x in range(max(0, int(cx - outer)), min(size, int(cx + outer) + 1)):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if i2 <= d2 <= o2:
                px[y][x] = (color[0], color[1], color[2], 255)


def draw_bulb(px, size, inset):
    """Line-drawn (outline) lightbulb glyph, matching the header brand SVG:
    a stroked white globe over a small stroked screw-base, with an amber
    filament dot. Stroke weight scales with icon size."""
    area = size - 2 * inset
    cx = size / 2.0
    stroke = max(2.0, area * 0.055)  # line weight scaled to size
    # globe (outline ring)
    globe_r = area * 0.19
    globe_cy = inset + area * 0.40
    ring(px, size, cx, globe_cy, globe_r, stroke, WHITE)
    # screw base: 2 short horizontal strokes below the globe
    base_w = globe_r * 1.0
    bar_h = stroke
    gap = area * 0.05
    y = globe_cy + globe_r + gap * 0.4
    for _ in range(2):
        fill_rect(px, size, cx - base_w / 2, y, cx + base_w / 2, y + bar_h, WHITE)
        y += bar_h + gap
        base_w *= 0.8
    # small amber filament dot centred in the globe
    fill_circle(px, size, cx, globe_cy, globe_r * 0.34, ACCENT)


def write_png(path, px, size=None):
    """Write an RGBA PNG. Width/height are derived from the pixel array
    (rows = height, columns = height's first row length = width), so this
    handles both square icons and rectangular screenshots."""
    height = len(px)
    width = len(px[0])

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0
        for x in range(width):
            r, g, b, a = px[y][x]
            raw += bytes((r, g, b, a))
    compressed = zlib.compress(bytes(raw), 9)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))
    print("wrote", path, width, "x", height)


def make(path, size, inset):
    px = new_canvas(size)
    draw_tile(px, size, inset)
    draw_bulb(px, size, inset)
    write_png(path, px, size)


def make_screenshot_sized(path, w, h):
    """Simple branded placeholder screenshot for the manifest install UI.
    A soft app-background canvas with a header bar, the brand tile,
    and stat/kanban-ish blocks so the install dialog has a preview."""
    px = [[(248, 250, 252, 255) for _ in range(w)] for _ in range(h)]  # --bg #f8fafc

    def rect(l, t, r, b, color):
        for y in range(max(0, t), min(h, b)):
            for x in range(max(0, l), min(w, r)):
                px[y][x] = (color[0], color[1], color[2], 255)

    def rrect(l, t, r, b, rad, color):
        for y in range(max(0, t), min(h, b)):
            for x in range(max(0, l), min(w, r)):
                cx = cy = None
                if x < l + rad and y < t + rad: cx, cy = l + rad, t + rad
                elif x >= r - rad and y < t + rad: cx, cy = r - rad - 1, t + rad
                elif x < l + rad and y >= b - rad: cx, cy = l + rad, b - rad - 1
                elif x >= r - rad and y >= b - rad: cx, cy = r - rad - 1, b - rad - 1
                if cx is not None and (x - cx) ** 2 + (y - cy) ** 2 > rad * rad:
                    continue
                px[y][x] = (color[0], color[1], color[2], 255)

    m = round(w * 0.03)
    # header card
    rrect(m, m, w - m, m + round(h * 0.10), 12, WHITE)
    # brand tile in header
    tile = round(h * 0.055)
    ty = m + round(h * 0.022)
    rrect(m + 20, ty, m + 20 + tile, ty + tile, round(tile * 0.22), PRIMARY)
    # header accent underline
    rect(m, m, w - m, m + 4, PRIMARY)
    # stat row
    sy = m + round(h * 0.13)
    sh = round(h * 0.10)
    cols = 5
    gap = round(w * 0.015)
    cw = (w - 2 * m - (cols - 1) * gap) // cols
    accents = [PRIMARY, (59, 130, 246), (245, 158, 11), (139, 92, 246), (16, 185, 129)]
    for i in range(cols):
        lx = m + i * (cw + gap)
        rrect(lx, sy, lx + cw, sy + sh, 10, WHITE)
        rect(lx, sy, lx + cw, sy + 5, accents[i])
    # kanban-ish columns
    ky = sy + sh + round(h * 0.03)
    kh = h - ky - m
    kcols = 4
    kw = (w - 2 * m - (kcols - 1) * gap) // kcols
    for i in range(kcols):
        lx = m + i * (kw + gap)
        rrect(lx, ky, lx + kw, ky + kh, 10, (241, 245, 249))  # --surface-alt
        # a couple of cards
        for c in range(2):
            cyy = ky + 14 + c * (round(kh * 0.16) + 10)
            rrect(lx + 10, cyy, lx + kw - 10, cyy + round(kh * 0.16), 8, WHITE)
    write_png(path, px)


if __name__ == "__main__":
    # full-bleed icons: tiny inset so the rounded tile nearly fills the canvas
    make("icon-192.png", 192, inset=6)
    make("icon-512.png", 512, inset=16)
    # maskable: ~20% safe-zone padding so the tile sits inside the mask
    make("icon-512-maskable.png", 512, inset=round(512 * 0.18))
    # manifest screenshots (wide desktop + narrow mobile)
    make_screenshot_sized("screenshot-wide.png", 1280, 720)
    make_screenshot_sized("screenshot-narrow.png", 720, 1280)
    print("done")
