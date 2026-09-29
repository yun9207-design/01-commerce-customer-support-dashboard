import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Command, Role } from './domain/types';
import { applyCommand } from './domain/engine';
import { browserRepository, LoadResult, STORAGE_KEY } from './lib/repository';
import { makeSeed } from './data/seed';
export type Page = 'dashboard' | 'tickets' | 'orders' | 'approvals' | 'policies' | 'import' | 'reports' | 'learn' | 'settings';
type Toast = {
    message: string;
    error: boolean;
} | null;
type Context = {
    state: AppState;
    role: Role;
    setRole: (role: Role) => void;
    run: (c: Command) => boolean;
    page: Page;
    go: (page: Page, id?: string) => void;
    selectedId: string;
    select: (id: string) => void;
    query: string;
    setQuery: (q: string) => void;
    help: boolean;
    setHelp: (b: boolean) => void;
    toast: Toast;
    notify: (s: string, error?: boolean) => void;
    storage: LoadResult;
    replace: (s: AppState) => boolean;
    reset: () => boolean;
    raw: () => string | null;
    now: number;
};
const DataContext = createContext<Context | null>(null);
export function DataProvider({ children }: {
    children: React.ReactNode;
}) {
    const repo = useRef(browserRepository());
    const initial = useRef<LoadResult | null>(null);
    if (!initial.current)
        initial.current = repo.current.load();
    const [storage, setStorage] = useState(initial.current);
    const [state, setState] = useState(initial.current.state);
    const current = useRef(state);
    current.current = state;
    const [role, setRole] = useState<Role>('agent');
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedId, select] = useState('T-2001');
    const [query, setQuery] = useState('');
    const [help, setHelp] = useState(true);
    const [toast, setToast] = useState<Toast>(null);
    const [now, setNow] = useState(Date.now());
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    function notify(message: string, error = false) { setToast({ message, error }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 7000); }
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
    useEffect(() => { function onStorage(e: StorageEvent) { if (e.key === STORAGE_KEY)
        notify('다른 탭에서 자료가 변경되었습니다. 저장 충돌 방지를 위해 새로고침 후 계속하세요.', true); } window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage); }, []);
    function run(c: Command) { try {
        const next = applyCommand(current.current, c, { role, name: role === 'manager' ? '관리자' : '상담원 지수' });
        repo.current.save(next);
        current.current = next;
        setState(next);
        if (c.type === 'ticket.create' || c.type === 'scenario.create') {
            select(next.tickets[0].id);
            setQuery('');
        }
        notify(next.events[0].detail);
        return true;
    }
    catch (e) {
        notify((e as Error).message, true);
        return false;
    } }
    function go(p: Page, id?: string) { setPage(p); if (id)
        select(id); if (p !== 'tickets')
        setQuery(''); window.scrollTo({ top: 0, behavior: 'instant' }); }
    function replace(s: AppState) { try {
        if (role !== 'manager')
            throw Error('자료 복원/초기화는 관리자 역할에서 실행하세요.');
        repo.current.replace(s);
        const loaded = repo.current.load();
        current.current = loaded.state;
        setState(loaded.state);
        setStorage(loaded);
        select(loaded.state.tickets[0]?.id ?? '');
        notify('전체 자료를 교체했습니다. 이 브라우저에만 반영됩니다.');
        return true;
    }
    catch (e) {
        notify((e as Error).message, true);
        return false;
    } }
    return <DataContext.Provider value={{ state, role, setRole, run, page, go, selectedId, select, query, setQuery, help, setHelp, toast, notify, storage, replace, reset: () => replace(makeSeed()), raw: () => repo.current.raw(), now }}>{children}</DataContext.Provider>;
}
export function useData() { const c = useContext(DataContext); if (!c)
    throw Error('DataProvider가 필요합니다.'); return c; }
