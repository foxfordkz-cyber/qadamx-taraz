from pathlib import Path
import hashlib,json,re,struct,subprocess
import cv2
from PIL import Image
import imageio_ffmpeg

p=Path(__file__).resolve().parent
video=p/'Qadam-Hackathon-Demo-RU-3min.mp4'
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
meta=subprocess.run([ffmpeg,'-hide_banner','-i',str(video)],capture_output=True,text=True,encoding='utf-8',errors='replace').stderr
assert 'Audio:' not in meta
assert 'Video: h264' in meta and '1920x1080' in meta and '24 fps' in meta
check=subprocess.run([ffmpeg,'-v','error','-i',str(video),'-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
assert check.returncode==0 and not check.stderr,check.stderr
cap=cv2.VideoCapture(str(video))
frames=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));fps=cap.get(cv2.CAP_PROP_FPS)
assert frames==4320 and fps==24,(frames,fps)
points=[4,13,23,33,43,53,64,75,85,96,107,116,126,137,148,158,167,176]
samples=p/'encoded-check';samples.mkdir(exist_ok=True)
contact=Image.new('RGB',(1280,3240),'white')
for i,t in enumerate(points):
    cap.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,frame=cap.read();assert ok,t
    im=Image.fromarray(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB))
    im.save(samples/f'{i+1:02d}-{t}s.jpg',quality=94)
    contact.paste(im.resize((640,360)),((i%2)*640,(i//2)*360))
    if t==176:
        url,box,_=cv2.QRCodeDetector().detectAndDecode(frame)
        assert url=='https://qadamx-taraz.pages.dev',url
cap.release();contact.save(p/'encoded-contact.jpg',quality=92)
# MP4 atom order verifies fast-start without a browser or player dependency.
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
assert atoms.index('moov')<atoms.index('mdat'),atoms
out={'file':video.name,'duration_seconds':frames/fps,'width':1920,'height':1080,'fps':fps,'frame_count':frames,'video_codec':'H.264','pixel_format':'yuv420p','audio_streams':0,'subtitles':'Russian burned in; UTF-8 SRT supplied separately','bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'full_decode_errors':0,'sampled_scene_frames':len(points),'closing_qr_verified':'https://qadamx-taraz.pages.dev','fast_start':True,'live_ai_or_financial_writes':False,'physical_android_acceptance':False}
(p/'video-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
