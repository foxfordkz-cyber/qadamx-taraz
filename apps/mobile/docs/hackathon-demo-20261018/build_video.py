"""Qadam silent hackathon film. Existing UI captures + labelled demo examples.
No API requests or application/database writes are made by this renderer.
"""
from pathlib import Path
from functools import lru_cache
import json, math, hashlib, subprocess, sys, shutil
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageOps
from fontTools.ttLib import TTFont
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
W, H, FPS = 1920, 1080, 24
GREEN='#164c3e'; DEEP='#103b31'; LIME='#d7f36a'; PAPER='#f5f3eb'
INK='#172a26'; MUTED='#58685f'; WHITE='#fffefa'; LINE='#e1e2d8'; AMBER='#b36d20'
SOURCE = HERE.parent/'hackathon-demo-20261017'
CAP = HERE/'captures' if (HERE/'captures').is_dir() else SOURCE/'captures'
OUT = HERE/'Qadam-Business-Demo-RU-90sec.mp4'
NATIVE = next((p for p in (HERE/'native-clip.mp4', HERE/'sources/native-clip.mp4', SOURCE/'sources/native-clip.mp4') if p.exists()), HERE/'native-clip.mp4')
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FONT_DIR = HERE/'fonts' if (HERE/'fonts').is_dir() else SOURCE/'fonts'
FONT = FONT_DIR/'Manrope-Variable.ttf'
FONTS = [FONT,FONT_DIR/'NotoSans-CyrillicExt.ttf',FONT_DIR/'NotoSans-LatinExt.ttf']
CMAPS = [TTFont(p).getBestCmap() for p in FONTS]
GALLERY = CAP/'mobile'

SCENES = [('hero', 7, 'Qadam Business', 'Учёт продаж\nи долгов\nголосом.', 'Скажите о продаже — проверьте черновик.\nQadam помогает учитывать продажи, оплаты и долги.', 'Учебная демонстрация · RU / KZ · без живых операций'), ('voice', 8, 'Голосовой учёт', 'Своими\nсловами.', 'Голос, текст или ручной ввод.\nАудио отправляется только по явному действию продавца.', 'Демонстрация интерфейса · без AI-запроса'), ('draft', 9, 'Черновик под контролем', 'AI готовит.\nЧеловек\nпроверяет.', 'AI создаёт только черновик: суммы, оплату и клиента\nможно проверить и исправить до подтверждения.', 'Сохранённый учебный экран · не живой ответ AI'), ('money', 11, 'Продажа / оплата / долг', 'Оплата\nи долг —\nотдельно.', 'Учебный пример: продано на 4 500 ₸, получено 2 000 ₸.\nОстаток — 2 500 ₸. Запись требует подтверждения.', 'Учебный пример · операция не создаётся'), ('repayment', 9, 'Принимать доплаты', 'Доплата\nуменьшает\nдолг.', 'Клиент доплатил 500 ₸ — остаток стал 2 000 ₸.\nДоплата не увеличивает сумму продаж.', 'Учебный пример · операция не создаётся'), ('debts', 7, 'Помнить каждый долг', 'Кому.\nЗа что.\nСколько.', 'В долгах видны клиент, продажа, полученная сумма\nи остаток. История операций остаётся под рукой.', 'Демонстрационные данные · отдельный снимок'), ('analytics', 8, 'Понимать свою точку', 'Не только\nзаписывать.\nПонимать.', 'Аналитика показывает продажи, поступления и активность.\nЕсть периоды 7 и 30 дней, итог дня и история.', 'Встроенное Demo сайта · синтетическая аналитика'), ('venues', 8, 'Витрина Тараза', 'Знакомые\nплощадки.', 'MART, Кайкармет, Ауыл Береке —\nвыберите площадку и познакомьтесь с её магазинами.', 'Условные схемы · учебные точки'), ('scene', 8, 'От схемы к магазину', 'От маркера\nк магазину.', 'Выберите номер на 3D-схеме или магазин в списке.\nОба пути ведут к одной торговой точке.', 'Опубликованный сайт · учебная площадка'), ('shop', 7, 'Каталог и заявка', 'Каталог\nдо визита.', 'Название товара, наличие и цена — на странице магазина.\nЗдесь же можно оставить заявку продавцу.', 'Опубликованный сайт · учебный каталог'), ('outro', 8, 'Qadam / Taraz', 'Покупателю — найти.\nПродавцу — учесть.', 'Qadam. Следующий шаг — пилот\nс местными торговыми точками.', 'qadamx-taraz.pages.dev')]
assert sum(s[1] for s in SCENES) == 90

