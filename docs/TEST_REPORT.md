# 검증 보고서 · 2026-09-29

## 실제 수행한 검사

| 검사 | 결과 | 조건 |
|---|---|---|
| 도메인 TypeScript 정적 검사 | 통과 | TypeScript 5.8.3, src/domain·data·CSV·repository·files |
| Node 단위/계약 테스트 | **60개 통과, 실패 0** | Node 22.16.0 내장 test runner |
| 단일 HTML 빌드 | 통과 | src 22개 모듈 → preview.html 및 dist/index.html |
| Chromium 브라우저 시나리오 | **7개 묶음 통과**, 처리되지 않은 JS 오류 0 | Python Playwright + Chromium, 1440px·390px |
| 화면 확인 | 수행 | 데스크톱 운영 개요·문의 작업대, 모바일 화면 캡처 |

### 브라우저 시나리오의 내용

1. 9개 화면 이동 및 가로 넘침 확인
2. 취소 요청·역할 제한·승인·실행·중복 실행 버튼 제거·초안·모의 답변·해결·JSON 내보내기
3. 승인 후 배송 상태 변경 → 실행 차단
4. 실제 파일 선택으로 오류/정상/중복 CSV 검사, 주문·문의 연결
5. JSON 미리보기, 역할·명시적 확인에 따른 복원, 초기화 가드, Escape로 모달 닫기
6. 학습 체크 저장과 독립 연습 자료 생성
7. 390px 화면에서 메뉴 이동과 새 문의 입력

### 단위 테스트 주요 내용

순수 명령의 불변성, 취소 전 과정, 권한 조건, 중복/오래된 승인, 금액 한도, 정보 불일치, 초안 재검사, 중복 답변, 상태 전이, 메모 한도, CSV 인용·줄바꿈·중복·크기·수식 접두어, JSON 스키마·날짜·중복·참조, 저장 충돌·용량 실패·손상 보존, 실제 자료 기반 지표.

## 검증 환경 때문에 아직 확인하지 못한 것

- **npm registry로의 네트워크 접근이 없어 전체 `npm install`은 실행 완료하지 못했다.** 배포본의 package-lock.json은 미포함이다. 의존성을 임의로 설치했다고 주장하지 않는다.
- React 타입 패키지와 Vite가 이 실행 환경에 없으므로 **전체 `npm run typecheck`와 `npm run build:vite`는 미실행**이다. 도메인 정적 검사·TS/TSX 구문 변환·실제 React 브라우저 실행은 별도로 통과했다. 전체 React 타입 검사를 대체하는 것은 아니다.
- 로컬 주소/파일로 브라우저 탐색하는 동작이 환경 정책으로 제한되어, **HTML을 `page.set_content`로 메모리 페이지에 넣어 시험**했다. 해당 페이지에서는 임시 저장 모드다. 실제 file:// 또는 HTTP origin의 localStorage 재열기 지속성을 검증했다고 주장하지 않는다.
- 저장 어댑터의 지속 저장·원본 보호·충돌·용량 실패는 **모의 Storage 인터페이스를 쓰는 Node 테스트**로 검사했다. 실제 브라우저 원점 저장은 사용자 환경에서 추가 확인한다.
- GitHub 업로드, Actions 실행, Pages 배포, Codex/Claude 계정 연결, 실제 쇼핑몰/AI/발송은 하지 않았다.
- Safari/Firefox, 접근성 정식 감사, 대용량 성능 시험, 실제 보안 시험은 미수행이다.

## 재현 명령

```
npm install
npm run typecheck
npm run typecheck:domain
npm test
npm run build
npm run build:vite
python tests/browser_smoke.py
```

Playwright 설치가 필요한 경우 README 절차를 따른다. 실제 배포 주소를 사용하는 브라우저 시험은 `BASE_URL`을 지정한다. CI YAML이 있다고 CI 통과를 의미하지 않는다. 다음 AI 작업의 첫 단계에서 미실행 항목을 검증한다.
