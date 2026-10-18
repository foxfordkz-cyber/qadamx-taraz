"""Encode reviewed scene frames one at a time with bounded memory.

This is an illustrated product demo, not footage of a continuous live session.
"""
from pathlib import Path
import hashlib, json, subprocess
import imageio_ffmpeg

p=Path(__file__).resolve().parent
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
scenes=json.loads((p/'storyboard.json').read_text(encoding='utf-8'))
segments=p/'segments';segments.mkdir(exist_ok=True)
paths=[]
for i,scene in enumerate(scenes):
    src=p/'frames'/f'{i+1:02d}-{scene["id"]}.jpg'
    target=segments/f'{i+1:02d}.mp4';paths.append(target)
    duration=scene['duration']
    with (segments/f'{i+1:02d}.log').open('w',encoding='utf-8') as log:
        command=[ffmpeg,'-y','-hide_banner','-loglevel','warning','-threads','1',
            '-loop','1','-framerate','24','-i',str(src),'-t',str(duration),
            '-filter_threads','1','-vf',f'fade=t=in:st=0:d=0.20,fade=t=out:st={duration-.20}:d=0.20',
            '-an','-c:v','libx264','-preset','fast','-tune','zerolatency',
            '-crf','19','-threads','1','-x264-params','rc-lookahead=0:sync-lookahead=0:ref=1:bframes=0',
            '-pix_fmt','yuv420p',str(target)]
        subprocess.run(command,stdout=subprocess.DEVNULL,stderr=log,check=True)
    print(f'{i+1}/{len(scenes)}: {scene["id"]} / {duration}s',flush=True)
concat=segments/'concat.txt'
concat.write_text('\n'.join(f"file '{v.name}'" for v in paths),encoding='utf-8')
out=p/'Qadam-Business-Demo-RU-90sec.mp4'
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0',
    '-i',str(concat),'-c','copy','-movflags','+faststart','-metadata',
    'title=Qadam Business — голосовой учёт продаж и долгов (учебная демонстрация)',
    '-metadata','comment=90 seconds; labelled saved UI and illustrative figures; no audio; no live AI/financial calls',
    str(out)],check=True)
print(json.dumps({'file':str(out),'bytes':out.stat().st_size,
    'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},ensure_ascii=False,indent=2),flush=True)
