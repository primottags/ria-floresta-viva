import csv, sys
from openpyxl import load_workbook
wb=load_workbook(sys.argv[1],read_only=True)
ws=wb['COVERAGE_11']; it=ws.iter_rows(values_only=True); h=next(it); si=h.index('state'); n=0
with open(sys.argv[2],'w',newline='',encoding='utf-8') as f:
  w=csv.writer(f); w.writerow(h)
  for r in it:
    if r[si] in ('Pará','PA'): w.writerow(r); n+=1
print('linhas PA', n)
