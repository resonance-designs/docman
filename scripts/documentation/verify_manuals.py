"""Render and mechanically inspect the final manuals; visual review still required."""
from pathlib import Path
import csv
import json
import sys
from manual_support import missing_case_headings

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tmp/pdf-deps'))
import pymupdf as fitz
from PIL import Image, ImageDraw

out=ROOT/'tmp/pdfs'
out.mkdir(parents=True,exist_ok=True)
report={}
for name in ['docman-user-manual','docman-qa-end-to-end-guide']:
    doc=fitz.open(ROOT/'output/pdf'/f'{name}.pdf')
    issues=[]
    all_text=''
    headings=[]
    for i,page in enumerate(doc):
        all_text+=page.get_text()
        page.get_pixmap(matrix=fitz.Matrix(1.25,1.25)).save(out/f'{name}-{i+1:03}.png')
        for block in page.get_text('dict')['blocks']:
            # Case headings use the builder's 12-point Case style. Prose and TOC
            # references must not satisfy a missing case, even if they quote its ID.
            heading_lines=[]
            for line in block.get('lines',[]):
                if line['spans'] and all(abs(span['size']-12)<0.1 for span in line['spans']):
                    heading_lines.append(''.join(span['text'] for span in line['spans']))
                for span in line['spans']:
                    x0,y0,x1,y1=span['bbox']
                    if x0<45 or x1>567 or y0<15 or y1>775:
                        issues.append({'page':i+1,'text':span['text'],'bbox':span['bbox']})
            if heading_lines: headings.append(' '.join(heading_lines))
    for start in range(0,len(doc),16):
        sheet=Image.new('RGB',(1000,1376),'#dce5ea');draw=ImageDraw.Draw(sheet)
        for j in range(start,min(start+16,len(doc))):
            im=Image.open(out/f'{name}-{j+1:03}.png');im.thumbnail((235,308))
            x=(j-start)%4*250+7;y=(j-start)//4*344+20
            sheet.paste(im,(x,y));draw.text((x,y-16),f'Page {j+1}',fill='black')
        sheet.save(out/f'{name}-sheet-{start//16+1}.png')
    report[name]={'pages':len(doc),'text_characters':len(all_text),'out_of_bounds':issues,'bookmarks':len(doc.get_toc())}
    assert not issues,issues
    if name.endswith('guide'):
        rows=list(csv.DictReader((ROOT/'docs/manuals/qa-results-template.csv').open(encoding='utf-8')))
        ids=[r['case_id'] for r in rows]
        assert len(ids)==len(set(ids)),'Duplicate case IDs'
        assert all(r['status']=='NOT RUN' for r in rows),'Template must contain no execution claims'
        missing=missing_case_headings(rows,headings)
        assert not missing,f'Missing case headings from PDF: {missing}'
        report[name]['case_rows']=len(rows)
(out/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
