# 구조와 개발 지도

## 상태 변경 경로

화면 → `store.run(command)` → `applyCommand` → 후보 상태 → `repository.save` → 저장 성공 후 화면 반영

업무 엔진은 원본을 바꾸지 않고 복제본에만 변경을 적용한다. 검증 실패 시 원본은 그대로다. 저장 실패 시 화면 상태도 반영하지 않는다. 이는 로컬 단일 탭 설계이며 서버 데이터베이스 트랜잭션이나 다중 사용자 원자성을 의미하지 않는다.

## 파일별 책임

| 경로 | 책임 |
|---|---|
| src/App.tsx | 네비게이션, 역할·모드 표시, 전역 검색, 오류 경계 |
| src/store.tsx | React 상태, 저장 호출, 화면 이동·안내 |
| src/domain/types.ts | 자료 구조와 명령 종류 |
| src/domain/engine.ts | 상태 전이·검증·감사 이력 |
| src/domain/rules.ts | 취소 판단, 답변 양식, 초안 근거 지문, 응답 목표 |
| src/domain/validation.ts | JSON/자료 경계 검증·정규화 |
| src/domain/metrics.ts | 실자료 지표와 최근 7일 집계 |
| src/data/seed.ts | 가상 자료 12+12. 현재 시각 기준 상대 날짜 |
| src/lib/csv.ts | CSV 파싱, 미리보기, 오류/경고, 내보내기 보호 |
| src/lib/repository.ts | localStorage 어댑터, 임시 모드, 원본 보호·충돌 감지 |
| src/lib/files.ts | 사용자가 선택한 파일 읽기, 내려받기, 클립보드 대안 |
| src/pages/* | 9개 업무/학습 화면 |
| src/components/ui.tsx | 공통 UI, 모달 초점·Escape, 페이지 이동 |
| src/styles.css | 자체 반응형 디자인. 외부 폰트나 이미지 요청 없음 |
| scripts/build.mjs | 단일 HTML 생성용 빌더 |
| scripts/serve.mjs | 로컬 프리뷰 서버. 백엔드 업무 API 아님 |
| scripts/test.mjs | TS 업무 코드를 임시 CJS로 변환해 Node 테스트 실행 |

## 로컬 저장 규약

- 키: `commerce-cs-lab:state:v1`; 스키마 버전과 자료 revision은 별개다.
- 저장 불가: session mode. 마지막 HTML을 다른 컴퓨터로 옮겨도 작업 자료는 따라가지 않는다.
- 손상: 복구 모드에서 원본 보존, 일반 쓰기 차단. 원본 내려받기 후 명시적 복원 또는 초기화.
- 다른 탭: 마지막 읽은 문자열과 현재 저장 문자열 비교. 오래된 쓰기를 감지하지만 compare-and-set이나 원자적 잠금은 아니다. **단일 탭만 지원**.
- 용량: 허용 레코드 수 이내라도 텍스트 길이와 브라우저에 따라 저장 한도에 먼저 도달할 수 있다. 레코드 한도는 저장 용량 보장이 아니다.
- 백업은 암호화·서명되지 않은 개인 파일이다. 무결성 검사는 구조 일관성 검사이지 위변조 방지가 아니다.

## 두 빌드 경로

### A. 제공된 오프라인 프리뷰 (`npm run build`)

TypeScript 5.8.3의 `transpileModule`이 소스를 CommonJS로 변환한다. 작은 로더가 상대 모듈, React, ReactDOM/client, 인라인 CSS를 묶는다. vendor 런타임은 React/ReactDOM 19.1.1. 빌드 결과는 원격 요청 없이 실행된다.

**지원:** 현재 TS/TSX 상대 import, 단일 CSS, React, ReactDOM/client.  
**미지원:** 임의 npm 패키지 import, 이미지/폰트 import, 동적 import/코드 분할, 서버 렌더링, Vite 플러그인, 환경변수 변환. 외부 패키지를 추가하면 빌더를 확장하거나 Vite 기반의 단일 파일 출력으로 이전해야 한다. 소스를 검토 없이 확장하지 말 것.

이 명령은 전체 정적 타입 검사가 아니다. `typecheck`를 별도로 실행한다. 런타임 외부 파일을 새로 추가했으면 offline 여부도 다시 시험한다.

### B. 표준 개발 및 Vite 빌드

`npm run dev`는 Vite 개발 서버, `npm run build:vite`는 `dist-vite/`로 출력한다. 설치된 React 패키지를 쓴다. React Fast Refresh 플러그인은 포함하지 않았으며 변경 시 전체 새로고침이 일어날 수 있다. 저장 전 편집 중인 초안이 날아갈 수 있으므로 먼저 저장할 것.

React 런타임 업데이트는 package.json과 vendor를 함께 고려해야 한다. 현재 React 버전을 최신이나 향후 보안 보장으로 표현하지 않는다. 업그레이드 시 공식 릴리스·보안 공지를 확인하고 회귀 테스트를 수행한다.

## 네트워크 저장으로 확장할 때

현재 Repository는 동기 인터페이스다. `save()`를 온라인 DB 호출로 한 줄 바꾸면 안 된다. Promise·loading·취소·재시도·중복 요청·서버 revision 충돌 처리가 필요한 비동기 인터페이스를 먼저 정의한다. 클라이언트 엔진은 학습/미리보기이고 서버가 인증·권한·변경을 최종 판정해야 한다. 승인과 실행은 서버 트랜잭션으로 보호해야 한다.
