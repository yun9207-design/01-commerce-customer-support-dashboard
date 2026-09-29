# 업로드 실습 파일

모든 사람·주문·연락처는 가상이며 실제 사업 데이터가 아니다.

1. 관리자 역할 → 자료 가져오기 → 주문 자료에서 `orders.csv`를 먼저 반영한다.
2. 문의 자료에서 `tickets.csv`를 반영한다. 주문을 먼저 가져오지 않으면 ‘연결 주문 없음’ 경고가 난다.
3. 동일 파일을 다시 불러오면 중복 오류가 나고 기존 자료는 유지된다.
4. `invalid-orders.csv`는 금액 한 곳, `invalid-tickets.csv`는 이메일 한 곳이 잘못되었다. 오류가 있는 파일은 전체 반영할 수 없다.
5. `shipping-policy.txt`는 정책 화면의 배송 안내 문구로 읽어 검토한다. AI 문서 학습이나 PDF 해석 기능이 아니다.
6. `demo.backup.json`은 2026-09-29 기준 가상 초기 상태다. 이 파일만 Git에서 예외로 추적한다. 내보낸 개인 `.backup.json`은 올리지 않는다.

CSV는 UTF-8(선택적으로 BOM)이며 따옴표 안의 쉼표·줄바꿈·따옴표 이스케이프를 지원한다. Excel에서 저장할 때 ‘CSV UTF-8’을 선택한다. EUC-KR/XLSX/PDF는 지원하지 않는다.

## 주문 헤더
`id,customer,email,product,amount,status,carrier,tracking,placedAt`

상태: paid, preparing, shipped, delivered, cancelled. 금액은 29000처럼 원화 정수. 날짜는 시간대를 포함한 ISO 문자열. 파일 신규 입력은 자체 version=1이 된다.

## 문의 헤더
`id,customer,email,subject,body,orderId,type,priority,assignee`

type: shipping/cancellation/other. priority: low/normal/high. 상태·답변·이력은 CSV가 지정하지 않고 새 문의로 생성한다.
