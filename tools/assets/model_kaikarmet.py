"""Photo-based Kaikarmet market composition, with estimated dimensions.

Reference: Yandex entity 63595775026 (street panorama 2023 and gallery 2024-25),
2GIS covered-market entity 70000001052970253, and undated Yandex satellite view.
The signs read Sultan; the public map entities are not proof of legal identity.
The long blue street facade, red Sultan/produce fascia letters and side gate
are observed. Roof arrangement is interpreted from the satellite image;
lengths, depth and unseen kiosk layout are illustrative, not a measured plan.
The large observed facade signs are original low-poly geometry; UI labels and
business names remain in frontend HTML.
"""
import bmesh

from venue_geometry import *

PALETTE.update({
    "kaika_blue": "174185", "kaika_glass": "153257",
    "kaika_skyglass": "284b75", "kaika_dark": "101e32",
    "kaika_cream": "e9e7db", "kaika_masonry": "d7cdb4",
    "kaika_roof": "a8b3b9", "kaika_rib": "c8d1d4",
    "kaika_gate": "478e9d", "kaika_steel": "69787e",
    "kaika_red": "a44542", "kaika_sign": "801328",
    "kaika_plinth": "62768b", "kaika_joint": "d1d2cc",
    "kaika_asphalt": "747979",
    "kaika_car": "e1e2df", "kaika_tyre": "303638",
})


def _section_along_x(name, section, x, length, mat):
    """Extrude a closed (z, y) section; all measurements are in glTF axes."""
    n = len(section)
    verts = [(x + dx, y, z) for dx in (-length / 2, length / 2) for z, y in section]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, verts, faces, mat)


def _long_roof(name, x, z, length, width, eave, rise, curved=False):
    segments = 16 if curved else 2
    top = [(z - width / 2 + width * i / segments,
            eave + rise * math.sin(math.pi * i / segments)) for i in range(segments + 1)]
    section = top + [(pz, py - .16) for pz, py in reversed(top)]
    _section_along_x(name, section, x, length, "kaika_roof")
    # Sparse seams express sheet metal without embedding texture imagery.
    for dx in (-length / 3, 0, length / 3):
        for i in range(segments):
            a, b = top[i], top[i + 1]
            beam(name + " roof seam", (x + dx, a[1] + .035, a[0]),
                 (x + dx, b[1] + .035, b[0]), .055, "kaika_rib")


def _street_glazing(left, right):
    box("Blue grey street facade plinth", ((left + right) / 2, .81, 18.08),
        (right - left, .59, .26), "kaika_plinth", 0)
    count = round((right - left) / 1.55)
    step = (right - left) / count
    for i in range(count):
        x = left + (i + .5) * step
        box("Dark blue glazed street bay", (x, 2.91, 18.12), (step - .08, 3.75, .12),
            "kaika_skyglass" if i % 7 in (0, 1) else "kaika_glass", 0)
    for i in range(count + 1):
        box("Cobalt facade mullion", (left + i * step, 2.91, 18.23),
            (.11, 3.85, .16), "kaika_blue", 0)
    for y in (1.02, 2.45, 3.72, 4.78):
        box("Facade transom", ((left + right) / 2, y, 18.24),
            (right - left, .095, .17), "kaika_blue", 0)


def _facade_letters(name, value, x, y, size, spacing):
    """Observed red fascia words, modeled as original geometry, no photo texture."""
    data = bpy.data.curves.new(name, "FONT")
    data.body = value
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    data.space_character = spacing
    data.resolution_u = 2
    data.extrude = .012
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    obj.location = xyz((x, y, 18.58))
    obj.rotation_euler[0] = math.pi / 2
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    # Blender font outlines have collinear points. Triangulating their n-gons
    # during glTF export can emit zero-area faces; discard those here instead.
    letters = bmesh.new()
    letters.from_mesh(obj.data)
    bmesh.ops.triangulate(letters, faces=list(letters.faces))
    # Allow for float32 position rounding in GLB: sub-centimetre slivers from
    # the font are invisible but can collapse to collinear exported vertices.
    degenerate = [face for face in letters.faces if face.calc_area() <= 1e-5]
    if degenerate:
        bmesh.ops.delete(letters, geom=degenerate, context="FACES")
    letters.to_mesh(obj.data)
    letters.free()
    obj.data.update()
    finish(obj, name, "kaika_sign")


def _awning(x, width=9.1):
    _section_along_x("Low corrugated street canopy",
                     [(18.55, 3.84), (22.65, 3.48), (22.65, 3.32), (18.55, 3.67)],
                     x, width, "kaika_roof")
    box("Canopy cobalt front edge", (x, 3.4, 22.66),
        (width, .15, .12), "kaika_blue", 0)
    for side in (-1, 1):
        sx = x + side * (width / 2 - .15)
        box("Canopy slender post", (sx, 2.01, 22.4), (.12, 2.98, .12), "kaika_steel", 0)
        beam("Canopy brace", (sx, 2.65, 22.4), (sx, 3.69, 20.1), .09, "kaika_steel")
    for i in range(8):
        sx = x - width / 2 + width * i / 7
        beam("Canopy sheet seam", (sx, 3.88, 18.55), (sx, 3.52, 22.65), .045, "kaika_rib")
    for dx in (-2.2, 2.2):
        box("Illustrative street counter", (x + dx, 1.09, 21.45),
            (3.65, 1.18, 1.25), "kaika_masonry", .025)


