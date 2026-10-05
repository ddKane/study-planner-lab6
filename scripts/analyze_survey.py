"""Analyze a genuine Google Forms CSV export; never synthesize responses."""
import argparse, csv, json, math
from collections import Counter
from pathlib import Path
PRIMARY='Какую иконку вы бы выбрали для установки приложения'
def wilson(k,n):
    if not n:return [0,1]
    z=1.95996398454;p=k/n;den=1+z*z/n;mid=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [max(0,mid-half),min(1,mid+half)]
def analyze(path):
    with open(path,encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);headers=reader.fieldnames or [];rows=list(reader)
    columns=[h for h in headers if any(k in h.lower() for k in ['какую иконку','отражает суть','профессиональной'])]
    if len(columns)!=3:raise ValueError('В CSV должны быть три вопроса о выборе, назначении и профессиональности иконки.')
    primary=next((h for h in columns if 'какую иконку' in h.lower()),None)
    result={'respondents':len(rows),'minimum_met':len(rows)>=10,'questions':{}}
    for col in columns:
        values=[]
        for i,row in enumerate(rows,2):
            x=row.get(col,'').strip()
            if x.startswith('Вариант A'):values.append('A')
            elif x.startswith('Вариант B'):values.append('B')
            else:raise ValueError(f'Строка {i}: отсутствует или неизвестен ответ на вопрос {col!r}.')
        c=Counter(values);n=len(values);k=c['A'];tail=min(k,n-k)
        p=min(1,2*sum(math.comb(n,j) for j in range(tail+1))/(2**n)) if n else None
        result['questions'][col]={'A':k,'B':c['B'],'n':n,'A_share':k/n if n else None,'A_wilson95':wilson(k,n),'exact_binomial_two_sided_p':p}
    main=result['questions'][primary];result['primary_question']=primary
    result['preferred_icon']=('A' if main['A']>main['B'] else 'B' if main['B']>main['A'] else 'tie') if result['minimum_met'] else 'pending'
    result['interpretation']='Опрос предпочтений; выборка удобства. Результат не измеряет конверсию установки и не обобщается на всех пользователей.'
    return result
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('csv_file');parser.add_argument('--out',default='survey-results.json');args=parser.parse_args()
    result=analyze(args.csv_file);Path(args.out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False,indent=2))
