"""Reproducible original Qadam concept models. Run with Blender 4.5 LTS or bpy.

All modeling helpers accept GLTF coordinates (X right, Y up, Z front), in metres.
Blender stores X, -Z, Y; its standard exporter restores glTF +Y without a root rotation.
The source keeps named editable parts. Export copies are joined by material.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "apps/web/public"
SOURCES = ROOT / "assets/venues/blend"
PALETTE = {
    "porcelain": "f6f5f2", "chalk": "efeeea", "stone": "e6e4df",
    "edge": "cfcdc6", "ink": "4a4943", "glass": "353b37",
    "metal": "6b6a63", "lime": "e4f222", "olive": "7c8700",
    "foliage": "92947b", "sand": "c2a58a", "brick": "99765c",
}
MATERIALS = {}
PARTS = []


def xyz(v):
    return (v[0], -v[2], v[1])


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def material(name):
    if name not in MATERIALS:
        rgb = [linear(int(PALETTE[name][i:i + 2], 16) / 255) for i in (0, 2, 4)]
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*rgb, 1)
        mat.use_nodes = True
        p = mat.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*rgb, 1)
        p.inputs["Roughness"].default_value = .82 if name != "glass" else .3
        p.inputs["Metallic"].default_value = 0
        MATERIALS[name] = mat
    return MATERIALS[name]


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(material(mat))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel:
        mod = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width, mod.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    # Bake location, rotation and scale: every exported mesh has the shared ground origin.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    PARTS.append(obj)
    return obj


def box(name, center, size, mat="porcelain", bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(center))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    return finish(obj, name, mat, min(bevel, min(size) / 4))


def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata([xyz(v) for v in verts], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return finish(obj, name, mat)


def cylinder(name, center, radius, height, mat="metal", vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=height, location=xyz(center))
    # Stay below the overlap clamp on thin low-poly poles (avoids collapsed triangles).
    bevel = min(.025, .4 * (2 * radius * math.sin(math.pi / vertices)), height / 4)
    return finish(bpy.context.object, name, mat, bevel)


def beam(name, a, b, width, mat):
    a, b = Vector(xyz(a)), Vector(xyz(b))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(a + b) / 2)
    obj = bpy.context.object
    obj.scale = (width, width, (b - a).length)
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, mat)


def prism(name, polygon, z, depth, mat):
    n = len(polygon)
    verts = [(x, y, z + dz) for dz in (-depth / 2, depth / 2) for x, y in polygon]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, verts, faces, mat)


def arch(name, x, bottom, spring, radius, z, mat, depth=.12):
    p = [(x - radius, bottom), (x + radius, bottom)]
    p += [(x + radius * math.cos(a * math.pi / 20), spring + radius * math.sin(a * math.pi / 20)) for a in range(21)]
    return prism(name, p, z, depth, mat)


def arch_ring(name, x, bottom, spring, radius, z, width, mat):
    box(name + " left jamb", (x - radius - width / 2, (bottom + spring) / 2, z), (width, spring - bottom, .28), mat, .025)
    box(name + " right jamb", (x + radius + width / 2, (bottom + spring) / 2, z), (width, spring - bottom, .28), mat, .025)
    for i in range(20):
        a, b = i * math.pi / 20, (i + 1) * math.pi / 20
        p = [(x + r * math.cos(t), spring + r * math.sin(t)) for r, t in [(radius, a), (radius + width, a), (radius + width, b), (radius, b)]]
        prism(name + f" voussoir {i:02}", p, z, .28, mat)


def tree(x, z, scale=1):
    box("Tree planter", (x, .7, z), (2.7 * scale, .55, 2.7 * scale), "edge", .18)
    cylinder("Tree trunk", (x, 1.7 * scale, z), .15 * scale, 2.5 * scale, "brick")
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=xyz((x, 3.5 * scale, z)))
    obj = bpy.context.object
    obj.scale = (1.5 * scale, 1.5 * scale, 1.8 * scale)
    finish(obj, "Faceted olive canopy", "foliage")


def bench(x, z, length=3):
    for dz in (-.36, 0, .36):
        box("Bench slat", (x, 1, z + dz), (length, .16, .28), "sand", .035)
    for dx in (-length / 2 + .3, length / 2 - .3):
        box("Bench foot", (x + dx, .69, z), (.16, .5, 1), "ink", .03)


def base(width, depth):
    box("Ground island at y=0", (0, .22, 0), (width, .44, depth), "stone", .18)
    box("Pedestrian surface", (0, .47, 0), (width - .8, .06, depth - .8), "chalk", .02)


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


def pitched_roof(name, x, z, w, d, eave, rise, mat="metal"):
    p = [(x - w / 2, eave), (x, eave + rise), (x + w / 2, eave), (x + w / 2, eave - .24), (x, eave + rise - .24), (x - w / 2, eave - .24)]
    prism(name, p, z, d, mat)


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


CONFIGS = {
    "mart": {"name": "MART", "build": mart, "camera": [50, 39, 60], "target": [0, 4.5, 0], "hotspots": [[-13, 5.2, 11.5], [0, 4.5, 14], [13, 5.2, 11.5]]},
    "kaikarmet": {"name": "Кайкармет", "build": kaikarmet, "camera": [47, 39, 58], "target": [0, 2.8, 0], "hotspots": [[-12.8, 4.8, 14], [0, 4.4, 4], [12.8, 4.8, 11]]},
    "auyl-bereke": {"name": "Ауыл Береке", "build": auyl_bereke, "camera": [49, 41, 61], "target": [0, 3, 0], "hotspots": [[-15, 4.5, 5.6], [0, 4.8, 3], [15, 4.5, 5.6]]},
}


def render_setup(config, path, samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1024, 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(path)
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.78, .77, .73, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = .6
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = .7
    bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -.025))
    ground = bpy.context.object
    ground.name = "RENDER ONLY studio ground"
    ground.data.materials.append(material("porcelain"))
    bpy.ops.object.camera_add(location=xyz(config["camera"]))
    camera = bpy.context.object
    camera.name = "RENDER ONLY camera"
    camera.rotation_euler = (Vector(xyz(config["target"])) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 76
    scene.camera = camera
    for name, loc, power, size in [("Key", (-30, 55, 40), 45000, 35), ("Fill", (35, 35, 5), 18000, 30)]:
        bpy.ops.object.light_add(type="AREA", location=xyz(loc))
        light = bpy.context.object
        light.name = "RENDER ONLY " + name
        light.data.energy, light.data.shape, light.data.size = power, "DISK", size
        light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()


def build_one(slug, config, args):
    PARTS.clear()
    MATERIALS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new("Studio world")
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1
    config["build"]()
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ v.co for obj in PARTS for v in obj.data.vertices]
    bounds = [[round(fn(p[i] for p in points), 5) for i in range(3)] for fn in (min, max)]
    # Blender bounds to +Y GLTF, reversing Z extent.
    bounds_min = [bounds[0][0], bounds[0][2], -bounds[1][1]]
    bounds_max = [bounds[1][0], bounds[1][2], -bounds[0][1]]
    temp = args.render_dir / f"{slug}.png"
    render_setup(config, temp, args.samples)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCES / f"{slug}.blend"), compress=True)
    if not args.no_render:
        bpy.ops.render.render(write_still=True)
        try:
            from PIL import Image
        except ImportError:
            print(f"PNG_READY {temp}; convert to WebP with tools/assets/package_venues.py", flush=True)
        else:
            Image.open(temp).convert("RGB").save(PUBLIC / f"previews/{slug}.webp", quality=86, method=6)
    # Material batching for a small number of browser draw calls.
    bpy.ops.object.select_all(action="DESELECT")
    exports = []
    for mat in MATERIALS.values():
        copies = []
        for obj in PARTS:
            if obj.data.materials[0] != mat:
                continue
            copy = obj.copy()
            copy.data = obj.data.copy()
            bpy.context.collection.objects.link(copy)
            copies.append(copy)
        if not copies:
            continue
        for obj in copies:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = copies[0]
        if len(copies) > 1:
            bpy.ops.object.join()
        batch = bpy.context.object
        batch.name = f"{slug}_{mat.name}"
        batch.select_set(False)
        exports.append(batch)
    for obj in exports:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(PUBLIC / f"models/{slug}.glb"), export_format="GLB", use_selection=True, export_yup=True, export_cameras=False, export_lights=False, export_animations=False, export_texcoords=False, export_normals=True, export_materials="EXPORT", export_extras=False)
    seed = json.loads((ROOT / "packages/contracts/demo-seed.json").read_text(encoding="utf-8"))
    businesses = {x["slug"]: x for x in seed["tables"]["businesses"]}
    hotspots = []
    for cat, position in zip(("clothes", "food", "home"), config["hotspots"]):
        key = f"{slug}-demo-{cat}"
        hotspots.append({"id": key, "business_slug": key, "business_id": businesses[key]["id"], "position": position})
    return {"slug": slug, "name": config["name"], "label_ru": "Концептуальная модель", "label_kk": "Тұжырымдамалық модель", "model_url": f"/models/{slug}.glb", "poster_url": f"/previews/{slug}.webp", "geometry_status": "conceptual", "conceptual_scale": True, "units": "meters", "up_axis": "+Y", "front_axis": "+Z", "center": [0, 0, 0], "bounds_min": bounds_min, "bounds_max": bounds_max, "camera_position": config["camera"], "camera_target": config["target"], "camera_fov_degrees": 45, "hotspots": hotspots}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--venue", choices=list(CONFIGS), help="Build only one model; preserve other manifest entries")
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--samples", type=int, default=32)
    parser.add_argument("--render-dir", type=Path, default=ROOT / "tmp/asset-renders")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else None)
    for path in (PUBLIC / "models", PUBLIC / "previews", SOURCES, args.render_dir):
        path.mkdir(parents=True, exist_ok=True)
    manifest_path = PUBLIC / "venue-assets.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    venues = {x["slug"]: x for x in manifest.get("venues", [])}
    for slug, config in CONFIGS.items():
        if args.venue is None or slug == args.venue:
            venues[slug] = build_one(slug, config, args)
            manifest = {"schema_version": 1, "note": "Концептуальные модели. Масштаб, расположение павильонов и учебных точек условные; не использовать для навигации на реальной площадке.", "venues": list(venues.values()), "required_venue_slugs": list(CONFIGS), "business_slug_pattern": "<venue-slug>-demo-<clothes|food|home>"}
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"ASSET_READY {slug}", flush=True)


if __name__ == "__main__":
    main()
