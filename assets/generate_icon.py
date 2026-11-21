"""Render the original geometric app icon without external image dependencies."""
import math
import pathlib
import struct
import zlib

SIZE = 256


def rounded(x, y, left, top, right, bottom, radius):
    dx = max(left + radius - x, 0, x - right + radius)
    dy = max(top + radius - y, 0, y - bottom + radius)
    return dx * dx + dy * dy <= radius * radius


def line_distance(x, y, ax, ay, bx, by):
    t = max(0, min(1, ((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)))
    return math.hypot(x-ax-t*(bx-ax), y-ay-t*(by-ay))


def pixel(x, y):
    color = (0, 0, 0, 0)
    if 8 <= x <= 248 and 8 <= y <= 248 and rounded(x, y, 8, 8, 248, 248, 54):
        color = (11, 16, 23, 255)
    if 38 <= x <= 218 and 53 <= y <= 203 and rounded(x, y, 38, 53, 218, 203, 24):
        color = (73, 185, 173, 255)
    if 47 <= x <= 209 and 62 <= y <= 194 and rounded(x, y, 47, 62, 209, 194, 15):
        color = (19, 43, 48, 255)
    if min(line_distance(x, y, *segment) for segment in [(73,99,105,128), (105,128,73,157), (129,157,177,157)]) <= 6:
        color = (114, 224, 206, 255)
    return bytes(color)


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))


raw = b''.join(b'\0' + b''.join(pixel(x, y) for x in range(SIZE)) for y in range(SIZE))
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', SIZE, SIZE, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
folder = pathlib.Path(__file__).resolve().parent
(folder / 'icon.png').write_bytes(png)
(folder / 'icon.ico').write_bytes(struct.pack('<3H', 0, 1, 1) + struct.pack('<4B2H2I', 0, 0, 0, 0, 1, 32, len(png), 22) + png)
