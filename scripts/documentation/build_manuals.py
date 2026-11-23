"""Build the two manuals and their traceability artifacts. Requires reportlab.

Run from any working directory: python scripts/documentation/build_manuals.py
Optional isolated dependencies: python -m pip install --target tmp/pdf-deps reportlab
The PDF renderer/QA step additionally uses pymupdf and pillow.
"""
from pathlib import Path
import csv
import html
import re
import sys
from manual_support import clean, release_metadata

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tmp/pdf-deps'))
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
    Spacer, PageBreak, KeepTogether, Flowable)
from reportlab.platypus.tableofcontents import TableOfContents

OUT = ROOT / 'output/pdf'
SRC = ROOT / 'docs/manuals'
OUT.mkdir(parents=True, exist_ok=True)
NAVY = colors.HexColor('#123047')
TEAL = colors.HexColor('#007C83')
ORANGE = colors.HexColor('#D96A18')
INK = colors.HexColor('#233746')
MUTED = colors.HexColor('#536673')
PALE = colors.HexColor('#EDF4F6')
FONT, BOLD = 'Helvetica', 'Helvetica-Bold'
for regular, bold in [
    (Path('C:/Windows/Fonts/segoeui.ttf'), Path('C:/Windows/Fonts/segoeuib.ttf')),
    (Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')),
]:
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont('Manual', str(regular)))
        pdfmetrics.registerFont(TTFont('ManualBold', str(bold)))
        pdfmetrics.registerFontFamily('Manual', normal='Manual', bold='ManualBold', italic='Manual', boldItalic='ManualBold')
        FONT, BOLD = 'Manual', 'ManualBold'
        break

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Body', fontName=FONT, fontSize=10, leading=15, textColor=INK, spaceAfter=9))
styles.add(ParagraphStyle(name='Section', fontName=BOLD, fontSize=21, leading=26, textColor=NAVY, spaceAfter=18, keepWithNext=True))
styles.add(ParagraphStyle(name='Case', fontName=BOLD, fontSize=12, leading=17, textColor=TEAL, spaceBefore=15, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name='SmallText', fontName=FONT, fontSize=8.3, leading=12, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name='ListText', parent=styles['Body'], leftIndent=15, firstLineIndent=-11, spaceAfter=7))
styles.add(ParagraphStyle(name='CoverTitle', fontName=BOLD, fontSize=34, leading=41, textColor=NAVY, spaceAfter=24))
styles.add(ParagraphStyle(name='Deck', fontName=FONT, fontSize=15, leading=23, textColor=MUTED, spaceAfter=22))

def markup(s):
    s = html.escape(clean(s))
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    return s

def para(s, style='Body'):
    return Paragraph(markup(s), styles[style])

