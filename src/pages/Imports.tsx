import React, { useRef, useState } from 'react';
import { useData } from '../store';
import { Button, Badge, Icon, PageHeading, Help, Empty } from '../components/ui';
import { ImportKind, ImportPreview, previewCSV, sampleCSV, toCSV, ORDER_HEADERS, TICKET_HEADERS } from '../lib/csv';
import { download, readText } from '../lib/files';
export function Imports() {
    const { state, role, run, notify } = useData();
    const [kind, setKind] = useState<ImportKind>('orders');
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [filename, setFilename] = useState('');
    const [drag, setDrag] = useState(false);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const errors = preview?.issues.filter(i => i.severity === 'error') ?? [];
    const warnings = preview?.issues.filter(i => i.severity === 'warning') ?? [];
    async function load(file: File | undefined) { if (!file)
        return; setBusy(true); try {
        if (!file.name.toLowerCase().endsWith('.csv'))
            throw Error('CSV 파일만 지원합니다. 엑셀에서 CSV UTF-8로 저장해 주세요.');
        const text = await readText(file);
        setPreview(previewCSV(text, kind, state));
        setFilename(file.name);
    }
    catch (e) {
        notify((e as Error).message, true);
        setPreview(null);
    }
    finally {
        setBusy(false);
    } }
    function apply() { if (!preview || errors.length)
        return; const ok = preview.kind === 'orders' ? run({ type: 'import.orders', orders: preview.orders, filename }) : run({ type: 'import.tickets', tickets: preview.tickets, filename }); if (ok) {
        setPreview(null);
        setFilename('');
    } }
    return <><PageHeading eyebrow="BRING YOUR OWN DATA" title="자료 가져오기" description="API 대신 파일로 연결합니다. 검사 결과를 먼저 확인한 뒤 신규 자료만 반영합니다."/>
 <Help title="여기서 ‘업로드’는 내 브라우저로 불러오기입니다">파일은 서버로 보내지 않습니다. 신규 주문/문의만 추가하며 기존 번호는 덮어쓰지 않습니다. 주문 CSV를 먼저 반영하면 문의 CSV의 주문 연결 여부를 검사할 수 있습니다.</Help>
 <div className="import-layout"><section><div className="segmented"><button className={kind === 'orders' ? 'active' : ''} onClick={() => { setKind('orders'); setPreview(null); }}>1. 주문 자료</button><button className={kind === 'tickets' ? 'active' : ''} onClick={() => { setKind('tickets'); setPreview(null); }}>2. 문의 자료</button></div><div className={`dropzone ${drag ? 'drag' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (!busy)
        load(e.dataTransfer.files[0]); }}><div className="drop-icon"><Icon name="upload" size={32}/></div><h2>{busy ? '파일 검사 중…' : `${kind === 'orders' ? '주문' : '문의'} CSV를 놓아주세요`}</h2><p>UTF-8 CSV · 최대 2 MB · 최대 2,000행</p><Button variant="primary" icon="file" disabled={busy} onClick={() => fileRef.current?.click()}>파일 선택</Button><input ref={fileRef} className="sr-only" aria-label="CSV 파일 선택" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { load(e.target.files?.[0]); e.target.value = ''; }}/><small>실습에는 가상/익명화 자료만 사용하세요.</small></div><div className="sample-actions"><Button icon="down" onClick={() => download(`sample-${kind}.csv`, sampleCSV(kind), 'text/csv;charset=utf-8')}>정상 샘플 받기</Button><Button onClick={() => download(`invalid-${kind}.csv`, sampleCSV(kind, true), 'text/csv;charset=utf-8')}>오류 샘플 받기</Button><Button onClick={() => { setPreview(previewCSV(sampleCSV(kind), kind, state)); setFilename(`sample-${kind}.csv`); }}>샘플 바로 검사</Button></div></section>
 <aside className="panel import-guide"><span className="eyebrow">IMPORT CONTRACT</span><h2>검사 → 확인 → 반영</h2><div className="numbered-item"><b>01</b><div><strong>필수 열과 값 검사</strong><p>이메일 · 상태 · 날짜 · 금액을 확인합니다.</p></div></div><div className="numbered-item"><b>02</b><div><strong>중복과 연결 확인</strong><p>기존 번호는 오류, 찾을 수 없는 연결 주문은 경고입니다.</p></div></div><div className="numbered-item"><b>03</b><div><strong>오류가 0개일 때만 반영</strong><p>정상 행만 몰래 가져오지 않습니다. 파일 전체를 수정한 뒤 다시 검사하세요.</p></div></div><h3>필수 열</h3><div className="code-tags">{(kind === 'orders' ? ORDER_HEADERS : TICKET_HEADERS).map(h => <code key={h}>{h}</code>)}</div><p className="muted">날짜: 2026-09-29T09:00:00+09:00 형식<br />금액: 29000 (쉼표·원 기호 제외)<br />XLSX · PDF 직접 해석은 미지원</p></aside></div>
 {preview && <section className="panel import-preview"><div className="panel-heading"><div><h2>검사 결과 · {filename}</h2><p>{preview.total}행 · 반영 전 미리보기</p></div><div className="badge-row"><Badge tone={errors.length ? 'red' : 'teal'}>오류 {errors.length}</Badge><Badge tone="amber">경고 {warnings.length}</Badge></div></div>{preview.issues.length > 0 && <div className="issue-list">{preview.issues.slice(0, 100).map((i, n) => <div key={n} className={`issue ${i.severity}`}><Icon name={i.severity === 'error' ? 'x' : 'warning'} size={16}/><b>{i.row ? `${i.row}행` : '파일'} · {i.field}</b><span>{i.message}</span></div>)}{preview.issues.length > 100 && <p>100개만 표시했습니다. 전체 오류 보고서를 내려받으세요.</p>}</div>}{preview.rows.length > 0 && <div className="table-wrap"><table><thead><tr><th>행</th>{preview.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 8).map((r, i) => <tr key={i} className={errors.some(e => e.row === i + 2) ? 'row-error' : ''}><td>{i + 2}</td>{r.map((v, j) => <td key={j} title={v}>{v.length > 65 ? v.slice(0, 65) + '…' : v}</td>)}</tr>)}</tbody></table></div>}<div className="import-footer"><p>{role !== 'manager' ? '반영하려면 상단 실습 역할을 관리자로 바꾸세요.' : errors.length ? '오류를 고친 뒤 다시 불러와 주세요. 현재 자료는 변경하지 않았습니다.' : warnings.length ? '경고 항목을 확인하세요. 연결되지 않은 문의는 취소 요청이 제한됩니다.' : '모든 행이 검사를 통과했습니다. 기존 자료는 유지됩니다.'}</p><div>{preview.issues.length > 0 && <Button icon="down" onClick={() => download('import-issues.csv', toCSV(['row', 'severity', 'field', 'message'], preview.issues.map(i => [i.row, i.severity, i.field, i.message])), 'text/csv;charset=utf-8')}>오류 보고서</Button>}<Button variant="primary" disabled={errors.length > 0 || !preview.total || role !== 'manager'} onClick={apply}>{preview.total}개 신규 자료 반영</Button></div></div></section>}
 </>;
}
