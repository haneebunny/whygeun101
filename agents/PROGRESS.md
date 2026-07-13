# PROGRESS.md — 모두의 외근 개발 이력서

이 문서는 프로젝트 개발이 진행되면서 완료된 작업과 핵심 성과를 누적하여 기록하는 개발 일지입니다.

---

## 📅 2026-07-13 (월)

### 1. 믹스패널(Mixpanel) 로그 및 유저 행동 트래킹 연동
* **작업 내용**:
  * 프론트엔드에 `mixpanel-browser` 라이브러리를 연동하고 SSR 및 개발 디버깅에 안전한 [mixpanel.ts](file:///Users/hani/Desktop/project/sales-route-map/frontend/src/presentation/utils/mixpanel.ts) 헬퍼를 추가했습니다.
  * 로그인/로그아웃, 메뉴 탭 전환, 엑셀 파일 업로드, 고객 추가/삭제/수정, AI 주소 보정 적용 등 전반적인 사용자 행동을 트래킹하도록 이벤트를 바인딩했습니다.
  * 로컬 개발 도중에도 토큰 유무와 상관없이 브라우저 콘솔을 통해 트래킹 상태를 점검할 수 있도록 실시간 `📊 [Mixpanel Event]` 로그 출력을 연동했습니다.

### 2. 3시간 뒤 예보 날씨 제공 및 홈 탭 UI 최적화
* **백엔드**: [CustomerService.java](file:///Users/hani/Desktop/project/sales-route-map/backend/src/main/java/com/hanibe/fieldwork_101/service/CustomerService.java)에서 Open-Meteo API 호출 방식을 `hourly`로 개편하고, 사용자 타겟 지역의 3시간 뒤 날씨와 온도를 매핑하여 시간(예: `18:00`)과 함께 반환하도록 수정했습니다.
* **프론트엔드**: [HomeTab.tsx](file:///Users/hani/Desktop/project/sales-route-map/frontend/src/presentation/features/home/HomeTab.tsx)에서 날씨 카드를 iOS 스타일의 정방형 세로 컴팩트 위젯 카드로 전면 개편하여 레이아웃을 최적화하고, 상단 인사말에 줄 바꿈을 적용해 가독성을 높였습니다.

### 3. 서비스 워커(Service Worker) 오류 패치
* **작업 내용**: [sw.js](file:///Users/hani/Desktop/project/sales-route-map/frontend/public/sw.js)의 `fetch` 이벤트 콜백 함수에서 누락되었던 `event` 인자 정의를 추가하여 `ReferenceError` 버그를 원천 해결했습니다.

---

## 📅 2026-07-01 (수)

### 1. 패키지 매니저 Yarn 단일화
* **작업 내용**: 프론트엔드 내의 중복 설정이었던 NPM의 `package-lock.json`을 완전히 제거하고 Yarn 환경으로 일원화했습니다.
* **이슈 해결**: 로컬 Node.js 버전(`v20.11.1`)과 개발 의존성 패키지(`eslint-visitor-keys`)의 충돌 문제를 해결하기 위해 `yarn config set ignore-engines true`를 구성한 후 의존성 설치(`yarn install`)를 성공적으로 마무리했습니다.

### 2. 브랜드 명칭 표준화 ('모두의 외근')
* **작업 내용**: 기존의 '외근의 정석'으로 기재되어 있던 모든 문서 텍스트, 코드 주석, 파일 레퍼런스를 새 프로젝트명인 **'모두의 외근'**으로 일괄 표준화하여 동기화했습니다.

### 3. 규칙 및 가이드 문서(AGENTS.md, ROADMAP.md, SKILL.md) 현행화
* **작업 내용**: 
  * `AGENTS.md` 내의 폴더 구조를 실제 Clean Architecture와 Next.js App Router가 혼용된 구조에 맞추어 도식화했습니다.
  * 실행 명령어 표를 `yarn dev`, `yarn build`, `./gradlew bootRun`, `./gradlew build` 등 Yarn 및 Gradle 표준 명령어로 명문화했습니다.
  * 사소한 문서 수정이나 긴급 핫픽스를 포함한 **모든 작업은 예외 없이 독립된 브랜치를 파서 작업해야 한다**는 Git 절대 규칙을 4장에 추가 보강했습니다.
  * `ROADMAP.md`의 규칙 확정(Phase 1) 단계를 완료 상태로 갱신했습니다.

### 4. [Phase 3] LLM 기반 지능형 주소 보정 기능 구현 완료 (핵심 AX)
* **백엔드 (OpenAI 및 지오코딩 검증)**:
  * 시스템 환경변수를 통해 `.env`에 정의된 `OPENAI_API_KEY`와 `LLM_MODEL="gpt-5.4-mini"`를 안전하게 바인딩했습니다.
  * AI가 오타가 있는 원본 주소를 파싱하여 보정 후보군을 뽑아내면, 백엔드에서 **카카오 주소 검색 API(지오코딩)를 한 번 더 거쳐서 실제 위경도 좌표가 나오는 검증된 후보만 필터링해 신뢰도와 함께 리턴하는 이중 검증 파이프라인**을 구현했습니다.
  * 신뢰도 `HIGH`인 보정 후보들을 한 번에 동기화하는 일괄 적용 API(`POST /api/customers/apply-corrections-bulk`)와 개별 후보 주소를 수동 확정하는 로직을 제공합니다.
* **프론트엔드 (UI & API 연동)**:
  * 사용자님이 전해주신 요약 정보 및 카드 리스트의 UI 인터랙션을 Next.js(React) 구조로 매끄럽게 이식했습니다.
  * 기존 레이아웃(`Header`와 `BottomNav`)과의 디자인 Harmony를 완벽히 맞추고, 주소 보정 페이지(`/address`) 진입 시 하단 네비게이션바의 **'고객' 탭이 활성화된 상태**로 보이도록 조율했습니다.
  * 카드 내 추천 주소를 클릭하면 즉시 보정 적용이 수행되며, **"상세 직접 보정"** 버튼을 누르면 팝업 모달이 노출되어 사용자가 직접 주소를 기입해 제출할 수 있는 UI 루프를 구축했습니다.
  * `ROADMAP.md`의 Phase 3 단계를 완료 상태로 업데이트했습니다.

### 5. 개인정보처리방침 (B2B SaaS 보안 강화)
* **작업 내용**: 사용자가 자발적으로 업로드하는 **'제3자(영업 대상 고객 등)의 이름, 주소, 연락처 등'**이 시스템상에 수집 및 대행 위탁 처리된다는 명확한 정보보호 조항을 `frontend/app/privacy/page.tsx` 방침 문서에 보강하여 법적 책임을 강화했습니다.
