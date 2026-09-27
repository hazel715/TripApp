# 레거시 분석

분류 요약: [reusable-logic.md](./reusable-logic.md), [removal-plan.md](./removal-plan.md).  
이 문서는 현재 저장소의 사실만 적는다.

## 1. 디렉터리 구조

```
TripApp/
  app.jsx              # 전 애플리케이션
  index.html           # 셸, Tailwind/Babel CDN
  .devcontainer/
    devcontainer.json
    Dockerfile         # node 18 + live-server
  .git/
```

패키지 매니저, `src/`, 백엔드, 테스트, `.env` 없음.

## 2. 기술 스택

- React 18 (esm.sh)
- React DOM createRoot
- lucide-react 아이콘
- Tailwind CDN
- Babel standalone (`text/babel` 모듈)
- Firebase JS SDK 10.7.1: Auth + Firestore
- 로컬 실행: Live Server 포트 5500 (devcontainer)

빌드/번들러/TypeScript 없음.

## 3. DB 구조

엔진: Cloud Firestore. 컬렉션 스키마 파일이 없다.

문서 하나:

`artifacts / {APP_ID=chengdu-trip-2026} / public / data / trip_data / main`

필드:

- `itinerary`: 일정 배열 (day, date 문자열, title, events[])
- `essentials`: `{ category, items[] }[]`
- `expenses`: 지출 객체 배열

지출 객체 shape:

```
{
  id, payer, category, date, title,
  amount, currency, exchangeRate, customRate,
  note, included[]
}
```

관계형 테이블, 인덱스, 마이그레이션 없음.

## 4. ORM / 데이터 접근

ORM 없음. Firestore SDK:

- `onSnapshot` 구독
- `updateDoc`
- `setDoc` (문서 없을 때 merge)
- `arrayUnion` / `arrayRemove` (지출 추가/삭제)

수정은 배열 전체를 새 배열로 `updateDoc({ expenses })`.

## 5. 여행계획 코드

`app.jsx` 대부분.

- `defaultItinerary` 43–84행
- `getEventDateObj`, `sortedItinerary`, `timelineEvents` 180–219
- 일정 CRUD 221–254, `renderEvent` 423–461
- 탭 `summary` / `itinerary` 494–578
- 일정 편집 모달 739–751
- `EVENT_ICONS`, lucide 교통/숙소 아이콘

`index.html` 타이틀 “청두 여행 가이드 2026”.

## 6. 가계부 코드

- 상태 `expenses`, `expenseModal`, `expenseGroupBy`, `showSettleModal`, `quickMemoModal`
- CRUD 279–376
- 목록 UI 581–631
- 폼 644–681

## 7. 환율 코드

상수 86–87, `getConvertedAmount` 378–382, 폼 662–672, 저장 332–333.  
외부 환율 API 없음. 상세 [../domain/exchange-rate.md](../domain/exchange-rate.md).

## 8. 정산 코드

`calculateSettlement` 392–407, 모달 684–702.  
저장 없음.

## 9. 날짜 코드

### 일정

`date: "4월 17일 (금)"`. `getEventDateObj`가 정규식 `(\d+)월\s*(\d+)일` + 시간 `(\d+):(\d+)` → `new Date(2026, month, day, hour, min)`.

**연도 2026 하드코딩.** 파싱 실패 시 `2099-01-01`.

### 지출

- 신규 기본값: `` `${month+1}월 ${date}일` `` (로컬 오늘, **연도 없음**)
- 공백이면 `'일자 미지정'`
- 입력: `<input type="text">`
- 정렬: `localeCompare` on 문자열. 미지정은 뒤로
- 그룹 키: 그 문자열 자체

### 시스템 시간

지출에 `createdAt` 없음. 퀵메모만 `note`에 `toLocaleTimeString()`.

### 날짜 타입을 바꾸기 어려웠던 정확한 원인

스키마/ORM 한계가 아니다. **표시 문자열을 식별자·저장값·정렬키로 동시에 쓰기 때문**이다.

1. Firestore에 JS 객체가 그대로 들어가 `date`가 string으로 고정됨
2. UI 입력·placeholder·그룹 헤더·sort가 같은 포맷(`M월 D일`)에 의존
3. 일정 파서는 연도를 텍스트에 넣지 않고 함수에 2026을 박음. 지출 기본 생성은 **올해** `getMonth()`라 일정(2026)과 지출 연도가 어긋날 수 있음
4. 기존 문서를 읽으면 UI가 string을 그대로 `value`에 넣음. DATE 타입으로 바꾸면 파서 없이 깨짐
5. 테스트가 없어 포맷 변경 회귀를 막을 수 없음

즉 “DB가 DATE를 못 해서”가 아니라 **단일 문서 앱이 도메인 타입 없이 UI 문자열을 persist**했기 때문이다. 신규 DB에서는 이 결합을 끊으면 된다.

## 10. 공통 유틸리티

별도 util 파일 없음. 컴포넌트 클로저 함수뿐.

## 11. 외부 API

- Firebase Auth/Firestore
- esm.sh / gstatic / unpkg / cdn.tailwindcss.com
- Google Maps 링크 (일정 이벤트 `map`)
- Notion 하드코딩 URL

환율 HTTP 없음.

## 12. 인증

익명 로그인. 사용자 프로필·멤버 매핑 없음. 누구나 같은 public 문서를 읽/쓸 수 있는 전제 (보안 규칙은 레포 밖).

## 13. 상태관리

React `useState` + `useEffect`. Redux/Zustand 없음. 클라우드가 소스 오브 트루스.

## 14. UI 컴포넌트

한 파일. 모달을 조기 리턴 JSX로 나열. 공통 디자인: emerald, `max-w-md`, sticky 탭, FAB, backdrop 모달.

## 15. 테스트

없음.

## 16. 환경변수

없음. Firebase 설정이 소스에 고정. 신규로 이 키를 가져가지 말 것.

## 17. 배포 구조

코드상 GitHub `hazel715/TripApp`, 정적 호스팅 설정(Firebase Hosting/nginx)은 레포에 없음. 개발은 Live Server.

## 분석 16항목과 공백

| # | 결과 |
| --- | --- |
| 백엔드 서비스 | 없음 |
| 패키지.json | 없음 |
| CI | 없음 |