@lru_cache(maxsize=100)
def font(size, weight='Regular', face=0):
    f=ImageFont.truetype(str(FONTS[face]),size)
    try:f.set_variation_by_name(weight)
    except (ValueError,OSError):pass
    return f

@lru_cache(maxsize=500)
def runs(text,size,weight):
    result=[]
    for c in text:
        face=next((i for i,chars in enumerate(CMAPS) if ord(c) in chars),0)
        assert ord(c) in CMAPS[face],f'Unsupported glyph: {c}'
        if result and result[-1][0]==face:result[-1]=(face,result[-1][1]+c)
        else:result.append((face,c))
    return [(font(size,weight,i),s) for i,s in result]

def textwidth(text,size,weight='Regular'):
    return sum(f.getlength(s) for f,s in runs(text,size,weight))

def txt(im, xy, text, size=32, color=INK, weight='Regular', spacing=12, maxwidth=None):
    d=ImageDraw.Draw(im)
    for i,line in enumerate(text.split('\n')):
        if maxwidth:assert textwidth(line,size,weight)<=maxwidth,(text,size,maxwidth)
        x=xy[0];y=xy[1]+size+i*(size+spacing)
        for f,s in runs(line,size,weight):
            d.text((x,y),s,font=f,fill=color,anchor='ls')
            x+=f.getlength(s)

def pill(im,x,y,text,bg=LIME,fg=GREEN,size=22):
    d=ImageDraw.Draw(im); width=int(textwidth(text,size,'SemiBold'))+34
    d.rounded_rectangle((x,y,x+width,y+42),radius=21,fill=bg)
    txt(im,(x+17,y+7),text,size,fg,'SemiBold')
    return width

def logo(im,x,y,scale=1,dark=False):
    d=ImageDraw.Draw(im); s=int(48*scale)
    d.rounded_rectangle((x,y,x+s,y+s),radius=int(13*scale),fill=LIME if dark else GREEN)
    points=[(x+s*.25,y+s*.7),(x+s*.42,y+s*.7),(x+s*.42,y+s*.52),(x+s*.6,y+s*.52),(x+s*.6,y+s*.32),(x+s*.76,y+s*.32)]
    d.line(points,fill=GREEN if dark else LIME,width=max(2,int(3*scale)),joint='curve')
    txt(im,(x+s+14*scale,y-4*scale),'qadam',int(40*scale),WHITE if dark else GREEN,'ExtraBold')

def roundpaste(im,src,xy,radius=24):
    im.paste(src,xy,rounded_mask(src.size,radius))

@lru_cache(maxsize=30)
def rounded_mask(size,radius):
    mask=Image.new('L',size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,size[0]-1,size[1]-1),radius=radius,fill=255)
    return mask

@lru_cache(maxsize=40)
def asset(name):
    p=(GALLERY/name[7:]) if name.startswith('mobile/') else CAP/name
    return Image.open(p).convert('RGB')