class Illustration(Flowable):
    """Vector figures deliberately labeled as diagrams, not captured UI."""
    def __init__(self, kind):
        super().__init__()
        self.kind, self.width, self.height = kind, 504, 238
    def box(self, x, y, w, h, title, lines, fill=PALE):
        c = self.canv
        c.setFillColor(fill); c.setStrokeColor(colors.HexColor('#CBD9E0'))
        c.roundRect(x,y,w,h,7,fill=1,stroke=1)
        c.setFillColor(NAVY); c.setFont(BOLD,10); c.drawString(x+10,y+h-19,title)
        c.setFillColor(INK); c.setFont(FONT,8.5)
        yy=y+h-35
        for line in lines:
            for wrapped in simpleSplit(line,FONT,8.5,w-20):
                c.drawString(x+10,yy,wrapped); yy-=12
    def draw(self):
        c=self.canv; k=self.kind
        c.setFillColor(TEAL); c.rect(0,self.height-4,self.width,4,fill=1,stroke=0)
        if k=='navigation':
            self.box(0,34,147,181,'LEFT MENU',['Documents','Approvals','Books / Categories','Teams / Projects','Administrative areas','(role dependent)'])
            self.box(159,164,345,51,'TOP TOOLBAR',['My account     |     Activity     |     Sign out'])
            self.box(159,34,345,118,'DOCUMENT WORK AREA',['1. Search the loaded list','2. Open a document','3. Read its published-version status','4. Download or use your permitted actions'])
            caption='Figure 1. Navigation map - schematic, not a screenshot.'
        elif k=='roles':
            self.box(0,94,244,121,'ACCOUNT ROLE',['Viewer: read assigned documents','Editor: create; edit owned/authored docs','Admin: document administration','Superadmin: global/account administration'])
            self.box(260,94,244,121,'DOCUMENT ASSIGNMENT',['Author / owner: edit if account permits','Approver: publication decisions','Stakeholder / review assignee: read','External contact: reference details only'])
            self.box(0,30,504,51,'ACCESS = ROLE + ASSIGNMENT + FILE STATUS',['A team association or a saved private URL does not grant document access.'])
            caption='Figure 2. Two layers of permission - conceptual diagram.'
        elif k=='workflow':
            self.box(0,139,150,74,'1. UPLOAD',['New file version','Awaiting approval'])
            self.box(177,139,150,74,'2. REVIEW',['Different eligible person','Download and decide'])
            self.box(354,139,150,74,'3. PUBLISH',['Threshold reached','New version becomes current'])
            c.setStrokeColor(TEAL); c.setLineWidth(2)
            for x in [153,330]:
                c.line(x,176,x+21,176);c.line(x+21,176,x+16,180);c.line(x+21,176,x+16,172)
            self.box(0,32,244,90,'REJECT / WITHDRAW',['Pending submission stops.','Previous published file stays current.','Correct and submit a new version.'])
            self.box(260,32,244,90,'REPLACEMENT PUBLISHED',['Old approved version is superseded.','Its history is retained.','Public link follows the new publication.'])
            caption='Figure 3. Version lifecycle under approval-required policy.'
        elif k=='public':
            self.box(0,127,244,85,'GLOBAL SHARING ON',['New public links allowed.','Existing valid links work.'])
            self.box(260,127,244,85,'OFF + PRESERVE LINKS',['New links blocked.','Existing links continue to work.'])
            self.box(0,29,244,85,'OFF + DISABLE EXISTING',['New links blocked; existing links stop.','Global re-enable restores retained links.'])
            self.box(260,29,244,85,'INDIVIDUAL REVOCATION',['Old link permanently invalidated.','Enabling again creates a new link.'])
            caption='Figure 4. Public-sharing switches and link lifetime.'
        else:
            self.box(0,133,244,80,'CONTROLLED IDENTITIES',['S1 / S2: superadmins; A1: admin','E1 / E2: editors; P1 / P2: approvers'])
            self.box(260,133,244,80,'ACCESS BOUNDARIES',['V1: stakeholder; R1: reviewer','O1 / U1: outsiders; anonymous browser'])
            self.box(0,33,244,85,'KNOWN FILES',['D1: version/approval lifecycle','D2: unrelated private document','D3: disposable failure/public fixture'])
            self.box(260,33,244,85,'EVIDENCE CHAIN',['Browser + HTTP + persisted state','Original/download SHA-256','Audit event + controlled inbox'])
            caption='Figure 1. QA fixture and evidence model - not a test result.'
        c.setFillColor(MUTED); c.setFont(FONT,8); c.drawString(0,10,caption)

class ManualDoc(BaseDocTemplate):
    def __init__(self,path,label):
        super().__init__(str(path), pagesize=(612,792), leftMargin=54,rightMargin=54,topMargin=58,bottomMargin=54,
                         title=label,author='DocMan project',subject='Repository-based guide, 20 November 2026')
        self.label=label
        self.addPageTemplates(PageTemplate(id='main', frames=[Frame(54,54,504,680,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)], onPage=self.decorate))
    def decorate(self,c,doc):
        c.saveState()
        c.setStrokeColor(colors.HexColor('#DCE5EA'));c.line(54,44,558,44)
        c.setFont(FONT,8); c.setFillColor(MUTED)
        c.drawString(54,30,'DOCMAN  /  '+self.label.upper())
        c.drawRightString(558,30,str(doc.page))
        if doc.page>1:
            c.setFont(BOLD,8);c.setFillColor(TEAL);c.drawString(54,754,'REFERENCE EDITION  |  '+self.edition)
        c.restoreState()
    def afterFlowable(self,flow):
        if isinstance(flow,Paragraph) and flow.style.name=='Section' and flow.getPlainText() != 'Contents':
            text=flow.getPlainText(); key='s'+str(self.seq.nextf('heading'))
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(text,key,0,False)
            self.notify('TOCEntry',(0,text,self.page,key))

