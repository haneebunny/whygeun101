# 🗺️ 모두의 외근

**모두의 외근**은 영업 사원들이 고객 목록을 효율적으로 관리하고, 지도(Kakao Map) 상에서 최적의 방문 동선과 실시간 날씨를 확인하며 방문 일정을 조율할 수 있도록 지원하는 웹 서비스 프로젝트입니다.

이 프로젝트는 **Next.js 프론트엔드**와 **Spring Boot 백엔드**로 구성되어 있습니다.

---

## 🛠️ 주요 제공 기능

1. **지도 기반 고객 시각화 (Kakao Map SDK)**
   * 고객 데이터를 카카오 지도 위에 핀으로 표시하여 밀집도 및 분포 현황을 직관적으로 확인.
2. **방문 일정 및 메모 관리 (Scheduler)**
   * 캘린더 모달을 통해 방문 시간을 설정하고, 메모를 작성하여 당일 방문 계획 최적화.
3. **실시간 위치별 날씨 조회**
   * 카카오 역지오코딩(Coord2RegionCode) 및 Open-Meteo API 연동을 통해 지도 뷰포트 내 고객 지역의 실시간 날씨 정보 동기화.
4. **카카오 OAuth 소셜 로그인**
   * 카카오 간편 로그인 연동을 통한 편리한 사용자 인증.
5. **대용량 고객 데이터 엑셀 업로드**
   * Apache POI 라이브러리를 사용해 다량의 고객 목록을 엑셀로 일괄 Import.

---

## ⚙️ 3단계 캐스케이드 주소 정제 파이프라인 (탑재 완료)

고객 주소 등록 시 비정형 주소(띄어쓰기 유실, 동/호수 접합, 아파트 단지 정보 오기 등)로 인한 지오코딩 실패 문제를 완전히 해결하기 위해 **3단계 캐스케이드(Cascade) 정밀 주소 정제 알고리즘**이 백엔드에 내장되어 있습니다.

### 🔄 작동 프로세스
1. **1단계: 베이스라인 지오코딩** (원본 주소 그대로 카카오 API에 조회)
2. **2단계: 룰 기반 정제 및 복원 (성공률 92.0%)**
   * 괄호 제거 및 동호수 정규식 추출.
   * 건물번호와 동 번호가 완전히 붙어 있는 경우(예: `13107동` ➡️ `13` 건물번호 복원 + `107동` 분리)의 전처리 자동화.
   * 상세주소 매칭 시점 뒤에 나오는 잔여 노이즈 문자열을 소거하여 지오코딩 API의 오탐지를 원천 차단.
3. **3단계: LLM 기반 정제 및 폴백 (성공률 100.0%)**
   * 앞선 룰 기반 검출에 실패한 비정형 주소에 대해 LLM(OpenAI GPT-4o-mini)을 호출하여 JSON 규격 파싱.
   * LLM 호출 전 붙어있는 숫자를 사전에 띄어쓰는 전처리 함수를 적용하여 오인식 방지.

> [!NOTE]
> 본 지오코딩 파이프라인의 **도로명 주소 정확도는 100%**, **상세주소 보존율은 100%**로 성능 검증을 마쳤습니다. (평균 지연시간 0.266초, LLM 호출 비용 92% 절감)
> - **[v1 1차 평가 보고서 (정확도 82% 수준의 초기 단계)](address_evaluation_report_v1.md)**
> - **[최종 평가 보고서 (정확도 100% 달성 완료)](address_evaluation_report.md)**

---

## 💻 프로젝트 기술 스택

### Frontend
- **Framework**: Next.js 16 (React 19), TypeScript
- **Styling**: TailwindCSS v4
- **Libraries**: `react-kakao-maps-sdk`, `mixpanel-browser`, `hangul-js`

### Backend
- **Framework**: Java 17, Spring Boot 3.x
- **Build Tool**: Gradle
- **Database**: PostgreSQL / Spring Data JPA
- **APIs**: Kakao Local API, OpenAI Chat Completion API, Open-Meteo API
- **Libraries**: Apache POI (Excel Parser), Lombok

---

## 🚀 시작하기 (How to Run)

### Backend 실행 방법
1. `.env` 또는 `application.yml` 파일에 카카오 API 및 OpenAI API 키를 세팅합니다.
2. 백엔드 디렉토리로 이동하여 빌드 및 실행합니다.
   ```bash
   cd backend
   ./gradlew bootRun
   ```

### Frontend 실행 방법
1. `react-kakao-maps-sdk` 연동을 위한 카카오 JS App Key를 환경 변수로 설정합니다.
2. 패키지를 설치하고 개발 서버를 시작합니다.
   ```bash
   cd frontend
   yarn install
   yarn dev
   ```
