"""Concept model of a Taraz livestock market (Mal bazar).

No candidate market has a confirmed official address, see
assets/venues/research/mal-bazar-research.json. The layout is therefore a
concept, not a reconstruction of one place. It combines features that recur in
the dated 2024-2025 photographs of livestock yards near Taraz: an open earth
yard behind a white perimeter wall, steel pipe tethering rails, wire-mesh pens,
long pitched metal roofs and trucks unloading animals. The gate board says only
the generic words "МАЛ БАЗАР"; no market name, brand or sign is copied. The
animal figures are decorative and do not show stock or availability.
"""
import bmesh

from venue_geometry import *

PALETTE.update({
    "mal_earth": "b39a7a", "mal_earth_dark": "9c8466",
    "mal_wall": "e7e3d8", "mal_plinth": "a49a8b",
    "mal_steel": "6f767a", "mal_steel_dark": "33393c",
    "mal_roof": "b3bcbe", "mal_roof_seam": "8e999d",
    "mal_board": "164c3e", "mal_letters": "e4f222",
    "mal_truck": "3f6b9a", "mal_slat": "8a6e4f",
    "mal_cow": "7a5038", "mal_cow_light": "e9e4da",
    "mal_wool": "ddd3c2", "mal_dark": "3a3029",
})

YARD_W, YARD_D = 64, 44
FRONT, BACK = YARD_D / 2, -YARD_D / 2
TOP = .4  # Earth surface height.


def rail(name, a, b, mat="mal_steel", width=.09):
    return beam(name, a, b, width, mat)


def roof_along_x(name, x, z, length, depth, eave, rise, mat="mal_roof"):
    """Pitched roof whose ridge runs along X (for sheds parallel to the back wall)."""
    half = depth / 2
    profile = [(z - half, eave), (z, eave + rise), (z + half, eave),
               (z + half, eave - .2), (z, eave + rise - .2), (z - half, eave - .2)]
    verts = [(x + dx, y, zz) for dx in (-length / 2, length / 2) for zz, y in profile]
    n = len(profile)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, verts, faces, mat)


def letters(name, value, x, y, z, size, mat):
    """Generic board words as original font geometry; zero-area slivers removed."""
    data = bpy.data.curves.new(name, "FONT")
    data.body = value
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    data.space_character = 1.12
    data.resolution_u = 2
    data.extrude = .015
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj.location = xyz((x, y, z))
    obj.rotation_euler[0] = math.pi / 2
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    shape = bmesh.new()
    shape.from_mesh(obj.data)
    bmesh.ops.triangulate(shape, faces=list(shape.faces))
    slivers = [face for face in shape.faces if face.calc_area() <= 1e-5]
    if slivers:
        bmesh.ops.delete(shape, geom=slivers, context="FACES")
    shape.to_mesh(obj.data)
    shape.free()
    obj.data.update()
    finish(obj, name, mat)


def wall_run(name, a, b, z_or_x, along="x", height=2.3):
    """White panel wall with dark steel posts every four metres."""
    length = abs(b - a)
    mid = (a + b) / 2
    if along == "x":
        box(name, (mid, TOP + height / 2, z_or_x), (length, height, .22), "mal_wall", 0)
        box(name + " plinth", (mid, TOP + .2, z_or_x), (length, .4, .3), "mal_plinth", 0)
    else:
        box(name, (z_or_x, TOP + height / 2, mid), (.22, height, length), "mal_wall", 0)
        box(name + " plinth", (z_or_x, TOP + .2, mid), (.3, .4, length), "mal_plinth", 0)
    posts = max(2, int(length / 4) + 1)
    for i in range(posts):
        t = a + (b - a) * i / (posts - 1)
        center = (t, TOP + height / 2 + .1, z_or_x) if along == "x" else (z_or_x, TOP + height / 2 + .1, t)
        box(name + " steel post", center, (.18, height + .2, .3) if along == "x" else (.3, height + .2, .18), "mal_steel_dark", 0)