def route_inventory():
    server=(ROOT/'backend/src/server.js').read_text()
    imports=dict(re.findall(r'import\s+(\w+)\s+from\s+[\'"]\./routes/([^\'"]+)[\'"]',server))
    mounts=re.findall(r'app\.use\([\'"]([^\'"]+)[\'"],\s*(\w+)\)',server)
    rows=[]
    for prefix,var in mounts:
        if var not in imports: continue
        path=ROOT/'backend/src/routes'/imports[var]
        content=path.read_text()
        for match in re.finditer(r'^router\.(get|post|put|patch|delete)\([\'"]([^\'"]+)[\'"],\s*(.*)',content,re.M):
            method,suffix,tail=match.groups()
            route=prefix+('' if suffix=='/' else suffix)
            tail=tail.strip().removesuffix(');')
            if 'async (' in tail: handler='inline handler'
            else: handler=tail.split(',')[-1].strip()
            guard=tail[:tail.rfind(',')].strip() if ',' in tail and handler!='inline handler' else ''
            if 'router.use(verifyAccessToken)' in content: guard='verifyAccessToken (router-wide); '+guard
            line=content[:match.start()].count('\n')+1
            rows.append({'id':f'API-{len(rows)+1:03}', 'method':method.upper(),'path':route,'handler':handler,'guards':guard or 'No route-level auth; inspect handler/global middleware', 'source':f'backend/src/routes/{imports[var]}:{line}'})
    with (SRC/'api-route-inventory.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    return rows

def appendix(rows):
    txt='''\n## Appendix A. Route-by-route execution inventory

This inventory includes every explicit mounted GET/POST/PUT/PATCH/DELETE declaration in backend/src/routes at generation time. Router-wide notification authentication is included. Global rate limiting/security middleware also applies. Conditional API documentation and SPA/static handling in server.js are tested by ENV-01/SEC-02; they are not business API declarations.

For EACH row run this procedure using the corresponding domain fixture and request recipe:

1. Locate the handler/model listed below, construct its smallest valid request with the current fixture IDs and required fields, and save a sanitized request in the run evidence. Reuse browser network requests where a UI exists.
2. Send as an authorized actor. For GET compare returned fields, filtering and relationships with the fixture; for create/edit/delete read back the target and list to prove persisted effect. For binary downloads compare SHA-256. For provider/queue effects inspect inbox and saved status.
3. Repeat with no token, expired/invalid token, lowest role and an unrelated account; substitute another fixture's IDs. Public/auth endpoints need their documented anonymous behavior rather than blanket 401. Expected: no privilege escalation, private leakage or unauthorized state change.
4. Send malformed/nonexistent IDs and invalid required fields/types; repeat the successful mutation to check duplicates/state conflicts. Verify useful 4xx and unchanged unrelated state. Record any 500 as a defect needing triage.
5. Record endpoint-specific status/body, persisted result, audit/notification effect where implemented, outcome and evidence. Reset mutated fixtures before the next route. Destructive maintenance only on a disposable database.

Source guards are implementation evidence, not independent proof the authorization design is correct. Apply document/ownership checks from the domain tests even when the route lists only a role guard. All rows start NOT RUN in the results CSV.
'''
    for r in rows:
        txt+=f"\n### {r['id']} - {r['method']} {r['path']}\n"
        txt+=f"Handler: {r['handler']}. Source: {r['source']}.\n\n"
        txt+=f"Declared guards: {r['guards']}. Execute steps 1-5 above and record the authorized plus negative actor variants.\n"
    (SRC/'qa-api-appendix.md').write_text(txt,encoding='utf-8')
    return txt

def story_from_md(text):
    story=[]; pending=[]
    def flush():
        if pending:
            story.append(para(' '.join(pending)));pending.clear()
    for line in text.splitlines():
        line=line.strip()
        if not line: flush();continue
        if line.startswith('# '): continue
        if line.startswith('Edition:'): continue
        if line.startswith('## '):
            flush();story.append(PageBreak());story.append(para(line[3:],'Section'))
        elif line.startswith('### '):
            flush();story.append(para(line[4:],'Case'))
        elif line.startswith('[[figure:'):
            flush();story.append(Illustration(line[9:-2]));story.append(Spacer(1,9))
        elif line.startswith('- ') or re.match(r'^\d+\. ',line):
            flush();story.append(para(line,'ListText'))
        elif re.match(r'^(Setup|Steps|Expected|Actor|Handler|Declared guards):',line):
            flush();label,rest=line.split(':',1);story.append(para('**'+label+':**'+rest))
        else: pending.append(line)
    flush()
    # Keep each test/endpoint entry together, so its expectation is never stranded
    # on a new page without its identifier and steps.
    grouped=[]; case=[]
    for item in story:
        is_case=isinstance(item,Paragraph) and item.style.name=='Case'
        boundary=is_case or isinstance(item,PageBreak)
        if boundary and case:
            grouped.append(KeepTogether(case));case=[]
        if is_case or case: case.append(item)
        else: grouped.append(item)
    if case: grouped.append(KeepTogether(case))
    return grouped

def build(name,title,subtitle,source,extra='',metadata=None):
    metadata = metadata or release_metadata(ROOT)
    doc=ManualDoc(OUT/name,title)
    doc.edition=metadata['date'].upper()
    story=[Spacer(1,80),para('DOCMAN  /  PRACTICAL GUIDES','Case'),Spacer(1,18),para(title,'CoverTitle'),para(subtitle,'Deck'),Spacer(1,20)]
    story += [para(f"DocMan {metadata['version']} - Vue interface",'Case'),para(metadata['date'],'Body'),para(f"Current source snapshot: {metadata['revision']}. Confirm deployment before use.",'Body'),Spacer(1,24),para('Illustrated with labeled vector diagrams. No simulated screenshot is presented as a real application capture.','SmallText'),PageBreak(),para('Contents','Section')]
    toc=TableOfContents();toc.levelStyles=[ParagraphStyle(name='TOC',fontName=FONT,fontSize=10,leading=15,spaceBefore=5,leftIndent=0,rightIndent=18)]
    story.append(toc)
    text=source.read_text(encoding='utf-8')+extra
    story+=story_from_md(text)
    doc.multiBuild(story)

def main():
    rows=route_inventory();extra=appendix(rows)
    qa=(SRC/'qa-end-to-end-guide.md').read_text(encoding='utf-8')
    cases=re.findall(r'^### ([A-Z]+-\d+) - (.+)$',qa,re.M)
    with (SRC/'qa-results-template.csv').open('w',newline='',encoding='utf-8') as f:
        fields=['case_id','title','status','build_sha','tester','timestamp_timezone','actor','fixture_ids','expected_reference','actual_result','evidence_path','defect_id','notes']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for ident,title in cases+[(r['id'],r['method']+' '+r['path']) for r in rows]:
            w.writerow({'case_id':ident,'title':title,'status':'NOT RUN','expected_reference':ident})
    build('docman-user-manual.pdf','User manual','Navigate, share, review and manage documents with confidence.',SRC/'user-manual.md')
    build('docman-qa-end-to-end-guide.pdf','End-to-end QA guide','Repeatable journeys, permission boundaries and evidence for developers and testers.',SRC/'qa-end-to-end-guide.md',extra)
    print(f'Built two PDFs; {len(cases)} scenario cases and {len(rows)} API route cases.')

if __name__=='__main__': main()