def _side_gate():
    """Cream masonry portal: shallow angular arch and open turquoise bars."""
    x, z = 40.2, -5.5
    for side in (-1, 1):
        pz = z + side * 5.8
        box("Side gate wall", (x, 3.45, pz), (1, 5.9, 4), "kaika_masonry", .025)
        box("Side gate reddish plinth", (x + .04, .86, pz),
            (1.09, .72, 4), "kaika_red", .015)
        for y in (1.5, 2.25, 3, 3.75, 4.5, 5.25):
            box("Gate masonry course", (x + .515, y, pz), (.025, .035, 3.93), "kaika_cream", 0)
        for y, radius, height in ((.79, .29, .58), (2.87, .18, 3.6), (4.78, .29, .22)):
            cylinder("Gate pilaster", (x + .6, y, z + side * 3.88), radius, height, "kaika_cream", 12)
    _section_along_x("Broad shallow pointed gate lintel",
                     [(z - 3.8, 4.45), (z, 5.45), (z + 3.8, 4.45),
                      (z + 3.8, 6.8), (z - 3.8, 6.8)], x, 1.08, "kaika_cream")
    box("Gate continuous classical cornice", (x + .12, 6.94, z),
        (1.5, .28, 16), "kaika_cream", .03)
    for i in range(31):
        box("Gate cornice dentil", (x + .78, 6.68, z - 7.5 + i * .5),
            (.23, .2, .23), "kaika_cream", 0)
    for side in (-1, 1):
        hinge = (x + .66, z + side * 3.65)
        tip = (x + 2.65, z + side * 1.9)
        for y in (.74, 3.68):
            beam("Open turquoise gate rail", (hinge[0], y, hinge[1]),
                 (tip[0], y, tip[1]), .095, "kaika_gate")
        for i in range(11):
            t = i / 10
            bx, bz = hinge[0] * (1 - t) + tip[0] * t, hinge[1] * (1 - t) + tip[1] * t
            box("Open turquoise gate bar", (bx, 2.21, bz), (.06, 3.02, .06), "kaika_gate", 0)


def _parked_car(x, z):
    # Anonymous scale cues, following the perpendicular parking in the panorama.
    box("Anonymous parked car", (x, 1.12, z), (1.8, .64, 4.1), "kaika_car", .13)
    box("Car glazing", (x, 1.67, z - .15), (1.57, .64, 2.25), "kaika_dark", .12)
    box("Car roof", (x, 2.02, z - .15), (1.53, .13, 2.08), "kaika_car", .04)
    for dx in (-.88, .88):
        for dz in (-1.28, 1.28):
            bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=.34, depth=.18,
                                                location=xyz((x + dx, .85, z + dz)))
            obj = bpy.context.object
            obj.rotation_euler[1] = math.pi / 2
            finish(obj, "Car wheel", "kaika_tyre")


