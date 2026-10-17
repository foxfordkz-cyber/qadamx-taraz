"""MART exterior reconstructed from photographs; dimensions remain estimates.

The four small blind arches, offset pointed portal and brick relief are visible
in completed-building photographs. The 180 x 66 m body is a proportional model,
not an architectural survey. Roof, rear and full far-right termination are not
documented well enough to reproduce; those surfaces stay deliberately simple.
Source provenance and uncertainty are carried into CONFIG['reconstruction'].
"""
from venue_geometry import *


# Architectural colours follow exterior photographs independently of UI tokens.
# No downloaded texture or photographic pixels are used. The venue lettering
# and four coloured sign tiles are newly modelled from the built-facade photos.
PALETTE.update({
    "mart_brick": "625044", "mart_relief": "78604a", "mart_cream": "c8b995",
    "mart_screen": "f2eee4", "mart_joint": "26282a", "mart_plinth": "282b2e",
    "mart_glass": "3c5364", "mart_glass_light": "738794", "mart_window_blue": "284e7b",
    "mart_upper": "90938f", "mart_roof": "999b94", "mart_mortar": "816d59",
    "mart_cream_mortar": "aa9c7e", "mart_red": "e13950", "mart_sign": "242b34",
    "mart_yellow": "f2c62b", "mart_blue": "285cc7", "mart_green": "168e7c",
    "mart_pink": "d94665", "mart_grass": "63714c",
    "mart_ad_red": "ab6a67", "mart_ad_blue": "69839d",
    "mart_ad_white": "c3beaf", "mart_ad_yellow": "a99a6d",
})


def _face_strips(name, spans, z, mat, thickness=.022):
    """Batch shallow mortar courses as original geometry, not a bitmap texture."""
    verts, faces = [], []
    for x0, x1, y in spans:
        if x1 - x0 < .05:
            continue
        n = len(verts)
        verts += [(x0, y, z), (x1, y, z),
                  (x1, y + thickness, z), (x0, y + thickness, z)]
        faces.append((n, n + 1, n + 2, n + 3))
    if faces:
        mesh(name, verts, faces, mat)


def _courses(name, x0, x1, bottom, top, z, mat="mart_mortar"):
    _face_strips(name, [(x0, x1, bottom + i * .28)
                       for i in range(int((top - bottom) / .28) + 1)], z, mat)


def _lettering(text, x, y, z, size, mat="mart_red"):
    """Original sans-serif stroke solids, avoiding fragile font triangulation."""
    glyphs = {
        "M": [((0, 0), (0, 1), (.5, .42), (1, 1), (1, 0))],
        "A": [((0, 0), (.5, 1), (1, 0)), ((.22, .42), (.78, .42))],
        "R": [((0, 0), (0, 1), (.72, 1), (1, .82), (1, .63),
               (.72, .50), (0, .50)), ((.53, .50), (1, 0))],
        "T": [((0, 1), (1, 1)), ((.5, 1), (.5, 0))],
    }
    letter_w, letter_h, gap = size * .55, size * .74, size * .13
    half_stroke = size * .0375
    left = x - (len(text) * letter_w + (len(text) - 1) * gap) / 2
    for index, char in enumerate(text):
        for path in glyphs[char]:
            for a, b in zip(path, path[1:]):
                ax = left + index * (letter_w + gap) + a[0] * letter_w
                bx = left + index * (letter_w + gap) + b[0] * letter_w
                ay, by = y + (a[1] - .5) * letter_h, y + (b[1] - .5) * letter_h
                dx, dy = bx - ax, by - ay
                length = math.hypot(dx, dy)
                nx, ny = -dy / length * half_stroke, dx / length * half_stroke
                # Each stroke is a convex four-corner prism, with no outline
                # holes, collinear tessellation vertices, or zero-width tips.
                prism("MART letter " + char + " stroke",
                      [(ax + nx, ay + ny), (bx + nx, by + ny),
                       (bx - nx, by - ny), (ax - nx, ay - ny)], z, .09, mat)


