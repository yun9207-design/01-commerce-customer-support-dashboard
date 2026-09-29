import React, { useState } from 'react';
import { useData } from '../store';
import { Button, Badge, Icon, PageHeading, Status, Help, Empty, Modal, Field, Pager } from '../components/ui';
import { Order, OrderStatus, orderLabels } from '../domain/types';
import { download, money, time } from '../lib/files';
import { toCSV, ORDER_HEADERS } from '../lib/csv';
export function Orders() {
    const { state, role, run, go } = useData();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const rows = state.orders.filter(o => (status === 'all' || o.status === status) && [o.id, o.customer, o.email, o.product, o.tracking].join(' ').toLowerCase().includes(query.toLowerCase()));
    const order = state.orders.find(o => o.id === selected);
    const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 12) - 1));
    return <>
 <PageHeading eyebrow="ORDER CONTEXT" title="주문 관리" description="답변과 취소 판단의 근거가 되는 자료입니다. 실제 쇼핑몰과 자동 동기화되지 않습니다." actions={<><Button icon="down" onClick={() => download('orders-export.csv', toCSV(ORDER_HEADERS, rows.map(o => ORDER_HEADERS.map(h => o[h as keyof Order]))), 'text/csv;charset=utf-8')}>조회 결과 CSV</Button><Button variant="primary" icon="upload" onClick={() => go('import')}>주문 가져오기</Button></>}/>
 <Help title="왜 주문 상태를 먼저 확인할까요?">같은 취소 문의라도 ‘상품 준비’와 ‘배송 중’은 처리 방법이 다릅니다. 주문을 눌러 물류 상태를 바꾸면, 이전 버전으로 작성한 답변과 승인 요청이 재검사됩니다. 이 변경은 실습 자료에만 적용됩니다.</Help>
 <div className="mini-stats">{['paid', 'preparing', 'shipped', 'cancelled'].map(k => <button key={k} onClick={() => { setStatus(k); setPage(0); }}><span>{orderLabels[k as OrderStatus]}</span><strong>{state.orders.filter(o => o.status === k).length}<small>건</small></strong></button>)}</div>
 <section className="panel"><div className="table-toolbar"><div className="input-icon"><Icon name="search" size={17}/><input aria-label="주문 검색" placeholder="주문번호 · 고객 · 상품 · 송장" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }}/></div><select aria-label="주문 상태 필터" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="all">전체 주문 상태</option>{Object.entries(orderLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><span className="muted">{rows.length}건</span></div>{rows.length ? <div className="table-wrap"><table><thead><tr><th>주문번호 / 접수일</th><th>고객</th><th>상품</th><th className="number">금액</th><th>상태</th><th>버전</th><th><span className="sr-only">상세</span></th></tr></thead><tbody>{rows.slice(currentPage * 12, currentPage * 12 + 12).map(o => <tr key={o.id}><td><button className="text-link" onClick={() => setSelected(o.id)}>{o.id}</button><small>{time(o.placedAt)}</small></td><td>{o.customer}<small>{o.email}</small></td><td>{o.product}</td><td className="number">{money(o.amount)}</td><td><Status status={o.status} label={orderLabels[o.status]}/></td><td><code>v{o.version}</code></td><td><Button variant="ghost" onClick={() => setSelected(o.id)}>상세</Button></td></tr>)}</tbody></table></div> : <Empty />}<Pager count={rows.length} page={currentPage} size={12} onChange={setPage}/></section>
 {order && <OrderModal order={order} onClose={() => setSelected(null)}/>}</>;
}
function OrderModal({ order: o, onClose }: {
    order: Order;
    onClose: () => void;
}) {
    const { state, role, run, go } = useData();
    const next: Record<string, OrderStatus[]> = { paid: ['preparing', 'shipped'], preparing: ['shipped'], shipped: ['delivered'], delivered: [], cancelled: [] };
    const [status, setStatus] = useState<OrderStatus>(next[o.status][0] ?? o.status);
    const [carrier, setCarrier] = useState(o.carrier || '가상택배');
    const [tracking, setTracking] = useState(o.tracking);
    const linked = state.tickets.filter(t => t.orderId === o.id);
    return <Modal title={`주문 ${o.id}`} onClose={onClose} wide><div className="order-modal-top"><div className="product-symbol"><Icon name="box" size={32}/></div><div><h2>{o.product}</h2><p>{o.customer} · {money(o.amount)}</p></div><Status status={o.status} label={orderLabels[o.status]}/></div><div className="key-value-grid"><div><span>주문자 이메일</span><strong>{o.email}</strong></div><div><span>주문 자료 버전</span><strong>v{o.version}</strong></div><div><span>택배사 / 송장번호</span><strong>{o.carrier || '미등록'} / {o.tracking || '미등록'}</strong></div><div><span>자료 갱신 시점</span><strong>{time(o.updatedAt)}</strong></div></div><h3>연결된 문의</h3>{linked.length ? <div className="pill-links">{linked.map(t => <Button key={t.id} onClick={() => { onClose(); go('tickets', t.id); }}>{t.subject}</Button>)}</div> : <p className="muted">연결된 문의가 없습니다.</p>}
 <div className="divider"/><h3>물류 상태 변경 실습</h3><p className="muted">실제 배송정보를 가져온 상황을 재현합니다. 상태를 뒤로 되돌리거나 취소 상태를 직접 입력할 수 없습니다.</p>{role !== 'manager' && <div className="notice"><Icon name="lock"/>상단의 실습 역할을 ‘관리자’로 바꾸면 수정할 수 있습니다.</div>}{next[o.status].length ? <form onSubmit={e => { e.preventDefault(); if (run({ type: 'order.logistics', id: o.id, status, carrier, tracking }))
        onClose(); }}><div className="form-grid"><Field label="다음 상태"><select value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>{next[o.status].map(v => <option key={v} value={v}>{orderLabels[v]}</option>)}</select></Field><Field label="택배사"><input value={carrier} maxLength={80} onChange={e => setCarrier(e.target.value)} required={status === 'shipped'}/></Field><Field label="송장번호" hint="배송 중으로 전환할 때 필수입니다."><input value={tracking} maxLength={100} onChange={e => setTracking(e.target.value)} required={status === 'shipped'} placeholder="DEMO-12345"/></Field></div><div className="notice amber"><Icon name="warning"/>진행 중인 취소 승인이 있다면 주문 버전 변경 때문에 실행이 차단됩니다.</div><div className="modal-actions"><Button onClick={onClose}>닫기</Button><Button type="submit" variant="primary" disabled={role !== 'manager'}>실습 주문 상태 변경</Button></div></form> : <div className="notice"><Icon name="check"/>최종 상태입니다. 새 상황은 다른 샘플 주문이나 신규 CSV로 연습하세요.</div>}</Modal>;
}
