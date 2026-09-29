import { AppState, Command, Actor, Ticket, Approval, ORDER_STATUSES } from './types';
import { parseOrder, parseTicket, parsePolicy, email } from './validation';
import { assessCancellation, fingerprint, draftReply } from './rules';
export type Runtime = {
    now: () => string;
    id: (prefix: string) => string;
};
export const runtime: Runtime = { now: () => new Date().toISOString(), id: p => `${p}-${globalThis.crypto?.randomUUID?.() ?? (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12))}` };
function text(s: string, label: string, max = 2000) { if (typeof s !== 'string' || !s.trim() || s.length > max)
    throw Error(`${label}: 1~${max}자를 입력하세요.`); return s.trim(); }
function manager(a: Actor) { if (a.role !== 'manager')
    throw Error('관리자 역할에서 실행하세요. 역할 전환은 학습용이며 실제 인증이 아닙니다.'); }
function ticket(s: AppState, id: string) { const t = s.tickets.find(t => t.id === id); if (!t)
    throw Error('문의가 없습니다.'); return t; }
function approval(s: AppState, id: string) { const a = s.approvals.find(a => a.id === id); if (!a)
    throw Error('승인 요청이 없습니다.'); return a; }
function active(s: AppState, t: Ticket) { return s.approvals.some(a => a.ticketId === t.id && ['pending', 'approved'].includes(a.status)); }
function editable(t: Ticket) { if (t.status === 'resolved')
    throw Error('해결된 문의입니다. 다시 열기 후 수정하세요.'); }
