import { AppState, Order, Ticket, Policy, Approval, Event, Message, Note, ORDER_STATUSES, TICKET_STATUSES, TICKET_TYPES, APPROVAL_STATUSES } from './types';
// Build new typed objects at all trust boundaries. Never assign raw JSON to application state.
function obj(x: unknown, label: string): Record<string, unknown> { if (!x || typeof x !== 'object' || Array.isArray(x))
    throw Error(`${label}: 객체 형식이어야 합니다.`); return x as Record<string, unknown>; }
function str(x: unknown, label: string, max = 200, empty = false): string { if (typeof x !== 'string' || x.length > max || (!empty && !x.trim()))
    throw Error(`${label}: ${empty ? '0' : '1'}~${max}자의 문자열이 필요합니다.`); return x; }
function num(x: unknown, label: string, min = 0, max = 1e9): number { if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max)
    throw Error(`${label}: ${min}~${max} 범위의 숫자가 필요합니다.`); return x; }
function integer(x: unknown, label: string, min = 0, max = 1e9): number { const n = num(x, label, min, max); if (!Number.isInteger(n))
    throw Error(`${label}: 정수가 필요합니다.`); return n; }
function bool(x: unknown, label: string): boolean { if (typeof x !== 'boolean')
    throw Error(`${label}: 참/거짓 값이 필요합니다.`); return x; }
function en<T extends string>(x: unknown, values: readonly T[], label: string): T { if (typeof x !== 'string' || !values.includes(x as T))
    throw Error(`${label}: 허용 값 ${values.join(', ')}`); return x as T; }
export function email(x: unknown): string { const t = str(x, '이메일', 254).trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))
    throw Error('이메일 형식을 확인하세요. 실습에는 example.com 주소를 사용하세요.'); return t; }
export function iso(x: unknown, label = '날짜'): string { const t = str(x, label, 40); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(t) || !Number.isFinite(Date.parse(t)))
    throw Error(`${label}: 시간대가 포함된 ISO 날짜가 필요합니다.`); if (Number(t.slice(11, 13)) > 23 || Number(t.slice(14, 16)) > 59 || Number(t.slice(17, 19)) > 59)
    throw Error(`${label}: 시간 범위를 확인하세요.`); const date = t.slice(0, 10); if (new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date)
    throw Error(`${label}: 존재하지 않는 날짜입니다.`); return t; }
function dateOrNull(x: unknown, label: string): string | null { return x === null ? null : iso(x, label); }
function id(x: unknown, label = 'ID'): string { const t = str(x, label, 100); if (!/^[A-Za-z0-9_-]+$/.test(t))
    throw Error(`${label}: 영문, 숫자, -, _ 만 사용하세요.`); return t; }
function arr<T>(x: unknown, label: string, parse: (v: unknown) => T, max = 2000): T[] { if (!Array.isArray(x) || x.length > max)
    throw Error(`${label}: 최대 ${max}개 배열이 필요합니다.`); return x.map(parse); }
function unique<T extends {
    id: string;
}>(items: T[], label: string) { const ids = new Set(items.map(x => x.id)); if (ids.size !== items.length)
    throw Error(`${label}: 중복 ID가 있습니다.`); }
export function parseOrder(x: unknown): Order { const o = obj(x, '주문'); return { id: id(o.id, '주문번호'), customer: str(o.customer, '고객명', 80), email: email(o.email), product: str(o.product, '상품', 300), amount: integer(o.amount, '금액', 1, 1e8), status: en(o.status, ORDER_STATUSES, '주문 상태'), carrier: str(o.carrier, '택배사', 80, true), tracking: str(o.tracking, '송장', 100, true), placedAt: iso(o.placedAt), updatedAt: iso(o.updatedAt), version: integer(o.version, '주문 버전', 1) }; }
function parseMessage(x: unknown): Message { const o = obj(x, '답변'); return { id: id(o.id), body: str(o.body, '답변', 6000), at: iso(o.at), by: str(o.by, '작성자', 80), fingerprint: str(o.fingerprint, '답변 근거', 500, true), mode: en(o.mode, ['simulated'], '발송 모드') }; }
function parseNote(x: unknown): Note { const o = obj(x, '메모'); return { id: id(o.id), body: str(o.body, '메모', 2000), at: iso(o.at), by: str(o.by, '작성자', 80) }; }
export function parseTicket(x: unknown): Ticket { const o = obj(x, '문의'); const t: Ticket = { id: id(o.id, '문의번호'), customer: str(o.customer, '고객명', 80), email: email(o.email), subject: str(o.subject, '제목', 180), body: str(o.body, '문의 내용', 6000), orderId: o.orderId === '' ? '' : id(o.orderId, '연결 주문번호'), type: en(o.type, TICKET_TYPES, '문의 유형'), priority: en(o.priority, ['low', 'normal', 'high'], '우선순위'), status: en(o.status, TICKET_STATUSES, '문의 상태'), assignee: str(o.assignee, '담당자', 80), createdAt: iso(o.createdAt), updatedAt: iso(o.updatedAt), resolvedAt: dateOrNull(o.resolvedAt, '해결일'), draft: str(o.draft, '초안', 6000, true), draftFingerprint: str(o.draftFingerprint, '초안 근거', 500, true), messages: arr(o.messages, '답변', parseMessage, 300), notes: arr(o.notes, '메모', parseNote, 300) }; unique(t.messages, '답변'); unique(t.notes, '메모'); if ((t.status === 'resolved') !== Boolean(t.resolvedAt))
    throw Error('해결 상태와 해결일이 일치하지 않습니다.'); if (t.status === 'resolved' && !t.messages.length)
    throw Error('해결 완료 문의에는 모의 답변이 필요합니다.'); return t; }
