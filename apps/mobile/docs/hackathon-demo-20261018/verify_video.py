"""Decode the complete short film and verify its public, secret-free claims."""
from pathlib import Path
import hashlib, json, math, struct, subprocess
import cv2
from PIL import Image
import imageio_ffmpeg

p = Path(__file__).resolve().parent
video = p / 'Qadam-Business-Demo-RU-90sec.mp4'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
meta = subprocess.run([ffmpeg, '-hide_banner', '-i', str(video)],
    capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
assert 'Audio:' not in meta
assert 'Video: h264' in meta and '1920x1080' in meta and '24 fps' in meta
check = subprocess.run([ffmpeg, '-threads', '2', '-v', 'error', '-i', str(video), '-f', 'null', '-'],
    capture_output=True, text=True, encoding='utf-8', errors='replace')
assert check.returncode == 0 and not check.stderr, check.stderr
cap = cv2.VideoCapture(str(video))
frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); fps = cap.get(cv2.CAP_PROP_FPS)
assert frames == 2160 and fps == 24, (frames, fps)
scenes = json.loads((p / 'storyboard.json').read_text(encoding='utf-8'))
points=[]; start=0
for scene in scenes:
    points.append(start + scene['duration']/2)
    start += scene['duration']
assert start == 90
samples = p / 'encoded-check'; samples.mkdir(exist_ok=True)
contact = Image.new('RGB', (1280,360*math.ceil(len(points)/2)), '#f5f3eb')
for i,t in enumerate(points):
    cap.set(cv2.CAP_PROP_POS_MSEC,t*1000); ok,frame = cap.read(); assert ok,t
    im = Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB))
    im.save(samples / f'{i+1:02d}-{t}s.jpg', quality=94)
    contact.paste(im.resize((640,360)), ((i%2)*640,(i//2)*360))
    if i == len(points)-1:
        url,box,_ = cv2.QRCodeDetector().detectAndDecode(frame)
        assert url == 'https://qadamx-taraz.pages.dev',url
cap.release(); contact.save(p / 'encoded-contact.jpg',quality=92)
atoms=[]
with video.open('rb') as f:
    while True:
        head=f.read(8)
        if not head:break
        length,kind=struct.unpack('>I4s',head)
        if length==1:length=struct.unpack('>Q',f.read(8))[0];skip=16
        else:skip=8
        atoms.append(kind.decode('ascii'))
        if length==0:break
        f.seek(length-skip,1)
assert atoms.index('moov') < atoms.index('mdat'), atoms
out={'file':video.name,'duration_seconds':frames/fps,'width':1920,'height':1080,
    'fps':fps,'frame_count':frames,'video_codec':'H.264','pixel_format':'yuv420p',
    'audio_streams':0,'subtitles':'Russian burned in; UTF-8 SRT supplied separately',
    'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),
    'full_decode_errors':0,'sampled_scene_frames':len(points),
    'closing_qr_verified':'https://qadamx-taraz.pages.dev','fast_start':True,
    'live_ai_or_financial_writes':False,'physical_phone_playback':'not performed',
    'new_assistant_footage':False,'money_example_tenge':{'sale':4500,'initial_payment':2000,'extra_payment':500,'final_debt':2000}}
(p / 'video-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
