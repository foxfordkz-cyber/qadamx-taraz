"""Reference-led western entrance and adjoining roofs, not the full market.

The gate/horse/fence identity is observed in May and September 2024 photos.
The asymmetry follows the visible satellite image at 71.411083, 42.905850:
large hipped-roof hall to the right, open court to the left, long rows behind.
Dimensions, crop boundary, hidden walls, bay repetitions and hotspot placement
remain estimated. The gold motifs and horse meshes are original stylizations.
"""
from venue_geometry import *

PALETTE.update({
    "auyl_gate": "354752", "auyl_gate_edge": "526570",
    "auyl_pier": "b9aa97", "auyl_pier_light": "d4c7b6",
    "auyl_gold": "b5a16a", "auyl_bronze": "877f60",
    "auyl_bronze_dark": "665f48", "auyl_mauve": "9b8295",
    "auyl_roof": "aab9bd", "auyl_roof_light": "c4d0d0",
    "auyl_roof_seam": "8a9da4", "auyl_wall": "dfddd0",
    "auyl_window": "546268", "auyl_orange": "bc7054",
    "auyl_road": "b4b3a9", "auyl_stall": "7b8b8c",
})


def fluted_column(name, x, z, bottom, height, radius):
    count, verts = 48, []
    for y in (bottom, bottom + height):
        for i in range(count):
            a = 2 * math.pi * i / count
            r = radius * (1 if i % 4 in (0, 3) else .92)
            verts.append((x + r * math.cos(a), y, z + r * math.sin(a)))
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)]
    return mesh(name, verts, faces, "auyl_gate_edge")


def oval(name, center, dimensions, mat, detail=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail, radius=1, location=xyz(center))
    obj = bpy.context.object
    obj.scale = (dimensions[0], dimensions[2], dimensions[1])
    return finish(obj, name, mat)


def horse_sketch(x, z, facing):
    """Original faceted horse silhouette, explicitly not a scan of sculpture."""
    scale, bottom = .84, 1.75
    def p(a, b, depth=0):
        return (x + facing * a * scale, bottom + b * scale, z + depth * scale)
    outline = [(1.28,2.72),(.58,2.82),(-.28,2.91),(-.62,3.61),(-.47,4.03),
        (-.72,4.18),(-.94,3.87),(-1.16,3.78),(-1.85,3.43),(-1.71,3.14),
        (-1.12,3.3),(-.83,2.53),(-.83,2.08),(-.56,.34),(-.83,.13),
        (-.18,.13),(-.1,.42),(-.26,1.94),(.66,1.82),(.53,.34),(.3,.13),
        (.9,.13),(1.12,1.11),(1.43,1.86),(1.46,2.32)]
    prism("Original bronze horse silhouette", [(p(a,b)[0],p(a,b)[1]) for a,b in outline], z, .58, "auyl_bronze")
    oval("Horse rounded barrel", p(.28,2.35), (1.02*scale,.59*scale,.49*scale), "auyl_bronze", 2)
    oval("Horse shoulder", p(-.45,2.36), (.48*scale,.67*scale,.46*scale), "auyl_bronze")
    beam("Horse lifted foreleg upper",p(-.61,2.23,.33),p(-1.25,1.76,.33),.19,"auyl_bronze")
    beam("Horse lifted foreleg lower",p(-1.25,1.76,.33),p(-1.62,2.16,.33),.16,"auyl_bronze")
    box("Raised hoof",p(-1.64,2.17,.33),(.28,.2,.22),"auyl_bronze_dark",0)
    beam("Horse far hind leg",p(1.02,1.9,-.3),p(1.46,.3,-.3),.17,"auyl_bronze")
    tail=[(1.28,2.66),(1.72,2.73),(2.04,2.29),(2.15,1.66),(1.81,1.18),(1.54,1.18),(1.78,1.75),(1.57,2.2)]
    prism("Horse flowing angular tail",[(p(a,b)[0],p(a,b)[1]) for a,b in tail],z,.23,"auyl_bronze_dark")
    mane=[(-.68,3.75),(-.39,3.54),(-.2,3.01),(-.39,2.71),(-.65,3.2),(-.86,3.66)]
    prism("Horse original mane",[(p(a,b)[0],p(a,b)[1]) for a,b in mane],z-.05,.66,"auyl_bronze_dark")


