"""Browser checks: pip install playwright && playwright install chromium.
Default opens the compiled preview with set_content (no web server required).
Set BASE_URL=http://127.0.0.1:4173 to test an actual deployment instead.
"""
from pathlib import Path
import json, os, re
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-artifacts'
OUT.mkdir(exist_ok=True)
HTML = (ROOT / 'preview.html').read_text(encoding='utf-8')
results=[]
with sync_playwright() as pw:
    exe=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
    browser=pw.chromium.launch(executable_path=exe, headless=True,args=['--no-sandbox'])
    errors=[]
    def fresh(width=1440,height=1000):
        page=browser.new_page(viewport={'width':width,'height':height})
        page.on('pageerror',lambda e:errors.append(str(e)))
        if os.environ.get('BASE_URL'): page.goto(os.environ['BASE_URL'])
        else: page.set_content(HTML,wait_until='load')
        expect(page.get_by_role('heading',name='오늘의 고객지원, 한눈에.')).to_be_visible()
        return page
    def nav(page,name):
        if page.viewport_size['width']<851:
            page.get_by_role('button',name='메뉴 열기',exact=True).click()
        page.get_by_role('navigation',name='주 메뉴').get_by_role('button',name=name,exact=False).click()
    def check(name,fn):
        before=len(errors)
        try:
            fn();assert len(errors)==before, errors[before:];results.append({'name':name,'passed':True});print('PASS',name)
        except Exception as e:
            results.append({'name':name,'passed':False,'error':str(e)});print('FAIL',name,str(e)[:1200]);raise
    def request(page):
        nav(page,'문의 작업대');page.get_by_role('button',name='취소 승인 요청',exact=True).click()
        page.get_by_role('button',name='승인 요청 등록',exact=True).click()
        nav(page,'승인함')
    def approve(page):
        page.get_by_label('실습 역할').select_option('manager')
        page.get_by_role('button',name='검토 승인',exact=True).click()
        page.get_by_role('button',name='검토 결과 저장',exact=True).click()
    def execute(page):
        page.get_by_role('button',name='재검사 후 모의 실행',exact=True).click()
        page.get_by_role('button',name='재검사 · 모의 실행',exact=True).click()
    def all_pages():
        p=fresh()
        for n in ['문의 작업대','주문 관리','승인함','정책 · 답변','자료 가져오기','리포트 · 이력','학습 가이드','설정 · 백업','운영 개요']:
            nav(p,n);expect(p.locator('h1')).to_be_visible()
        assert p.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'desktop horizontal overflow'
        p.screenshot(path=str(OUT/'dashboard-desktop.png'),full_page=True)
        nav(p,'문의 작업대');p.screenshot(path=str(OUT/'workbench-desktop.png'),full_page=True);p.close()
    check('all 9 pages and desktop layout',all_pages)
    def workflow():
        p=fresh();request(p)
        expect(p.get_by_role('button',name='검토 승인',exact=True)).to_be_disabled()
        approve(p);expect(p.get_by_text('승인 · 실행 전',exact=True)).to_be_visible()
        execute(p);p.get_by_role('button',name='실행 완료',exact=False).click()
        expect(p.get_by_text('모의 실행 완료',exact=True)).to_be_visible()
        expect(p.get_by_role('button',name='재검사 후 모의 실행',exact=True)).to_have_count(0)
        p.get_by_role('button',name='결과 안내 · 해결하기').click()
        p.get_by_role('button',name='규칙 기반 초안 생성',exact=True).click()
        expect(p.get_by_label('답변 초안')).not_to_be_empty()
        p.get_by_role('button',name='모의 답변 기록',exact=True).click()
        p.get_by_role('button',name='해결 처리',exact=True).click()
        expect(p.get_by_role('button',name='다시 열기',exact=True)).to_be_visible()
        nav(p,'설정 · 백업')
        with p.expect_download() as download_info:p.get_by_role('button',name='전체 JSON 백업').click()
        data=json.loads(Path(download_info.value.path()).read_text())
        assert data['orders'][0]['status']=='cancelled'
        assert data['tickets'][0]['status']=='resolved'
        assert data['tickets'][0]['messages'][0]['mode']=='simulated'
        assert data['approvals'][0]['status']=='executed'
        p.close()
    check('request, role gate, approval, execution, reply, resolution and JSON export',workflow)
    def race():
        p=fresh();request(p);approve(p);nav(p,'주문 관리')
        p.get_by_role('button',name='ORD-1001',exact=True).click()
        p.get_by_label('송장번호',exact=False).fill('DEMO-BROWSER-RACE')
        p.get_by_role('button',name='실습 주문 상태 변경',exact=True).click()
        nav(p,'승인함');execute(p)
        p.get_by_role('button',name='차단',exact=False).click()
        expect(p.get_by_text('재검사 차단',exact=True)).to_be_visible()
        expect(p.get_by_text('배송 중',exact=True)).to_be_visible();p.close()
    check('approved request is blocked after logistics changes',race)
    def csvflow():
        p=fresh();nav(p,'자료 가져오기')
        bad=(ROOT/'samples/invalid-orders.csv').read_bytes()
        p.get_by_label('CSV 파일 선택',exact=True).set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':bad})
        expect(p.get_by_text('오류 1',exact=True)).to_be_visible()
        expect(p.get_by_role('button',name='2개 신규 자료 반영')).to_be_disabled()
        p.get_by_label('CSV 파일 선택',exact=True).set_input_files(str(ROOT/'samples/orders.csv'))
        expect(p.get_by_text('오류 0',exact=True)).to_be_visible()
        expect(p.get_by_role('button',name='2개 신규 자료 반영')).to_be_disabled()
        p.get_by_label('실습 역할').select_option('manager')
        p.get_by_role('button',name='2개 신규 자료 반영').click()
        p.get_by_label('CSV 파일 선택',exact=True).set_input_files(str(ROOT/'samples/orders.csv'))
        expect(p.get_by_text('오류 2',exact=True)).to_be_visible()
        expect(p.get_by_role('button',name='2개 신규 자료 반영')).to_be_disabled()
        p.get_by_role('button',name='2. 문의 자료',exact=True).click()
        p.get_by_label('CSV 파일 선택',exact=True).set_input_files(str(ROOT/'samples/tickets.csv'))
        expect(p.get_by_text('경고 0',exact=True)).to_be_visible()
        p.get_by_role('button',name='2개 신규 자료 반영').click()
        nav(p,'주문 관리');p.get_by_label('주문 검색',exact=True).fill('IMPORT-101')
        expect(p.get_by_role('button',name='IMPORT-101',exact=True)).to_be_visible();p.close()
    check('real file input validates invalid, valid and duplicate CSV; links imported inquiries',csvflow)
    def restore():
        p=fresh();nav(p,'설정 · 백업')
        p.get_by_label('JSON 백업 파일 선택').set_input_files(str(ROOT/'samples/demo.backup.json'))
        expect(p.get_by_role('heading',name='백업 복원 미리보기')).to_be_visible()
        p.get_by_label('계속하려면 ‘복원’을 입력하세요').fill('복원')
        expect(p.get_by_role('button',name='전체 자료 복원',exact=True)).to_be_disabled()
        p.get_by_role('dialog').get_by_role('button',name='취소',exact=True).click()
        p.get_by_label('실습 역할').select_option('manager')
        p.get_by_label('JSON 백업 파일 선택').set_input_files(str(ROOT/'samples/demo.backup.json'))
        p.get_by_label('계속하려면 ‘복원’을 입력하세요').fill('복원')
        p.get_by_role('button',name='전체 자료 복원',exact=True).click()
        expect(p.get_by_role('heading',name='백업 복원 미리보기')).to_have_count(0)
        p.get_by_role('button',name='가상 샘플로 전체 초기화').click()
        expect(p.get_by_role('button',name='전체 초기화 실행')).to_be_disabled()
        p.keyboard.press('Escape');expect(p.get_by_role('dialog')).to_have_count(0);p.close()
    check('backup validation, explicit restore confirmation, reset guard and Escape dismissal',restore)
    def learning():
        p=fresh();nav(p,'학습 가이드')
        p.get_by_role('checkbox').first.check()
        expect(p.get_by_text('1 / 6 개념 체크',exact=True)).to_be_visible()
        p.get_by_role('button',name='이 상황의 새 연습 자료 만들기').first.click()
        expect(p.get_by_role('heading',name='배송 상태 문의',exact=True,level=2)).to_be_visible()
        p.get_by_role('button',name='규칙 기반 초안 생성',exact=True).click()
        expect(p.get_by_label('답변 초안')).to_have_value(re.compile('DEMO-PRACTICE-01'));p.close()
    check('learning progress and isolated new scenario creation',learning)
    def mobile():
        p=fresh(390,844)
        assert p.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile dashboard overflow'
        p.screenshot(path=str(OUT/'dashboard-mobile.png'),full_page=True)
        nav(p,'문의 작업대')
        assert p.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile workbench overflow'
        p.get_by_role('button',name='새 문의 접수',exact=True).click()
        expect(p.get_by_role('heading',name='가상 문의 접수')).to_be_visible()
        p.get_by_label('고객명',exact=True).fill('연습 사용자')
        p.get_by_label('이메일',exact=True).fill('mobile@example.com')
        p.get_by_label('문의 제목',exact=True).fill('모바일 신규 문의')
        p.get_by_label('문의 내용',exact=True).fill('이 화면에서 직접 접수합니다.')
        p.get_by_role('button',name='문의 접수',exact=True).click()
        expect(p.get_by_role('heading',name='모바일 신규 문의',exact=True,level=2)).to_be_visible()
        p.screenshot(path=str(OUT/'workbench-mobile.png'),full_page=True);p.close()
    check('390px responsive layout and new inquiry entry',mobile)
    assert errors==[],errors
    browser.close()
(OUT/'browser-results.json').write_text(json.dumps({'checks':results,'consoleErrors':errors,'mode':'BASE_URL' if os.environ.get('BASE_URL') else 'embedded about:blank, session-only storage'},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(results)} browser scenarios passed; no uncaught JS errors.')
