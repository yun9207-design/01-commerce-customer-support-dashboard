import { AppState, Ticket } from './types';
import { isOverdue } from './rules';
export function metrics(s: AppState, now = Date.now(), days = 0) {
    const tickets = days ? s.tickets.filter(t => Date.parse(t.createdAt) >= now - days * 86400000) : s.tickets;
    const resolved = tickets.filter(t => t.status === 'resolved');
    const firstReplies = tickets.filter(t => t.messages.length).map(t => Math.max(0, Date.parse(t.messages[0].at) - Date.parse(t.createdAt)) / 60000);
    return { total: tickets.length, open: tickets.length - resolved.length, resolved: resolved.length, resolutionRate: tickets.length ? Math.round(resolved.length / tickets.length * 100) : 0, overdue: tickets.filter(t => isOverdue(s, t, now)).length, firstReplyMinutes: firstReplies.length ? Math.round(firstReplies.reduce((a, b) => a + b, 0) / firstReplies.length) : null, pending: s.approvals.filter(a => a.status === 'pending').length, approved: s.approvals.filter(a => a.status === 'approved').length, executed: s.approvals.filter(a => a.status === 'executed').length, blocked: s.approvals.filter(a => a.status === 'blocked').length, tickets };
}
export function dailySeries(tickets: Ticket[], days = 7, now = new Date()) { return Array.from({ length: days }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i)); const key = localDay(d); return { key, label: `${d.getMonth() + 1}/${d.getDate()}`, arrived: tickets.filter(t => localDay(new Date(t.createdAt)) === key).length, resolved: tickets.filter(t => t.resolvedAt && localDay(new Date(t.resolvedAt)) === key).length }; }); }
function localDay(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