def gate():
    """Entrance on the +Z front: two pillars, a lintel and a generic board."""
    for side in (-1, 1):
        x = side * 5.2
        box("Gate pillar", (x, TOP + 2.7, FRONT), (1.1, 5.4, 1.1), "mal_wall", .04)
        box("Gate pillar plinth", (x, TOP + .35, FRONT), (1.3, .7, 1.3), "mal_plinth", .03)
        box("Gate pillar cap", (x, TOP + 5.5, FRONT), (1.3, .25, 1.3), "mal_steel_dark", 0)
        # Open steel gate leaf swung inward along the wall.
        hinge = side * 4.6
        tip = side * 1.0
        zz = FRONT - 2.4
        for y in (TOP + .3, TOP + 1.2, TOP + 2.1):
            rail("Open gate leaf rail", (hinge, y, FRONT - .3), (tip, y, zz), "mal_steel_dark", .08)
        for t in (0, .5, 1):
            gx, gz = hinge + (tip - hinge) * t, FRONT - .3 + (zz - FRONT + .3) * t
            rail("Open gate leaf upright", (gx, TOP + .25, gz), (gx, TOP + 2.15, gz), "mal_steel_dark", .08)
    box("Gate steel lintel", (0, TOP + 5.0, FRONT), (11.5, .45, .5), "mal_steel_dark", 0)
    box("Gate board", (0, TOP + 6.15, FRONT), (9.6, 1.75, .3), "mal_board", .03)
    box("Gate board lower edge", (0, TOP + 5.32, FRONT + .02), (9.6, .12, .34), "mal_letters", 0)
    letters("Gate board words", "МАЛ БАЗАР", 0, TOP + 6.2, FRONT + .17, 1.05, "mal_letters")


def pen(x, z, w, d):
    """Wire-mesh pen: posts and two rails; the mesh itself is suggested, not drawn."""
    corners = [(x - w / 2, z - d / 2), (x + w / 2, z - d / 2), (x + w / 2, z + d / 2), (x - w / 2, z + d / 2)]
    for cx, cz in corners:
        box("Pen corner post", (cx, TOP + .7, cz), (.12, 1.4, .12), "mal_steel_dark", 0)
    for (ax, az), (bx, bz) in zip(corners, corners[1:] + corners[:1]):
        for y in (TOP + .55, TOP + 1.3):
            rail("Pen mesh rail", (ax, y, az), (bx, y, bz), "mal_steel", .06)
        mx, mz = (ax + bx) / 2, (az + bz) / 2
        box("Pen mid post", (mx, TOP + .7, mz), (.1, 1.4, .1), "mal_steel_dark", 0)


def canopy(x, z, width, depth, eave=4.4, rise=1.3):
    """Open pitched metal roof on steel posts over the tethering aisle."""
    pitched_roof("Long pitched metal canopy", x, z, width, depth, eave, rise, "mal_roof")
    seams = int(depth / 6)
    for i in range(seams + 1):
        zz = z - depth / 2 + i * depth / seams
        for side in (-1, 1):
            rail("Canopy roof seam", (x, eave + rise + .01, zz), (x + side * width / 2, eave + .01, zz), "mal_roof_seam", .05)
            box("Canopy steel post", (x + side * (width / 2 - .4), (TOP + eave) / 2, zz), (.16, eave - TOP, .16), "mal_steel_dark", 0)


def tether_rails(x, z0, z1):
    """Horizontal steel pipe on short posts where cattle are tied."""
    rail("Tethering pipe", (x, TOP + 1.05, z0), (x, TOP + 1.05, z1), "mal_steel", .1)
    steps = int(abs(z1 - z0) / 3)
    for i in range(steps + 1):
        zz = z0 + (z1 - z0) * i / steps
        cylinder("Tethering pipe post", (x, TOP + .55, zz), .06, 1.1, "mal_steel", 8)


