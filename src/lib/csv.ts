import { AppState, Order, Ticket } from '../domain/types';
import { parseOrder, parseTicket } from '../domain/validation';
export const ORDER_HEADERS = ['id', 'customer', 'email', 'product', 'amount', 'status', 'carrier', 'tracking', 'placedAt'];
export const TICKET_HEADERS = ['id', 'customer', 'email', 'subject', 'body', 'orderId', 'type', 'priority', 'assignee'];
export const MAX_CSV_BYTES = 2000000;
export type ImportKind = 'orders' | 'tickets';
export type Issue = {
    row: number;
    field: string;
    message: string;
    severity: 'error' | 'warning';
};
export type ImportPreview = {
    kind: ImportKind;
    total: number;
    orders: Order[];
    tickets: Ticket[];
    issues: Issue[];
    headers: string[];
    rows: string[][];
};
// RFC-style quoted fields, embedded line breaks, CRLF and UTF-8 BOM. No execution of file contents.
export function parseCSV(text: string): string[][] {
    if (new TextEncoder().encode(text).byteLength > MAX_CSV_BYTES)
        throw Error('CSV 파일은 2 MB 이하여야 합니다.');
    const src = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    let closed = false;
    const flush = () => { row.push(field); field = ''; closed = false; };
    const line = () => { flush(); if (row.some(c => c !== ''))
        rows.push(row); row = []; if (rows.length > 2001)
        throw Error('CSV는 머리글을 제외하고 2,000행까지 허용합니다.'); };
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (quoted) {
            if (c === '"') {
                if (src[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                field += c;
            continue;
        }
        if (c === ',') {
            flush();
            continue;
        }
        if (c === '\n') {
            line();
            continue;
        }
        if (closed) {
            if (c === ' ' || c === '\t')
                continue;
            throw Error('닫는 따옴표 뒤에는 쉼표 또는 줄바꿈이 필요합니다.');
        }
        if (c === '"') {
            if (field.length)
                throw Error('따옴표는 필드 맨 앞에서 시작해야 합니다.');
            quoted = true;
        }
        else
            field += c;
    }
    if (quoted)
        throw Error('닫히지 않은 따옴표가 있습니다.');
    if (field || row.length || closed)
        line();
    return rows;
}
export function previewCSV(text: string, kind: ImportKind, state: AppState, now = new Date().toISOString()): ImportPreview {
    const p: ImportPreview = { kind, total: 0, orders: [], tickets: [], issues: [], headers: [], rows: [] };
    let all: string[][];
    try {
        all = parseCSV(text);
    }
    catch (e) {
        p.issues.push({ row: 0, field: '파일', message: (e as Error).message, severity: 'error' });
        return p;
    }
    if (all.length < 2) {
        p.issues.push({ row: 1, field: '파일', message: '머리글과 최소 1개의 자료 행이 필요합니다.', severity: 'error' });
        return p;
    }
    p.headers = all[0].map(h => h.trim());
    p.rows = all.slice(1);
    p.total = p.rows.length;
    const required = kind === 'orders' ? ORDER_HEADERS : TICKET_HEADERS;
    if (new Set(p.headers).size !== p.headers.length)
        p.issues.push({ row: 1, field: '머리글', message: '중복된 열 이름이 있습니다.', severity: 'error' });
    for (const key of required)
        if (!p.headers.includes(key))
            p.issues.push({ row: 1, field: key, message: `필수 열 ${key}가 없습니다. 샘플 양식을 사용하세요.`, severity: 'error' });
    for (const key of p.headers)
        if (!required.includes(key))
            p.issues.push({ row: 1, field: key, message: '사용하지 않는 추가 열입니다.', severity: 'warning' });
    if (p.issues.some(i => i.severity === 'error'))
        return p;
    const ids = new Set((kind === 'orders' ? state.orders : state.tickets).map(x => x.id));
    for (let idx = 0; idx < p.rows.length; idx++) {
        const cells = p.rows[idx];
        if (cells.length !== p.headers.length) {
            p.issues.push({ row: idx + 2, field: '열 수', message: `${p.headers.length}열이 필요하지만 ${cells.length}열입니다.`, severity: 'error' });
            continue;
        }
        const o = Object.fromEntries(p.headers.map((h, i) => [h, cells[i].trim()]));
        try {
            if (ids.has(o.id))
                throw Error(`중복 번호 ${o.id}. 기존 자료나 같은 파일 안의 번호와 겹칩니다.`);
            ids.add(o.id);
            if (kind === 'orders') {
                if (!/^\d+$/.test(o.amount))
                    throw Error('amount: 쉼표 없는 양의 정수 원화 금액을 입력하세요.');
                const order = parseOrder({ ...o, amount: Number(o.amount), updatedAt: now, version: 1 });
                p.orders.push(order);
                if (['shipped', 'delivered'].includes(order.status) && (!order.carrier || !order.tracking))
                    p.issues.push({ row: idx + 2, field: 'tracking', message: '배송 상태이지만 택배사/송장이 없습니다. 초안에 임의로 생성하지 않습니다.', severity: 'warning' });
            }
            else {
                const ticket = parseTicket({ ...o, status: 'open', createdAt: now, updatedAt: now, resolvedAt: null, draft: '', draftFingerprint: '', messages: [], notes: [] });
                p.tickets.push(ticket);
                const order = state.orders.find(x => x.id === ticket.orderId);
                if (!order)
                    p.issues.push({ row: idx + 2, field: 'orderId', message: '연결 주문 없음. 자료 반영은 가능하지만 취소 검토는 차단됩니다.', severity: 'warning' });
                else if (order.email !== ticket.email)
                    p.issues.push({ row: idx + 2, field: 'email', message: '주문자 이메일 불일치. 민감한 주문 안내/취소가 제한됩니다.', severity: 'warning' });
            }
        }
        catch (e) {
            p.issues.push({ row: idx + 2, field: '검사', message: (e as Error).message, severity: 'error' });
        }
    }
    if ((kind === 'orders' ? state.orders.length : state.tickets.length) + p.total > 2000)
        p.issues.push({ row: 0, field: '한도', message: '반영 후 2,000개를 초과합니다.', severity: 'error' });
    return p;
}
export function toCSV(headers: string[], rows: unknown[][]): string {
    const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[\s]*[=+@-]/.test(s))
        s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    return '\uFEFF' + [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
}
export function sampleCSV(kind: ImportKind, invalid = false, now = new Date().toISOString()): string {
    if (kind === 'orders')
        return toCSV(ORDER_HEADERS, [['IMPORT-101', '가상 고객 하나', 'import1@example.com', '샘플 파우치', 29000, 'preparing', '', '', now], ['IMPORT-102', '가상 고객 둘', 'import2@example.com', '샘플 무드등', invalid ? '금액오류' : 56000, 'shipped', '가상택배', 'DEMO-IMPORT-102', now]]);
    return toCSV(TICKET_HEADERS, [['IMPORT-T101', '가상 고객 하나', 'import1@example.com', '출고 전 취소 문의', '아직 출고 전이면 취소하고 싶어요.', 'IMPORT-101', 'cancellation', 'high', '상담원 지수'], ['IMPORT-T102', '가상 고객 둘', invalid ? '이메일오류' : 'import2@example.com', '배송 위치 문의', '배송 진행 상황을 알려주세요.', 'IMPORT-102', 'shipping', 'normal', '상담원 민지']]);
}
