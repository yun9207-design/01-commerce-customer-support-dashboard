export const ORDER_STATUSES = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export const TICKET_STATUSES = ['open', 'in_progress', 'waiting_approval', 'escalated', 'resolved'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];
export const TICKET_TYPES = ['shipping', 'cancellation', 'other'] as const;
export type TicketType = typeof TICKET_TYPES[number];
export type Priority = 'low' | 'normal' | 'high';
export type Role = 'agent' | 'manager';
export type Actor = {
    role: Role;
    name: string;
};
export type Order = {
    id: string;
    customer: string;
    email: string;
    product: string;
    amount: number;
    status: OrderStatus;
    carrier: string;
    tracking: string;
    placedAt: string;
    updatedAt: string;
    version: number;
};
export type Message = {
    id: string;
    body: string;
    at: string;
    by: string;
    fingerprint: string;
    mode: 'simulated';
};
export type Note = {
    id: string;
    body: string;
    at: string;
    by: string;
};
export type Ticket = {
    id: string;
    customer: string;
    email: string;
    subject: string;
    body: string;
    orderId: string;
    type: TicketType;
    priority: Priority;
    status: TicketStatus;
    assignee: string;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    draft: string;
    draftFingerprint: string;
    messages: Message[];
    notes: Note[];
};
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'executed', 'blocked'] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];
export type Approval = {
    id: string;
    ticketId: string;
    orderId: string;
    status: ApprovalStatus;
    reason: string;
    requestedBy: string;
    requestedAt: string;
    orderVersion: number;
    policyVersion: number;
    amount: number;
    decisionBy: string;
    decisionAt: string | null;
    decisionReason: string;
    executedAt: string | null;
};
export type Policy = {
    version: number;
    allowPaid: boolean;
    allowPreparing: boolean;
    maxCancelAmount: number;
    slaHours: number;
    shippingNote: string;
    cancellationNote: string;
    shopName: string;
};
export type Event = {
    id: string;
    at: string;
    actor: string;
    role: Role;
    kind: string;
    entityId: string;
    detail: string;
};
export type AppState = {
    schemaVersion: 1;
    revision: number;
    createdAt: string;
    updatedAt: string;
    sourceLabel: string;
    sourceAt: string;
    orders: Order[];
    tickets: Ticket[];
    approvals: Approval[];
    events: Event[];
    policy: Policy;
    lessons: string[];
};
export type RuleCheck = {
    label: string;
    pass: boolean;
    detail: string;
};
export type Assessment = {
    allowed: boolean;
    title: string;
    checks: RuleCheck[];
};
export type TicketInput = Pick<Ticket, 'customer' | 'email' | 'subject' | 'body' | 'orderId' | 'type' | 'priority' | 'assignee'>;
export type Command = {
    type: 'ticket.create';
    input: TicketInput;
} | {
    type: 'ticket.link';
    id: string;
    orderId: string;
} | {
    type: 'ticket.meta';
    id: string;
    priority: Priority;
    assignee: string;
} | {
    type: 'ticket.note';
    id: string;
    body: string;
} | {
    type: 'ticket.draft';
    id: string;
    body?: string;
} | {
    type: 'ticket.send';
    id: string;
} | {
    type: 'ticket.resolve';
    id: string;
} | {
    type: 'ticket.reopen';
    id: string;
} | {
    type: 'ticket.escalate';
    id: string;
    reason: string;
} | {
    type: 'approval.request';
    ticketId: string;
    reason: string;
} | {
    type: 'approval.decide';
    id: string;
    decision: 'approved' | 'rejected';
    reason: string;
} | {
    type: 'approval.execute';
    id: string;
} | {
    type: 'order.logistics';
    id: string;
    status: OrderStatus;
    carrier: string;
    tracking: string;
} | {
    type: 'policy.update';
    policy: Omit<Policy, 'version'>;
} | {
    type: 'import.orders';
    orders: Order[];
    filename: string;
} | {
    type: 'import.tickets';
    tickets: Ticket[];
    filename: string;
} | {
    type: 'lesson.toggle';
    id: string;
} | {
    type: 'scenario.create';
    scenario: 'shipping' | 'cancel' | 'race' | 'high' | 'mismatch';
};
export const orderLabels: Record<OrderStatus, string> = { paid: '결제 완료', preparing: '상품 준비', shipped: '배송 중', delivered: '배송 완료', cancelled: '취소 완료 (모의)' };
export const ticketLabels: Record<TicketStatus, string> = { open: '새 문의', in_progress: '처리 중', waiting_approval: '승인 대기', escalated: '담당자 확인', resolved: '해결 완료' };
export const typeLabels: Record<TicketType, string> = { shipping: '배송 조회', cancellation: '취소 요청', other: '기타 문의' };
export const approvalLabels: Record<ApprovalStatus, string> = { pending: '검토 대기', approved: '승인 · 실행 전', rejected: '반려', executed: '모의 실행 완료', blocked: '재검사 차단' };
