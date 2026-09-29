import { AppState, Ticket, Assessment, orderLabels } from './types';
export function linkedOrder(s: AppState, t: Ticket) { return s.orders.find(o => o.id === t.orderId); }
export function assessCancellation(s: AppState, t: Ticket): Assessment {
    const o = linkedOrder(s, t);
    const p = s.policy;
    const checks = [
        { label: '주문 자료 연결', pass: !!o, detail: o ? `${o.id} · 자료 버전 ${o.version}` : '주문번호가 없거나 불러온 자료에서 찾을 수 없습니다.' },
        { label: '문의자 · 주문자 대조', pass: !!o && o.email.toLowerCase() === t.email.toLowerCase(), detail: !o ? '주문 연결 후 검사' : o.email.toLowerCase() === t.email.toLowerCase() ? '이메일 일치 (실제 본인 인증 아님)' : '이메일 불일치 — 다른 고객의 주문 처리를 막습니다.' },
        { label: '출고 전 주문인지', pass: !!o && ((o.status === 'paid' && p.allowPaid) || (o.status === 'preparing' && p.allowPreparing)), detail: o ? `현재 ${orderLabels[o.status]} · 학습 정책 v${p.version}` : '주문 상태 확인 필요' },
        { label: '검토 한도 이내인지', pass: !!o && o.amount <= p.maxCancelAmount, detail: o ? `${o.amount.toLocaleString()}원 / 한도 ${p.maxCancelAmount.toLocaleString()}원` : '금액 확인 필요' },
        { label: '취소 유형인지', pass: t.type === 'cancellation', detail: t.type === 'cancellation' ? '출고 전 취소 요청' : '배송 조회 · 기타 문의에서는 취소 실행하지 않습니다.' }
    ];
    const allowed = checks.every(c => c.pass);
    return { allowed, title: allowed ? '승인 요청 가능' : '별도 확인 필요', checks };
}
export function fingerprint(s: AppState, t: Ticket): string { const o = linkedOrder(s, t); return JSON.stringify([t.orderId, t.type, t.email, o?.version ?? 0, s.policy.version]); }
export function draftReply(s: AppState, t: Ticket): string {
    const o = linkedOrder(s, t);
    const intro = `${t.customer}님, 안녕하세요. ${s.policy.shopName}입니다.`;
    if (!o)
        return `${intro}\n\n문의해 주신 주문을 현재 자료에서 찾지 못했습니다. 주문번호와 주문 시 사용한 이메일을 확인해 주세요.\n\n[상담원 검토용 초안 · 실제 발송 전 확인]`;
    if (o.email.toLowerCase() !== t.email.toLowerCase())
        return `${intro}\n\n문의 정보와 주문자 정보가 일치하지 않아 주문 내역을 안내하기 어렵습니다. 주문 시 사용한 이메일을 확인해 주세요.\n\n[본인 확인이 필요한 문의 · 민감한 주문정보 제외]`;
    if (t.type === 'shipping')
        return `${intro}\n\n주문 ${o.id}의 불러온 자료상 상태는 '${orderLabels[o.status]}'입니다.${o.tracking ? `\n택배사: ${o.carrier || '확인 필요'} / 송장번호: ${o.tracking}` : ''}\n${s.policy.shippingNote}\n\n※ 실시간 배송 조회가 아닌 업로드 자료 기준 안내입니다.`;
    if (t.type === 'cancellation') {
        if (o.status === 'cancelled')
            return `${intro}\n\n주문 ${o.id}의 취소 상태가 실습 데이터에 반영되었습니다. 실제 쇼핑몰 취소나 결제 환불은 실행되지 않았습니다.\n\n[학습용 모의 처리 결과]`;
        const a = assessCancellation(s, t);
        return `${intro}\n\n${a.allowed ? '출고 전 취소 검토 조건을 충족합니다. 담당자 승인과 실행 전 재확인 후 결과를 안내하겠습니다. 아직 취소가 완료된 것은 아닙니다.' : '현재 자료와 학습 정책으로는 출고 전 취소를 바로 처리할 수 없어 담당자의 추가 확인이 필요합니다.'}\n${s.policy.cancellationNote}\n\n[규칙 기반 초안 · 처리 완료를 보장하지 않음]`;
    }
    return `${intro}\n\n문의 내용을 담당자가 확인하고 있습니다. 이 실습의 자동 안내 범위는 배송 조회와 출고 전 취소 접수입니다. 그 밖의 문의는 확인 후 별도로 안내하겠습니다.`;
}
export function isOverdue(s: AppState, t: Ticket, now = Date.now()): boolean { return t.status !== 'resolved' && t.messages.length === 0 && now - Date.parse(t.createdAt) > s.policy.slaHours * 3600000; }