def shed(x, z, length, depth):
    """Closed low shed with white walls and a pitched metal roof along the back wall."""
    box("Shed white walls", (x, TOP + 1.6, z), (length, 3.2, depth), "mal_wall", .03)
    roof_along_x("Shed pitched metal roof", x, z, length + .6, depth + .8, TOP + 3.2, 1.0)
    for i in range(int(length / 6)):
        dx = x - length / 2 + 3 + i * 6
        box("Shed door", (dx, TOP + 1.1, z + depth / 2 + .02), (1.6, 2.2, .06), "mal_steel", 0)


def truck(x, z, facing=1):
    """Livestock truck silhouette at the unloading ramp (generic, no markings)."""
    box("Truck cab", (x, TOP + 1.55, z + facing * 3.2), (2.4, 2.3, 2.0), "mal_truck", .08)
    box("Truck chassis", (x, TOP + .75, z), (2.2, .5, 8.6), "mal_steel_dark", 0)
    box("Truck slatted body floor", (x, TOP + 1.15, z - facing * 1.0), (2.5, .3, 6.2), "mal_slat", 0)
    for y in (TOP + 1.6, TOP + 2.1, TOP + 2.6):
        for side in (-1, 1):
            box("Truck body slat", (x + side * 1.2, y, z - facing * 1.0), (.1, .22, 6.2), "mal_slat", 0)
    for dz in (-3.2, -1.2, 2.8):
        for side in (-1, 1):
            cylinder("Truck wheel", (x + side * 1.1, TOP + .5, z + facing * dz), .5, .35, "mal_dark", 12)


def ramp(x, z_high, length, width=2.6):
    """Earth-and-concrete wedge from the truck floor down to the yard."""
    h = TOP + 1.25
    verts = [(x - width / 2, TOP, z_high), (x - width / 2, h, z_high), (x - width / 2, TOP, z_high - length),
             (x + width / 2, TOP, z_high), (x + width / 2, h, z_high), (x + width / 2, TOP, z_high - length)]
    faces = [(0, 1, 2), (3, 5, 4), (0, 2, 5, 3), (0, 3, 4, 1), (1, 4, 5, 2)]
    return mesh("Unloading ramp", verts, faces, "mal_plinth")


def cow(x, z, facing=1, mat="mal_cow"):
    """Decorative low-poly cattle figure, not a stock count."""
    s = 1.0
    def p(a, b, c=0):
        return (x + facing * a * s, TOP + b * s, z + c * s)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=xyz(p(0, 1.25)))
    body = bpy.context.object
    body.scale = (1.15, .42, .55)
    finish(body, "Decorative cow body", mat)
    box("Decorative cow head", p(-1.35, 1.35), (.5, .42, .36), mat, .05)
    for a in (-.75, .7):
        for c in (-.22, .22):
            beam("Decorative cow leg", p(a, .85, c), p(a, .02, c), .14, "mal_dark")


def sheep(x, z, facing=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=xyz((x, TOP + .62, z)))
    body = bpy.context.object
    body.scale = (.55, .32, .36)
    finish(body, "Decorative sheep wool", "mal_wool")
    box("Decorative sheep head", (x - facing * .6, TOP + .7, z), (.24, .24, .2), "mal_dark", .03)
    for a in (-.3, .3):
        beam("Decorative sheep leg", (x + a, TOP + .4, z), (x + a, TOP + .02, z), .08, "mal_dark")


def horse(x, z, facing=1):
    def p(a, b, c=0):
        return (x + facing * a, TOP + b, z + c)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=xyz(p(0, 1.45)))
    body = bpy.context.object
    body.scale = (1.0, .36, .42)
    finish(body, "Decorative horse body", "mal_dark")
    beam("Decorative horse neck", p(-.75, 1.6), p(-1.1, 2.3), .3, "mal_dark")
    box("Decorative horse head", p(-1.35, 2.3), (.55, .26, .24), "mal_dark", .04)
    for a in (-.65, .6):
        for c in (-.18, .18):
            beam("Decorative horse leg", p(a, 1.1, c), p(a, .02, c), .12, "mal_dark")


