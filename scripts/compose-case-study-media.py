#!/usr/bin/env python3
"""Compose case-study images and clips from Figma renders.

Usage: python3 scripts/compose-case-study-media.py <plan.json> [--only name]

The plan lists compositions. Every source is a PNG rendered from Figma
(node.screenshot at 2x/3x). Phones are set in a simple device frame and laid
out in rows on a soft gradient so no image is taller than it is wide;
desktop screens get rounded corners and a shadow on a backdrop; strips are
padded; "timelapse" renders an MP4 that cross-fades through a list of
screens (needs ffmpeg).

Plan entries (all paths relative to the plan file unless absolute):
  {"name": "...", "type": "phone-row", "sources": ["a.png", ...], "out": "assets/x.png",
   "size": [2400, 1350], "bg": "yelo", "frame": true, "phoneHeight": 0.86}
  {"type": "desktop", "sources": ["a.png"], "out": ..., "size": [2400, 1500], "bg": "newly", "bgImage": "gradient.png"}
  {"type": "strip", "sources": ["a.png"], "out": ..., "pad": 80, "bg": "paper"}
  {"type": "crop", "sources": ["a.png"], "box": [x, y, w, h], "scale": 1, "out": ...}
  {"type": "crop-row", "sources": [...], "boxes": [[x,y,w,h], ...], "out": ..., "size": [2400, 900]}
  {"type": "cover", ...}  (phone-row plus optional "decor": [{"path": ..., "anchor": "right", "height": 0.42}])
  {"type": "timelapse", "sources": [...], "out": "assets/x.mp4", "poster": "assets/x.jpg", "size": [1600, 900], "hold": 0.9, "fade": 0.35}
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

PALETTES = {
    # top-left colour, bottom-right colour
    'yelo': ((221, 232, 239), (247, 243, 222)),
    'yelo-warm': ((250, 244, 206), (255, 255, 255)),
    'newly': ((239, 240, 250), (255, 255, 255)),
    'paper': ((246, 246, 246), (246, 246, 246)),
    'white': ((255, 255, 255), (255, 255, 255)),
}


def gradient(size, name):
    a, b = PALETTES[name]
    w, h = size
    base = Image.new('RGB', (2, 2))
    base.putpixel((0, 0), a)
    base.putpixel((1, 0), tuple((x + y) // 2 for x, y in zip(a, b)))
    base.putpixel((0, 1), tuple((x + y) // 2 for x, y in zip(a, b)))
    base.putpixel((1, 1), b)
    return base.resize((w, h), Image.BICUBIC).convert('RGBA')


def backdrop(size, entry, root):
    if entry.get('bgImage'):
        img = load(root, entry['bgImage'])
        w, h = size
        scale = max(w / img.width, h / img.height)
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        left = (img.width - w) // 2
        top = (img.height - h) // 2
        img = img.crop((left, top, left + w, top + h))
        if entry.get('bgBlur'):
            img = img.filter(ImageFilter.GaussianBlur(entry['bgBlur']))
        if entry.get('bgDim'):
            overlay = Image.new('RGBA', size, (255, 255, 255, int(255 * entry['bgDim'])))
            img = Image.alpha_composite(img, overlay)
        return img
    return gradient(size, entry.get('bg', 'paper'))


def rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def with_shadow(canvas, layer, pos, blur=40, offset=(0, 28), opacity=0.28):
    """Paste `layer` (RGBA) onto `canvas` at `pos` with a soft drop shadow."""
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    alpha = layer.split()[-1]
    tinted = Image.new('RGBA', layer.size, (0, 0, 0, int(255 * opacity)))
    tinted.putalpha(alpha.point(lambda v: int(v * opacity)))
    shadow.paste(tinted, (pos[0] + offset[0], pos[1] + offset[1]), tinted)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(layer, pos)


def phone(img, frame=True):
    """Clip a screen render to the iPhone shape and add a thin device frame."""
    img = img.convert('RGBA')
    w, h = img.size
    radius = round(w * 0.137)  # ~55pt on a 402pt wide screen
    screen = Image.new('RGBA', img.size, (0, 0, 0, 0))
    screen.paste(img, (0, 0), rounded_mask(img.size, radius))
    if not frame:
        return screen
    bezel = round(w * 0.03)
    size = (w + 2 * bezel, h + 2 * bezel)
    body = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(body)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius + bezel, fill=(24, 24, 26, 255))
    # subtle edge highlight
    draw.rounded_rectangle((1, 1, size[0] - 2, size[1] - 2), radius=radius + bezel - 1, outline=(70, 70, 74, 255), width=2)
    body.alpha_composite(screen, (bezel, bezel))
    return body


def fit_height(img, height):
    scale = height / img.height
    return img.resize((round(img.width * scale), height), Image.LANCZOS)


def fit_width(img, width):
    scale = width / img.width
    return img.resize((width, round(img.height * scale)), Image.LANCZOS)


def load(root, path):
    return Image.open(path if os.path.isabs(path) else os.path.join(root, path)).convert('RGBA')


def save(img, root, out, quality=92):
    path = out if os.path.isabs(out) else os.path.join(root, out)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if path.lower().endswith(('.jpg', '.jpeg')):
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)
    else:
        img.convert('RGB').save(path, optimize=True)
    return path


# ---------------------------------------------------------------------------

def compose_phone_row(entry, root):
    frames = [phone(load(root, p), entry.get('frame', True)) for p in entry['sources']]
    n = len(frames)
    rows = entry.get('rows', 1)
    per_row = -(-n // rows)
    phone_h = entry.get('phoneHeight', 0.86)
    size = entry.get('size', 'auto')
    if size == 'auto':
        # Width is fixed; the phones fill ~90% of it (never wider than 26% each)
        # and the canvas height follows, so a row of eight stays short and a
        # pair stays landscape. With `rows`, long sequences wrap.
        width = entry.get('width', 2400)
        gap = entry.get('gap', round(width * 0.03))
        frame_w = min(round((width * 0.9 - gap * (per_row - 1)) / per_row), round(width * 0.26))
        ratio = frames[0].height / frames[0].width
        size = (width, round(frame_w * ratio / phone_h) * rows)
    size = tuple(size)
    canvas = backdrop(size, entry, root)
    row_h = size[1] // rows
    target_h = round(row_h * phone_h)
    frames = [fit_height(f, target_h) for f in frames]
    gap = entry.get('gap', round(size[0] * 0.03))
    for r in range(rows):
        chunk = frames[r * per_row:(r + 1) * per_row]
        total = sum(f.width for f in chunk) + gap * (len(chunk) - 1)
        if total > size[0] * 0.92:
            scale = size[0] * 0.92 / total
            chunk = [fit_height(f, round(target_h * scale)) for f in chunk]
            gap = round(gap * scale)
            total = sum(f.width for f in chunk) + gap * (len(chunk) - 1)
        x = (size[0] - total) // 2 + round(size[0] * entry.get('xShift', 0))
        y_center = row_h * r + row_h // 2 + round(size[1] * entry.get('yShift', 0))
        for f in chunk:
            with_shadow(canvas, f, (x, y_center - f.height // 2))
            x += f.width + gap
    for decor in entry.get('decor', []):
        d = load(root, decor['path'])
        d = fit_height(d, round(size[1] * decor.get('height', 0.4)))
        if decor.get('anchor', 'right') == 'right':
            pos = (size[0] - d.width - round(size[0] * decor.get('inset', 0.04)), size[1] - d.height - round(size[1] * decor.get('bottom', 0.08)))
        else:
            pos = (round(size[0] * decor.get('inset', 0.04)), size[1] - d.height - round(size[1] * decor.get('bottom', 0.08)))
        canvas.alpha_composite(d, pos)
    return canvas


def laptop(screen):
    """Set a desktop render into a simple MacBook-style shell: dark bezel with a
    camera dot, then a thin base with a notch for the trackpad lip."""
    w, h = screen.size
    bezel = round(w * 0.028)
    top = round(w * 0.034)
    lid_w, lid_h = w + 2 * bezel, h + bezel + top
    base_h = round(w * 0.022)
    base_w = round(lid_w * 1.12)
    out = Image.new('RGBA', (base_w, lid_h + base_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    lx = (base_w - lid_w) // 2
    lid_r = round(w * 0.03)
    draw.rounded_rectangle((lx, 0, lx + lid_w - 1, lid_h - 1), radius=lid_r, fill=(22, 22, 24, 255))
    draw.rounded_rectangle((lx + 1, 1, lx + lid_w - 2, lid_h - 2), radius=lid_r - 1, outline=(64, 64, 68, 255), width=2)
    # camera
    cam = round(w * 0.005)
    draw.ellipse((lx + lid_w // 2 - cam, top // 2 - cam, lx + lid_w // 2 + cam, top // 2 + cam), fill=(45, 45, 50, 255))
    screen_r = round(w * 0.008)
    clipped = Image.new('RGBA', screen.size, (0, 0, 0, 0))
    clipped.paste(screen, (0, 0), rounded_mask(screen.size, screen_r))
    out.alpha_composite(clipped, (lx + bezel, top))
    # base
    by = lid_h - 1
    base = Image.new('RGBA', (base_w, base_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(base)
    bd.rounded_rectangle((0, 0, base_w - 1, base_h - 1), radius=base_h // 2, fill=(196, 198, 204, 255))
    bd.rectangle((0, 0, base_w - 1, base_h // 2), fill=(214, 216, 222, 255))
    notch_w = round(base_w * 0.14)
    bd.rounded_rectangle((base_w // 2 - notch_w // 2, 0, base_w // 2 + notch_w // 2, round(base_h * 0.45)), radius=round(base_h * 0.2), fill=(168, 170, 176, 255))
    out.alpha_composite(base, (0, by))
    return out


def compose_desktop(entry, root):
    size = tuple(entry.get('size', [2400, 1500]))
    canvas = backdrop(size, entry, root)
    shots = [load(root, p) for p in entry['sources']]
    n = len(shots)
    pad = round(size[0] * entry.get('pad', 0.06))
    gap = round(size[0] * 0.025)
    avail_w = size[0] - 2 * pad - gap * (n - 1)
    per_w = avail_w // n
    use_laptop = entry.get('frame') == 'laptop'
    if use_laptop:
        per_w = round(per_w / 1.12)  # the base is wider than the lid
    shots = [fit_width(s, per_w) for s in shots]
    layers = []
    for s in shots:
        if use_laptop:
            layers.append(laptop(s))
            continue
        radius = round(s.width * entry.get('radius', 0.012))
        layer = Image.new('RGBA', s.size, (0, 0, 0, 0))
        layer.paste(s, (0, 0), rounded_mask(s.size, radius))
        # hairline border so white UI separates from a light backdrop
        ImageDraw.Draw(layer).rounded_rectangle((0, 0, s.width - 1, s.height - 1), radius=radius, outline=(0, 0, 0, 28), width=2)
        layers.append(layer)
    max_h = max(l.height for l in layers)
    if max_h > size[1] - 2 * pad:
        scale = (size[1] - 2 * pad) / max_h
        layers = [l.resize((round(l.width * scale), round(l.height * scale)), Image.LANCZOS) for l in layers]
    total = sum(l.width for l in layers) + gap * (n - 1)
    x = (size[0] - total) // 2
    y_shift = round(size[1] * entry.get('yShift', 0))
    for l in layers:
        with_shadow(canvas, l, (x, (size[1] - l.height) // 2 + y_shift), blur=60, offset=(0, 36), opacity=0.22)
        x += l.width + gap
    return canvas


def compose_strip(entry, root):
    img = load(root, entry['sources'][0])
    pad = entry.get('pad', 80)
    if entry.get('maxWidth') and img.width > entry['maxWidth']:
        img = fit_width(img, entry['maxWidth'])
    size = (img.width + 2 * pad, img.height + 2 * pad)
    canvas = backdrop(size, entry, root)
    canvas.alpha_composite(img, (pad, pad))
    return canvas


def source_scale(entry, i):
    """Pixels per 1x design unit for source i: the entry's own `scale`, or with
    "scale": "auto" the scale recorded for that export."""
    s = entry.get('scale', 1)
    if s == 'auto':
        s = (entry.get('_sourceScales') or [None] * (i + 1))[i] or 1
    return s


def compose_crop(entry, root):
    img = load(root, entry['sources'][0])
    x, y, w, h = entry['box']
    s = source_scale(entry, 0)
    crop = img.crop((round(x * s), round(y * s), round((x + w) * s), round((y + h) * s)))
    if entry.get('pad'):
        pad = entry['pad']
        canvas = backdrop((crop.width + 2 * pad, crop.height + 2 * pad), entry, root)
        radius = entry.get('radius', 0)
        if radius:
            layer = Image.new('RGBA', crop.size, (0, 0, 0, 0))
            layer.paste(crop, (0, 0), rounded_mask(crop.size, radius))
            with_shadow(canvas, layer, (pad, pad), blur=30, offset=(0, 16), opacity=0.16)
        else:
            canvas.alpha_composite(crop, (pad, pad))
        return canvas
    return crop


def compose_crop_row(entry, root):
    """Several crops (same height) side by side on a backdrop."""
    size = tuple(entry.get('size', [2400, 900]))
    canvas = backdrop(size, entry, root)
    crops = []
    for i, (path, box) in enumerate(zip(entry['sources'], entry['boxes'])):
        img = load(root, path)
        x, y, w, h = box
        s = source_scale(entry, i)
        crops.append(img.crop((round(x * s), round(y * s), round((x + w) * s), round((y + h) * s))))
    n = len(crops)
    pad = round(size[0] * 0.05)
    gap = round(size[0] * 0.03)
    target_h = round(size[1] * entry.get('rowHeight', 0.7))
    crops = [fit_height(c, target_h) for c in crops]
    total = sum(c.width for c in crops) + gap * (n - 1)
    if total > size[0] - 2 * pad:
        scale = (size[0] - 2 * pad) / total
        crops = [fit_height(c, round(target_h * scale)) for c in crops]
        gap = round(gap * scale)
        total = sum(c.width for c in crops) + gap * (n - 1)
    x = (size[0] - total) // 2
    for c in crops:
        radius = entry.get('radius', 24)
        layer = Image.new('RGBA', c.size, (0, 0, 0, 0))
        layer.paste(c, (0, 0), rounded_mask(c.size, radius))
        with_shadow(canvas, layer, (x, (size[1] - c.height) // 2), blur=40, offset=(0, 20), opacity=0.18)
        x += c.width + gap
    return canvas


def card(img, radius):
    """Round the corners of a UI crop and add a hairline so white UI separates from the backdrop."""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    layer.paste(img, (0, 0), rounded_mask(img.size, radius))
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, outline=(0, 0, 0, 22), width=2)
    return layer


def compose_stack(entry, root):
    """Sources stacked vertically at one shared scale (e.g. prompt-bar variants)."""
    imgs = [load(root, p) for p in entry['sources']]
    width = entry.get('width', 2400)
    pad = round(width * entry.get('pad', 0.08))
    gap = round(width * entry.get('gap', 0.025))
    inner = width - 2 * pad
    widest = max(i.width for i in imgs)
    scale = min(1.0, inner / widest) * entry.get('scale', 1.0)
    imgs = [i.resize((round(i.width * scale), round(i.height * scale)), Image.LANCZOS) for i in imgs]
    height = sum(i.height for i in imgs) + gap * (len(imgs) - 1) + 2 * pad
    canvas = backdrop((width, height), entry, root)
    y = pad
    for i in imgs:
        layer = card(i, entry.get('radius', 0)) if entry.get('radius') else i
        x = (width - i.width) // 2 if entry.get('align', 'center') == 'center' else pad
        if entry.get('shadow', True):
            with_shadow(canvas, layer, (x, y), blur=30, offset=(0, 14), opacity=0.14)
        else:
            canvas.alpha_composite(layer, (x, y))
        y += i.height + gap
    return canvas


def compose_row(entry, root):
    """Sources side by side at one shared scale, vertically centred (sizes may differ)."""
    imgs = [load(root, p) for p in entry['sources']]
    width = entry.get('width', 2400)
    pad = round(width * entry.get('pad', 0.06))
    gap = round(width * entry.get('gap', 0.03))
    inner = width - 2 * pad - gap * (len(imgs) - 1)
    total = sum(i.width for i in imgs)
    scale = min(1.0, inner / total) * entry.get('scale', 1.0)
    imgs = [i.resize((round(i.width * scale), round(i.height * scale)), Image.LANCZOS) for i in imgs]
    tallest = max(i.height for i in imgs)
    height = entry.get('height') or tallest + 2 * pad
    canvas = backdrop((width, height), entry, root)
    x = (width - (sum(i.width for i in imgs) + gap * (len(imgs) - 1))) // 2
    for i in imgs:
        layer = card(i, entry.get('radius', 0)) if entry.get('radius') else i
        if entry.get('shadow', True):
            with_shadow(canvas, layer, (x, (height - i.height) // 2), blur=30, offset=(0, 14), opacity=0.14)
        else:
            canvas.alpha_composite(layer, (x, (height - i.height) // 2))
        x += i.width + gap
    return canvas


def compose_grid(entry, root):
    """Sources in N columns at one shared scale; each row is as tall as its tallest item."""
    imgs = [load(root, p) for p in entry['sources']]
    cols = entry.get('columns', 2)
    width = entry.get('width', 2400)
    pad = round(width * entry.get('pad', 0.06))
    gap = round(width * entry.get('gap', 0.03))
    cell_w = (width - 2 * pad - gap * (cols - 1)) / cols
    widest = max(i.width for i in imgs)
    scale = min(1.0, cell_w / widest) * entry.get('scale', 1.0)
    imgs = [i.resize((round(i.width * scale), round(i.height * scale)), Image.LANCZOS) for i in imgs]
    rows = [imgs[i:i + cols] for i in range(0, len(imgs), cols)]
    height = sum(max(i.height for i in r) for r in rows) + gap * (len(rows) - 1) + 2 * pad
    canvas = backdrop((width, height), entry, root)
    y = pad
    for r in rows:
        row_h = max(i.height for i in r)
        for c, i in enumerate(r):
            x = pad + round(c * (cell_w + gap)) + round((cell_w - i.width) / 2)
            layer = card(i, entry.get('radius', 0)) if entry.get('radius') else i
            pos = (x, y + (row_h - i.height) // 2 if entry.get('valign') == 'middle' else y)
            if entry.get('shadow', True):
                with_shadow(canvas, layer, pos, blur=30, offset=(0, 14), opacity=0.14)
            else:
                canvas.alpha_composite(layer, pos)
        y += row_h + gap
    return canvas


def compose_timelapse(entry, root):
    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg is required for timelapse clips')
    size = tuple(entry.get('size', [1600, 900]))
    fps = entry.get('fps', 24)
    hold = entry.get('hold', 0.9)
    fade = entry.get('fade', 0.35)
    bg = backdrop(size, entry, root)
    frames = []
    for p in entry['sources']:
        img = load(root, p)
        if entry.get('phone', True):
            layer = fit_height(phone(img, entry.get('frame', True)), round(size[1] * entry.get('phoneHeight', 0.86)))
        else:
            layer = fit_width(img, round(size[0] * entry.get('itemWidth', 0.86)))
            if entry.get('radius'):
                layer = card(layer, entry['radius'])
        canvas = bg.copy()
        if entry.get('anchor') == 'bottom':
            # Like the real UI: the bar sits at the bottom and grows upward.
            pos = ((size[0] - layer.width) // 2, size[1] - layer.height - round(size[1] * entry.get('bottomPad', 0.08)))
        else:
            pos = ((size[0] - layer.width) // 2, (size[1] - layer.height) // 2)
        if entry.get('shadow', True):
            with_shadow(canvas, layer, pos)
        else:
            canvas.alpha_composite(layer, pos)
        frames.append(canvas.convert('RGB'))
    tmp = tempfile.mkdtemp(prefix='timelapse-')
    index = 0
    hold_n = max(1, round(hold * fps))
    fade_n = max(1, round(fade * fps))
    for i, frame in enumerate(frames):
        for _ in range(hold_n):
            frame.save(os.path.join(tmp, f'f{index:05d}.png')); index += 1
        nxt = frames[(i + 1) % len(frames)]
        for k in range(1, fade_n + 1):
            Image.blend(frame, nxt, k / (fade_n + 1)).save(os.path.join(tmp, f'f{index:05d}.png')); index += 1
    out = entry['out'] if os.path.isabs(entry['out']) else os.path.join(root, entry['out'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(tmp, 'f%05d.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', str(entry.get('crf', 21)), '-preset', 'slow', '-movflags', '+faststart', out,
    ], check=True)
    shutil.rmtree(tmp)
    if entry.get('poster'):
        save(frames[0], root, entry['poster'])
    return out


COMPOSERS = {
    'phone-row': compose_phone_row,
    'cover': compose_phone_row,
    'desktop': compose_desktop,
    'strip': compose_strip,
    'crop': compose_crop,
    'crop-row': compose_crop_row,
    'stack': compose_stack,
    'row': compose_row,
    'grid': compose_grid,
}


def main():
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    plan_path = os.path.abspath(args[0])
    only = args[args.index('--only') + 1] if '--only' in args else None
    root = os.path.dirname(plan_path)
    plan = json.load(open(plan_path))
    sources_root = plan.get('sourcesRoot')
    # "figma:<nodeId>" sources resolve through one or more JSON maps of
    # {nodeId: {path}} written while exporting (--source-map a.json,b.json).
    source_map = {}
    if '--source-map' in args:
        for file in args[args.index('--source-map') + 1].split(','):
            for node, info in json.load(open(file)).items():
                if isinstance(info, dict):
                    if not info.get('path'):
                        continue
                    source_map[node] = {'path': info['path'], 'scale': info.get('scale')}
                else:
                    source_map[node] = {'path': info, 'scale': None}

    class MissingSource(Exception):
        pass

    def resolve(path):
        if path.startswith('figma:'):
            node = path[len('figma:'):]
            if node not in source_map:
                raise MissingSource(node)
            return source_map[node]['path']
        if sources_root and not os.path.isabs(path):
            return os.path.join(sources_root, path)
        return path

    def scale_of(path):
        if path.startswith('figma:'):
            return source_map.get(path[len('figma:'):], {}).get('scale')
        return None

    skipped = []
    for entry in plan['compositions']:
        if only and entry['name'] != only:
            continue
        try:
            # Exports can come back at different scales; "scale": "auto" on a
            # crop reads each source's recorded scale instead of one number.
            entry['_sourceScales'] = [scale_of(p) for p in entry['sources']]
            entry['sources'] = [resolve(p) for p in entry['sources']]
            for decor in entry.get('decor', []):
                decor['path'] = resolve(decor['path'])
            if entry.get('bgImage'):
                entry['bgImage'] = resolve(entry['bgImage'])
        except MissingSource as e:
            skipped.append((entry['name'], str(e)))
            print(f"{entry['name']}: SKIPPED, no export for Figma node {e}")
            continue
        if entry['type'] == 'timelapse':
            out = compose_timelapse(entry, root)
            print(f"{entry['name']}: {out}")
            continue
        img = COMPOSERS[entry['type']](entry, root)
        path = save(img, root, entry['out'], entry.get('quality', 92))
        print(f"{entry['name']}: {path} {img.size[0]}x{img.size[1]}")
    if skipped:
        print(f"{len(skipped)} composition(s) skipped for missing exports: {', '.join(n for n, _ in skipped)}")
        sys.exit(2)


if __name__ == '__main__':
    main()
