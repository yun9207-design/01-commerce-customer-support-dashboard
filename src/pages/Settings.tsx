import React, { useState } from 'react';
import { useData } from '../store';
import { Button, Badge, Icon, PageHeading, Help, Modal, Field } from '../components/ui';
import { AppState } from '../domain/types';
import { parseBackup } from '../domain/validation';
import { download, readText, time } from '../lib/files';
export function Settings() {
    const { state, role, storage, replace, canStore, reset, notify, raw } = useData();
    const [restore, setRestore] = useState<AppState | null>(null);
    const [confirmText, setConfirmText] = useState('');
    const [resetOpen, setResetOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    async function loadBackup(file: File | undefined) { if (!file)
        return; setBusy(true); try {
        const text = await readText(file, 12000000);
        const parsed = parseBackup(text);
        if (!canStore(parsed))
            throw Error(`이 백업(파일 약 ${(text.length / 1e6).toFixed(1)}MB)은 이 브라우저의 저장 공간에 들어가지 않아 복원할 수 없습니다. 현재 자료는 바뀌지 않았습니다. 더 작은 백업을 선택하거나, 현재 자료를 먼저 JSON 백업한 뒤 정리하세요.`);
        setRestore(parsed);
        setConfirmText('');
    }
    catch (e) {
        notify((e as Error).message, true);
    }
    finally {
        setBusy(false);
    } }
    return <><PageHeading eyebrow="LOCAL DATA & PROJECT BOUNDARIES" title="설정 · 백업" description="프로그램 파일과 내가 입력한 업무 자료는 별개입니다. 자료는 JSON으로 백업하세요." actions={<Badge tone={storage.mode === 'recovery' ? 'red' : 'teal'}>{storage.mode === 'persistent' ? '브라우저 로컬 저장' : storage.mode === 'session' ? '현재 탭 임시 저장' : '원본 보호 · 복구 모드'}</Badge>}/>
 <Help title="GitHub에는 코드를, 백업에는 작업 자료를">공개 저장소에는 이 프로젝트의 가상 샘플과 코드만 올리세요. 고객정보, 작업 백업, 비밀번호, API 키는 올리지 않습니다. 실습 역할 전환은 실제 사용자 인증이나 보안 경계가 아닙니다.</Help>
 <div className="settings-grid"><section className="panel settings-card"><div className="settings-icon"><Icon name="down"/></div><h2>전체 자료 백업</h2><p>주문, 문의, 답변, 승인, 정책, 작업 이력과 학습 체크를 한 파일에 저장합니다.</p><dl><div><dt>주문 / 문의</dt><dd>{state.orders.length} / {state.tickets.length}건</dd></div><div><dt>마지막 변경</dt><dd>{time(state.updatedAt)}</dd></div><div><dt>백업 스키마 / 자료 버전</dt><dd>v1 / {state.revision}</dd></div></dl><Button variant="primary" icon="down" onClick={() => download(`commerce-cs-${new Date().toISOString().slice(0, 10)}.backup.json`, JSON.stringify(state, null, 2), 'application/json')}>전체 JSON 백업</Button>{storage.mode === 'recovery' && <Button variant="danger" onClick={() => download('recovery-original.txt', raw() ?? '저장 자료 없음')}>손상 원본 그대로 내려받기</Button>}<small>백업 파일은 공개 공유하지 마세요. 암호화된 보관함이 아닙니다.</small></section>
 <section className="panel settings-card"><div className="settings-icon"><Icon name="upload"/></div><h2>백업 복원</h2><p>버전, 필수 항목, 중복 ID, 승인 연결과 상태를 검사한 뒤 교체 내용을 미리 보여줍니다.</p><div className="notice amber"><Icon name="warning"/>복원은 병합이 아닌 전체 교체입니다. 현재 자료를 먼저 백업하세요.</div><label className={`file-button large ${busy ? 'disabled' : ''}`}><Icon name="file"/>{busy ? '검사 중…' : 'JSON 백업 파일 선택'}<input type="file" accept=".json,application/json" disabled={busy} aria-label="JSON 백업 파일 선택" onChange={e => { loadBackup(e.target.files?.[0]); e.target.value = ''; }}/></label><small>검사 미리보기는 모든 역할에서 가능하며, 실제 복원은 관리자 역할만 가능합니다.</small></section>
 <section className="panel settings-card"><div className="settings-icon"><Icon name="shield"/></div><h2>현재 구현 범위</h2><ul className="boundary-list"><li><Badge tone="teal">구현</Badge>로컬 자료 검사·저장·상태 변경·백업</li><li><Badge tone="amber">모의</Badge>고객 답변 기록·주문 취소·물류 변경</li><li><Badge tone="neutral">미연결</Badge>쇼핑몰 API·실제 AI·문자·결제</li><li><Badge tone="neutral">미구현</Badge>실제 로그인·팀 공유·서버 권한</li></ul><p>브라우저 탭 하나에서 사용하는 학습용 앱입니다. 공유 계정이나 실제 고객 운영에 사용하지 마세요.</p>{location.protocol === 'file:' && <div className="notice">직접 연 HTML의 저장 방식은 브라우저마다 다를 수 있습니다. 파일을 이동하기 전에 JSON 백업하세요.</div>}</section>
 <section className="panel settings-card danger-card"><div className="settings-icon"><Icon name="refresh"/></div><h2>처음부터 다시 연습</h2><p>모든 현재 자료를 삭제하고 가상 주문 12개와 문의 12개로 되돌립니다. 취소할 수 없으므로 먼저 백업하세요.</p><Button variant="danger" disabled={role !== 'manager'} onClick={() => { setResetOpen(true); setConfirmText(''); }}>가상 샘플로 전체 초기화</Button><small>{role !== 'manager' ? '상단 실습 역할을 관리자로 변경해야 합니다.' : '새 연습 자료만 필요하면 학습 가이드에서 개별 시나리오를 추가하세요.'}</small></section></div>
 {restore && <Modal title="백업 복원 미리보기" onClose={() => setRestore(null)}><div className="key-value-grid"><div><span>주문</span><strong>{state.orders.length} → {restore.orders.length}건</strong></div><div><span>문의</span><strong>{state.tickets.length} → {restore.tickets.length}건</strong></div><div><span>승인 / 작업 이력</span><strong>{restore.approvals.length} / {restore.events.length}건</strong></div><div><span>정책</span><strong>v{restore.policy.version}</strong></div></div><p>복원할 워크스페이스: <strong>{restore.policy.shopName}</strong></p><div className="notice red"><Icon name="warning"/>현재 자료 전체가 교체됩니다. 기존 자료와 병합하지 않습니다.</div><Field label="계속하려면 ‘복원’을 입력하세요"><input value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off"/></Field><div className="modal-actions"><Button onClick={() => setRestore(null)}>취소</Button><Button variant="primary" disabled={role !== 'manager' || confirmText !== '복원'} onClick={() => { if (replace(restore))
        setRestore(null); }}>전체 자료 복원</Button></div></Modal>}
 {resetOpen && <Modal title="전체 초기화 확인" onClose={() => setResetOpen(false)}><p className="confirm-copy">현재 문의·주문·승인·정책·이력·학습 기록을 모두 가상 샘플로 교체합니다. 복구하려면 사전에 받은 JSON 백업이 필요합니다.</p><Field label="계속하려면 ‘초기화’를 입력하세요"><input value={confirmText} onChange={e => setConfirmText(e.target.value)} autoComplete="off"/></Field><div className="modal-actions"><Button onClick={() => setResetOpen(false)}>취소</Button><Button variant="danger" disabled={role !== 'manager' || confirmText !== '초기화'} onClick={() => { if (reset())
        setResetOpen(false); }}>전체 초기화 실행</Button></div></Modal>}
 </>;
}