def screen(im,src,box,progress=.5,zoom=.0,contain=True):
    x,y,w,h=box
    if isinstance(src,str):src=asset(src)
    if contain:
        s=ImageOps.contain(src,(w,h),Image.Resampling.LANCZOS)
        panel=Image.new('RGB',(w,h),WHITE);panel.paste(s,((w-s.width)//2,(h-s.height)//2))
    else:
        scale=max(w/src.width,h/src.height)*(1+zoom)
        s=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.LANCZOS)
        xx=(s.width-w)//2; yy=round((s.height-h)*progress)
        panel=s.crop((xx,yy,xx+w,yy+h))
    d=ImageDraw.Draw(im);d.rounded_rectangle((x-2,y-2,x+w+2,y+h+2),radius=26,fill=LINE)
    roundpaste(im,panel,(x,y),24)

@lru_cache(maxsize=40)
def scaled(name,w,h):
    return ImageOps.contain(asset(name),(w,h),Image.Resampling.LANCZOS)

def phone(im,name,x,y,h=710,label=None):
    src=asset(name) if isinstance(name,str) else name
    w=round(h*src.width/src.height)
    s=src.resize((w,h),Image.Resampling.LANCZOS)
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((x-12,y-12,x+w+12,y+h+12),radius=44,fill=INK)
    roundpaste(im,s,(x,y),30)
    if label:pill(im,x,y+h+25,label,bg='#eaf0e5',size=20)
    return w

def header(idx,s,dark=False):
    im=Image.new('RGB',(W,H),DEEP if dark else PAPER)
    d=ImageDraw.Draw(im)
    if dark:
        d.ellipse((1110,-480,2230,640),fill='#164c3e')
        d.ellipse((1320,-260,2010,430),outline='#295b47',width=2)
    logo(im,72,45,dark=dark)
    txt(im,(390,56),'ТАРАЗ  /  ДЕМО ПРОЕКТА',22,'#c3d8c5' if dark else MUTED,'SemiBold')
    txt(im,(1770,55),f'{idx+1:02d} / {len(SCENES):02d}',22,'#c3d8c5' if dark else MUTED,'SemiBold')
    txt(im,(76,173),s[2].upper(),24,LIME if dark else GREEN,'Bold')
    txt(im,(72,235),s[3],65,WHITE if dark else INK,'ExtraBold',spacing=8,maxwidth=980 if s[0]=='outro' else 650)
    return im

def footer(im,s,start,t,dark=False):
    d=ImageDraw.Draw(im)
    # Persistent provenance, never disguised as live production data.
    txt(im,(76,882),s[5],22,'#c3d8c5' if dark else MUTED,'Medium',maxwidth=1760)
    d.rectangle((0,932,W,1080),fill='#0c2e26')
    lines=s[4].split('\n')
    for i,line in enumerate(lines):
        tw=textwidth(line,35,'Medium')
        assert tw<1770,(line,tw)
        txt(im,((W-tw)/2,954+i*48),line,35,WHITE,'Medium')
    d.rectangle((0,1073,int(W*(start+t)/90),1079),fill=LIME)

def arrow(d,x,y,color=GREEN):
    d.line((x,y,x+75,y),fill=color,width=5)
    d.line((x+54,y-17,x+75,y,x+54,y+17),fill=color,width=5,joint='curve')

def panel(im,box,bg=WHITE):
    ImageDraw.Draw(im).rounded_rectangle(box,radius=28,fill=bg)

def amount(im,x,y,label,value,color=GREEN,width=500):
    panel(im,(x,y,x+width,y+192))
    txt(im,(x+30,y+26),label,27,MUTED,'Medium')
    txt(im,(x+30,y+75),value,65,color,'ExtraBold',maxwidth=width-55)

def ease(v):
    v=max(0,min(1,v));return v*v*(3-2*v)

def prepare():
    (HERE/'frames').mkdir(exist_ok=True)
    # Reviewed full-card crops from the 852x2279 comparison board are included.
    assert (CAP/'draft-input.png').exists() and (CAP/'draft-review.png').exists()
    # The demo financial example exactly matches this preserved UI:4500/2000/2500.
    assert (CAP/'qr.png').exists(),'The reviewed project QR asset is required.'
    native=NATIVE
    assert native.exists(),'The reviewed, silent 12-second emulator excerpt is required.'

def base(idx,s):
    key=s[0];dark=key in ['hero','problem','recovery','outro']
    im=header(idx,s,dark)
    if key=='hero':
        txt(im,(76,520),'Витрина + учёт + мобильное приложение',29,'#c3d8c5','Medium')
        pill(im,76,595,'НАЙТИ МАГАЗИН');pill(im,350,595,'ВЕСТИ БИЗНЕС')
        screen(im,'web-home.jpg',(770,200,1050,590))
    elif key=='problem':
        for j,(head,body) in enumerate([('ПОКУПАТЕЛЬ','Где найти\nнужный магазин?'),('ПРОДАВЕЦ','Кто оплатил,\nа кто ещё должен?')]):
            x=800+j*500
            panel(im,(x,250,x+450,660),'#1c5444')
            pill(im,x+28,280,head)
            txt(im,(x+28,385),body,43,WHITE,'Bold',spacing=18)
            txt(im,(x+28,565),'Одна платформа',25,'#c3d8c5','Medium')
    elif key=='venues':
        for j,(name,caption) in enumerate([('web-venues-mart.jpg','MART'),('web-venues-kaikarmet.jpg','Кайкармет'),('web-venues-auyl.jpg','Ауыл Береке')]):
            x=670+j*390
            panel(im,(x,260,x+370,725))
            a=asset(name).crop((65,165,760,543))
            screen(im,a,(x+12,295,346,250))
            txt(im,(x+25,587),caption,36,GREEN,'ExtraBold')
            txt(im,(x+25,645),'3D + список точек',24,MUTED)
    elif key in ['scene','shop','inquiry','analytics']:
        source={'scene':'web-kaikarmet-scene.jpg','shop':'web-shop.jpg','inquiry':'web-inquiry-filled.jpg','analytics':'web-analytics-charts.jpg'}[key]
        screen(im,source,(650,176,1200,675))
        if key=='scene':
            pill(im,76,535,'3D-СХЕМА');pill(im,76,596,'ОБЫЧНЫЙ СПИСОК')
        if key=='shop':
            txt(im,(76,520),'Наличие\nЦена\nЗаявка продавцу',33,GREEN,'SemiBold',spacing=28)
        if key=='inquiry':
            txt(im,(76,560),'Без регистрации\nв публичной витрине',30,MUTED,'Medium',spacing=12)
        if key=='analytics':
            pill(im,76,575,'7 ДНЕЙ');pill(im,250,575,'30 ДНЕЙ')
            txt(im,(76,655),'Продажи ≠ поступления',29,GREEN,'SemiBold')
    elif key=='dashboard':
        phone(im,'mobile/dashboard-ru-390-x1.0.png',970,155,680)
        for y,text in [(580,'Выбранная торговая точка'),(642,'Данные и действия рядом'),(704,'Один нативный кабинет')]:
            txt(im,(76,y),text,28,GREEN,'SemiBold')
        for y,head,sub in [(260,'Продажи','Что продано за день'),(445,'Поступления','Сколько получено'),(630,'Долги','Что осталось получить')]:
            panel(im,(1410,y,1830,y+140))
            txt(im,(1440,y+24),head,31,GREEN,'Bold');txt(im,(1440,y+77),sub,24,MUTED)
    elif key=='voice':
        screen(im,asset('draft-input.png'),(1070,150,440,690))
        for j,(label,sub) in enumerate([('ГОЛОС','Записать → прослушать'),('ТЕКСТ','Рассказать своими словами'),('ВРУЧНУЮ','Заполнить без AI')]):
            y=480+j*106
            pill(im,76,y,label);txt(im,(305,y+5),sub,26,MUTED,'Medium')
    elif key=='draft':
        phone(im,asset('draft-review.png'),1120,145,700)
        txt(im,(76,580),'Проверить суммы\nВыбрать клиента\nПодтвердить запись',33,GREEN,'SemiBold',spacing=28)
        pill(im,1600,350,'AI ≠ ЗАПИСЬ',bg='#fff2cf',fg='#8a5410',size=21)
    elif key=='money':
        amount(im,730,225,'Продано','4 500 ₸',width=520)
        amount(im,1290,225,'Получено','2 000 ₸',width=520)
        panel(im,(730,460,1810,755),GREEN)
        txt(im,(775,500),'Осталось получить',32,'#c3d8c5','Medium')
        txt(im,(775,555),'2 500 ₸',108,LIME,'ExtraBold')
        txt(im,(76,615),'Клиент обязателен,\nесли есть долг.',31,MUTED,'Medium')
    elif key=='repayment':
        amount(im,730,225,'Долг до доплаты','2 500 ₸',width=520)
        amount(im,1290,225,'Доплата','500 ₸',width=520)
        panel(im,(730,460,1810,755),GREEN)
        txt(im,(775,500),'Новый остаток',32,'#c3d8c5','Medium')
        txt(im,(775,555),'2 000 ₸',108,LIME,'ExtraBold')
        txt(im,(76,650),'Продажи по примеру:\nпо-прежнему 4 500 ₸',31,MUTED,'Medium')
    elif key=='debts':
        phone(im,'mobile/debts-ru-390-x1.0.png',920,160,680)
        phone(im,'mobile/history-ru-390-x1.0.png',1410,160,680)
        txt(im,(76,595),'Клиент → продажа → остаток\nИстория продаж и оплат',28,GREEN,'SemiBold',spacing=22)
    elif key=='recovery':
        labels=[('01','Сохранить\nнамерение'),('02','Проверить\nрезультат'),('03','Повторить\nто же действие')]
        for j,(n,label) in enumerate(labels):
            x=740+j*360
            panel(im,(x,285,x+320,655),'#1c5444')
            txt(im,(x+30,317),n,66,LIME,'ExtraBold')
            txt(im,(x+30,437),label,34,WHITE,'Bold',spacing=12)
            if j<2:arrow(ImageDraw.Draw(im),x+321,680,LIME)
        txt(im,(76,625),'После сбоя сети\nи перезапуска приложения',29,'#c3d8c5','Medium',spacing=12)
        txt(im,(740,750),'Один ключ · исходное тело · нужный аккаунт и точка',27,'#c3d8c5','Medium')
    elif key=='native':
        panel(im,(800,150,1840,860),'#eaf0e5')
        txt(im,(76,535),'Главная\nПлощадки\nКабинет\nПрофиль',38,GREEN,'SemiBold',spacing=19)
        pill(im,1410,350,'FLUTTER')
        txt(im,(1410,430),'Основные\nэкраны —\nв приложении',35,GREEN,'Bold',spacing=15)
    elif key=='language':
        phone(im,'mobile/home-ru-390-x1.0.png',920,160,680)
        phone(im,'mobile/home-kk-390-x1.0.png',1410,160,680)
        pill(im,76,545,'RU');pill(im,190,545,'KZ')
        txt(im,(76,625),'Локальный контекст.\nПонятные действия.',32,MUTED,'Medium',spacing=14)
    elif key=='market':
        phone(im,'mobile/market-ru-390-x1.0.png',970,160,680)
        for j,(title,sub) in enumerate([('Фото + объявление','Цена за голову'),('Есть сегодня','Актуальность наличия'),('Продано / снять','Управление статусом')]):
            y=215+j*202
            panel(im,(1410,y,1830,y+164))
            txt(im,(1440,y+30),title,28,GREEN,'Bold');txt(im,(1440,y+92),sub,24,MUTED)
        txt(im,(76,550),'Объявления о скоте\nв мобильном Qadam',33,MUTED,'Medium',spacing=15)
    elif key=='outro':
        # The closing line is intentionally more spacious than a feature page.
        panel(im,(1125,235,1755,820),WHITE)
        screen(im,asset('qr.png'),(1290,282,300,300))
        txt(im,(1182,640),'Откройте Qadam',38,GREEN,'ExtraBold')
        txt(im,(1182,703),'qadamx-taraz.pages.dev',28,GREEN,'SemiBold')
        txt(im,(76,520),'Витрина  /  Учёт  /  Мобильное приложение',28,'#c3d8c5','Medium')
        txt(im,(76,640),'Местная торговля.\nЦифровой шаг вперёд.',44,LIME,'Bold',spacing=14)
    return im,dark

def dynamic(im,key,t,duration):
    d=ImageDraw.Draw(im)
    # Small motion accents guide attention; no fake clicks, requests or success states.
    if key=='voice':
        for i in range(17):
            x=1640+i*9
            amp=int(13+34*(.5+.5*math.sin(t*3.2+i*.8)))
            d.rounded_rectangle((x,470-amp,x+5,470+amp),radius=3,fill=GREEN)
        txt(im,(1580,550),'Голос → черновик',26,GREEN,'SemiBold')
    if key in ['money','repayment']:
        factor=ease((t-.8)/2)
        start=730
        d.rounded_rectangle((start,795,1810,815),radius=10,fill=LINE)
        fraction=(2000/4500 if key=='money' else 2500/4500)*factor
        d.rounded_rectangle((start,795,start+int(1080*fraction),815),radius=10,fill=GREEN)
    if key=='recovery':
        step=min(2,int(t/3.1));x=740+step*360
        d.rounded_rectangle((x-3,282,x+323,658),radius=30,outline=LIME,width=4)
    if key=='scene':
        # Marker positions on the preserved screenshot. Decorative focus ring only.
        if 1<t<6:
            a=.5+.5*math.sin(t*2)
            r=22+int(8*a)
            d.ellipse((1307-r,350-r,1307+r,350+r),outline=LIME,width=4)
    if key=='venues':
        active=min(2,int(t/3.4));x=670+active*390
        d.rounded_rectangle((x,260,x+370,725),radius=28,outline=GREEN,width=4)

def motion_patch(bg,key):
    box=(770,200,1050,590) if key=='hero' else (650,176,1200,675) if key in ['scene','shop','inquiry','analytics'] else None
    if not box:return None
    x,y,w,h=box
    return box,bg.crop((x,y,x+w,y+h)).resize((round(w*1.025),round(h*1.025)),Image.Resampling.LANCZOS)

def add_motion(im,motion,t,duration):
    if not motion:return
    (x,y,w,h),pic=motion
    u=ease(t/duration)
    xx=round((pic.width-w)*u);yy=round((pic.height-h)*(1-u))
    roundpaste(im,pic.crop((xx,yy,xx+w,yy+h)),(x,y),24)

def stamp(seconds):
    n=round(seconds*1000);return f'{n//3600000:02d}:{(n//60000)%60:02d}:{(n//1000)%60:02d},{n%1000:03d}'

def make_srt():
    out=[];start=0
    for i,s in enumerate(SCENES):
        out += [str(i+1),f'{stamp(start)} --> {stamp(start+s[1])}',s[4],'']
        start+=s[1]
    (HERE/'Qadam-Demo-RU.srt').write_text('\n'.join(out),encoding='utf-8-sig')
    (HERE/'storyboard.json').write_text(json.dumps([dict(id=s[0],duration=s[1],chapter=s[2],title=s[3],subtitle=s[4],provenance=s[5]) for s in SCENES],ensure_ascii=False,indent=2),encoding='utf-8')

def render(preview_only=False):
    prepare();make_srt()
    bases=[base(i,s) for i,s in enumerate(SCENES)]
    t0=0
    for i,(s,(im,dark)) in enumerate(zip(SCENES,bases)):
        p=im.copy();dynamic(p,s[0],3,s[1]);footer(p,s,t0,3,dark)
        if s[0]=='native':
            cap=cv2.VideoCapture(str(NATIVE));cap.set(cv2.CAP_PROP_POS_MSEC,3000);ok,fr=cap.read();cap.release()
            if ok:phone(p,Image.fromarray(cv2.cvtColor(fr,cv2.COLOR_BGR2RGB)),900,165,680)
        p.save(HERE/'frames'/f'{i+1:02d}-{s[0]}.jpg',quality=93)
        t0+=s[1]
    # Contact sheet 2x9, scaled for file review.
    thumbs=Image.new('RGB',(1280,360*math.ceil(len(SCENES)/2)),PAPER)
    for i,s in enumerate(SCENES):thumbs.paste(Image.open(HERE/'frames'/f'{i+1:02d}-{s[0]}.jpg').resize((640,360)),((i%2)*640,(i//2)*360))
    thumbs.save(HERE/'storyboard-contact.jpg',quality=90)
    Image.open(HERE/'frames/01-hero.jpg').save(HERE/'Qadam-Demo-Poster.jpg',quality=95)
    if preview_only:return
    command=[FFMPEG,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','-metadata','title=Qadam Business — голосовой учёт продаж и долгов (учебная демонстрация)','-metadata','comment=90 seconds; Russian burned-in subtitles; labelled demonstration data; no audio',str(OUT)]
    log=(HERE/'encode.log').open('w',encoding='utf-8')
    proc=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=log,stdout=subprocess.DEVNULL)
    native=cv2.VideoCapture(str(NATIVE))
    start=0
    try:
        for idx,(s,(bg,dark)) in enumerate(zip(SCENES,bases)):
            print(f'Scene {idx+1}/{len(SCENES)}: {s[0]} ({start}-{start+s[1]}s)',flush=True)
            motion=motion_patch(bg,s[0])
            for n in range(s[1]*FPS):
                t=n/FPS;im=bg.copy()
                add_motion(im,motion,t,s[1])
                if s[0]=='native':
                    ok,fr=native.read()
                    if ok:
                        fr=Image.fromarray(cv2.cvtColor(fr,cv2.COLOR_BGR2RGB))
                        # Already decoded small frame; constant resize cached by pipeline is cheap.
                        phone(im,fr,900,165,680)
                dynamic(im,s[0],t,s[1]);footer(im,s,start,t,dark)
                # Quick dissolves through palette; text stays still during reading.
                fade=min(1,t/.28,(s[1]-t)/.28)
                if fade<1:im=Image.blend(Image.new('RGB',(W,H),DEEP),im,max(0,fade))
                proc.stdin.write(im.tobytes())
            start+=s[1]
        proc.stdin.close();rc=proc.wait();assert rc==0,rc
    finally:
        native.release();log.close()
    print(json.dumps({'file':str(OUT),'bytes':OUT.stat().st_size,'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()},indent=2),flush=True)

if __name__=='__main__':
    render('--preview' in sys.argv)
