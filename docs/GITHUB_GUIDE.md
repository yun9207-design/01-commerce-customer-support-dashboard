# GitHub에 올리는 방법

## 처음에는 새 저장소

권장 이름은 `vibecoding-business-01-customer-support`다. 기존 프로젝트를 덮어쓰지 않는다. 공개 여부는 사용자가 선택한다. 처음 실습에서는 비공개로 시작해도 된다. GitHub의 계정·요금제별 Pages 지원 여부는 별도로 확인한다.

### 웹 업로드

1. ZIP을 컴퓨터에 저장하고 압축을 푼다.
2. 프로젝트 폴더를 열어 `package.json`, `README.md`, `src`, `docs`, `samples` 등이 보이는지 확인한다.
3. 새 저장소를 만들고 **Add file → Upload files**로 프로젝트 **내용**을 올린다. ZIP 파일 하나만 올리면 AI가 바로 소스 구조를 다루기 어렵다.
4. `.github`, `.gitignore`, `.gitattributes`, `.nvmrc`가 빠지지 않았는지 확인한다. 시스템이 숨김 파일을 제외하면 GitHub Desktop이나 git 방식으로 올린다.
5. `Create customer support learning app v1` 같은 설명으로 커밋한다.
6. 저장소 첫 화면에서 `package.json`과 `AGENTS.md`가 바로 보이는지 확인한다. 한 단계 불필요한 부모 폴더 안에 숨겨졌다면 개발 도구의 작업 폴더를 그 하위 폴더로 지정해야 한다.

이 패키지의 파일 수와 크기는 소규모지만 웹 업로드 제한은 GitHub 공식 안내를 확인한다. 큰 파일/개인 자료를 추가하지 않는다.

### git을 쓸 수 있을 때

새 빈 저장소를 만든 뒤 프로젝트 폴더에서 실행한다. URL은 실제 새 저장소 값으로 바꾸고 `.gitignore`를 확인한다.

```bash
git init
git add .
git commit -m "Create customer support learning app v1"
git branch -M main
git remote add origin <YOUR_NEW_REPOSITORY_URL>
git push -u origin main
```

기존 저장소 URL을 그대로 쓰거나 강제 push하지 않는다. 인증은 GitHub가 지원하는 방법으로 진행하며 토큰을 소스나 AI 채팅에 붙이지 않는다.

## 올린 뒤 AI에게 맡기기

Codex/Claude에서 이 저장소를 사용하도록 연결하는 계정·권한 절차는 각 도구에서 진행한다. 이 파일 제공은 계정 연결이나 권한 부여를 수행하지 않았다. `docs/AI_NEXT_TASK.md`를 첫 요청으로 사용한다. 전체 기능 추가보다 **현재 소스 실행·검증**부터 시킨다.

## 배포는 별도

`preview.html`은 이미 컴퓨터에서 열 수 있다. 온라인 주소가 필요할 때만 Pages를 진행한다.

1. GitHub 저장소 Settings → Pages에서 지원 여부와 공개 노출 범위를 확인한다.
2. Build and deployment Source를 GitHub Actions로 선택한다.
3. Actions에서 `Deploy learning preview (manual)` 워크플로를 선택하고 main에 대해 수동 실행한다.
4. 워크플로는 검사와 빌드를 거쳐 `dist/`만 배포한다. 사용자 백업은 배포하지 않는다.
5. 실제 성공 여부와 생성된 주소는 GitHub 결과에서 확인한다. 실패 시 먼저 로그를 읽는다.

호스팅된 이 앱도 백엔드 없이 방문자의 브라우저별로 작동한다. 한 사람이 수정한 자료가 다른 사람에게 공유되는 서비스가 아니다. 소스가 공개된다고 실제 고객 자료를 넣어도 된다는 뜻이 아니다.

## 공식 안내

- 업로드: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- Codex 지침: https://developers.openai.com/codex/guides/agents-md/
- Claude Code 지침: https://code.claude.com/docs/en/memory

확인 기준 2026-09-29. 외부 도구 UI·권한·요금은 바뀔 수 있으므로 해당 시점의 공식 화면을 기준으로 한다.
