"""Editable auyl_bereke venue geometry; see asset-sources.md for evidence."""
from venue_geometry import *

def auyl_bereke():
    base(52, 44)
    # Courtyard scheme: low pavilions and a monumental gate, not a surveyed plan.
    for x in (-15, 15):
        for z in (-10, 0):
            box("Courtyard pavilion", (x, 2.15, z), (9, 3.3, 8.5), "sand", .08)
            pitched_roof("Low pavilion roof", x, z, 10.5, 10, 3.85, 1.9, "foliage")
            for dx in (-2.7, 0, 2.7):
                box("Pavilion opening", (x + dx, 2, z + 4.3), (2.1, 2.7, .12), "glass", .02)
            box("Pavilion awning", (x, 3.3, z + 5.1), (9.6, .18, 2.1), "porcelain", .04)
    box("Rear market hall", (0, 2.4, -15), (13.5, 3.8, 8), "porcelain", .08)
    pitched_roof("Rear hipped-style roof", 0, -15, 15, 10, 4.35, 2.4, "foliage")
    for x in (-4.5, 0, 4.5):
        box("Rear shopfront", (x, 2.2, -10.94), (3.6, 3.2, .12), "glass", .02)
    # Reference-inspired gate: broad entablature, paired dark columns, sand piers.
    for side in (-1, 1):
        box("Gate outer pylon", (side * 11.3, 4.2, 13.8), (3.2, 7.4, 2.8), "sand", .07)
        box("Pylon capital", (side * 11.3, 8.1, 13.8), (3.7, .5, 3.3), "porcelain", .06)
        for dx in (-.63, .63):
            cylinder("Dark gate column", (side * 7.9 + dx, 3.8, 14), .39, 6.3, "glass", 16)
            cylinder("Column base", (side * 7.9 + dx, .85, 14), .56, .65, "stone", 16)
            cylinder("Column capital", (side * 7.9 + dx, 7.02, 14), .57, .28, "sand", 16)
    box("Broad gate entablature", (0, 7.85, 14), (24.5, 1.3, 3), "porcelain", .08)
    box("Gate crown", (0, 8.67, 14), (25.4, .35, 3.7), "sand", .06)
    box("Gate front inset", (0, 7.78, 15.55), (14.5, .66, .12), "stone", .035)
    box("Lime entrance accent", (0, 7.78, 15.64), (5.2, .18, .06), "lime", .01)
    for side in (-1, 1):
        for i in range(5):
            x = side * (16 + i * 1.6)
            box("Fence picket", (x, 1.7, 13.8), (.08, 2.4, .12), "metal", .01)
        box("Fence rail", (side * 19.2, 2.1, 13.8), (7.2, .09, .12), "metal", .01)
    # Central produce court. Crates are original simple solids, not photographed goods.
    for x in (-4, 4):
        for z in (-4, 3):
            box("Produce counter", (x, 1.04, z), (4, 1.1, 2), "sand", .05)
            for dx in (-1.25, 0, 1.25):
                box("Display crate", (x + dx, 1.72, z), (.96, .28, 1.5), "edge", .025)
                for dz in (-.42, .1, .5):
                    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.24, location=xyz((x + dx, 1.98, z + dz)))
                    finish(bpy.context.object, "Concept produce", "foliage")
            for dx in (-1.9, 1.9):
                cylinder("Court canopy pole", (x + dx, 2.1, z), .065, 3.2, "metal", 8)
            pitched_roof("Court canopy", x, z, 4.7, 2.7, 3.75, .65, "chalk")
    for x, z in ((-22, 6), (22, 6), (-21, -17), (21, -17)):
        tree(x, z, .8)
    for x in (-17, 17):
        bench(x, 18)


CONFIG = {"name": "Ауыл Береке", "build": auyl_bereke, "camera": [49, 41, 61], "target": [0, 3, 0], "hotspots": [[-15, 4.5, 5.6], [0, 4.8, 3], [15, 4.5, 5.6]]}
