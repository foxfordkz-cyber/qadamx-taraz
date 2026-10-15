"""Photo-based Kaikarmet market composition, with estimated dimensions.

Reference: Yandex entity 63595775026 (street panorama 2023 and gallery 2024-25),
2GIS covered-market entity 70000001052970253, and undated Yandex satellite view.
The signs read Sultan; the public map entities are not proof of legal identity.
The long blue street facade and side gate are observed. Roof arrangement is
interpreted from the satellite image; lengths, depth and unseen kiosk layout
are illustrative, not a measured site plan. Lettering stays in frontend HTML.
"""
from venue_geometry import *

PALETTE.update({
    "kaika_blue": "204b94", "kaika_glass": "365d91",
    "kaika_skyglass": "6384a5", "kaika_dark": "172a43",
    "kaika_cream": "e9e4d0", "kaika_masonry": "d7cdb4",
    "kaika_roof": "a8b3b9", "kaika_rib": "c8d1d4",
    "kaika_gate": "478e9d", "kaika_steel": "69787e",
    "kaika_red": "a44542", "kaika_asphalt": "747979",
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
    box("Street facade base", ((left + right) / 2, .8, 18.08),
        (right - left, .6, .26), "kaika_masonry", 0)
    count = round((right - left) / 1.55)
    step = (right - left) / count
    for i in range(count):
        x = left + (i + .5) * step
        box("Blue glazed street bay", (x, 3.13, 18.12), (step - .08, 4.08, .12),
            "kaika_skyglass" if i % 5 == 0 else "kaika_glass", 0)
    for i in range(count + 1):
        box("Cobalt facade mullion", (left + i * step, 3.13, 18.23),
            (.09, 4.2, .15), "kaika_blue", 0)
    for y in (1.08, 2.55, 4.4, 5.18):
        box("Facade transom", ((left + right) / 2, y, 18.24),
            (right - left, .09, .17), "kaika_blue", 0)


def _awning(x, width=9.1):
    _section_along_x("Low corrugated street canopy",
                     [(19.15, 3.65), (22.65, 3.28), (22.65, 3.12), (19.15, 3.49)],
                     x, width, "kaika_roof")
    for side in (-1, 1):
        sx = x + side * (width / 2 - .15)
        box("Canopy slender post", (sx, 1.91, 22.4), (.12, 2.82, .12), "kaika_steel", 0)
        beam("Canopy brace", (sx, 2.58, 22.4), (sx, 3.52, 20.1), .09, "kaika_steel")
    for i in range(8):
        sx = x - width / 2 + width * i / 7
        beam("Canopy sheet seam", (sx, 3.69, 19.15), (sx, 3.32, 22.65), .045, "kaika_rib")
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

    # Observed long blue street front. The interruption at x=8..16 is the
    # recessed rectangular public entrance, not an invented monumental arch.
    for left, right in ((-41, 8), (16, 41)):
        box("Low continuous street gallery", ((left + right) / 2, 2.91, 13.5),
            (right - left, 4.82, 9), "kaika_masonry", .035)
        _street_glazing(left, right)
    box("Wide cream signage fascia", (0, 5.8, 18.12), (82.5, 1.18, .55), "kaika_cream", .025)
    box("Narrow cobalt fascia band", (0, 5.19, 18.19), (82.6, .14, .64), "kaika_blue", 0)
    box("Blue upper fascia edge", (0, 6.4, 18.12), (82.8, .12, .7), "kaika_blue", 0)
    box("Street gallery shallow roof", (0, 6.21, 13.3), (83, .22, 9.5), "kaika_roof", .02)
    for x in range(-40, 41, 5):
        box("Gallery roof sheet seam", (x, 6.335, 13.3), (.045, .025, 9.3), "kaika_rib", 0)
    box("Entrance recess soffit", (12, 5.02, 15.4), (8.05, .18, 5.4), "kaika_cream", 0)
    box("Entrance shadow", (12, 2.84, 12.68), (8, 4.68, .2), "kaika_dark", 0)
    for x in (9.35, 11.1, 12.9, 14.65):
        box("Recessed blue framed door", (x, 2.24, 12.85), (1.67, 3.45, .15), "kaika_blue", 0)
        box("Entrance door glass", (x, 2.36, 12.95), (1.38, 2.9, .08), "kaika_glass", 0)
    for x in (8.08, 15.92):
        box("Wide entry blue jamb", (x, 2.79, 17.77), (.26, 4.58, .55), "kaika_blue", 0)
    for x in (-8.4, 1.7):
        _awning(x)
    for x, mat in ((7, "kaika_cream"), (18.2, "kaika_red")):
        box("Small entrance kiosk", (x, 1.81, 21.4), (1.5, 2.62, 1.8), mat, .035)
        box("Kiosk dark opening", (x, 2, 22.32), (1.12, 1.54, .08), "kaika_dark", 0)

    # Satellite suggests parallel roof strips and a transverse interruption.
    # The rounded central sheet roof is an interpretation; there is no survey.
    box("Rear low market strip", (-1, 2.55, -18.7), (80, 4.1, 8), "kaika_masonry", .035)
    _long_roof("Rear low pitched roof", -1, -18.7, 81, 9, 4.78, .85)
    for x in (-19.1, 17.1):
        _long_roof("Covered market broad raised roof", x, -3, 34.4, 18, 6.18, 2.9, curved=True)
    box("Transverse roof connection", (-1, 6.14, -3), (2.1, .18, 18.5), "kaika_steel", 0)
    box("Front roof link", (-1, 5.58, 7.3), (79.6, .22, 4.7), "kaika_roof", .015)
    box("Rear roof link", (-1, 4.6, -13), (79.6, .18, 3.7), "kaika_roof", .015)
    for x in range(-34, 36, 8):
        for z in (-11.3, 5.3):
            box("Covered market steel column", (x, 3.34, z), (.15, 5.68, .15), "kaika_steel", 0)
        beam("Covered market roof tie", (x, 6.13, -11.3), (x, 6.13, 5.3), .12, "kaika_steel")
        beam("Covered market roof brace", (x, 6.13, -11.3), (x, 8.88, -3), .12, "kaika_steel")
        beam("Covered market roof brace", (x, 8.88, -3), (x, 6.13, 5.3), .12, "kaika_steel")
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
    "camera": [94, 66, 112], "target": [0, 3.5, 0], "render_scale": 116,
    "hotspots": [[-24, 5.1, 19.3], [12, 5.1, 20.2], [42, 5.4, -5.5]],
    "geometry_status": "reference_based",
    "label_ru": "По фотографиям · размеры оценочные",
    "label_kk": "Фотосуреттер негізінде · өлшемдері болжамды",
    "reconstruction": {
        "coverage": "Observed street facade and gate; interpreted connected roof composition. Non-survey reconstruction.",
        "confirmed": ["Long blue glazed street frontage with cream fascia", "Wide recessed rectangular entrance",
                      "Low lean-to street canopies", "Steel-covered market aisles", "Cream side portal with turquoise bar gates"],
        "estimated": ["All metric dimensions and exact bay counts", "Central roof curvature and strip connections",
                      "Position of side gate within the complete footprint", "Unseen kiosk arrangement and anonymous parked cars"],
        "source_urls": ["https://yandex.com/maps/org/kaikarmet/63595775026/gallery/",
                        "https://yandex.com/maps/org/kaikarmet/63595775026/panorama/",
                        "https://yandex.com/maps/org/kaikarmet/63595775026/gallery/?l=sat&ll=71.335908%2C42.885073&z=18",
                        "https://2gis.kz/taraz/firm/70000001052970253"],
    },
}
