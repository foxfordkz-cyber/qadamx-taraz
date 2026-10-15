"""Editable kaikarmet venue geometry; see asset-sources.md for evidence."""
from venue_geometry import *

def kaikarmet():
    base(50, 44)
    # Deliberately conceptual: staggered modular halls, open central lane.
    for x, z0 in ((-12.8, -2), (12.8, -5)):
        box("Market hall", (x, 2.65, z0), (10.5, 4.3, 27), "porcelain", .08)
        box("Low flat hall roof", (x, 4.99, z0), (11.7, .38, 28), "metal", .08)
        box("Light roof fascia", (x, 5.05, z0 + 14), (11.7, .65, .24), "porcelain", .04)
        for z in (z0 - 9, z0, z0 + 9):
            box("Raised clerestory", (x, 5.48, z), (6, .65, 5.8), "glass", .05)
            box("Clerestory cap", (x, 5.85, z), (6.6, .2, 6.4), "chalk", .04)
            for side in (-1, 1):
                inner_x = x + side * 5.32
                for dz in (-2.8, 0, 2.8):
                    box("Hall modular shutters", (inner_x, 2.45, z + dz), (.12, 3.25, 2.35), "edge", .02)
                    for y in (1.2, 1.7, 2.2, 2.7, 3.2):
                        box("Shutter horizontal seam", (inner_x + side * .07, y, z + dz), (.025, .045, 2.3), "metal", 0)
        for dx in (-3.4, 0, 3.4):
            box("Hall front windows", (x + dx, 2.5, z0 + 13.55), (2.8, 3.2, .12), "glass", .025)
        box("Front awning", (x, 4.4, z0 + 14.2), (11.2, .25, 2.1), "stone", .06)
    box("Central lane", (0, .54, -1.5), (8.5, .08, 35), "stone", .03)
    for z in (-15, -9, -3, 3, 9):
        box("Lane paving joint", (0, .59, z), (7.9, .025, .06), "edge", 0)
    for x in (-6, 6):
        box("Entry pier", (x, 3.35, 16), (.7, 5.7, .8), "ink", .05)
    box("Entry lintel", (0, 6.25, 16), (13.8, .9, 1.8), "porcelain", .1)
    box("Entry identification strip", (0, 6.18, 16.95), (6.4, .34, .08), "lime", .025)
    for z in (-11, -2, 7):
        for x in (-5.7, 5.7):
            cylinder("Open canopy post", (x, 2.8, z), .09, 4.6, "metal", 8)
        beam("Open canopy tie", (-5.7, 5.1, z), (5.7, 5.1, z), .12, "metal")
        beam("Canopy truss left", (-5.7, 5.1, z), (0, 5.9, z), .1, "metal")
        beam("Canopy truss right", (0, 5.9, z), (5.7, 5.1, z), .1, "metal")
    for x, z in ((-21, 15), (21, 15), (-21, -16), (21, -16)):
        tree(x, z, .82)
    for x in (-12, 12):
        bench(x, 18.4)
    # Small front stall clusters, clearly synthetic zones, no real stall numbers.
    for x in (-3.4, 3.4):
        box("Small market counter", (x, 1.1, 4), (2.6, 1.2, 1.3), "sand", .05)
        for dz in (-.48, .48):
            cylinder("Awning support", (x - 1.2, 2, 4 + dz), .055, 3, "metal", 8)
            cylinder("Awning support", (x + 1.2, 2, 4 + dz), .055, 3, "metal", 8)
        box("Counter awning", (x, 3.5, 4), (3, .15, 1.7), "chalk", .04)


CONFIG = {"name": "Кайкармет", "build": kaikarmet, "camera": [47, 39, 58], "target": [0, 2.8, 0], "hotspots": [[-12.8, 4.8, 14], [0, 4.4, 4], [12.8, 4.8, 11]]}