def _venue_sign(cx):
    plaque = []
    radius = 1.3
    for ox, oy, start in ((7.35, 1.25, 0), (-7.35, 1.25, 90),
                          (-7.35, -1.25, 180), (7.35, -1.25, 270)):
        for step in range(7):
            a = math.radians(start + 90 * step / 6)
            plaque.append((cx + ox + radius * math.cos(a),
                           27.2 + oy + radius * math.sin(a)))
    prism("MART dark rounded sign plaque", plaque, 39.91, .46, "mart_sign")
    _lettering("MART", cx + 2.5, 27.2, 40.19, 3.65)
    # Four separate coloured lozenges are visible in both 2023 and 2025 photos.
    for dx, dy, mat in ((-1.0, 1.0, "mart_yellow"), (1.0, 1.0, "mart_pink"),
                        (-1.0, -1.0, "mart_blue"), (1.0, -1.0, "mart_green")):
        x, y = cx - 5.7 + dx, 27.2 + dy
        angle, half = -.30, .80
        pts = [(x + a * math.cos(angle) - b * math.sin(angle),
                y + a * math.sin(angle) + b * math.cos(angle))
               for a, b in ((-half, -half), (half, -half), (half, half), (-half, half))]
        prism("MART coloured emblem tile", pts, 40.20, .10, mat)


def _pointed_y(x, radius, spring, rise):
    """Two circular arcs meeting at a cusp, rather than a semicircle."""
    offset = (rise * rise - radius * radius) / (2 * radius)
    return spring + math.sqrt(max(0, (radius + offset) ** 2 - (abs(x) + offset) ** 2))


def _pointed_curve(cx, radius, spring, rise, steps=32):
    return [(cx + radius * (1 - 2 * i / steps),
             _pointed_y(radius * (1 - 2 * i / steps), radius, spring, rise))
            for i in range(steps + 1)]


