import React, { useEffect, useRef } from 'react';
import { useData } from '../store';
const paths: Record<string, string> = { grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', inbox: 'M4 4h16v16H4z M4 13h5l2 3h2l2-3h5', box: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10 M7 5l10 4', shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6', book: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15', upload: 'M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5', chart: 'M4 3v18h17 M8 16v-4 M13 16V8 M18 16V5', learn: 'M2 8l10-5 10 5-10 5z M6 10v7c4 3 8 3 12 0v-7 M22 8v9', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z', search: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5', plus: 'M12 5v14 M5 12h14', arrow: 'M4 12h16 M14 6l6 6-6 6', down: 'M12 3v13 M7 11l5 5 5-5 M4 18v3h16v-3', check: 'M5 12l4 4L19 6', x: 'M5 5l14 14 M19 5L5 19', clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6l4 2', spark: 'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 10v7 M12 7v.1', lock: 'M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3', mail: 'M3 5h18v14H3z M3 5l9 8 9-8', copy: 'M8 8h12v13H8z M16 8V3H3v13h5', refresh: 'M20 8A8 8 0 1 0 21 14 M20 3v5h-5', menu: 'M4 6h16 M4 12h16 M4 18h16', chevron: 'M9 5l7 7-7 7', file: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6', warning: 'M12 3L2 21h20z M12 9v5 M12 17v.2', user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-3a8 8 0 0 1 16 0v3', link: 'M10 13l4-4 M8 15l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 6 0 M16 9l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-6 0', dot: 'M12 11v2', send: 'M3 3l19 9-19 9 4-9z M7 12h15', history: 'M4 6A9 9 0 1 1 3 14 M4 2v5h5 M12 7v6l4 2' };
export function Icon({ name, size = 20 }: {
    name: string;
    size?: number;
}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.grid}/></svg>; }
export function Button({ children, variant = 'secondary', icon, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    icon?: string;
}) { return <button type="button" {...props} className={`btn ${variant} ${className}`}>{icon && <Icon name={icon} size={17}/>}<span>{children}</span></button>; }
export function Badge({ children, tone = 'neutral' }: {
    children: React.ReactNode;
    tone?: string;
}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Status({ status, label }: {
    status: string;
    label: string;
}) { const tone: Record<string, string> = { open: 'blue', in_progress: 'teal', waiting_approval: 'amber', escalated: 'red', resolved: 'neutral', pending: 'amber', approved: 'teal', executed: 'neutral', blocked: 'red', rejected: 'red', paid: 'blue', preparing: 'amber', shipped: 'teal', delivered: 'neutral', cancelled: 'red' }; return <Badge tone={tone[status] ?? 'neutral'}>{label}</Badge>; }
export function PageHeading({ eyebrow, title, description, actions }: {
    eyebrow: string;
    title: string;
    description: string;
    actions?: React.ReactNode;
}) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{actions}</div></div>; }
export function Help({ title, children }: {
    title: string;
    children: React.ReactNode;
}) { const { help } = useData(); return help ? <aside className="help"><Icon name="learn"/><div><strong>{title}</strong><p>{children}</p></div></aside> : null; }
export function Empty({ title = '표시할 자료가 없습니다', description = '필터를 바꾸거나 새 자료를 추가해 보세요.', action }: {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}) { return <div className="empty"><div className="empty-icon"><Icon name="inbox" size={28}/></div><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function Modal({ title, children, onClose, wide = false }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    wide?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const before = document.activeElement as HTMLElement | null; const original = document.body.style.overflow; document.body.style.overflow = 'hidden'; const root = ref.current; root?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
        onClose(); if (e.key === 'Tab' && root) {
        const fs = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]')).filter(x => x.getClientRects().length);
        if (!fs.length) {
            e.preventDefault();
            return;
        }
        const first = fs[0], last = fs[fs.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === root)) {
            e.preventDefault();
            first.focus();
        }
    } }; document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); document.body.style.overflow = original; before?.focus(); }; }, []);
    return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}><div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><header><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="x"/></button></header><div className="modal-body">{children}</div></div></div>;
}
export function Field({ label, children, hint }: {
    label: string;
    children: React.ReactNode;
    hint?: string;
}) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Confirm({ title, description, onConfirm, onClose, button = '확인', danger = false }: {
    title: string;
    description: string;
    onConfirm: () => void;
    onClose: () => void;
    button?: string;
    danger?: boolean;
}) { return <Modal title={title} onClose={onClose}><p className="confirm-copy">{description}</p><div className="modal-actions"><Button onClick={onClose}>돌아가기</Button><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{button}</Button></div></Modal>; }
export function Pager({ count, page, size, onChange }: {
    count: number;
    page: number;
    size: number;
    onChange: (n: number) => void;
}) { const pages = Math.ceil(count / size); return pages > 1 ? <div className="pager"><span>{count}개 중 {page * size + 1}–{Math.min((page + 1) * size, count)}</span><Button disabled={page === 0} onClick={() => onChange(page - 1)}>이전</Button><strong>{page + 1} / {pages}</strong><Button disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>다음</Button></div> : null; }
