"""Reproducible Qadam venue models. Run with Blender 4.5 LTS or bpy.

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
# Blender --python does not automatically expose sibling modules.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from venue_geometry import PARTS, MATERIALS, material, xyz
from model_mart import CONFIG as MART
from model_kaikarmet import CONFIG as KAIKARMET
from model_auyl_bereke import CONFIG as AUYL_BEREKE

CONFIGS = {"mart": MART, "kaikarmet": KAIKARMET, "auyl-bereke": AUYL_BEREKE}


def render_setup(config, path, samples, bounds_min, bounds_max):
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
    scene.view_settings.exposure = config.get("render_exposure", .7)
    bpy.ops.mesh.primitive_plane_add(size=2000, location=(0, 0, -.025))
    ground = bpy.context.object
    ground.name = "RENDER ONLY studio ground"
    ground.data.materials.append(material("porcelain"))
    bpy.ops.object.camera_add(location=xyz(config["camera"]))
    camera = bpy.context.object
    camera.name = "RENDER ONLY camera"
    camera.rotation_euler = (Vector(xyz(config["target"])) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    # Fit the actual export bounds instead of assuming the first concept's size.
    rotation = camera.rotation_euler.to_quaternion().inverted()
    target = Vector(xyz(config["target"]))
    projected = [rotation @ (Vector(xyz((x, y, z))) - target)
                 for x in (bounds_min[0], bounds_max[0])
                 for y in (bounds_min[1], bounds_max[1])
                 for z in (bounds_min[2], bounds_max[2])]
    fit = max(max(abs(p.x) for p in projected) * 2,
              max(abs(p.y) for p in projected) * 2 * 4 / 3) * 1.12
    camera.data.ortho_scale = max(config.get("render_scale", 0), fit)
    scene.camera = camera
    extent = max(bounds_max[0] - bounds_min[0], bounds_max[2] - bounds_min[2]) / 56
    for name, loc, power, size in [("Key", (-30, 55, 40), 45000, 35), ("Fill", (35, 35, 5), 18000, 30)]:
        bpy.ops.object.light_add(type="AREA", location=xyz([v * extent for v in loc]))
        light = bpy.context.object
        light.name = "RENDER ONLY " + name
        light.data.energy, light.data.shape, light.data.size = power * extent ** 2, "DISK", size * extent
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
    render_setup(config, temp, args.samples, bounds_min, bounds_max)
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
    entry = {"slug": slug, "name": config["name"], "label_ru": config.get("label_ru", "Концептуальная модель"), "label_kk": config.get("label_kk", "Тұжырымдамалық модель"), "model_url": f"/models/{slug}.glb", "poster_url": f"/previews/{slug}.webp", "geometry_status": config.get("geometry_status", "conceptual"), "conceptual_scale": True, "units": "meters", "up_axis": "+Y", "front_axis": "+Z", "center": [0, 0, 0], "bounds_min": bounds_min, "bounds_max": bounds_max, "camera_position": config["camera"], "camera_target": config["target"], "camera_fov_degrees": 45, "hotspots": hotspots}
    if "reconstruction" in config:
        entry["reconstruction"] = config["reconstruction"]
    return entry


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
            manifest = {"schema_version": 1, "note": "Модели по открытым референсам. Точность зависит от площадки; размеры без обмеров оценочные. Учебные точки не задают маршрут к реальному продавцу.", "venues": list(venues.values()), "required_venue_slugs": list(CONFIGS), "business_slug_pattern": "<venue-slug>-demo-<clothes|food|home>"}
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"ASSET_READY {slug}", flush=True)


if __name__ == "__main__":
    main()