def _ribbon(name, points, z, width, depth=.18, mat="mart_screen", taper=.20):
    """Solid scroll with local width limits so tight curls cannot fold faces."""
    n = len(points)
    normals, halves = [], []
    for i, (x, y) in enumerate(points):
        a, b = points[max(0, i - 1)], points[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        norm = math.hypot(dx, dy)
        normals.append((-dy / norm, dx / norm))
        halves.append(width * (.5 - taper * i / (n - 1)))
    # A wide offset on the inside of a small-radius bend can turn a quad into
    # a bow tie. Limit only the affected neighbouring widths, retaining the
    # broad outer leaves and the existing path. Explicit triangles below then
    # receive their own consistent normals before the exporter sees them.
    for _ in range(32):
        edges = [((p[0] + v[0] * h, p[1] + v[1] * h),
                  (p[0] - v[0] * h, p[1] - v[1] * h))
                 for p, v, h in zip(points, normals, halves)]
        folded = set()
        for i in range(n - 1):
            a, b = edges[i]
            d, c = edges[i + 1]
            for p, q, r in ((a, b, c), (a, c, d)):
                area = ((q[0] - p[0]) * (r[1] - p[1])
                        - (q[1] - p[1]) * (r[0] - p[0]))
                if area <= 1e-8:
                    folded.update((i, i + 1))
        if not folded:
            break
        for i in folded:
            halves[i] *= .8
    else:
        raise ValueError("Cannot form an unfolded scroll ribbon: " + name)
    verts = []
    for (x, y), (vx, vy), half in zip(points, normals, halves):
        nx, ny = vx * half, vy * half
        verts += [(x + nx, y + ny, z - depth / 2),
                  (x - nx, y - ny, z - depth / 2),
                  (x + nx, y + ny, z + depth / 2),
                  (x - nx, y - ny, z + depth / 2)]
    faces = [(0, 1, 3, 2), (4 * n - 4, 4 * n - 2, 4 * n - 1, 4 * n - 3)]
    for i in range(n - 1):
        a, b = 4 * i, 4 * (i + 1)
        faces += [(a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2),
                  (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)]
    triangles = [tri for a, b, c, d in faces for tri in ((a, b, c), (a, c, d))]
    mesh(name, verts, triangles, mat)


def _bezier_chain(segments, steps=6):
    points = []
    for segment in segments:
        for i in range(steps):
            t, u = i / steps, 1 - i / steps
            points.append(tuple(u ** 3 * segment[0][axis]
                                + 3 * u * u * t * segment[1][axis]
                                + 3 * u * t * t * segment[2][axis]
                                + t ** 3 * segment[3][axis] for axis in (0, 1)))
    return points + [segments[-1][-1]]


def _horn_path(x, y, h, side, flip=1, reach=.86, r0=.8, steps=18, stem_steps=5):
    """Ram-horn band: a short stalk from (x, y) curling outwards and back in.

    side=1 curls to +X, flip=-1 hangs the motif downwards. Newly drawn; the
    photographs show broad paired curls, not this exact outline.
    """
    centre = (reach, 1.3 * h)
    start = math.radians(170)
    join = (centre[0] + r0 * math.cos(start), centre[1] + r0 * math.sin(start))
    stem = _bezier_chain([((0, 0), (0, .45 * centre[1]),
                           (join[0] - .05, join[1] - .5 * centre[1]), join)], stem_steps)
    curl = []
    for i in range(1, steps + 1):
        t = i / steps
        r = r0 * (1 - .6 * t)
        a = start - math.radians(320) * t
        curl.append((centre[0] + r * math.cos(a), centre[1] + r * math.sin(a)))
    return [(x + side * px, y + flip * py) for px, py in stem + curl]


def _entrance_screen(cx, z):
    # kr2b's night photo and the El.kz 2023 daylight photo show a pale screen
    # filling the pointed opening above the doors: a frame of four columns and
    # two rows, with broad paired curls joined to it and dark gaps between.
    # Pale material dominates, so it reads as lace rather than separate glyphs.
    radius, spring, rise, bottom, split = 7.55, 9.8, 9.0, 4.45, 10.75
    tile = radius / 4
    curve = _pointed_curve(cx, radius, spring, rise)
    _ribbon("Pale screen arched frame", [(cx - radius, bottom)] + curve[::-1]
            + [(cx + radius, bottom)], z, .6, .22, taper=0)
    # Overlapping pale parts get different depths: coincident faces would
    # flicker in WebGL and render black in the Cycles preview.
    box("Pale screen bottom rail", (cx, bottom, z), (2 * radius + .6, .6, .26), "mart_screen", 0)
    box("Pale screen middle rail", (cx, split, z), (2 * radius - .1, .5, .24), "mart_screen", 0)
    for k in (-1, 0, 1):
        x = cx + k * 2 * tile
        top = _pointed_y(x - cx, radius, spring, rise) - .1
        box("Pale screen column bar", (x, (bottom + top) / 2, z), (.5, top - bottom, .28),
            "mart_screen", 0)
    for col in range(4):
        tx = cx - radius + tile * (2 * col + 1)
        top = min(_pointed_y(tx - cx + s * tile * .5, radius, spring, rise) for s in (-1, 1))
        for side in (-1, 1):
            depth = .19 + .015 * side
            _ribbon("Lower rising horn curl", _horn_path(tx, bottom + .25, 1.25, side), z, .9, depth)
            _ribbon("Lower hanging horn curl",
                    _horn_path(tx, split - .25, 1.0, side, -1, .82, .7), z, .8, depth)
            _ribbon("Upper rising horn curl", _horn_path(tx, split + .25, 1.35, side), z, .9, depth)
            if top - split > 6.5:
                _ribbon("Crown hanging horn curl",
                        _horn_path(tx, top - .3, .8, side, -1, .7, .55), z, .7, depth)


def _wing_tile(x, y, z, w=2.2, h=3.4):
    """Pale ornament tile of the right wing (El.kz 2023): frame and a horn pair."""
    for dy in (-1, 1):
        box("Wing ornament tile frame", (x, y + dy * (h / 2 - .11), z), (w, .22, .14), "mart_screen", 0)
    for dx in (-1, 1):
        box("Wing ornament tile frame", (x + dx * (w / 2 - .11), y, z), (.22, h - .44, .14),
            "mart_screen", 0)
    for side in (-1, 1):
        _ribbon("Wing ornament horn curl",
                _horn_path(x, y - h / 2 + .2, 1.45, side, 1, .5, .4, 9, 3), z, .46, .11 + .01 * side)


def _relief(x0, x1, y0, y1, z, step_x=1.45, step_y=1.25, name="Raised brick"):
    """Projecting blocks are photographed; their exact count is estimated."""
    row = 0
    y = y0
    while y <= y1:
        x = x0 + (.38 if row % 2 else 0)
        while x <= x1:
            box(name, (x, y, z), (.56, .27, .34), "mart_relief", 0)
            x += step_x
        y += step_y
        row += 1


def _glazing(name, x0, x1, bottom, top, z, spacing=3.0):
    box(name, ((x0 + x1) / 2, (bottom + top) / 2, z),
        (x1 - x0, top - bottom, .16), "mart_glass", 0)
    count = max(1, round((x1 - x0) / spacing))
    pane_width = (x1 - x0) / count
    for i in range(count):
        if i % 3 != 1:
            box(name + " reflected sky pane", (x0 + (i + .5) * pane_width,
                bottom + (top - bottom) * .75, z + .09),
                (pane_width - .14, (top - bottom) * .41, .018), "mart_glass_light", 0)
    for i in range(count + 1):
        x = x0 + (x1 - x0) * i / count
        box(name + " mullion", (x, (bottom + top) / 2, z + .11),
            (.11, top - bottom, .1), "mart_plinth", 0)
    for y in (bottom, top, bottom + (top - bottom) * .64):
        box(name + " transom", ((x0 + x1) / 2, y, z + .12),
            (x1 - x0, .1, .12), "mart_plinth", 0)


def _portal():
    # Photographs place the apex at roughly 55-60% of the tower height, leaving
    # a broad brick cap. The arch is not an opening almost as tall as the tower.
    cx, radius, spring, rise = -48, 8.3, 9.8, 10.6
    front, back = 39.5, 31.0
    curve = _pointed_curve(cx, radius, spring, rise)
    opening = [(cx - radius, .5), (cx + radius, .5)] + curve
    prism("Pointed entrance recessed glazing", opening, back + .17, .2, "mart_glass")
    # Piers and a shaped crown preserve a deep opening in front of dark glazing.
    for side in (-1, 1):
        box("Entrance tower brick pier", (cx + side * 10.9, (spring + .5) / 2, 35.25),
            (5.2, spring - .5, 8.5), "mart_brick", 0)
        _relief(cx + side * 10.9 - 1.9, cx + side * 10.9 + 1.9,
                3.0, 32.6, front + .14, step_x=1.35)
        box("Entrance inner pale return", (cx + side * (radius - .18),
            (spring + .5) / 2, 38.4), (.40, spring - .5, 2.2), "mart_cream", 0)
    crown = [(cx - 13.5, 34), (cx + 13.5, 34),
             (cx + 13.5, spring)] + curve + [(cx - 13.5, spring)]
    prism("Pointed entrance tower crown", crown, 35.25, 8.5, "mart_brick")
    for i in range(len(curve) - 1):
        a, b = curve[i], curve[i + 1]
        inside_a, inside_b = (a[0], a[1] - .48), (b[0], b[1] - .48)
        prism("Pointed arch pale soffit", [a, b, inside_b, inside_a],
              38.7, 1.6, "mart_cream")
    for y in (21.8, 23.2, 24.6, 26.0, 27.4, 28.8, 30.2, 31.6, 33.0):
        _relief(cx - 7.8, cx + 7.8, y, y, front + .14)
    box("Portal roof coping", (cx, 34.12, 35.25), (27.25, .24, 8.7), "mart_joint", 0)
    for y in (22.2, 30.6):
        box("Portal cap horizontal joint", (cx, y, front + .035),
            (26.9, .14, .08), "mart_joint", 0)
    # The oblique exterior views also reveal relief and panel joints on the
    # right return of the tower, a prominent surface in the default camera.
    for y in (10.0, 18.0, 26.0):
        box("Portal side horizontal joint", (cx + 13.54, y, 35.25),
            (.08, .065, 8.4), "mart_joint", 0)
    for y in (12.4, 15.0, 17.6, 20.2, 22.8, 25.4, 28.0, 30.6, 33.0):
        for z in (32.0, 33.7, 35.4, 37.1, 38.8):
            box("Portal return raised brick", (cx + 13.62, y, z),
                (.24, .23, .46), "mart_relief", 0)
    for y in (4.8, 11.6, 18.2, 25.4):
        for side in (-1, 1):
            box("Portal horizontal masonry joint", (cx + side * 10.9, y, front + .035),
                (5.1, .14, .08), "mart_joint", 0)
    for side in (-1, 1):
        box("Portal recessed upright joint", (cx + side * 8.7, 22.1, front + .035),
            (.12, 15.6, .08), "mart_joint", 0)
        box("Portal dark stone foot", (cx + side * 10.9, 2.6, front + .08),
            (5.2, 4.2, .16), "mart_plinth", 0)
    spans = []
    offset = (rise * rise - radius * radius) / (2 * radius)
    for row in range(116):
        y = 1.0 + row * .28
        if y >= spring + rise:
            spans.append((cx - 13.45, cx + 13.45, y))
        else:
            opening_half = radius if y <= spring else math.sqrt(
                max(0, (radius + offset) ** 2 - (y - spring) ** 2)) - offset
            spans.extend(((cx - 13.45, cx - opening_half - .12, y),
                          (cx + opening_half + .12, cx + 13.45, y)))
    _face_strips("Portal fine brick courses", spans, front + .055, "mart_mortar", .018)
    _entrance_screen(cx, 38.45)
    _glazing("Recessed entry doors", cx - 7.9, cx + 7.9, .56, 4.05, 36.0, 2.0)
    for dx in (-4.95, -1.0, 2.95, 6.9):
        box("Entrance door handle", (cx + dx, 2.35, 36.2), (.09, 1.15, .1), "mart_screen", 0)
    _venue_sign(cx)


def mart():
    base(198, 94)
    glass = material("mart_glass").node_tree.nodes.get("Principled BSDF")
    glass.inputs["Roughness"].default_value = .34
    # Aspect ratio follows 2GIS. All metre dimensions are proportional estimates.
    box("Long rectangular retail body", (0, 11.3, -2), (180, 21.6, 66), "mart_cream", .06)
    box("Recessed continuous upper mass", (0, 23.25, -3.3),
        (178, 5.3, 61.8), "mart_upper", .04)
    box("Unsurveyed simplified flat roof", (0, 25.96, -3.3),
        (178.4, .18, 62.2), "mart_roof", 0)
    for x in range(-88, 90, 8):
        box("Front recessed upper cladding seam", (x, 24.1, 27.65),
            (.065, 3.45, .08), "mart_joint", 0)
    for y in (23.0, 24.45, 25.7):
        box("Upper metal cladding horizontal joint", (0, y, 27.65),
            (178, .045, .08), "mart_joint", 0)
    # No unsupported loading bays, rooflights or HVAC layout are invented.
    for x in range(-84, 90, 12):
        box("Rear upper panel seam", (x, 23.35, -34.25), (.06, 4.65, .06), "mart_joint", 0)
    for z in range(-30, 30, 10):
        for side in (-1, 1):
            box("Side upper panel seam", (side * 89.04, 23.35, z),
                (.06, 4.65, .06), "mart_joint", 0)
    box("Facade dark plinth", (0, 2.5, 31.8), (180.1, 4, 1.7), "mart_plinth", 0)

    # Tall brick advertising wall to the left. The 2026 photo has an irregular
    # dark frame grid, not a two-tone checkerboard; tenant artwork changes.
    box("Left advertising wall", (-75.75, 13.9, 32.0),
        (28.5, 26.8, 3.5), "mart_cream", .04)
    for x in (-89.2, -62.3):
        box("Pale advertising wall return", (x, 14.0, 33.1),
            (1.6, 27, 2.4), "mart_cream", 0)
    box("Brick advertising field", (-75.75, 16.0, 33.84),
        (25.3, 20.6, .12), "mart_brick", 0)
    _courses("Advertising brick courses", -88.3, -63.2, 5.8, 26.2, 33.92)
    for x in (-88.35, -77.0, -63.15):
        box("Advertising board vertical frame", (x, 16.0, 33.98),
            (.16, 20.6, .13), "mart_joint", 0)
    for y in (5.75, 9.0, 13.0, 17.4, 26.3):
        box("Advertising board horizontal frame", (-75.75, y, 34.0),
            (25.35, .15, .15), "mart_joint", 0)
    # The 2GIS 2026 night photo confirms red, blue and pale sign zones in this
    # grid. Use smaller muted daytime suggestions, not copied tenant lettering.
    for x, y, width, mat in ((-82.7, 23.4, 7.8, "mart_ad_red"),
                            (-69.9, 23.9, 10.1, "mart_ad_white"),
                            (-69.9, 21.4, 9.8, "mart_ad_blue"),
                            (-69.9, 18.9, 10.4, "mart_ad_white"),
                            (-82.7, 18.7, 8.5, "mart_ad_white"),
                            (-82.7, 15.2, 8.9, "mart_ad_red"),
                            (-69.9, 15.2, 10.0, "mart_ad_white"),
                            (-82.7, 11.1, 8.3, "mart_ad_yellow"),
                            (-69.9, 11.1, 9.7, "mart_ad_red"),
                            (-82.7, 7.3, 8.8, "mart_ad_white"),
                            (-69.9, 7.3, 9.3, "mart_ad_white")):
        for i in range(5):
            box("Abstract tenant sign strokes", (x - width / 2 + width * (i + .5) / 5,
                y + (.07 if i % 2 else -.07), 34.06),
                (width / 7.3, .34 if i % 3 else .47, .08), mat, 0)
    _glazing("Left ground storefront", -88.2, -63.1, .6, 5.75, 33.94, 2.8)
    _portal()

    # Pale recessed connector and its upper window are clear in the construction
    # and 2025 photographs. The four brick bays start on its right.
    box("Pale entrance connector", (-32.5, 11.4, 32.35),
        (4, 21.8, 2.5), "mart_cream", 0)
    _glazing("Pale connector upper inset window", -34.1, -30.9, 16.6, 19.6, 33.66, 1.6)
    _glazing("Pale connector lower entrance", -34.1, -30.9, .6, 4.8, 33.67, 1.6)
    _courses("Connector pale brick courses", -34.45, -30.55, 5.2, 16.3,
             33.62, "mart_cream_mortar")
    box("Four bay brown brick frontage", (-4.0, 11.4, 32.35),
        (53, 21.8, 2.5), "mart_brick", .035)
    for bay, x in enumerate((-23.5, -10.5, 2.5, 15.5)):
        arch("Cream blind arch %d" % (bay + 1), x, 4.9, 12.25,
             4.65, 33.67, "mart_cream", .15)
        _glazing("Arched bay ground storefront", x - 4.7, x + 4.7,
                 .6, 5.35, 33.84, 2.35)
        spans = []
        for row in range(41):
            y = 5.5 + row * .28
            half = 4.62 if y <= 12.25 else math.sqrt(max(0, 4.62 ** 2 - (y - 12.25) ** 2))
            spans.append((x - half, x + half, y))
        _face_strips("Cream arch fine brick courses", spans, 33.76, "mart_cream_mortar", .019)
        _courses("Brick bay upper masonry courses", x - 6.36, x + 6.36,
                 17.1, 22.2, 33.64)
        for side in (-1, 1):
            _courses("Brick arch pier courses", x + side * 5.45 - .65,
                     x + side * 5.45 + .65, 5.6, 16.9, 33.64)
        if bay in (0, 2, 3):
            box("Shopfront blue display band", (x, 3.2, 33.95),
                (9.1, 1.35, .035), "mart_window_blue", 0)
        _relief(x - 5.5, x + 5.5, 18.1, 21.7, 33.76, step_x=1.42, step_y=1.12)
        for y in (6.2, 9.0, 11.8, 14.6):
            for side in (-1, 1):
                box("Brick pier relief", (x + side * 5.45, y, 33.77),
                    (.56, .27, .34), "mart_relief", 0)
        for y in (17.5, 22.25):
            box("Brick frieze horizontal joint", (x, y, 33.68),
                (12.9, .16, .10), "mart_joint", 0)
        box("Brick bay vertical joint", (x + 6.45, 14.0, 33.68),
            (.16, 16.3, .10), "mart_joint", 0)

    # Lower wing in the El.kz 2023 photograph; cropped far-end counts estimated.
    box("Right lower wing", (56.5, 10.25, 32.0),
        (67, 19.5, 2), "mart_brick", .03)
    _glazing("Right wing upper ribbon glazing", 24.0, 89.4, 13.2, 17.8, 33.15, 3.15)
    box("Right wing pale fascia", (56.5, 18.8, 33.25),
        (67, 1.8, .35), "mart_screen", 0)
    _glazing("Right wing ground storefront", 24.0, 89.4, .6, 5.25, 33.2, 3.15)
    for i, x in enumerate((29.5, 41.5, 53.5, 65.5, 77.5, 88.0)):
        box("Right wing pale pier", (x, 11.5, 33.38), (.65, 14.5, .5), "mart_cream", 0)
        if i < 5:
            centre = x + 5.8
            box("Right wing ornament dark inset", (centre, 9.1, 33.22),
                (9.6, 4.2, .13), "mart_joint", 0)
            for dx in (-3.55, -1.18, 1.18, 3.55):
                _wing_tile(centre + dx, 9.1, 33.42)
    box("Front roof edge", (6.0, 22.48, 32.6), (33, .25, 2.7), "mart_joint", 0)

    # Forecourt is context, not a surveyed pedestrian route.
    box("Entrance paved approach", (-48, .54, 42.0),
        (24, .08, 9), "porcelain", .015)
    for x in range(-90, 96, 12):
        box("Forecourt paving joint", (x, .514, 40.0),
            (.06, .02, 12.2), "edge", 0)
    for x in (-91, -71, -22, 24, 70, 92):
        box("Forecourt narrow grass bed", (x, .56, 41.5),
            (5.4, .08, 3.7), "mart_grass", .02)
        box("Forecourt tree planter", (x, .8, 41.5), (2.6, .6, 2.6), "edge", .08)
        box("Forecourt tree trunk", (x, 2.8, 41.5), (.26, 4.0, .26), "mart_brick", 0)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1,
            location=xyz((x, 5.2, 41.5)))
        obj = bpy.context.object
        obj.scale = (1.65, 1.65, 2.4)
        finish(obj, "Forecourt tree crown", "foliage")
    for x in (-81, -8, 42, 82):
        box("Slim forecourt lamp pole", (x, 4.7, 43.8), (.16, 8.4, .16), "mart_plinth", 0)
        box("Forecourt lamp head", (x, 8.9, 43.5), (1.0, .19, .9), "mart_plinth", .025)
    for x in (-65, -31, 56):
        for dz in (-.36, 0, .36):
            box("Forecourt bench slat", (x, 1.1, 44.2 + dz),
                (3.8, .15, .28), "mart_relief", .015)
        for dx in (-1.5, 1.5):
            box("Forecourt bench foot", (x + dx, .8, 44.2),
                (.18, .6, 1.05), "mart_plinth", 0)


