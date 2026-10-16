#!/usr/bin/env python3
"""Validate the three venue assets using only the Python standard library.

Run from any directory: python tools/assets/validate_assets.py --report report.json
This checks binary data and the delivery contract; it is not a renderer or a
replacement for checking camera framing and hotspot placement in the frontend.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import struct
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[2]
EPSILON = 0.005  # Metres; accommodates exported float32 positions.
IDENTITY = [1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0]
COMPONENTS = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2),
              5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4,
          "MAT2": 4, "MAT3": 9, "MAT4": 16}


class InvalidAsset(ValueError):
    """A malformed asset or a failed contract requirement."""


def require(condition, message):
    if not condition:
        raise InvalidAsset(message)


def finite_vector(value, size=3):
    return (isinstance(value, list) and len(value) == size
            and all(isinstance(x, (int, float)) and not isinstance(x, bool)
                    and math.isfinite(x) for x in value))


def matrix_multiply(a, b):
    return [sum(a[r * 4 + k] * b[k * 4 + c] for k in range(4))
            for r in range(4) for c in range(4)]


def determinant(matrix):
    a, b, c = matrix[0:3]
    d, e, f = matrix[4:7]
    g, h, i = matrix[8:11]
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)


def transform_point(matrix, point):
    return [sum(matrix[r * 4 + c] * point[c] for c in range(3))
            + matrix[r * 4 + 3] for r in range(3)]


def node_matrix(node, index):
    label = f"node {index}"
    if "matrix" in node:
        require(not any(k in node for k in ("translation", "rotation", "scale")),
                f"{label}: matrix cannot be combined with TRS")
        raw = node["matrix"]
        require(finite_vector(raw, 16), f"{label}: invalid matrix")
        matrix = [raw[c * 4 + r] for r in range(4) for c in range(4)]
        require(all(abs(matrix[12 + i] - [0, 0, 0, 1][i]) < 1e-6
                    for i in range(4)), f"{label}: non-affine matrix")
    else:
        translation = node.get("translation", [0, 0, 0])
        scale = node.get("scale", [1, 1, 1])
        rotation = node.get("rotation", [0, 0, 0, 1])
        require(finite_vector(translation), f"{label}: invalid translation")
        require(finite_vector(scale) and all(x > 0 for x in scale),
                f"{label}: scale must be finite and positive")
        require(finite_vector(rotation, 4), f"{label}: invalid quaternion")
        require(abs(sum(x * x for x in rotation) - 1) < 1e-5,
                f"{label}: quaternion is not normalized")
        x, y, z, w = rotation
        sx, sy, sz = scale
        matrix = [(1 - 2*y*y - 2*z*z)*sx, (2*x*y - 2*z*w)*sy,
                  (2*x*z + 2*y*w)*sz, translation[0],
                  (2*x*y + 2*z*w)*sx, (1 - 2*x*x - 2*z*z)*sy,
                  (2*y*z - 2*x*w)*sz, translation[1],
                  (2*x*z - 2*y*w)*sx, (2*y*z + 2*x*w)*sy,
                  (1 - 2*x*x - 2*y*y)*sz, translation[2], 0, 0, 0, 1]
    require(determinant(matrix) > 1e-12, f"{label}: non-positive determinant")
    require(all(abs(matrix[r * 4 + c] - (1 if r == c else 0)) < 1e-5
                for r in range(3) for c in range(3)),
            f"{label}: apply scale and rotation before exporting")
    return matrix


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def walk_objects(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from walk_objects(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk_objects(item)


def image_size(data):
    """Read dimensions of PNG, JPEG or WebP without decoding image pixels."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        require(len(data) >= 24 and data[12:16] == b"IHDR", "Invalid PNG header")
        return struct.unpack_from(">II", data, 16)
    if data.startswith(b"\xff\xd8"):
        offset = 2
        while offset < len(data):
            require(data[offset] == 255, "Invalid JPEG marker")
            while offset < len(data) and data[offset] == 255:
                offset += 1
            require(offset < len(data), "Truncated JPEG marker")
            marker = data[offset]
            offset += 1
            if marker in (0x01, *range(0xD0, 0xDA)):
                continue
            require(offset + 2 <= len(data), "Truncated JPEG segment")
            length = struct.unpack_from(">H", data, offset)[0]
            require(length >= 2 and offset + length <= len(data), "Invalid JPEG segment")
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                          0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                require(length >= 7, "Truncated JPEG dimensions")
                height, width = struct.unpack_from(">HH", data, offset + 3)
                return width, height
            require(marker not in (0xDA, 0xD9), "JPEG dimensions not found")
            offset += length
        raise InvalidAsset("JPEG dimensions not found")
    require(len(data) >= 20 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
            "Unsupported or invalid embedded image; expected PNG, JPEG or WebP")
    require(struct.unpack_from("<I", data, 4)[0] + 8 == len(data),
            "WebP RIFF length does not match file length")
    offset = 12
    dimensions = None
    has_pixels = False
    while offset < len(data):
        require(offset + 8 <= len(data), "Truncated WebP chunk header")
        kind = data[offset:offset + 4]
        size = struct.unpack_from("<I", data, offset + 4)[0]
        start = offset + 8
        require(start + size <= len(data), "Truncated WebP chunk")
        chunk = data[start:start + size]
        if kind == b"VP8X":
            require(len(chunk) >= 10, "Truncated WebP VP8X header")
            require(not chunk[0] & 2, "Animated WebP is not a static poster")
            dimensions = (1 + int.from_bytes(chunk[4:7], "little"),
                          1 + int.from_bytes(chunk[7:10], "little"))
        elif kind == b"VP8 ":
            require(len(chunk) >= 10 and chunk[3:6] == b"\x9d\x01\x2a",
                    "Invalid WebP VP8 frame")
            width, height = struct.unpack_from("<HH", chunk, 6)
            dimensions = dimensions or (width & 0x3fff, height & 0x3fff)
            has_pixels = True
        elif kind == b"VP8L":
            require(len(chunk) >= 5 and chunk[0] == 0x2f, "Invalid WebP VP8L frame")
            bits = int.from_bytes(chunk[1:5], "little")
            dimensions = dimensions or ((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
            has_pixels = True
        offset = start + size + size % 2
    require(offset == len(data) and dimensions is not None and has_pixels,
            "WebP lacks a complete static pixel frame")
    return dimensions


class Glb:
    def __init__(self, path):
        self.path = path
        self.data = path.read_bytes()
        require(len(self.data) >= 20, "GLB header is truncated")
        magic, version, length = struct.unpack_from("<4sII", self.data)
        require(magic == b"glTF" and version == 2, "Expected a GLB version 2 file")
        require(length == len(self.data), "GLB declared length differs from file size")
        chunks = []
        offset = 12
        while offset < length:
            require(offset + 8 <= length, "Truncated GLB chunk header")
            size, kind = struct.unpack_from("<II", self.data, offset)
            require(size % 4 == 0, "GLB chunks must be 4-byte aligned")
            offset += 8
            require(offset + size <= length, "GLB chunk extends beyond file")
            chunks.append((kind, self.data[offset:offset + size]))
            offset += size
        require([c[0] for c in chunks] == [0x4E4F534A, 0x004E4942],
                "Expected exactly one JSON chunk followed by one BIN chunk")
        self.doc = json.loads(chunks[0][1].decode("utf-8"))
        self.binary = chunks[1][1]
        require(isinstance(self.doc, dict), "GLB JSON must be an object")
        require(self.doc.get("asset", {}).get("version") == "2.0", "Invalid glTF asset version")
        buffers = self.doc.get("buffers", [])
        require(len(buffers) == 1, "GLB must have one embedded buffer")
        declared = buffers[0]["byteLength"]
        require(0 <= len(self.binary) - declared <= 3, "BIN length differs from buffer byteLength")
        require(not any(self.binary[declared:]), "BIN padding must contain zero bytes")
        self.binary = self.binary[:declared]
        require(not self.doc.get("extensionsRequired"), "Required extensions need an unagreed decoder")
        for obj in walk_objects(self.doc):
            require("uri" not in obj, "All resources must be embedded bufferViews, without URI paths")
            extensions = obj.get("extensions", {})
            require("KHR_draco_mesh_compression" not in extensions
                    and "EXT_meshopt_compression" not in extensions,
                    "Compressed mesh requires an unagreed frontend decoder")
            require("KHR_lights_punctual" not in extensions, "Export must not contain lights")
        require(not self.doc.get("cameras"), "Export must not contain cameras")
        require(not self.doc.get("animations") and not self.doc.get("skins"),
                "Venue delivery must contain static meshes")
        self.accessor_cache = {}

    def view(self, index):
        views = self.doc.get("bufferViews", [])
        require(isinstance(index, int) and 0 <= index < len(views), "Invalid bufferView index")
        view = views[index]
        require(view.get("buffer") == 0, "bufferView must use the embedded buffer")
        start, size = view.get("byteOffset", 0), view["byteLength"]
        require(isinstance(start, int) and isinstance(size, int) and start >= 0 and size >= 0
                and start + size <= len(self.binary), "bufferView exceeds embedded buffer")
        return view, self.binary[start:start + size]

    def accessor(self, index):
        if index in self.accessor_cache:
            return self.accessor_cache[index]
        accessors = self.doc.get("accessors", [])
        require(isinstance(index, int) and 0 <= index < len(accessors), "Invalid accessor index")
        accessor = accessors[index]
        require("sparse" not in accessor, "Sparse accessors are outside this delivery validator")
        require(accessor.get("componentType") in COMPONENTS and accessor.get("type") in WIDTHS,
                "Unsupported accessor component or shape")
        fmt, component_bytes = COMPONENTS[accessor["componentType"]]
        width = WIDTHS[accessor["type"]]
        view, data = self.view(accessor["bufferView"])
        item_bytes = component_bytes * width
        stride = view.get("byteStride", item_bytes)
        count, offset = accessor["count"], accessor.get("byteOffset", 0)
        require(isinstance(count, int) and count > 0, "Empty or invalid accessor")
        require(isinstance(stride, int) and stride >= item_bytes and stride % component_bytes == 0,
                "Invalid accessor byteStride")
        require(isinstance(offset, int) and offset >= 0 and offset % component_bytes == 0,
                "Invalid accessor byteOffset")
        require(offset + (count - 1) * stride + item_bytes <= len(data),
                "Accessor exceeds bufferView")
        values = [struct.unpack_from("<" + fmt * width, data, offset + i * stride)
                  for i in range(count)]
        require(all(math.isfinite(x) for value in values for x in value),
                "Accessor contains NaN or infinity")
        self.accessor_cache[index] = (accessor, values)
        return accessor, values

    def inspect(self):
        # Inspect every view, accessor and node, including objects outside the active scene.
        for index in range(len(self.doc.get("bufferViews", []))):
            self.view(index)
        for index in range(len(self.doc.get("accessors", []))):
            self.accessor(index)
        nodes = self.doc.get("nodes", [])
        matrices = [node_matrix(node, i) for i, node in enumerate(nodes)]
        require(all("camera" not in node for node in nodes), "Node contains a camera")
        texture_sizes = []
        for item in self.doc.get("images", []):
            _, data = self.view(item["bufferView"])
            width, height = image_size(data)
            require(0 < width <= 1024 and 0 < height <= 1024, "Texture exceeds 1024 pixels")
            texture_sizes.append([width, height])
        mesh_data = []
        total_vertices = total_primitives = stored_triangles = 0
        degenerate_triangles = 0
        for mesh_index, mesh in enumerate(self.doc.get("meshes", [])):
            points, triangles = [], 0
            require(mesh.get("primitives"), f"mesh {mesh_index}: no primitives")
            for primitive in mesh["primitives"]:
                total_primitives += 1
                require(primitive.get("mode", 4) == 4, "Only TRIANGLES primitives are supported")
                require(not primitive.get("targets"), "Morph targets are outside the static delivery")
                attributes = primitive["attributes"]
                require("POSITION" in attributes and "NORMAL" in attributes,
                        "Every primitive must have positions and normals")
                position_spec, positions = self.accessor(attributes["POSITION"])
                normal_spec, normals = self.accessor(attributes["NORMAL"])
                require(position_spec["type"] == normal_spec["type"] == "VEC3"
                        and position_spec["componentType"] == normal_spec["componentType"] == 5126,
                        "Positions and normals must use float32 VEC3 accessors")
                require(len(normals) == len(positions), "Position and normal counts differ")
                require(all(abs(sum(x*x for x in n) - 1) < 0.01 for n in normals),
                        "Normals must have unit length")
                for key, choose in (("min", min), ("max", max)):
                    actual = [choose(p[axis] for p in positions) for axis in range(3)]
                    require(finite_vector(position_spec.get(key)), f"POSITION accessor lacks valid {key}")
                    require(all(abs(a-b) <= EPSILON for a, b in zip(actual, position_spec[key])),
                            f"POSITION accessor {key} does not match its binary values")
                if "indices" in primitive:
                    index_spec, values = self.accessor(primitive["indices"])
                    require(index_spec["type"] == "SCALAR"
                            and index_spec["componentType"] in (5121, 5123, 5125),
                            "Indices must use unsigned integer SCALAR accessors")
                    indices = [value[0] for value in values]
                else:
                    indices = list(range(len(positions)))
                require(len(indices) % 3 == 0, "Triangle index count is not divisible by three")
                require(all(0 <= i < len(positions) for i in indices), "Index exceeds vertex count")
                for start in range(0, len(indices), 3):
                    ids = indices[start:start + 3]
                    a, b, c = [positions[i] for i in ids]
                    u, v = [b[i]-a[i] for i in range(3)], [c[i]-a[i] for i in range(3)]
                    cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                    magnitude = math.sqrt(sum(x*x for x in cross))
                    if magnitude <= 1e-10:
                        degenerate_triangles += 1
                    else:
                        average = [sum(normals[j][i] for j in ids) for i in range(3)]
                        require(sum(cross[i]*average[i] for i in range(3)) >= -magnitude*0.01,
                                "Triangle winding opposes its vertex normals")
                points.extend(positions)
                triangles += len(indices) // 3
                total_vertices += len(positions)
            mesh_data.append((points, triangles))
            stored_triangles += triangles
        require(mesh_data, "GLB contains no meshes")
        scenes = self.doc.get("scenes", [])
        scene_index = self.doc.get("scene", 0)
        require(isinstance(scene_index, int) and 0 <= scene_index < len(scenes), "Missing default scene")
        bounds_min, bounds_max = [math.inf]*3, [-math.inf]*3
        seen_nodes, used_meshes = set(), set()
        rendered_triangles = 0

        def visit(index, parent, ancestors):
            nonlocal rendered_triangles
            require(isinstance(index, int) and 0 <= index < len(nodes), "Invalid node index")
            require(index not in ancestors, "Cycle in scene hierarchy")
            require(index not in seen_nodes, "Node has multiple parents or appears twice in scene")
            seen_nodes.add(index)
            world = matrix_multiply(parent, matrices[index])
            require(determinant(world) > 1e-12, "World transform has non-positive determinant")
            node = nodes[index]
            if "mesh" in node:
                mesh_index = node["mesh"]
                require(isinstance(mesh_index, int) and 0 <= mesh_index < len(mesh_data), "Invalid mesh index")
                used_meshes.add(mesh_index)
                points, triangles = mesh_data[mesh_index]
                rendered_triangles += triangles
                for point in points:
                    world_point = transform_point(world, point)
                    require(all(math.isfinite(x) for x in world_point), "Non-finite transformed position")
                    for axis in range(3):
                        bounds_min[axis] = min(bounds_min[axis], world_point[axis])
                        bounds_max[axis] = max(bounds_max[axis], world_point[axis])
            for child in node.get("children", []):
                visit(child, world, ancestors | {index})

        for index in scenes[scene_index].get("nodes", []):
            visit(index, IDENTITY, set())
        require(used_meshes, "Default scene has no mesh instances")
        require(len(used_meshes) == len(mesh_data), "Unreferenced meshes inflate the delivery")
        require(abs(bounds_min[1]) <= EPSILON, f"Ground must be y=0; measured minY={bounds_min[1]}")
        require(all(bounds_max[i] > bounds_min[i] for i in range(3)), "Model has empty bounds")
        return {"bytes": len(self.data), "triangles": rendered_triangles,
                "stored_triangles": stored_triangles, "vertices": total_vertices,
                "meshes": len(mesh_data), "primitives": total_primitives,
                "bounds_min": bounds_min, "bounds_max": bounds_max,
                "textures": texture_sizes, "degenerate_triangles": degenerate_triangles}


def public_file(public_dir, url, suffix):
    require(isinstance(url, str), "Asset URL must be a string")
    parsed = urlsplit(url)
    require(not parsed.scheme and not parsed.netloc and not parsed.query and not parsed.fragment,
            "Asset URL must be an unversioned local public path")
    require(parsed.path.startswith("/") and "\\" not in parsed.path, "Asset URL must begin with /")
    path = (public_dir / unquote(parsed.path).lstrip("/")).resolve()
    require(path.is_relative_to(public_dir.resolve()), "Asset URL escapes public directory")
    require(path.suffix == suffix, f"Asset must use {suffix} extension")
    require(path.is_file(), f"Missing asset: {path}")
    return path


def validate(args):
    repo_root = Path(__file__).resolve().parents[2]
    public_path = args.public_dir.resolve()
    public_label = public_path.relative_to(repo_root).as_posix() if public_path.is_relative_to(repo_root) else str(public_path)
    result = {"ok": False, "public_dir": public_label, "venues": [],
              "errors": [], "warnings": [],
              "budgets": {"glb_bytes": args.max_glb_bytes, "triangles": args.max_triangles,
                          "poster_bytes": args.max_poster_bytes, "texture_max_dimension": 1024},
              "manual_checks": ["Visual identity and +Z facade orientation",
                                "Camera framing, lighting and hotspot clickability in the real app",
                                "Mobile loading and image fallback; image pixels are not decoded here",
                                "References, authorship and usage rights in asset-sources.md"]}
    try:
        fixture = read_json(args.fixture)
        manifest = read_json(args.manifest or args.public_dir / "venue-assets.json")
        seed = read_json(args.seed)["tables"]
        required_slugs = fixture["required_venue_slugs"]
        required_fields = set(fixture["venues"][0])
        require(manifest.get("schema_version") == fixture["schema_version"], "Unexpected schema_version")
        venues = manifest["venues"]
        require(isinstance(venues, list) and len(venues) == len(required_slugs), "Exactly three venues are required")
        require(sorted(v["slug"] for v in venues) == sorted(required_slugs), "Venue slugs do not match fixture")
        seed_venues = {v["slug"]: v["id"] for v in seed["venues"]}
        businesses = {b["slug"]: b for b in seed["businesses"]}
    except (OSError, ValueError, KeyError, TypeError, AttributeError, RecursionError) as error:
        result["errors"].append(f"Manifest/fixture/seed: {error}")
        return result
    for venue in venues:
        slug = venue["slug"]
        item = {"slug": slug, "errors": []}
        result["venues"].append(item)
        try:
            require(required_fields <= set(venue), f"Missing fields: {sorted(required_fields - set(venue))}")
            require(venue["geometry_status"] in ("conceptual", "reference_based"), "Unknown geometry_status")
            require(isinstance(venue["conceptual_scale"], bool), "conceptual_scale must be boolean")
            require(venue["geometry_status"] != "conceptual" or venue["conceptual_scale"],
                    "Conceptual dimensions must declare conceptual_scale=true")
            require(venue["units"] == "meters" and venue["up_axis"] == "+Y" and venue["front_axis"] == "+Z",
                    "Expected units=meters, up_axis=+Y, front_axis=+Z")
            for key in ("center", "bounds_min", "bounds_max", "camera_position", "camera_target"):
                require(finite_vector(venue[key]), f"{key} must be a finite three-element vector")
            require(all(abs(x) < EPSILON for x in venue["center"]), "Center/origin must be [0, 0, 0]")
            require(sum((a-b)**2 for a, b in zip(venue["camera_position"], venue["camera_target"])) > 1,
                    "Camera position must differ from its target")
            require(venue["camera_position"][1] > 0, "Camera must be above ground")
            hotspots = venue["hotspots"]
            expected = {f"{slug}-demo-{category}" for category in ("clothes", "food", "home")}
            require(isinstance(hotspots, list) and len(hotspots) == 3, "Exactly three hotspots are required")
            require({h.get("id") for h in hotspots} == expected
                    and {h.get("business_slug") for h in hotspots} == expected,
                    "Hotspot IDs and business_slugs must match the three fixture demo slugs")
            for hotspot in hotspots:
                require(hotspot["id"] == hotspot["business_slug"], "Hotspot id must equal business_slug")
                business = businesses[hotspot["business_slug"]]
                require(business["venue_id"] == seed_venues[slug], "Hotspot belongs to a different seed venue")
                if "business_id" in hotspot:
                    require(hotspot["business_id"] == business["id"], "business_id differs from seed UUID")
                require(finite_vector(hotspot.get("position")), "Hotspot position must be a finite vector")
            model = public_file(args.public_dir, venue["model_url"], ".glb")
            poster = public_file(args.public_dir, venue["poster_url"], ".webp")
            require(model.name == f"{slug}.glb" and poster.name == f"{slug}.webp", "Asset filenames must match slug")
            metrics = Glb(model).inspect()
            item.update(metrics)
            require(metrics["bytes"] <= args.max_glb_bytes, "GLB exceeds file budget")
            require(metrics["triangles"] <= args.max_triangles, "GLB exceeds triangle budget")
            if metrics["degenerate_triangles"]:
                result["warnings"].append(f"{slug}: {metrics['degenerate_triangles']} degenerate triangles")
            for key in ("bounds_min", "bounds_max"):
                require(all(abs(a-b) <= EPSILON for a, b in zip(venue[key], metrics[key])),
                        f"Manifest {key} differs from transformed GLB geometry")
            low, high = metrics["bounds_min"], metrics["bounds_max"]
            require(all(abs((low[i] + high[i]) / 2) <= EPSILON for i in (0, 2)),
                    "Ground origin must be at the horizontal bounding-box center")
            for hotspot in hotspots:
                x, y, z = hotspot["position"]
                require(low[0] <= x <= high[0] and low[2] <= z <= high[2]
                        and 0 < y <= high[1] + max(5, (high[1] - low[1]) * .5),
                        f"Hotspot {hotspot['id']} is outside model footprint or altitude range")
            poster_data = poster.read_bytes()
            item["poster_bytes"] = len(poster_data)
            require(poster_data[:4] == b"RIFF" and poster_data[8:12] == b"WEBP", "Poster is not WebP")
            item["poster_dimensions"] = list(image_size(poster_data))
            require(all(x > 0 for x in item["poster_dimensions"]), "Poster dimensions must be positive")
            require(len(poster_data) <= args.max_poster_bytes, "Poster exceeds file budget")
        except (OSError, ValueError, KeyError, IndexError, TypeError, AttributeError,
                struct.error, OverflowError, RecursionError) as error:
            item["errors"].append(str(error))
            result["errors"].append(f"{slug}: {error}")
    result["ok"] = not result["errors"]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--public-dir", type=Path, default=ROOT / "apps/web/public")
    parser.add_argument("--manifest", type=Path, help="Defaults to public-dir/venue-assets.json")
    parser.add_argument("--fixture", type=Path, default=ROOT / "docs/team5/fixtures/venue-assets.example.json")
    parser.add_argument("--seed", type=Path, default=ROOT / "packages/contracts/demo-seed.json")
    parser.add_argument("--report", type=Path, help="Also save the JSON report to this path")
    parser.add_argument("--max-glb-bytes", type=int, default=1_500_000)
    parser.add_argument("--max-triangles", type=int, default=30_000)
    parser.add_argument("--max-poster-bytes", type=int, default=200_000)
    args = parser.parse_args()
    report = validate(args)
    output = json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False)
    if args.report:
        try:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(output + "\n", encoding="utf-8")
        except OSError as error:
            report["ok"] = False
            report["errors"].append(f"Cannot write report: {error}")
            output = json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False)
    print(output)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
