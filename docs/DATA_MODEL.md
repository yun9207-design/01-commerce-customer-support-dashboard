# 데이터 모델과 상태 전이

앱 전체 자료는 `AppState`에 있다. 다음 항목은 향후 서버 테이블 후보이며 현재는 브라우저 객체 배열이다.

| 자료 | 주요 필드 | 핵심 제약 |
|---|---|---|
| Order | id, customer, email, product, amount, status, version | 금액은 원화 정수, 상태 전이 시 버전 증가 |
| Ticket | id, orderId, subject, body, type, status, assignee, draft | 주문 연결이 없을 수 있지만 취소 요청은 차단 |
| Message | body, at, by, fingerprint, mode | `mode`는 반드시 `simulated` |
| Note | body, at, by | 고객에게 보이지 않는 내부 기록 |
| Approval | orderId, ticketId, status, orderVersion, policyVersion, amount | 주문별 활성 요청 한 개, 승인·실행 분리 |
| Policy | version, allowPaid, allowPreparing, maxCancelAmount, slaHours | 저장마다 새 버전, 기존 승인과 초안 재검사 |
| Event | id, at, actor, role, kind, entityId, detail | 성공한 로컬 명령 이력. 보안 감사 원장 아님 |
| AppState | schemaVersion, revision, sourceLabel, sourceAt, lessons | 스키마 v1, 저장 변경마다 revision 증가 |

## 주문 상태

```
paid ──→ preparing ──→ shipped ──→ delivered
  └───────────────→ shipped
paid/preparing ──[검토 승인 + 재검사 + 모의 실행]──→ cancelled
```

`delivered`/`cancelled`는 최종 상태. 물류 화면에서 취소하거나 이전 단계로 되돌릴 수 없다. 새로운 테스트는 신규 시나리오로 만든다. 이 버전은 부분 취소·여러 상품별 수량·반품·환불 정산을 모델링하지 않는다.

## 승인 상태

```
pending → approved → executed
   ├──→ rejected
   └──→ blocked
approved ──[자료 변경·정책 변경·조건 불충족]──→ blocked
```

승인 요청에는 당시 주문 버전·정책 버전·금액을 저장한다. 승인 시와 실행 시 현재 값·조건을 재검사한다. `executed` 상태는 반복 실행 불가. 순수 로컬 코드의 중복 차단이며 실제 분산 시스템의 idempotency 보장이 아니다.

## 문의 상태

- 접수: open
- 최초 모의 답변: in_progress
- 취소 요청: waiting_approval
- 인계·반려·재검사 차단: escalated
- 모의 취소 실행 후: in_progress (결과 답변/해결은 상담원이 별도 수행)
- 해결: resolved; 답변 기록이 있어야 하며 활성 승인이 없어야 한다.
- 다시 열기: open, resolvedAt=null

## 초안의 근거

fingerprint = JSON 문자열 `[orderId, ticketType, requesterEmail, orderVersion, policyVersion]`.
주문·정책이 바뀌면 기존 초안을 보내지 못한다. 규칙 기반으로 다시 생성해야 한다. 내용 편집만으로 오래된 지문을 새 것으로 덮지 않는다. 동일 body+fingerprint의 중복 모의 답변을 차단한다. 이 지문은 암호학적 해시가 아니다.

## 입력과 백업 검증

- 파일: UTF-8 CSV 최대 2 MB·2,000행. JSON 최대 12 MB. TXT 안내 문구 제한 별도.
- 저장 배열: 주문/문의 각 2,000, 승인 4,000, 이력 20,000, 문의별 답변/메모 각 300.
- ID: 영문·숫자·하이픈·밑줄. 이메일 소문자 정규화. 날짜 ISO 형식과 실제 날짜/시간 검사.
- JSON: 스키마·필수 필드·자료형·중복 ID·연결 승인·실행/취소 상태의 일관성 검사. 알 수 없는 키는 복사하지 않는다.
- CSV: 기존 데이터 덮어쓰기 없음. 오류 행이 하나라도 있으면 UI 전체 반영 불가. 연결 주문 없음/불일치는 명시적인 경고.
- 백업 복원: 병합이 아닌 전체 교체. 역할·확인 문구를 거친다. 개인 백업은 Git에 올리지 않는다.

## 보고 지표

해결 비율 = 현재 해결 건수 / 선택한 접수 기간의 문의 수. 첫 응답 시간 = 최초 모의 답변 시각 - 접수 시각. 아직 답변이 없고 해결되지 않은 문의만 첫 응답 목표 초과로 집계한다. 달력 시간 기준이며 근무시간·공휴일을 반영하지 않는다. 7일 차트는 브라우저 현지 날짜 기준. 실제 고객 만족·AI 정확도·매출 효과는 수집하거나 추정하지 않는다.
