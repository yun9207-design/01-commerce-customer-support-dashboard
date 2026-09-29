import React, { useEffect, useState } from 'react';
import { useData } from '../store';
import { Button, Badge, Icon, PageHeading, Help, Field, Confirm } from '../components/ui';
import { Policy } from '../domain/types';
import { readText } from '../lib/files';
export function Policies() {
    const { state, role, run, notify } = useData();
    const [p, setP] = useState<Omit<Policy, 'version'>>({ ...state.policy });
    const [confirm, setConfirm] = useState(false);
    useEffect(() => setP({ ...state.policy }), [state.policy]);
    const dirty = JSON.stringify({ ...p, version: state.policy.version }) !== JSON.stringify(state.policy);
    async function importText(file: File | undefined, field: 'shippingNote' | 'cancellationNote') { if (!file)
        return; try {
        const text = await readText(file, 12000);
        if (!text.trim() || text.length > 3000)
            throw Error('안내 문구는 1~3,000자여야 합니다.');
        setP({ ...p, [field]: text.trim() });
        notify('TXT 내용을 편집칸에 불러왔습니다. 검토 후 정책 저장을 눌러야 반영됩니다.');
    }
    catch (e) {
        notify((e as Error).message, true);
    } }
    return <>
 <PageHeading eyebrow="RULES & REPLY KNOWLEDGE" title="정책 · 답변" description="앱이 어떤 근거로 판단하고 답하는지 직접 설정합니다. 모든 규정은 실습용 가정입니다." actions={<Badge tone="teal">현재 정책 v{state.policy.version}</Badge>}/>
 <Help title="정책 변경은 이미 만든 답변에도 영향을 줍니다">취소 한도나 안내 문구를 수정하면 정책 버전이 올라갑니다. 이전 초안은 재생성해야 하며, 이전 승인 요청도 검토/실행 시 차단됩니다. 실제 환불 권리를 판단하는 법률 도구가 아닙니다.</Help>
 <form onSubmit={e => { e.preventDefault(); setConfirm(true); }} className="policy-layout"><section className="panel form-panel"><div className="panel-heading"><div><h2>출고 전 취소 조건</h2><p>조건 일치 → 승인 요청 가능 · 자동 실행하지 않음</p></div><Icon name="shield"/></div><label className="switch-row"><div><strong>결제 완료 상태 허용</strong><small>paid 주문을 승인 요청 대상으로 포함</small></div><input aria-label="결제 완료 취소 허용" type="checkbox" checked={p.allowPaid} onChange={e => setP({ ...p, allowPaid: e.target.checked })}/></label><label className="switch-row"><div><strong>상품 준비 상태 허용</strong><small>preparing 주문을 승인 요청 대상으로 포함</small></div><input aria-label="상품 준비 취소 허용" type="checkbox" checked={p.allowPreparing} onChange={e => setP({ ...p, allowPreparing: e.target.checked })}/></label><div className="form-padding"><Field label="취소 검토 금액 한도 (원)" hint="한도 초과는 별도 담당자 확인으로 보냅니다."><input type="number" required min={1} max={100000000} step={1} value={p.maxCancelAmount} onChange={e => setP({ ...p, maxCancelAmount: Number(e.target.value) })}/></Field><Field label="첫 응답 목표 (시간)" hint="접수 후 모의 답변이 없는 미해결 문의에 적용합니다. 영업일 계산은 하지 않습니다."><input type="number" required min={1} max={168} step={1} value={p.slaHours} onChange={e => setP({ ...p, slaHours: Number(e.target.value) })}/></Field></div><div className="policy-fixed"><Icon name="lock"/><div><strong>항상 적용하는 안전 조건</strong><p>문의자 이메일 대조 · 배송 이후 취소 차단 · 승인과 실행 분리 · 실행 직전 재검사 · 중복 실행 방지</p></div></div></section>
 <section className="panel form-panel"><div className="panel-heading"><div><h2>답변에 사용하는 안내 문구</h2><p>AI가 학습하는 자료가 아닌, 초안에 삽입할 문구</p></div><Icon name="book"/></div><div className="form-padding"><Field label="스토어 / 워크스페이스 이름"><input required maxLength={80} value={p.shopName} onChange={e => setP({ ...p, shopName: e.target.value })}/></Field><Field label="배송 안내"><textarea required rows={5} maxLength={3000} value={p.shippingNote} onChange={e => setP({ ...p, shippingNote: e.target.value })}/></Field><label className="file-button"><Icon name="upload" size={15}/>배송 안내 TXT 불러오기<input type="file" accept=".txt,text/plain" onChange={e => { importText(e.target.files?.[0], 'shippingNote'); e.target.value = ''; }}/></label><Field label="취소 안내"><textarea required rows={5} maxLength={3000} value={p.cancellationNote} onChange={e => setP({ ...p, cancellationNote: e.target.value })}/></Field><label className="file-button"><Icon name="upload" size={15}/>취소 안내 TXT 불러오기<input type="file" accept=".txt,text/plain" onChange={e => { importText(e.target.files?.[0], 'cancellationNote'); e.target.value = ''; }}/></label></div></section>
 <div className="policy-save"><p>{role !== 'manager' ? '관리자 역할로 바꾸어야 정책을 저장할 수 있습니다.' : dirty ? '수정 중인 내용이 있습니다. 저장해야 업무에 반영됩니다.' : '저장된 정책을 보고 있습니다.'}</p><Button onClick={() => setP({ ...state.policy })} disabled={!dirty}>변경 취소</Button><Button type="submit" variant="primary" disabled={role !== 'manager' || !dirty}>새 정책 버전 저장</Button></div></form>
 {confirm && <Confirm title="새 정책 버전을 적용할까요?" description={`정책 v${state.policy.version + 1}로 변경합니다. 기존 답변 초안은 재검토 대상이 되고, 진행 중 취소 요청은 최신 조건 재검사에서 차단됩니다. 실제 쇼핑몰 정책은 바뀌지 않습니다.`} button="정책 변경 적용" onClose={() => setConfirm(false)} onConfirm={() => { if (run({ type: 'policy.update', policy: p }))
        setConfirm(false); }}/>}</>;
}
