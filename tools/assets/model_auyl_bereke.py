"""Reference-led western entrance and a schematic run of adjoining roofs.

The gate/horse/fence identity is observed in May and September 2024 photos.
The asymmetry follows the visible satellite image at 71.411083, 42.905850:
large hipped-roof hall to the right, open court to the left, long rows behind.
The longer roof run is informed by satellite, but it is not a surveyed plan of
the market or its eastern exit. Dimensions, crop boundary, hidden walls, bay
repetitions and hotspot placement remain estimated. The gold motifs and horse
meshes are original stylizations.
"""
from venue_geometry import *

PALETTE.update({
    "auyl_gate": "293a43", "auyl_gate_edge": "4d6069",
    "auyl_pier": "b39b88", "auyl_pier_light": "d2bdab",
    "auyl_gold": "c59b65", "auyl_bronze": "6d5a44",
    "auyl_bronze_dark": "4b3d32", "auyl_mauve": "a56f8e",
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


def oval(name, center, dimensions, mat, detail=1, pitch=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail, radius=1, location=xyz(center))
    obj = bpy.context.object
    obj.scale = (dimensions[0], dimensions[2], dimensions[1])
    obj.rotation_euler[1] = pitch
    return finish(obj, name, mat)


def horse_sketch(x, z, facing, raised):
    """Original faceted sculpture study: one rearing horse, one standing horse."""
    scale, bottom = 1.27, 1.71
    def p(a, b, depth=0):
        return (x + facing * a * scale, bottom + b * scale, z + depth * scale)
    lift = .65 if raised else 0
    oval("Horse barrel",p(.15,2.36+lift*.35),(1.09*scale,.61*scale,.48*scale),
         "auyl_bronze",2,pitch=.32*facing if raised else 0)
    oval("Horse chest",p(-.55,2.21+lift),(.58*scale,.8*scale,.46*scale),"auyl_bronze",2)
    oval("Horse haunch",p(.91,2.15),(.52*scale,.72*scale,.46*scale),"auyl_bronze",2)
    beam("Horse rising neck",p(-.65,2.48+lift),p(-1.16,3.48+lift),.44*scale,"auyl_bronze")
    oval("Horse head",p(-1.38,3.62+lift),(.53*scale,.32*scale,.3*scale),"auyl_bronze",2)
    oval("Horse muzzle",p(-1.86,3.49+lift),(.3*scale,.21*scale,.25*scale),"auyl_bronze")
    for depth in (-.19,.19):
        beam("Horse pointed ear",p(-1.21,3.8+lift,depth),p(-1.27,4.08+lift,depth),.14,"auyl_bronze_dark")
    mane=[(-.65,3.67+lift),(-.44,3.4+lift),(-.32,2.94+lift),(-.52,2.67+lift),(-.87,3.25+lift),(-1.03,3.61+lift)]
    prism("Horse faceted mane",[(p(a,b)[0],p(a,b)[1]) for a,b in mane],z-.14,.22,"auyl_bronze_dark")
    tail=[(1.2,2.61),(1.62,2.72),(1.91,2.36),(2.03,1.75),(1.78,1.31),(1.57,1.34),(1.76,1.88),(1.54,2.24)]
    prism("Horse flowing tail",[(p(a,b)[0],p(a,b)[1]) for a,b in tail],z,.25,"auyl_bronze_dark")
    # Near and far limbs give the silhouette depth at the oblique viewing angle.
    legs=[(.88,1.83,1.10,.79,1.17,.11,.29),
          (.65,1.81,.77,.87,.81,.11,-.29)]
    if raised:
        legs += [(-.42,2.64,-1.02,2.3,-1.51,2.79,-.34),
                 (-.68,2.75,-1.29,2.05,-1.88,2.21,.36)]
    else:
        legs += [(-.35,1.86,-.61,.78,-.73,.11,-.34),
                 (-.58,1.86,-.75,.79,-.71,.11,.29)]
    for upper_a,upper_b,knee_a,knee_b,hoof_a,hoof_b,depth in legs:
        beam("Horse upper leg",p(upper_a,upper_b,depth),p(knee_a,knee_b,depth),.21*scale,"auyl_bronze")
        beam("Horse lower leg",p(knee_a,knee_b,depth),p(hoof_a,hoof_b,depth),.16*scale,"auyl_bronze")
        box("Horse dark hoof",p(hoof_a,hoof_b,depth),(.28*scale,.17*scale,.25*scale),"auyl_bronze_dark",0)


def long_canopy(x, z, width, depth, rise=1.25):
    """A short visible end of a silver roof strip, with illustrative bays."""
    eave, count = 4.4, 12
    profile=[(x+width*(i/count-.5),eave+rise*math.sin(math.pi*i/count)) for i in range(count+1)]
    prism("Long silver vaulted canopy",profile+[(px,py-.15) for px,py in reversed(profile)],z,depth,"auyl_roof")
    for i in range(1,count,2):
        px,py=profile[i]
        box("Long canopy raised seam",(px,py+.02,z),(.05,.04,depth),"auyl_roof_light",0)
    box("Continuous shortened trading row",(x,2.14,z),(width-1.1,3.28,depth-1),"auyl_wall",0)
    bays=max(4,int(depth/6))
    for i in range(bays):
        zz=z-depth/2+3+i*(depth-6)/(bays-1)
        for side in (-1,1):
            xx=x+side*(width/2-.5)
            box("Original repetitive stall recess",(xx,2.08,zz),(.1,3.15,3.2),"auyl_stall",0)
            box("Exposed canopy steel upright",(xx,2.38,zz+1.72),(.12,3.76,.12),"auyl_gate",0)
    box("Unlettered functional row fascia",(x,3.8,z+depth/2-.45),(width-1.05,.48,.12),"auyl_gate_edge",0)


def hipped_hall():
    # Right/south of the western entrance: footprint and hipped roof are visible
    # in satellite; windows/orange belt are visible through the May 2024 gate.
    # Only the visible western portion is shown; the back of this block is a
    # crop boundary, not a claim about the real building's complete footprint.
    x,z,w,d,eave,rise=20,-12,31,36,7.35,2.8
    box("Large pale hall beside entrance",(x,3.91,z),(w,6.82,d),"auyl_wall",0)
    verts=[(x-w/2-.5,eave,z-d/2-.5),(x+w/2+.5,eave,z-d/2-.5),
        (x+w/2+.5,eave,z+d/2+.5),(x-w/2-.5,eave,z+d/2+.5),
        (x,eave+rise,z-d/2+12),(x,eave+rise,z+d/2-12)]
    mesh("Broad silver hipped hall roof",verts,[(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5),(3,2,1,0)],"auyl_roof")
    box("Orange band facing access lane",(x-w/2-.05,3.44,z),(.12,.65,d),"auyl_orange",0)
    box("Orange front band",(x,3.44,z+d/2+.05),(w,.65,.12),"auyl_orange",0)
    for i in range(8):
        zz=z-d/2+2.5+i*(d-5)/7
        box("Hall upper aisle window",(x-w/2-.06,5.42,zz),(.1,2.35,3.65),"auyl_window",0)
        box("Hall ground shop opening",(x-w/2-.07,1.91,zz),(.1,2.82,3.65),"auyl_stall",0)
    for i in range(7):
        xx=x-w/2+2.6+i*(w-5.2)/6
        box("Hall upper front window",(xx,5.42,z+d/2+.06),(3.12,2.35,.1),"auyl_window",0)
        box("Hall lower front opening",(xx,1.91,z+d/2+.07),(3.12,2.82,.1),"auyl_stall",0)
    for i in range(7):
        zz=z-d/2+12+i*(d-24)/6
        for side in (-1,1):
            beam("Sparse standing roof seam",(x,eave+rise+.02,zz),(x+side*(w/2+.5),eave+.02,zz),.055,"auyl_roof_light")
    # Small attached front appendage is visible beside the broad hipped roof.
    box("Low attached hall porch",(3,2.7,1.8),(4.8,4.4,9),"auyl_wall",0)
    pitched_roof("Attached porch shallow roof",3,1.8,5.3,9.5,4.98,.75,"auyl_roof_light")


def frieze_leaf(x, y, z, size=1):
    """An original, legible leaf motif in the photographed frieze's rhythm."""
    pts=[(-.11,-.39),(.11,-.39),(.15,-.12),(.29,.06),(0,.42),(-.29,.06),(-.15,-.12)]
    prism("Original gold central leaf",[(x+a*size,y+b*size) for a,b in pts],z,.08,"auyl_gold")
    for side in (-1,1):
        pts=[(side*.11,-.22),(side*.36,.02),(side*.44,.24),(side*.29,.17),(side*.21,-.02)]
        prism("Original gold curling leaf",[(x+a*size,y+b*size) for a,b in pts],z+.005,.075,"auyl_gold")


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
        box("Raised end frieze",(x,12.88,z+.08),(4.75,.83,4.34),"auyl_gate",0)
        box("End frieze gold lower line",(x,12.46,z+2.27),(4.65,.045,.06),"auyl_gold",0)
        for dx in (-1.47,0,1.47):
            frieze_leaf(x+dx,12.89,z+2.31,.52)
        box("Raised end cornice middle",(x,13.43,z+.08),(5.19,.27,4.75),"auyl_gate_edge",0)
        box("Raised end cornice top",(x,13.67,z+.08),(5.53,.20,5.04),"auyl_gate",0)
        box("Horse stone plinth",(x,1.05,z+4),(5.6,1.1,2.9),"auyl_pier",.035)
        box("Horse plinth cap",(x,1.67,z+4),(5.8,.14,3.05),"auyl_pier_light",.02)
        horse_sketch(x,z+4,1,side==1)
    box("Broad dark entrance entablature",(0,10.96,z),(25.7,1.65,3.35),"auyl_gate",0)
    box("Entablature lower moulding",(0,10.09,z+.05),(26.05,.18,3.57),"auyl_gate_edge",0)
    box("Continuous upper cornice",(0,11.91,z+.05),(26.5,.29,3.79),"auyl_gate_edge",0)
    box("Dark upper cornice edge",(0,12.12,z+.05),(26.75,.15,3.94),"auyl_gate",0)
    for yy in (10.34,11.61):
        box("Fine gold frieze rule",(0,yy,z+1.71),(25.1,.065,.065),"auyl_gold",0)
    for i in range(21):
        frieze_leaf(-11.8+i*1.18,10.98,z+1.76,.9)
    for i in range(35):
        xx=-12+i*.7
        box("Narrow gold frieze lace",(xx,10.27,z+1.78),(.18,.12,.055),"auyl_gold",0)
    for i in range(43):
        box("Simple cornice dentil",(-12.6+i*.6,11.74,z+1.83),(.16,.13,.16),"auyl_pier_light",0)
    for side in (-1,1):
        for i in range(4):
            x=side*(15.7+i*2.5)
            cylinder("Muted mauve fence column",(x,2.64,20),.2,3.48,"auyl_mauve",12)
            box("Fence pale capital",(x,4.5,20),(.59,.27,.58),"auyl_pier_light",0)
            box("Fence pale cap",(x,4.7,20),(.7,.13,.69),"auyl_pier_light",0)
        box("Fence pale low wall",(side*19.5,.91,20),(9.2,.82,.52),"auyl_pier_light",0)
        for i in range(21):
            box("Black steel fence picket",(side*(15.1+i*.44),2.58,20),(.047,2.52,.06),"auyl_gate",0)
        for y in (1.63,3.39):
            box("Black horizontal fence rail",(side*19.5,y,20),(9.2,.055,.07),"auyl_gate",0)
        for i in range(12):
            box("Open gate leaf vertical",(side*8.9,1.87,18.2-i*.34),(.065,2.66,.045),"auyl_gate",0)
        for y in (.56,3.18):
            box("Open gate leaf rail",(side*8.9,y,16.32),(.08,.08,4.15),"auyl_gate",0)
    # Place this independently editable entrance into the west-facing vignette.
    # Vertex transforms stay baked, with unit object scales and shared origin.
    for obj in PARTS[start:]:
        for v in obj.data.vertices:
            v.co.x*=1.45
            v.co.y=(v.co.y+20)*1.15-17
            v.co.z=.5+(v.co.z-.5)*1.15
        obj.data.update()


def auyl_bereke():
    # Front (+Z) is west. This display island cuts off the long rows well
    # before the mapped eastern market exits; its perimeter is not a boundary.
    box("Ground island at y=0",(0,.22,-35),(96,.44,138),"stone",.18)
    box("Pedestrian surface",(0,.47,-35),(95.2,.06,137.2),"chalk",.02)
    # Keep the road slabs well clear of the pale pedestrian top (y=.50);
    # the earlier three-millimetre gap made the long lane z-fight in preview.
    box("Central market access lane",(-5,.56,-41),(18,.04,113),"auyl_road",0)
    box("Street outside western entrance",(0,.56,28),(95,.04,11),"auyl_road",0)
    # Stop before the access lane at x=-14: coplanar overlapping road slabs
    # rendered a near-black rectangle in the entrance preview.
    box("Open north-side entrance court",(-25,.56,5),(21,.04,24),"auyl_road",0)
    # Parallel pale roof strips continue east in satellite view. Their exact
    # bay counts and lengths are deliberately illustrative.
    long_canopy(-22,-47.5,10,81,1.05)
    long_canopy(-32,-47.5,8.5,81,1.1)
    long_canopy(-42,-52,8.5,72,1.05)
    # A broad roof volume continues behind the hall on the south side. Only
    # massing is shown because the satellite does not resolve its facades.
    box("Rear pale trading hall volume",(20,3.65,-65),(29,6.3,59),"auyl_wall",0)
    pitched_roof("Rear silver trading hall roof",20,-65,29.8,60,6.8,2.1,"auyl_roof")
    for zz in (-90,-78,-66,-54,-42):
        for side in (-1,1):
            beam("Sparse rear hall roof seam",(20,8.93,zz),
                 (20+side*14.9,6.83,zz),.045,"auyl_roof_light")
    hipped_hall()
    entrance_gate()
    # The display island is centred at z=-35 in the construction coordinates.
    # Recenter every baked mesh so the delivered GLB origin lies at the
    # horizontal bounding-box centre on the ground, as the asset contract asks.
    for obj in PARTS:
        for vertex in obj.data.vertices:
            vertex.co.y -= 35  # Blender Y is negative glTF Z.
        obj.data.update()


CONFIG = {
    "name":"Ауыл Береке", "build":auyl_bereke,
    "geometry_status":"reference_based",
    "label_ru":"Западный вход и ряды · схема, размеры оценочные",
    "label_kk":"Батыс кіреберіс пен қатарлар · өлшемдері болжамды",
    "camera":[47,52,157], "target":[0,5,5], "render_scale":0,
    "preview_camera":[12,13,96], "preview_target":[0,7.5,52], "preview_scale":50,
    "hotspots":[[-42,6,-35],[0,3,45],[29,10.7,7]],
    "reconstruction": {
        "coverage":"western_monumental_entrance_and_schematic_adjacent_market_rows; eastern_exit_not_modelled",
        "confirmed":["Прямоугольные монументальные ворота, сине-серые колонны, золотистый фриз и парные кони", "Правый от входа крупный корпус со скатной/вальмовой серебристой крышей", "Открытый двор слева и протяжённые параллельные серебристые ряды за ним", "По отзывам 2025 года есть выход на востоке к дороге у канала, но его архитектура не подтверждена"],
        "estimated":["Метрические размеры, длина рядов и конечная граница фрагмента", "Высоты крыш, дальний южный корпус и скрытые фасады", "Повторные проёмы, детали навесов и положения учебных точек", "Синий фасад «Береке Сауда Кешені» не включён: связь с Ауыл Береке по фото не подтверждена"],
        "source_urls":["https://yandex.kz/maps/ru/org/auyl_bereke/161384481381/gallery/", "https://yandex.kz/maps/ru/org/auyl_bereke/161384481381/?l=sat&ll=71.411083%2C42.905850&z=18", "https://yandex.kz/maps/ru/org/auyl_bereke/161384481381/", "https://www.youtube.com/watch?v=UiR8DrhGLbY", "https://2gis.kz/taraz/firm/70000001054386766"]
    }
}