CONFIG = {
    "name": "MART", "build": mart,
    "label_ru": "По фотографиям · размеры оценочные",
    "label_kk": "Фотосуреттер бойынша · өлшемдері болжамды",
    "geometry_status": "reference_based",
    "camera": [32, 48, 295], "target": [0, 11, 12], "render_scale": 214,
    "preview_camera": [-86, 30, 225], "preview_target": [-31, 17, 33], "preview_scale": 98,
    "render_exposure": -.2,
    "hotspots": [[-75, 7, 35.5], [-14, 7.1, 35.8], [57, 6.8, 35.8]],
    "reconstruction": {
        "researched_on": "2026-10-15",
        "accuracy": "Оригинальная реконструкция по фотографиям; не обмерная модель 1:1.",
        "coverage": "Главный уличный фасад и вход изучены с нескольких ракурсов; контур сопоставлен с 2ГИС. Крыша, задняя сторона и дальний конец правого крыла подтверждены частично.",
        "confirmed": [
            "Вытянутый комплекс; главный вход смещён к левому краю уличного фасада.",
            "Высокий прямоугольный кирпичный портал со стрельчатым проёмом и светлым растительным орнаментом.",
            "Красные буквы MART на тёмной скруглённой плашке и четырёхцветный знак над входом.",
            "Вершина проёма находится примерно на 55–60% высоты башни; над ней широкий кирпичный участок и плашка вывески.",
            "Четыре небольшие арки справа от входа: светлое глухое заполнение сверху, остекление снизу.",
            "Тёплая коричневая кирпичная облицовка, ряды выступающих блоков, тёмные панельные швы и почти чёрный цоколь.",
            "Плоская рекламная стена слева, низкое протяжённое крыло справа, отступающий верхний объём."
        ],
        "estimated": [
            "Размер основного корпуса 180 × 66 м и высоты 20–34 м приняты по пропорциям; точных обмеров нет.",
            "Отношение длины к глубине около 2.7:1 — визуальная оценка картографического контура.",
            "Плотный четырёхколоночный орнамент и вывеска созданы заново из геометрии; точное начертание не копируется.",
            "Цветные штрихи в рекламном блоке передают расположение вывесок без утверждения актуальных арендаторов; число выступов и дальних панелей условное.",
            "Крыша и закрытые стороны упрощены; оборудование и неподтверждённые проёмы не реконструированы.",
            "Покрытие, деревья, светильники и учебные hotspot не задают точную планировку или путь к продавцу."
        ],
        "source_urls": [
            "https://www.kr2b.com/taraz-mart",
            "https://www.kr2b.com/taraz-mart?lightbox=dataItem-k2lx6rbr",
            "https://www.kr2b.com/taraz-mart?lightbox=dataItem-k2oht0ux1",
            "https://2gis.kz/taraz/geo/70030076203041976",
            "https://2gis.kz/taraz/gallery/firm/70000001053119298/photoId/30258560238906207",
            "https://2gis.kz/taraz/gallery/firm/70000001053119298/photoId/30258560330555256",
            "https://foto-planeta.com/photo/1156867.html",
            "https://el.kz/ru/lyudey-iz-samogo-bolshogo-trts-v-taraze-evakuirovali-iz-za-zadymivshegosya-masla-vo-frityurnitse_91013/"
        ]
    }
}
