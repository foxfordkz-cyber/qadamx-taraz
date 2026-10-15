"""Editable mart venue geometry; see asset-sources.md for evidence."""
from venue_geometry import *

def mart():
    base(56, 42)
    box("Main mall volume", (0, 5.25, -2), (42, 9.5, 23), "sand", .12)
    box("Upper recessed volume", (0, 10.5, -3.5), (38, 1, 18), "brick", .1)
    box("Floating roof cornice", (0, 11.12, -3.5), (40, .32, 20), "porcelain", .05)
    # Four broad arched facade bays flank a taller entry portal.
    for x in (-16, -9.5, 9.5, 16):
        arch("Arched shopfront", x, .8, 5.8, 2.7, 9.58, "glass")
        arch_ring("Shopfront arch", x, .8, 5.8, 2.7, 9.72, .23, "porcelain")
        for dx in (-1.8, -.9, 0, .9, 1.8):
            box("Shopfront mullion", (x + dx, 3.35, 9.8), (.075, 5.1, .09), "edge", 0)
        box("Shopfront transom", (x, 4.65, 9.82), (5.25, .1, .1), "edge", 0)
    box("Main entry portal", (0, 7.2, 10), (13.4, 13.4, 2.4), "brick", .1)
    box("Portal crown", (0, 14.02, 10), (14, .36, 3), "sand", .05)
    arch("Deep entry recess", 0, .5, 6.5, 4.85, 11.25, "glass", .18)
    arch_ring("Central monumental arch", 0, .5, 6.5, 4.85, 11.42, .5, "porcelain")
    # Original geometric screen, an interpretation of the documented ornamental arch.
    for slope in (-1, 1):
        for offset in (-5, -3, -1, 1, 3, 5, 7, 9, 11, 13):
            pts = []
            for step in range(201):
                x = -4.65 + step * 9.3 / 200
                y = slope * x + offset
                top = 6.5 + math.sqrt(max(0, 4.65 ** 2 - x ** 2))
                if 4.1 <= y <= top - .12:
                    pts.append((x, y, 11.58))
            if len(pts) > 1:
                beam("Entry lattice", pts[0], pts[-1], .11, "porcelain")
    box("Entry door frame", (0, 2.12, 11.57), (4.8, 3.2, .18), "metal", .025)
    for x in (-1.15, 1.15):
        box("Entry glass door", (x, 2.12, 11.7), (2.1, 2.95, .1), "glass", .02)
        box("Door handle", (x / 5, 2.1, 11.8), (.06, .8, .08), "porcelain", .01)
    box("Entry lime canopy", (0, 3.85, 12.4), (5.7, .2, 2), "lime", .06)
    # Side panel rhythm and subtle masonry courses, without a texture download.
    for z in range(-11, 8, 3):
        box("Side reveal", (21.06, 4.6, z), (.1, 7.6, .08), "brick", 0)
        box("Side glazing", (21.09, 2.5, z + .8), (.1, 3.1, 1.45), "glass", .02)
    for y in (2, 4, 6, 8, 9.6):
        for x in (-20, -6.3, 6.3, 20):
            box("Masonry joint", (x, y, 9.61), (1.1, .035, .03), "brick", 0)
    for x in (-10, 10):
        box("Rooflight frame", (x, 11.4, -4), (5.4, .5, 7), "metal", .08)
        box("Rooflight glazing", (x, 11.68, -4), (5.05, .08, 6.65), "glass", .02)
        for z in (-6, -4, -2):
            box("Rooflight bar", (x, 11.74, z), (5.1, .08, .1), "edge", .01)
    box("Entry promenade", (0, .54, 15.8), (10, .08, 9), "porcelain", .02)
    for x in (-23, 23):
        for z in (-12, 1, 14):
            tree(x, z, .9)
    for x in (-13, 13):
        bench(x, 15.5, 4)
    for x in (-7, -3.5, 3.5, 7):
        cylinder("Entry bollard", (x, 1.03, 18.2), .12, 1.05)


CONFIG = {"name": "MART", "build": mart, "camera": [50, 39, 60], "target": [0, 4.5, 0], "hotspots": [[-13, 5.2, 11.5], [0, 4.5, 14], [13, 5.2, 11.5]]}
