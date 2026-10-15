"""MART exterior reconstructed from photographs; dimensions remain estimates.

The four small blind arches, offset pointed portal and brick relief are visible
in completed-building photographs. The 180 x 66 m body is a proportional model,
not an architectural survey. Roof, rear and full far-right termination are not
documented well enough to reproduce; those surfaces stay deliberately simple.
Source provenance and uncertainty are carried into CONFIG['reconstruction'].
"""
from venue_geometry import *


# Architectural colours follow exterior photographs independently of UI tokens.
# No downloaded texture, tenant logo or photographic pixels are used.
PALETTE.update({
    "mart_brick": "76604f", "mart_relief": "8a6b4c", "mart_cream": "c9bb9e",
    "mart_screen": "ebe4d7", "mart_joint": "514d47", "mart_plinth": "464745",
    "mart_glass": "46575b", "mart_upper": "9d9b94", "mart_roof": "a5a39b",
})


def _pointed_y(x, radius, spring, rise):
    """Two circular arcs meeting at a cusp, rather than a semicircle."""
    offset = (rise * rise - radius * radius) / (2 * radius)
    return spring + math.sqrt(max(0, (radius + offset) ** 2 - (abs(x) + offset) ** 2))


def _pointed_curve(cx, radius, spring, rise, steps=32):
    return [(cx + radius * (1 - 2 * i / steps),
             _pointed_y(radius * (1 - 2 * i / steps), radius, spring, rise))
            for i in range(steps + 1)]