def long_canopy(x, z, width, depth, rise=1.25):
    """Silver vault and repeated stalls reflect visible long roofs, not shop IDs."""
    eave, count = 4.4, 12
    profile=[(x+width*(i/count-.5),eave+rise*math.sin(math.pi*i/count)) for i in range(count+1)]
    prism("Long silver vaulted canopy",profile+[(px,py-.15) for px,py in reversed(profile)],z,depth,"auyl_roof")
    for i in range(1,count,2):
        px,py=profile[i]
        box("Long canopy raised seam",(px,py+.02,z),(.05,.04,depth),"auyl_roof_light",0)
    box("Continuous shortened trading row",(x,2.14,z),(width-1.1,3.28,depth-1),"auyl_wall",0)
    for i in range(11):
        zz=z-depth/2+2.7+i*(depth-5.4)/10
        for side in (-1,1):
            xx=x+side*(width/2-.5)
            box("Original repetitive stall recess",(xx,2.08,zz),(.1,3.15,3.6),"auyl_stall",0)
            box("Exposed canopy steel upright",(xx,2.38,zz+1.96),(.12,3.76,.12),"auyl_gate",0)
    box("Unlettered functional row fascia",(x,3.8,z+depth/2-.45),(width-1.05,.48,.12),"auyl_gate_edge",0)


def hipped_hall():
    # Right/south of the western entrance: footprint and hipped roof are visible
    # in satellite; windows/orange belt are visible through the May 2024 gate.
    x,z,w,d,eave,rise=39,19,43,59,7.35,3.5
    box("Large pale hall beside entrance",(x,3.91,z),(w,6.82,d),"auyl_wall",0)
    verts=[(x-w/2-.5,eave,z-d/2-.5),(x+w/2+.5,eave,z-d/2-.5),
        (x+w/2+.5,eave,z+d/2+.5),(x-w/2-.5,eave,z+d/2+.5),
        (x,eave+rise,z-d/2+12),(x,eave+rise,z+d/2-12)]
    mesh("Broad silver hipped hall roof",verts,[(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5),(3,2,1,0)],"auyl_roof")
    box("Orange band facing access lane",(x-w/2-.05,3.44,z),(.12,.65,d),"auyl_orange",0)
    box("Orange front band",(x,3.44,z+d/2+.05),(w,.65,.12),"auyl_orange",0)
    for i in range(13):
        zz=z-d/2+2.3+i*(d-4.6)/12
        box("Hall upper aisle window",(x-w/2-.06,5.42,zz),(.1,2.35,3.56),"auyl_window",0)
        box("Hall ground shop opening",(x-w/2-.07,1.91,zz),(.1,2.82,3.56),"auyl_stall",0)
    for i in range(9):
        xx=x-w/2+2.6+i*(w-5.2)/8
        box("Hall upper front window",(xx,5.42,z+d/2+.06),(3.65,2.35,.1),"auyl_window",0)
        box("Hall lower front opening",(xx,1.91,z+d/2+.07),(3.65,2.82,.1),"auyl_stall",0)
    for i in range(10):
        zz=z-d/2+13+i*(d-26)/9
        for side in (-1,1):
            beam("Sparse standing roof seam",(x,eave+rise+.02,zz),(x+side*(w/2+.5),eave+.02,zz),.055,"auyl_roof_light")
    # Small attached front appendage is visible beside the broad hipped roof.
    box("Low attached hall porch",(15.2,2.7,37),(5.1,4.4,15),"auyl_wall",0)
    pitched_roof("Attached porch shallow roof",15.2,37,5.6,15.5,4.98,.75,"auyl_roof_light")


