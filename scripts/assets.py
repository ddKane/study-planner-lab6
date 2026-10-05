from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'app' / 'assets'
META = ROOT / 'metadata'
OUT.mkdir(parents=True, exist_ok=True)
META.mkdir(parents=True, exist_ok=True)
S=3
def icon(variant='A',maskable=False):
    size=512*S
    image=Image.new('RGBA',(size,size),(81,70,217,255) if variant=='A' else (24,119,108,255))
    d=ImageDraw.Draw(image)
    def box(xy,fill,r=0):
        xy=tuple(round(v*S) for v in xy)
        if r:d.rounded_rectangle(xy, radius=r*S, fill=fill)
        else:d.rectangle(xy,fill=fill)
    def line(points,fill,width):d.line([(int(x*S),int(y*S)) for x,y in points],fill=fill,width=width*S,joint='curve')
    # All foreground content lies within the maskable safe zone.
    if variant=='A':
        box((142,119,370,393),(255,255,255,255),24)
        box((177,96,335,145),(197,189,255,255),13)
        for y in [204,272,340]:
            line([(178,y),(191,y+12),(213,y-14)],(81,70,217,255),10)
            box((235,y-5,326,y+5),(201,203,226,255),5)
    else:
        box((134,145,378,378),(255,255,255,255),25)
        box((134,145,378,204),(171,226,213,255),24)
        box((134,181,378,204),(171,226,213,255))
        line([(193,120),(193,172)],(255,255,255,255),17)
        line([(319,120),(319,172)],(255,255,255,255),17)
        line([(192,283),(237,326),(319,242)],(24,119,108,255),20)
    return image.resize((512,512),Image.Resampling.LANCZOS)
a=icon('A');b=icon('B')
a.save(META/'icon-A-512.png');b.save(META/'icon-B-512.png')
a.save(OUT/'icon-512.png');a.resize((192,192),Image.Resampling.LANCZOS).save(OUT/'icon-192.png');a.save(OUT/'icon-maskable-512.png')
font=Path(r'C:\Windows\Fonts\segoeui.ttf');bold=Path(r'C:\Windows\Fonts\segoeuib.ttf')
comparison=Image.new('RGB',(1200,750),'#f5f6fa');d=ImageDraw.Draw(comparison)
d.text((70,42),'Учебный планер',font=ImageFont.truetype(str(bold),42),fill='#20263c')
d.text((70,108),'Два варианта иконки для сравнительного опроса',font=ImageFont.truetype(str(font),25),fill='#626b83')
for x,img,label in [(100,a,'Вариант A'),(690,b,'Вариант B')]:
    comparison.paste(img.resize((410,410)),(x,198))
    d.text((x+126,632),label,font=ImageFont.truetype(str(bold),27),fill='#20263c')
comparison.save(META/'icons-comparison.png')
banner=Image.new('RGB',(1024,500),'#5146d9');d=ImageDraw.Draw(banner)
banner.paste(a.resize((160,160)),(790,170))
d.text((65,87),'УЧЁБА В ПОРЯДКЕ',font=ImageFont.truetype(str(bold),19),fill='#d7d1ff')
d.text((60,142),'Учебный',font=ImageFont.truetype(str(bold),63),fill='white')
d.text((60,215),'планер',font=ImageFont.truetype(str(bold),63),fill='white')
d.text((65,327),'Задания. Сроки. Ваш прогресс.',font=ImageFont.truetype(str(font),29),fill='#edeaff')
d.text((65,380),'На телефоне · работает офлайн',font=ImageFont.truetype(str(font),21),fill='#d7d1ff')
banner.save(META/'feature-graphic-1024x500.png')
for p in sorted(META.glob('*.png')):
    im=Image.open(p);print(p.name,im.size,im.mode)