export function applyCommand(input: AppState, c: Command, actor: Actor, r: Runtime = runtime): AppState {
    // Pure domain transaction: mutate only the cloned candidate; rejected commands never alter input.
    const s = structuredClone(input);
    const now = r.now();
    let entity = '';
    let detail = '';
    const touch = (t: Ticket) => { t.updatedAt = now; };
    const stale = (a: Approval) => { const t = ticket(s, a.ticketId); const o = s.orders.find(o => o.id === a.orderId); return !o || o.version !== a.orderVersion || s.policy.version !== a.policyVersion || o.amount !== a.amount || !assessCancellation(s, t).allowed; };
    const block = (a: Approval) => { a.status = 'blocked'; a.decisionAt = now; a.decisionBy = actor.name; a.decisionReason = '요청 후 주문 또는 정책이 변경되었습니다. 최신 조건으로 다시 요청하세요.'; const t = ticket(s, a.ticketId); t.status = 'escalated'; touch(t); detail = a.decisionReason; };
    switch (c.type) {
        case 'ticket.create': {
            const i = c.input;
            email(i.email);
            const t = parseTicket({ ...i, id: r.id('T'), status: 'open', createdAt: now, updatedAt: now, resolvedAt: null, draft: '', draftFingerprint: '', messages: [], notes: [] });
            if (s.tickets.length >= 2000)
                throw Error('실습 한도: 문의 2,000개. 백업 후 자료를 정리하세요.');
            s.tickets.unshift(t);
            entity = t.id;
            detail = `문의 접수 · ${t.subject}`;
            break;
        }
        case 'ticket.link': {
            const t = ticket(s, c.id);
            editable(t);
            if (active(s, t))
                throw Error('진행 중 승인 검토를 종료한 뒤 주문 연결을 변경하세요.');
            if (c.orderId) {
                const o = s.orders.find(o => o.id === c.orderId);
                if (!o)
                    throw Error('주문을 찾을 수 없습니다.');
                if (o.email !== t.email)
                    throw Error('문의자와 주문자 이메일이 일치하지 않습니다.');
            }
            t.orderId = c.orderId;
            touch(t);
            entity = t.id;
            detail = `주문 연결 ${c.orderId || '해제'} · 기존 초안은 재검토 필요`;
            break;
        }
        case 'ticket.meta': {
            const t = ticket(s, c.id);
            if (!['low', 'normal', 'high'].includes(c.priority))
                throw Error('우선순위 값이 잘못되었습니다.');
            t.priority = c.priority;
            t.assignee = text(c.assignee, '담당자', 80);
            touch(t);
            entity = t.id;
            detail = `담당 ${t.assignee} / 우선순위 ${t.priority}`;
            break;
        }
        case 'ticket.note': {
            const t = ticket(s, c.id);
            if (t.notes.length >= 300)
                throw Error('문의별 메모 한도 300개입니다.');
            t.notes.push({ id: r.id('N'), body: text(c.body, '메모'), at: now, by: actor.name });
            touch(t);
            entity = t.id;
            detail = '내부 메모 추가 (고객에게 발송하지 않음)';
            break;
        }
        case 'ticket.draft': {
            const t = ticket(s, c.id);
            editable(t);
            t.draft = c.body === undefined ? draftReply(s, t) : text(c.body, '답변 초안', 6000);
            if (c.body === undefined || !t.draftFingerprint)
                t.draftFingerprint = fingerprint(s, t);
            touch(t);
            entity = t.id;
            detail = c.body === undefined ? '주문·정책을 읽어 규칙 기반 초안 생성 (AI 미연결)' : '초안 편집 저장';
            break;
        }
        case 'ticket.send': {
            const t = ticket(s, c.id);
            editable(t);
            text(t.draft, '답변 초안', 6000);
            if (t.draftFingerprint !== fingerprint(s, t))
                throw Error('주문 또는 정책이 변경되어 초안이 오래되었습니다. 최신 근거로 초안을 다시 생성하세요.');
            if (t.messages.some(m => m.body === t.draft && m.fingerprint === t.draftFingerprint))
                throw Error('동일한 답변이 이미 모의 발송되었습니다. 중복 기록을 막았습니다.');
            if (t.messages.length >= 300)
                throw Error('문의별 답변 한도 300개입니다.');
            t.messages.push({ id: r.id('M'), body: t.draft, at: now, by: actor.name, fingerprint: t.draftFingerprint, mode: 'simulated' });
            if (t.status === 'open')
                t.status = 'in_progress';
            touch(t);
            entity = t.id;
            detail = '모의 답변 기록 · 이메일/문자는 실제로 발송되지 않음';
            break;
        }
        case 'ticket.resolve': {
            const t = ticket(s, c.id);
            editable(t);
            if (active(s, t))
                throw Error('진행 중 승인 절차를 먼저 마무리하세요.');
            if (!t.messages.length)
                throw Error('모의 답변을 한 번 이상 기록한 뒤 해결 처리하세요.');
            t.status = 'resolved';
            t.resolvedAt = now;
            touch(t);
            entity = t.id;
            detail = '문의 해결 완료';
            break;
        }
        case 'ticket.reopen': {
            const t = ticket(s, c.id);
            if (t.status !== 'resolved')
                throw Error('해결된 문의만 다시 열 수 있습니다.');
            t.status = 'open';
            t.resolvedAt = null;
            touch(t);
            entity = t.id;
            detail = '문의 다시 열기';
            break;
        }
        case 'ticket.escalate': {
            const t = ticket(s, c.id);
            editable(t);
            if (active(s, t))
                throw Error('진행 중 승인을 먼저 처리하세요.');
            if (t.notes.length >= 300)
                throw Error('문의별 메모 한도 300개입니다.');
            const reason = text(c.reason, '인계 사유', 1500);
            t.status = 'escalated';
            t.notes.push({ id: r.id('N'), body: `담당자 인계: ${reason}`, at: now, by: actor.name });
            touch(t);
            entity = t.id;
            detail = `담당자 확인으로 전환: ${reason}`;
            break;
        }
        case 'approval.request': {
            if (s.approvals.length >= 4000)
                throw Error('승인 한도 4,000개입니다. 백업 후 정리하세요.');
            const t = ticket(s, c.ticketId);
            editable(t);
            const evaluation = assessCancellation(s, t);
            if (!evaluation.allowed)
                throw Error(evaluation.checks.filter(x => !x.pass).map(x => x.detail).join(' / '));
            if (s.approvals.some(a => a.orderId === t.orderId && ['pending', 'approved'].includes(a.status)))
                throw Error('이 주문에는 이미 진행 중인 취소 승인이 있습니다.');
            const o = s.orders.find(o => o.id === t.orderId)!;
            const a: Approval = { id: r.id('A'), ticketId: t.id, orderId: o.id, status: 'pending', reason: text(c.reason, '요청 사유', 1500), requestedBy: actor.name, requestedAt: now, orderVersion: o.version, policyVersion: s.policy.version, amount: o.amount, decisionBy: '', decisionAt: null, decisionReason: '', executedAt: null };
            s.approvals.unshift(a);
            t.status = 'waiting_approval';
            touch(t);
            entity = a.id;
            detail = `${o.id} 취소 승인 요청 · ${o.amount.toLocaleString()}원 · 아직 실행 안 됨`;
            break;
        }
        case 'approval.decide': {
            manager(actor);
            const a = approval(s, c.id);
            if (a.status !== 'pending')
                throw Error('검토 대기 상태에서만 승인/반려할 수 있습니다.');
            if (!['approved', 'rejected'].includes(c.decision))
                throw Error('검토 결과가 올바르지 않습니다.');
            text(c.reason, '검토 사유', 1500);
            entity = a.id;
            if (c.decision === 'approved' && stale(a)) {
                block(a);
                break;
            }
            a.status = c.decision;
            a.decisionBy = actor.name;
            a.decisionAt = now;
            a.decisionReason = c.reason.trim();
            if (c.decision === 'rejected') {
                const t = ticket(s, a.ticketId);
                t.status = 'escalated';
                touch(t);
            }
            detail = c.decision === 'approved' ? '검토 승인 · 모의 실행은 별도 버튼에서 진행' : `반려: ${c.reason}`;
            break;
        }
        case 'approval.execute': {
            manager(actor);
            const a = approval(s, c.id);
            if (a.status !== 'approved')
                throw Error('승인된 요청만 실행할 수 있습니다. 이미 실행된 요청은 재실행할 수 없습니다.');
            entity = a.id;
            if (stale(a)) {
                block(a);
                break;
            }
            const o = s.orders.find(o => o.id === a.orderId)!;
            o.status = 'cancelled';
            o.version++;
            o.updatedAt = now;
            a.status = 'executed';
            a.executedAt = now;
            const t = ticket(s, a.ticketId);
            t.status = 'in_progress';
            touch(t);
            detail = `${o.id} 모의 취소 완료 · 실제 주문/결제/환불은 변경하지 않음`;
            break;
        }
        case 'order.logistics': {
            manager(actor);
            const o = s.orders.find(o => o.id === c.id);
            if (!o)
                throw Error('주문이 없습니다.');
            const next: Record<string, string[]> = { paid: ['preparing', 'shipped'], preparing: ['shipped'], shipped: ['delivered'], delivered: [], cancelled: [] };
            if (!ORDER_STATUSES.includes(c.status) || !next[o.status].includes(c.status))
                throw Error('허용되지 않는 물류 상태 전환입니다. 취소는 승인함에서만 실행하세요.');
            if (c.status === 'shipped' && (!c.carrier.trim() || !c.tracking.trim()))
                throw Error('배송 중으로 바꾸려면 택배사와 송장번호가 필요합니다.');
            o.status = c.status;
            o.carrier = c.carrier.trim();
            o.tracking = c.tracking.trim();
            o.version++;
            o.updatedAt = now;
            parseOrder(o);
            entity = o.id;
            detail = `물류 상태 변경 실습: ${c.status} · 주문 v${o.version} · 기존 승인/초안 재검사 대상`;
            break;
        }
        case 'policy.update': {
            manager(actor);
            s.policy = parsePolicy({ ...c.policy, version: s.policy.version + 1 });
            entity = 'POLICY';
            detail = `학습 정책 v${s.policy.version} 저장 · 진행 중 승인과 기존 초안은 최신 조건 재검사`;
            break;
        }
        case 'import.orders': {
            manager(actor);
            if (s.orders.length + c.orders.length > 2000)
                throw Error('주문 한도 2,000개입니다.');
            const ids = new Set(s.orders.map(o => o.id));
            const incoming = c.orders.map(parseOrder);
            for (const o of incoming) {
                if (ids.has(o.id))
                    throw Error(`중복 주문번호 ${o.id}. 기존 자료는 덮어쓰지 않습니다.`);
                ids.add(o.id);
                if (o.version !== 1)
                    throw Error('신규 주문 버전은 1이어야 합니다.');
            }
            if (!incoming.length)
                throw Error('반영할 주문이 없습니다.');
            s.orders.unshift(...incoming);
            s.sourceLabel = text(c.filename, '파일명', 200);
            s.sourceAt = now;
            entity = 'IMPORT';
            detail = `주문 CSV 신규 ${incoming.length}개 반영 · 기존 자료 보존`;
            break;
        }
        case 'import.tickets': {
            manager(actor);
            if (s.tickets.length + c.tickets.length > 2000)
                throw Error('문의 한도 2,000개입니다.');
            const ids = new Set(s.tickets.map(o => o.id));
            const incoming = c.tickets.map(parseTicket);
            for (const t of incoming) {
                if (ids.has(t.id))
                    throw Error(`중복 문의번호 ${t.id}. 기존 자료는 덮어쓰지 않습니다.`);
                ids.add(t.id);
                if (t.status !== 'open' || t.messages.length || t.notes.length)
                    throw Error('CSV 문의는 이력 없는 새 문의여야 합니다.');
            }
            if (!incoming.length)
                throw Error('반영할 문의가 없습니다.');
            s.tickets.unshift(...incoming);
            s.sourceLabel = text(c.filename, '파일명', 200);
            s.sourceAt = now;
            entity = 'IMPORT';
            detail = `문의 CSV 신규 ${incoming.length}개 반영`;
            break;
        }
        case 'scenario.create': {
            if (s.orders.length >= 2000 || s.tickets.length >= 2000)
                throw Error('실습 자료 한도에 도달했습니다. 백업 후 정리하세요.');
            const names = { shipping: '배송 상태 문의', cancel: '출고 전 취소', race: '승인 뒤 출고 예외', high: '고액 주문 취소', mismatch: '문의자 정보 불일치' };
            if (!Object.hasOwn(names, c.scenario))
                throw Error('알 수 없는 시나리오입니다.');
            const oid = r.id('LAB-O'), tid = r.id('LAB-T');
            const cancellation = c.scenario !== 'shipping';
            const order = parseOrder({ id: oid, customer: '연습 고객 (가상)', email: 'practice@example.com', product: `실습 상품 · ${names[c.scenario]}`, amount: c.scenario === 'high' ? 990000 : 39000, status: c.scenario === 'shipping' ? 'shipped' : 'preparing', carrier: c.scenario === 'shipping' ? '가상택배' : '', tracking: c.scenario === 'shipping' ? 'DEMO-PRACTICE-01' : '', placedAt: now, updatedAt: now, version: 1 });
            const t = parseTicket({ id: tid, customer: '연습 고객 (가상)', email: c.scenario === 'mismatch' ? 'different@example.com' : 'practice@example.com', subject: names[c.scenario], body: cancellation ? '주문한 상품이 출고 전이면 취소하고 싶습니다.' : '주문한 상품의 배송 상태를 알려주세요.', orderId: oid, type: cancellation ? 'cancellation' : 'shipping', priority: 'normal', status: 'open', assignee: '상담원 지수', createdAt: now, updatedAt: now, resolvedAt: null, draft: '', draftFingerprint: '', messages: [], notes: [] });
            s.orders.unshift(order);
            s.tickets.unshift(t);
            entity = tid;
            detail = `새 연습 자료 생성: ${names[c.scenario]} · 기존 자료는 유지`;
            break;
        }
        case 'lesson.toggle': {
            if (!['shipping', 'cancel', 'race', 'high', 'mismatch', 'data'].includes(c.id))
                throw Error('알 수 없는 학습 항목입니다.');
            text(c.id, '학습 항목', 80);
            if (s.lessons.includes(c.id))
                s.lessons = s.lessons.filter(i => i !== c.id);
            else {
                if (s.lessons.length >= 30)
                    throw Error('학습 기록 한도입니다.');
                s.lessons.push(c.id);
            }
            entity = c.id;
            detail = '학습 체크 변경';
            break;
        }
        default: throw Error('지원하지 않는 작업입니다.');
    }
    if (s.events.length >= 20000)
        throw Error('실습 이력이 20,000개에 도달했습니다. 백업 후 초기화하세요.');
    s.events.unshift({ id: r.id('E'), at: now, actor: actor.name, role: actor.role, kind: c.type, entityId: entity, detail });
    s.revision = input.revision + 1;
    s.updatedAt = now;
    return s;
}