def kaikarmet():
    base(94, 64)
    box("Street parking apron", (0, .515, 28), (92, .03, 7.1), "kaika_asphalt", 0)
    box("Street frontage pavement", (0, .545, 21.2), (85, .09, 6.2), "stone", .025)

    # The panorama shows one long low facade. The wide x=7..19 opening is
    # recessed, while two distinct low corrugated canopies project to its left.
    for left, right in ((-41, 7), (19, 41)):
        box("Low continuous street gallery", ((left + right) / 2, 2.76, 13.5),
            (right - left, 4.52, 9), "kaika_masonry", .035)
        _street_glazing(left, right)
    box("Tall pale panel fascia", (0, 5.74, 18.16), (82.5, 1.72, .55), "kaika_cream", .025)
    for x in range(-40, 41, 2):
        box("Pale fascia panel joint", (x, 5.74, 18.448),
            (.022, 1.68, .012), "kaika_joint", 0)
    box("Deep cobalt band below signs", (0, 4.83, 18.26),
        (82.7, .19, .68), "kaika_blue", 0)
    box("Blue roofline trim", (0, 6.67, 18.18),
        (82.8, .12, .72), "kaika_blue", 0)
    box("Street gallery shallow roof", (0, 6.49, 13.3),
        (83, .22, 9.5), "kaika_roof", .02)
    for x in range(-40, 41, 5):
        box("Gallery roof sheet seam", (x, 6.615, 13.3),
            (.045, .025, 9.3), "kaika_rib", 0)
    _facade_letters("Red SULTAN fascia sign", "СҰЛТАН", 14.6, 5.75, 1.45, 1.58)
    _facade_letters("Red produce fascia sign", "ЖЕМІС-ЖИДЕКТЕР", -23, 5.75, 1.16, 1.08)
    box("Entrance recess soffit", (13, 4.78, 15.4), (12.05, .18, 5.4), "kaika_dark", 0)
    box("Entrance shadow", (13, 2.73, 12.68), (11.8, 4.43, .2), "kaika_dark", 0)
    for x in (8.6, 10.8, 13, 15.2, 17.4):
        box("Recessed blue framed door", (x, 2.17, 12.85),
            (2.1, 3.34, .15), "kaika_blue", 0)
        box("Entrance door glass", (x, 2.38, 12.95),
            (1.78, 2.78, .08), "kaika_glass", 0)
    for x in (7.08, 18.92):
        box("Wide entry blue jamb", (x, 2.75, 17.77),
            (.31, 4.48, .65), "kaika_blue", 0)
    box("Entrance blue lintel", (13, 4.79, 18.08),
        (12, .17, .35), "kaika_blue", 0)
    for x in (-12.5, -1.5):
        _awning(x, 10.7)
    for x, mat in ((5.7, "kaika_cream"), (20.3, "kaika_red")):
        box("Small entrance kiosk", (x, 1.81, 21.4),
            (1.5, 2.62, 1.8), mat, .035)
        box("Kiosk dark opening", (x, 2, 22.32), (1.12, 1.54, .08), "kaika_dark", 0)

    # Satellite suggests parallel roof strips and a transverse interruption.
    # The rounded central sheet roof is an interpretation; there is no survey.
    box("Rear low market strip", (-1, 2.55, -18.7), (80, 4.1, 8), "kaika_masonry", .035)
    _long_roof("Rear low pitched roof", -1, -18.7, 81, 9, 4.78, .85)
    for x in (-19.1, 17.1):
        _long_roof("Covered market shallow raised roof", x, -3, 34.4, 18, 6.15, 1.85, curved=True)
    box("Transverse roof connection", (-1, 6.14, -3), (2.1, .18, 18.5), "kaika_steel", 0)
    box("Front roof link", (-1, 5.58, 7.3), (79.6, .22, 4.7), "kaika_roof", .015)
    box("Rear roof link", (-1, 4.6, -13), (79.6, .18, 3.7), "kaika_roof", .015)
    for x in range(-34, 36, 8):
        for z in (-11.3, 5.3):
            box("Covered market steel column", (x, 3.34, z), (.15, 5.68, .15), "kaika_steel", 0)
        beam("Covered market roof tie", (x, 6.13, -11.3), (x, 6.13, 5.3), .12, "kaika_steel")
        beam("Covered market roof brace", (x, 6.13, -11.3), (x, 7.94, -3), .12, "kaika_steel")
        beam("Covered market roof brace", (x, 7.94, -3), (x, 6.13, 5.3), .12, "kaika_steel")
    for x in (-28, -17, -6, 5, 16, 27):
        for z in (-8.2, 2.3):
            box("Illustrative low stall under shared roof", (x, 1.9, z),
                (7.7, 2.8, 3.7), "kaika_cream", .02)
            box("Illustrative stall opening", (x, 1.99, z + 1.88),
                (6.9, 2.15, .08), "kaika_blue", 0)
    box("Low western connecting wall", (-40, 2.9, -5.1), (2, 4.8, 28), "kaika_masonry", .025)
    _side_gate()
    for x in (-29, -19, 26, 35):
        _parked_car(x, 24)
    for name in ("kaika_glass", "kaika_skyglass", "kaika_dark"):
        p = material(name).node_tree.nodes.get("Principled BSDF")
        p.inputs["Roughness"].default_value = .32
        p.inputs["Metallic"].default_value = .12


CONFIG = {
    "name": "Кайкармет", "build": kaikarmet,
    "camera": [26, 42, 108], "target": [0, 3.5, 8], "render_scale": 108,
    "render_exposure": -.1,
    "preview_camera": [10, 10, 62], "preview_target": [10, 3.1, 18], "preview_scale": 48,
    "hotspots": [[-24, 5.1, 19.3], [12, 5.1, 20.2], [42, 5.4, -5.5]],
    "geometry_status": "reference_based",
    "label_ru": "По фотографиям · размеры оценочные",
    "label_kk": "Фотосуреттер негізінде · өлшемдері болжамды",
    "reconstruction": {
        "coverage": "Observed street facade, signs and gate; interpreted connected roof composition. Non-survey reconstruction.",
        "confirmed": ["Long dark blue glazed street frontage with tall cream fascia and red Sultan/produce letters", "Wide recessed rectangular entrance",
                      "Low lean-to street canopies", "Steel-covered market aisles", "Cream side portal with turquoise bar gates"],
        "estimated": ["All metric dimensions and exact bay counts", "Central roof curvature and strip connections",
                      "Position of side gate within the complete footprint", "Unseen kiosk arrangement and anonymous parked cars"],
        "source_urls": ["https://yandex.com/maps/org/kaikarmet/63595775026/gallery/",
                        "https://yandex.com/maps/org/kaikarmet/63595775026/panorama/",
                        "https://yandex.com/maps/org/kaikarmet/63595775026/gallery/?l=sat&ll=71.335908%2C42.885073&z=18",
                        "https://2gis.kz/taraz/firm/70000001052970253"],
    },
}