def _ribbon(name, points, z, width, depth=.18, mat="mart_screen"):
    """Original solid scroll ribbon, with quad strips and no external shader."""
    verts = []
    n = len(points)
    for i, (x, y) in enumerate(points):
        a, b = points[max(0, i - 1)], points[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        norm = math.hypot(dx, dy)
        half = width * (.5 - .20 * i / (n - 1))
        nx, ny = -dy / norm * half, dx / norm * half
        verts += [(x + nx, y + ny, z - depth / 2),
                  (x - nx, y - ny, z - depth / 2),
                  (x + nx, y + ny, z + depth / 2),
                  (x - nx, y - ny, z + depth / 2)]
    faces = [(0, 1, 3, 2), (4 * n - 4, 4 * n - 2, 4 * n - 1, 4 * n - 3)]
    for i in range(n - 1):
        a, b = 4 * i, 4 * (i + 1)
        faces += [(a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2),
                  (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)]
    mesh(name, verts, faces, mat)


def _scroll_pair(name, cx, cy, radius, z, width=.76):
    """A new paired ram-horn motif inspired by the photographed pale screen."""
    for side in (-1, 1):
        points = []
        for i in range(25):
            t = i / 24
            angle = -math.pi / 2 + 1.85 * math.pi * t
            r = radius * (1 - .78 * t)
            points.append((cx + side * (radius * .9 + r * math.cos(angle)),
                           cy + r * math.sin(angle)))
        _ribbon(name, points, z, width)


def _relief(x0, x1, y0, y1, z, step_x=1.45, step_y=1.25, name="Raised brick"):
    """Projecting blocks are photographed; their exact count is estimated."""
    row = 0
    y = y0
    while y <= y1:
        x = x0 + (.38 if row % 2 else 0)
        while x <= x1:
            box(name, (x, y, z), (.46, .23, .24), "mart_relief", 0)
            x += step_x
        y += step_y
        row += 1


def _glazing(name, x0, x1, bottom, top, z, spacing=3.0):
    box(name, ((x0 + x1) / 2, (bottom + top) / 2, z),
        (x1 - x0, top - bottom, .16), "mart_glass", 0)
    count = max(1, round((x1 - x0) / spacing))
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
        box("Entrance inner pale return", (cx + side * (radius - .10),
            (spring + .5) / 2, 38.5), (.22, spring - .5, 1.9), "mart_cream", 0)
    crown = [(cx - 13.5, 34), (cx + 13.5, 34),
             (cx + 13.5, spring)] + curve + [(cx - 13.5, spring)]
    prism("Pointed entrance tower crown", crown, 35.25, 8.5, "mart_brick")
    for i in range(len(curve) - 1):
        a, b = curve[i], curve[i + 1]
        inside_a, inside_b = (a[0], a[1] - .24), (b[0], b[1] - .24)
        prism("Pointed arch pale soffit", [a, b, inside_b, inside_a],
              38.7, 1.6, "mart_cream")
    for y in (21.8, 23.2, 24.6, 26.0, 27.4, 28.8, 30.2, 31.6, 33.0):
        _relief(cx - 7.8, cx + 7.8, y, y, front + .14)
    box("Portal roof coping", (cx, 34.12, 35.25), (27.25, .24, 8.7), "mart_joint", 0)
    for y in (22.2, 30.6):
        box("Portal cap horizontal joint", (cx, y, front + .035),
            (26.9, .065, .08), "mart_joint", 0)
    # The oblique exterior views also reveal relief and panel joints on the
    # right return of the tower, a prominent surface in the default camera.
    for y in (10.0, 18.0, 26.0):
        box("Portal side horizontal joint", (cx + 13.54, y, 35.25),
            (.08, .065, 8.4), "mart_joint", 0)
    for y in (12.4, 15.0, 17.6, 20.2, 22.8, 25.4, 28.0, 30.6, 33.0):
        for z in (32.0, 33.7, 35.4, 37.1, 38.8):
            box("Portal return raised brick", (cx + 13.62, y, z),
                (.24, .23, .46), "mart_relief", 0)
    for y in (9.2, 18.0, 27.1):
        for side in (-1, 1):
            box("Portal horizontal masonry joint", (cx + side * 10.9, y, front + .035),
                (5.1, .055, .08), "mart_joint", 0)
    # Original curving motifs reproduce the pale scroll character, rather than
    # copying the precise screen artwork or using a diagonal diamond lattice.
    for row, (cy, r, width) in enumerate(((8.9, 3.6, 1.9), (13.9, 2.9, 1.65),
                                         (17.7, 1.75, 1.15))):
        _scroll_pair("Entrance paired scroll %d" % row, cx, cy, r, 38.45, width)
    for side in (-1, 1):
        points = [(cx + side * (.45 + .65 * math.sin(i * math.pi / 16)),
                   4.25 + 14.2 * i / 24) for i in range(25)]
        _ribbon("Entrance scrolling stem", points, 38.46, .85)
    box("Entry screen lower rail", (cx, 4.25, 38.45), (16.1, .32, .2), "mart_screen", 0)
    _glazing("Recessed entry doors", cx - 7.9, cx + 7.9, .56, 4.05, 36.0, 2.0)
    for dx in (-4.95, -1.0, 2.95, 6.9):
        box("Entrance door handle", (cx + dx, 2.35, 36.2), (.09, 1.15, .1), "mart_screen", 0)
    # The accessible venue name is HTML; tenant logos are not copied.
    box("Entrance sign backing", (cx, 26.3, 39.85), (14.2, 4.3, .36), "mart_plinth", .48)


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
    # No unsupported loading bays, rooflights or HVAC layout are invented.
    for x in range(-84, 90, 12):
        box("Rear upper panel seam", (x, 23.35, -34.25), (.06, 4.65, .06), "mart_joint", 0)
    for z in range(-30, 30, 10):
        for side in (-1, 1):
            box("Side upper panel seam", (side * 89.04, 23.35, z),
                (.06, 4.65, .06), "mart_joint", 0)
    box("Facade dark plinth", (0, 2.5, 31.8), (180.1, 4, 1.7), "mart_plinth", 0)

    # Tall advertising wall to the left. Graphics change, so panels stay neutral.
    box("Left advertising wall", (-75.75, 13.9, 32.0),
        (28.5, 26.8, 3.5), "mart_cream", .04)
    for x in (-89.2, -62.3):
        box("Pale advertising wall return", (x, 14.0, 33.1),
            (1.6, 27, 2.4), "mart_cream", 0)
    for row, (bottom, top) in enumerate(((6.1, 14.4), (14.7, 25.9))):
        for col in range(3):
            x = -84.2 + col * 8.4
            box("Neutral advertising panel", (x, (bottom + top) / 2, 33.86),
                (8.16, top - bottom, .12), "mart_upper" if (row + col) % 2 else "mart_plinth", 0)
    _glazing("Left ground storefront", -88.2, -63.1, .6, 5.75, 33.94, 2.8)
    _portal()

    # Narrow pale connector, then FOUR small arches, all to the portal's right.
    box("Pale entrance connector", (-32.5, 11.4, 32.35),
        (4, 21.8, 2.5), "mart_cream", 0)
    box("Four bay brown brick frontage", (-4.0, 11.4, 32.35),
        (53, 21.8, 2.5), "mart_brick", .035)
    for bay, x in enumerate((-23.5, -10.5, 2.5, 15.5)):
        arch("Cream blind arch %d" % (bay + 1), x, 4.9, 12.25,
             4.65, 33.67, "mart_cream", .15)
        _glazing("Arched bay ground storefront", x - 4.7, x + 4.7,
                 .6, 5.35, 33.84, 2.35)
        for y in (6.3, 8.6, 10.9, 13.1, 15.3):
            half = 4.62 if y <= 12.25 else math.sqrt(max(0, 4.62 ** 2 - (y - 12.25) ** 2))
            box("Cream masonry course", (x, y, 33.77),
                (half * 2, .045, .035), "mart_upper", 0)
        _relief(x - 5.5, x + 5.5, 18.1, 21.7, 33.76, step_x=1.42, step_y=1.12)
        for y in (6.2, 9.0, 11.8, 14.6):
            for side in (-1, 1):
                box("Brick pier relief", (x + side * 5.45, y, 33.77),
                    (.46, .23, .24), "mart_relief", 0)
        for y in (17.5, 22.25):
            box("Brick frieze horizontal joint", (x, y, 33.68),
                (12.9, .065, .06), "mart_joint", 0)
        box("Brick bay vertical joint", (x + 6.45, 14.0, 33.68),
            (.07, 16.3, .06), "mart_joint", 0)

    # Lower wing in the El.kz 2023 photograph; cropped far-end counts estimated.
    box("Right lower wing", (56.5, 10.25, 32.0),
        (67, 19.5, 2), "mart_cream", .03)
    _glazing("Right wing upper ribbon glazing", 24.0, 89.4, 13.2, 17.8, 33.15, 3.15)
    box("Right wing pale fascia", (56.5, 18.8, 33.25),
        (67, 1.8, .35), "mart_screen", 0)
    _glazing("Right wing ground storefront", 24.0, 89.4, .6, 5.25, 33.2, 3.15)
    for i, x in enumerate((29.5, 41.5, 53.5, 65.5, 77.5, 88.0)):
        box("Right wing pale pier", (x, 11.5, 33.38), (1.1, 14.5, .5), "mart_cream", 0)
        if i < 5:
            centre = x + 5.8
            box("Right wing ornament dark inset", (centre, 9.1, 33.22),
                (7.6, 5.4, .13), "mart_brick", 0)
            _scroll_pair("Right wing pale ornamental panel", centre, 9.25, 1.72, 33.42, .43)
    box("Front roof edge", (6.0, 22.48, 32.6), (33, .25, 2.7), "mart_joint", 0)

    # Forecourt is context, not a surveyed pedestrian route.
    box("Entrance paved approach", (-48, .54, 42.0),
        (24, .08, 9), "porcelain", .015)
    for x in range(-90, 96, 12):
        box("Forecourt paving joint", (x, .514, 40.0),
            (.06, .02, 12.2), "edge", 0)
    for x in (-91, -71, -22, 24, 70, 92):
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
    "camera": [105, 92, 260], "target": [0, 10, 0], "render_scale": 222,
    "render_exposure": -.2,
    "hotspots": [[-75, 7, 35.5], [-14, 7.1, 35.8], [57, 6.8, 35.8]],
    "reconstruction": {
        "researched_on": "2026-10-15",
        "accuracy": "Оригинальная реконструкция по фотографиям; не обмерная модель 1:1.",
        "coverage": "Главный уличный фасад и вход изучены с нескольких ракурсов; контур сопоставлен с 2ГИС. Крыша, задняя сторона и дальний конец правого крыла подтверждены частично.",
        "confirmed": [
            "Вытянутый комплекс; главный вход смещён к левому краю уличного фасада.",
            "Высокий прямоугольный кирпичный портал со стрельчатым проёмом и светлым растительным орнаментом.",
            "Вершина проёма находится примерно на 55–60% высоты башни; над ней широкий кирпичный участок и плашка вывески.",
            "Четыре небольшие арки справа от входа: светлое глухое заполнение сверху, остекление снизу.",
            "Коричнево-серая кирпичная облицовка, мелкие выступающие блоки, тёмный цоколь и светлые вставки.",
            "Плоская рекламная стена слева, низкое протяжённое крыло справа, отступающий верхний объём."
        ],
        "estimated": [
            "Размер основного корпуса 180 × 66 м и высоты 20–34 м приняты по пропорциям; точных обмеров нет.",
            "Отношение длины к глубине около 2.7:1 — визуальная оценка картографического контура.",
            "Рисунок орнамента создан заново и упрощён; число кирпичных выступов и панелей дальнего крыла условное.",
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
