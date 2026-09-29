import React, { useState } from 'react';
import { DataProvider, useData, Page } from './store';
import { Icon, Button, Badge } from './components/ui';
import { Dashboard } from './pages/Dashboard';
import { Tickets } from './pages/Tickets';
import { Orders } from './pages/Orders';
import { Approvals } from './pages/Approvals';
import { Policies } from './pages/Policies';
import { Imports } from './pages/Imports';
import { Reports } from './pages/Reports';
import { Learn } from './pages/Learn';
import { Settings } from './pages/Settings';
const navigation: {
    id: Page;
    label: string;
    icon: string;
}[] = [{ id: 'dashboard', label: '운영 개요', icon: 'grid' }, { id: 'tickets', label: '문의 작업대', icon: 'inbox' }, { id: 'orders', label: '주문 관리', icon: 'box' }, { id: 'approvals', label: '승인함', icon: 'shield' }, { id: 'policies', label: '정책 · 답변', icon: 'book' }, { id: 'import', label: '자료 가져오기', icon: 'upload' }, { id: 'reports', label: '리포트 · 이력', icon: 'chart' }, { id: 'learn', label: '학습 가이드', icon: 'learn' }, { id: 'settings', label: '설정 · 백업', icon: 'settings' }];
function Shell() {
    const { state, role, setRole, page, go, query, setQuery, help, setHelp, toast, storage } = useData();
    const [menu, setMenu] = useState(false);
    const pending = state.approvals.filter(a => ['pending', 'approved'].includes(a.status)).length;
    const tabs: Record<Page, React.ReactNode> = { dashboard: <Dashboard />, tickets: <Tickets />, orders: <Orders />, approvals: <Approvals />, policies: <Policies />, import: <Imports />, reports: <Reports />, learn: <Learn />, settings: <Settings /> };
    return <div className="app-shell">
 <a className="skip-link" href="#main">본문으로 이동</a>
 {menu && <button className="sidebar-backdrop" aria-label="메뉴 닫기" onClick={() => setMenu(false)}/>}
 <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
 <button className="brand" onClick={() => { go('dashboard'); setMenu(false); }}><span className="brand-mark"><Icon name="box" size={24}/></span><span>Commerce<span className="brand-sub">CS LAB</span></span></button>
 <div className="workspace-card"><div className="workspace-avatar">느</div><div><strong>{state.policy.shopName}</strong><span>가상 스토어 · 로컬 실습</span></div><Icon name="chevron" size={15}/></div>
 <div className="nav-caption">WORKSPACE</div><nav aria-label="주 메뉴">{navigation.map((n, i) => <React.Fragment key={n.id}>{i === 7 && <div className="nav-caption nav-divider">LEARN & BUILD</div>}<button className={`nav-item ${page === n.id ? 'active' : ''}`} aria-current={page === n.id ? 'page' : undefined} onClick={() => { go(n.id); setMenu(false); }}><Icon name={n.icon}/><span>{n.label}</span>{n.id === 'approvals' && pending > 0 && <b>{pending}</b>}</button></React.Fragment>)}</nav>
 <div className="sidebar-bottom"><div className="lab-number">BUSINESS MODEL <strong>01 <span>/ 30</span></strong></div><p>화면을 조작하며<br />비즈니스의 흐름을 배우세요.</p><button onClick={() => go('learn')}>실습 시나리오 열기 <Icon name="arrow" size={15}/></button></div>
 <div className="sidebar-footer"><i /> LOCAL ONLY <span>v1.0</span></div>
 </aside>
 <div className="main-shell"><header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setMenu(!menu)} aria-label="메뉴 열기"><Icon name="menu"/></button><div className="breadcrumb">실습 워크스페이스 <Icon name="chevron" size={14}/><strong>{navigation.find(x => x.id === page)?.label}</strong></div><form className="global-search" onSubmit={e => { e.preventDefault(); go('tickets'); }}><Icon name="search" size={17}/><input aria-label="전체 문의 검색" placeholder="문의 · 고객 · 주문 검색" value={query} onChange={e => setQuery(e.target.value)}/><button type="submit" aria-label="검색 실행">↵</button></form><button className={`learn-toggle ${help ? 'on' : ''}`} aria-pressed={help} onClick={() => setHelp(!help)}><Icon name="learn" size={17}/>설명 {help ? '켜짐' : '꺼짐'}</button><div className="role-control"><span className="avatar small">{role === 'manager' ? '관' : '상'}</span><label><span className="sr-only">실습 역할</span><select aria-label="실습 역할" value={role} onChange={e => setRole(e.target.value as 'agent' | 'manager')}><option value="agent">상담원</option><option value="manager">관리자</option></select><small>실제 로그인 아님</small></label></div></header>
 <div className="mode-strip"><span><Icon name="shield" size={14}/><b>로컬 실습 모드</b> 실제 고객 발송 · 주문 취소 · 환불 · AI 호출 없음</span><span className="storage-tag">{storage.mode === 'persistent' ? '브라우저 저장' : storage.mode === 'session' ? '임시 저장만 가능' : '자료 복구 필요'}</span></div>
 {storage.notice && <div className="persistent-warning" role="alert">{storage.notice}<Button onClick={() => go('settings')}>복구 · 백업</Button></div>}
 <main id="main" className="main-content" key={page}>{tabs[page]}</main><footer className="main-footer"><span>Commerce CS Lab · 가상 데이터로 배우는 고객지원</span><span>내 자료는 이 브라우저에만 저장됩니다. 정기적으로 백업하세요.</span></footer>
 </div>{toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}><Icon name={toast.error ? 'warning' : 'check'}/><span>{toast.message}</span></div>}
 </div>;
}
class ErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? <div className="fatal"><h1>화면을 다시 확인해야 합니다.</h1><p>저장 자료를 자동 삭제하지 않았습니다. 새로고침 후에도 문제가 있으면 오류 내용과 백업 파일을 개발자에게 전달하세요. 공개 저장소에 개인정보를 올리지 마세요.</p><button onClick={() => location.reload()}>새로고침</button></div> : this.props.children; }
}
export default function App() { return <ErrorBoundary><DataProvider><Shell /></DataProvider></ErrorBoundary>; }