def mal_bazar():
    # Earth yard island; its edge is the display boundary, not a surveyed plot.
    box("Ground island at y=0", (0, TOP / 2, 0), (YARD_W + 2, TOP, YARD_D + 2), "mal_earth", .15)
    box("Trodden central aisle", (0, TOP + .015, 2), (11, .03, YARD_D - 4), "mal_earth_dark", 0)
    # Perimeter wall with the gate opening on the +Z front.
    wall_run("Back perimeter wall", -YARD_W / 2, YARD_W / 2, BACK)
    wall_run("Left perimeter wall", BACK, FRONT, -YARD_W / 2, along="z")
    wall_run("Right perimeter wall", BACK, FRONT, YARD_W / 2, along="z")
    wall_run("Front wall left of gate", -YARD_W / 2, -5.75, FRONT)
    wall_run("Front wall right of gate", 5.75, YARD_W / 2, FRONT)
    gate()
    # Central aisle: long canopy over two tethering rails for cattle.
    canopy(0, -2, 11, 30)
    tether_rails(-2.6, -15.5, 11.5)
    tether_rails(2.6, -15.5, 11.5)
    # Mesh pens on both sides of the aisle for sheep and goats.
    for side in (-1, 1):
        for col in range(3):
            for row in range(3):
                if side == 1 and col == 2 and row == 2:
                    continue  # Kept clear for the unloading ramp.
                pen(side * (11.5 + col * 6.6), -12 + row * 8, 6, 7)
    # Long closed shed along the back wall.
    shed(0, BACK + 3.2, 40, 4.4)
    # Unloading area at the right front corner with a ramp and a truck.
    ramp(27.6, 8.0, 3.6)
    truck(27.6, 12.2, facing=1)
    # A few decorative figures; they do not indicate stock.
    cow(-2.6 + 1.3, -6, facing=1)
    cow(2.6 - 1.3, 2, facing=-1, mat="mal_cow_light")
    cow(-2.6 + 1.3, 8, facing=1)
    for sx, sz in ((-12.2, -11.4), (-10.8, -12.8), (12.4, -3.6), (11, -4.6)):
        sheep(sx, sz, facing=1 if sx < 0 else -1)
    horse(-20, 15.5, facing=1)


CONFIG = {
    "name": "Мал базар", "build": mal_bazar,
    "geometry_status": "conceptual",
    "label_ru": "Концепт-модель скотного рынка · не план реального места",
    "label_kk": "Мал базарының тұжырымдамалық моделі · нақты орынның жоспары емес",
    "camera": [9, 51, 62], "target": [0, 1.5, 0], "render_scale": 0,
    "preview_camera": [24, 40, 62], "preview_target": [3, 2, -1], "preview_scale": 54,
    "hotspots": [],
    "descriptor": "mal-bazar-asset.json",
    "reconstruction": {
        "coverage": "concept_layout; no confirmed location",
        "confirmed": [
            "Типичные для скотных рынков у Тараза открытый грунтовый двор, коновязи из стальных труб, сетчатые загоны, длинные навесы с металлической кровлей, белая ограда и разгрузка скотовозов — по датированным фото 2024–2025 годов"
        ],
        "estimated": [
            "Планировка, размеры, число загонов и положение входа — концепция",
            "Ворота и щит «МАЛ БАЗАР» — обобщённые, без названия и вывески конкретного рынка",
            "Фигуры животных декоративные и не показывают наличие скота"
        ],
        "source_urls": [
            "https://www.youtube.com/watch?v=dR5Ymr1HmIo",
            "https://www.youtube.com/watch?v=SvmbOMn_hRM",
            "https://www.muftyat.kz/kk/news/qmdb/2025-05-29/46593-qurban2025-rban-shalua-arnalan-oryindar-belglend/"
        ]
    }
}
