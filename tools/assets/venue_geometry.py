"""Shared Blender primitives in glTF coordinates: X right, Y up, Z front."""
import math
import bpy
from mathutils import Vector

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


def pitched_roof(name, x, z, w, d, eave, rise, mat="metal"):
    p = [(x - w / 2, eave), (x, eave + rise), (x + w / 2, eave), (x + w / 2, eave - .24), (x, eave + rise - .24), (x - w / 2, eave - .24)]
    prism(name, p, z, d, mat)