def entrance_gate():
    start,z=len(PARTS),20
    for side in (-1,1):
        x=side*11.4
        box("Tall warm stone gate pier",(x,5.35,z),(3.5,9.7,3.2),"auyl_pier",.035)
        box("Pier vertical front inset",(x,5.5,z+1.615),(2.64,8.7,.08),"auyl_pier_light",0)
        box("Pier stone foot",(x,.91,z),(3.95,.82,3.7),"auyl_pier_light",0)
        for dx in (-1.49,1.49):
            xx=x+dx
            cylinder("Blue-grey column spreading base",(xx,.77,z+1.98),.61,.54,"auyl_gate_edge",20)
            cylinder("Column lower collar",(xx,1.19,z+1.98),.47,.28,"auyl_gate",20)
            fluted_column("Fluted blue-grey entrance column",xx,z+1.98,1.33,8.18,.365)
            cylinder("Column upper collar",(xx,9.6,z+1.98),.49,.23,"auyl_gate",20)
            box("Simplified column capital",(xx,9.94,z+1.98),(1.03,.43,.95),"auyl_gate_edge",0)
        box("Side entablature block",(x,11.02,z+.08),(4.45,1.76,4.1),"auyl_gate",0)
        box("Raised pier cornice",(x,12.2,z+.08),(4.94,.45,4.58),"auyl_gate_edge",0)
        box("Raised pier cap edge",(x,12.53,z+.08),(5.23,.21,4.83),"auyl_gate",0)
        box("Horse stone plinth",(x,1.05,z+4),(4.5,1.1,2.45),"auyl_pier",.035)
        box("Horse plinth cap",(x,1.67,z+4),(4.7,.14,2.63),"auyl_pier_light",.02)
        horse_sketch(x,z+4,side)
    box("Broad dark entrance entablature",(0,10.96,z),(25.7,1.65,3.35),"auyl_gate",0)
    box("Entablature lower moulding",(0,10.09,z+.05),(26.05,.18,3.57),"auyl_gate_edge",0)
    box("Continuous upper cornice",(0,11.91,z+.05),(26.5,.29,3.79),"auyl_gate_edge",0)
    box("Dark upper cornice edge",(0,12.12,z+.05),(26.75,.15,3.94),"auyl_gate",0)
    for yy in (10.44,11.57):
        box("Fine gold frieze rule",(0,yy,z+1.71),(25.1,.065,.065),"auyl_gold",0)
    for i in range(15):
        xx=-11.2+i*1.6
        for a,b in [((-.28,0),(0,.36)),((0,.36),(.28,0)),((.28,0),(0,-.36)),((0,-.36),(-.28,0))]:
            beam("Original gold geometric frieze motif",(xx+a[0],11+a[1],z+1.77),(xx+b[0],11+b[1],z+1.77),.065,"auyl_gold")
        box("Frieze motif stem",(xx,11,z+1.77),(.055,.9,.055),"auyl_gold",0)
    for i in range(43):
        box("Simple cornice dentil",(-12.6+i*.6,11.74,z+1.83),(.16,.13,.16),"auyl_pier_light",0)
    for side in (-1,1):
        for i in range(10):
            x=side*(15.7+i*3.1)
            cylinder("Muted mauve fence column",(x,2.64,20),.2,3.48,"auyl_mauve",12)
            box("Fence pale capital",(x,4.5,20),(.59,.27,.58),"auyl_pier_light",0)
            box("Fence pale cap",(x,4.7,20),(.7,.13,.69),"auyl_pier_light",0)
        box("Fence pale low wall",(side*29.55,.91,20),(29.2,.82,.52),"auyl_pier_light",0)
        for i in range(64):
            box("Black steel fence picket",(side*(15.25+i*.45),2.58,20),(.047,2.52,.06),"auyl_gate",0)
        for y in (1.63,3.39):
            box("Black horizontal fence rail",(side*29.55,y,20),(29.2,.055,.07),"auyl_gate",0)
        for i in range(12):
            box("Open gate leaf vertical",(side*8.9,1.87,18.2-i*.34),(.065,2.66,.045),"auyl_gate",0)
        for y in (.56,3.18):
            box("Open gate leaf rail",(side*8.9,y,16.32),(.08,.08,4.15),"auyl_gate",0)
    # Place this independently editable entrance into the larger observed crop.
    # Vertex transforms stay baked, with unit object scales and shared origin.
    for obj in PARTS[start:]:
        for v in obj.data.vertices:
            v.co.x*=1.25
            v.co.y=(v.co.y+20)*1.25-55
            v.co.z=.5+(v.co.z-.5)*1.25
        obj.data.update()


def auyl_bereke():
    base(154,150)
    # West is the model front (+Z). The access road continues east (-Z).
    box("Central market access lane",(0,.518,-3),(22,.03,140),"auyl_road",0)
    box("Street outside western entrance",(0,.52,67),(152.8,.03,12),"auyl_road",0)
    box("Open north-side entrance court",(-40,.518,26),(57,.03,47),"auyl_road",0)
    # Three long roof strips north/left of the entry are visible in the crop.
    # Their hidden shop subdivisions and finite lengths are illustrative.
    long_canopy(-22,-30,11,73,1.05)
    long_canopy(-39,-29,12.5,76,1.28)
    long_canopy(-58,-27,14,79,1.1)
    hipped_hall()
    entrance_gate()
    for x in (-66,66):
        tree(x,58,.9)


CONFIG = {
    "name":"Ауыл Береке", "build":auyl_bereke,
    "camera":[156,115,182], "target":[0,5,0], "render_scale":210,
    "hotspots":[[-21,5.9,-1],[-35,2.5,24],[39,12.1,20]],
    "reconstruction": {
        "coverage":"entrance_and_adjacent_rows_fragment",
        "label_ru":"Вход и ряды · размеры оценочные",
        "confirmed":["Прямоугольные монументальные ворота, сине-серые колонны, золотистый фриз и парные кони", "Правый от входа крупный корпус со скатной/вальмовой серебристой крышей", "Открытый двор слева и протяжённые параллельные серебристые ряды за ним"],
        "estimated":["Метрические размеры и конечная граница фрагмента", "Высоты крыш и скрытые фасады", "Повторные проёмы, детали навесов и положения учебных точек"],
        "source_urls":["https://yandex.kz/maps/ru/org/auyl_bereke/161384481381/gallery/", "https://yandex.kz/maps/ru/org/auyl_bereke/161384481381/gallery/?l=sat&ll=71.411083%2C42.905850&z=19", "https://www.youtube.com/watch?v=UiR8DrhGLbY", "https://2gis.kz/taraz/firm/70000001054386766"]
    }
}