export function parsePolicy(x: unknown): Policy { const o = obj(x, '정책'); return { version: integer(o.version, '정책 버전', 1), allowPaid: bool(o.allowPaid, '결제 후 취소'), allowPreparing: bool(o.allowPreparing, '준비 중 취소'), maxCancelAmount: integer(o.maxCancelAmount, '취소 한도', 1, 1e8), slaHours: integer(o.slaHours, '응답 목표', 1, 168), shippingNote: str(o.shippingNote, '배송 안내', 3000), cancellationNote: str(o.cancellationNote, '취소 안내', 3000), shopName: str(o.shopName, '워크스페이스', 80) }; }
function parseApproval(x: unknown): Approval { const o = obj(x, '승인'); return { id: id(o.id), ticketId: id(o.ticketId), orderId: id(o.orderId), status: en(o.status, APPROVAL_STATUSES, '승인 상태'), reason: str(o.reason, '요청 사유', 1500), requestedBy: str(o.requestedBy, '요청자', 80), requestedAt: iso(o.requestedAt), orderVersion: integer(o.orderVersion, '주문 버전', 1), policyVersion: integer(o.policyVersion, '정책 버전', 1), amount: integer(o.amount, '승인 금액', 1, 1e8), decisionBy: str(o.decisionBy, '검토자', 80, true), decisionAt: dateOrNull(o.decisionAt, '검토일'), decisionReason: str(o.decisionReason, '검토 사유', 1500, true), executedAt: dateOrNull(o.executedAt, '실행일') }; }
function parseEvent(x: unknown): Event { const o = obj(x, '이력'); return { id: id(o.id), at: iso(o.at), actor: str(o.actor, '담당자', 80), role: en(o.role, ['agent', 'manager'], '역할'), kind: str(o.kind, '작업', 80), entityId: str(o.entityId, '대상', 100, true), detail: str(o.detail, '내용', 4000) }; }
export function parseState(x: unknown): AppState {
    const o = obj(x, '백업');
    if (o.schemaVersion !== 1)
        throw Error('지원하지 않는 백업 버전입니다. schemaVersion: 1 이 필요합니다.');
    const s: AppState = { schemaVersion: 1, revision: integer(o.revision, '자료 버전'), createdAt: iso(o.createdAt), updatedAt: iso(o.updatedAt), sourceLabel: str(o.sourceLabel, '자료 출처', 200), sourceAt: iso(o.sourceAt), orders: arr(o.orders, '주문', parseOrder), tickets: arr(o.tickets, '문의', parseTicket), approvals: arr(o.approvals, '승인', parseApproval, 4000), events: arr(o.events, '이력', parseEvent, 20000), policy: parsePolicy(o.policy), lessons: arr(o.lessons, '학습 기록', v => str(v, '학습 항목', 80), 30) };
    if (new Set(s.lessons).size !== s.lessons.length || s.lessons.some(v => !['shipping', 'cancel', 'race', 'high', 'mismatch', 'data'].includes(v)))
        throw Error('학습 기록을 확인하세요.');
    unique(s.orders, '주문');
    unique(s.tickets, '문의');
    unique(s.approvals, '승인');
    unique(s.events, '이력');
    const activeOrders = new Set<string>();
    for (const a of s.approvals) {
        const t = s.tickets.find(t => t.id === a.ticketId);
        const order = s.orders.find(t => t.id === a.orderId);
        if (!t || !order)
            throw Error('승인에 연결된 문의/주문이 없습니다.');
        if (['pending', 'approved'].includes(a.status)) {
            if (activeOrders.has(a.orderId))
                throw Error('같은 주문에 중복 활성 승인이 있습니다.');
            activeOrders.add(a.orderId);
            if (t.orderId !== a.orderId || t.status !== 'waiting_approval')
                throw Error('진행 중 승인과 문의 상태가 일치하지 않습니다.');
        }
        if (a.status === 'executed' && (!a.executedAt || order.status !== 'cancelled'))
            throw Error('실행 기록과 취소 주문이 일치하지 않습니다.');
        if (a.status !== 'pending' && !a.decisionAt)
            throw Error('검토 상태에 검토일이 없습니다.');
    }
    for (const t of s.tickets) {
        if (t.status === 'waiting_approval' && !s.approvals.some(a => a.ticketId === t.id && ['pending', 'approved'].includes(a.status)))
            throw Error('승인 대기 문의에 활성 승인이 없습니다.');
    }
    return s;
}
export function parseBackup(text: string): AppState { if (text.length > 12000000)
    throw Error('백업 파일은 12 MB 이하여야 합니다.'); let json: unknown; try {
    json = JSON.parse(text);
}
catch {
    throw Error('JSON 문법이 올바르지 않습니다. 원본 백업을 선택하세요.');
} return parseState(json); }
