# 제거 계획 (REMOVE)

신규 앱 구현 시 이식하지 않는다. **지금 레거시 저장소의 파일을 삭제하지 않는다.** 이 문서는 새 프로젝트 범위에서 빼는 목록이다.

분석 단계에서는 `app.jsx`를 수정하지 않았다.

## 제거 대상

| 항목 | 경로 | 이유 |
| --- | --- | --- |
| 일정 기본 데이터 | `defaultItinerary` | 여행 도메인 |
| 일정 상태/CRUD/뷰 | itinerary state, `renderEvent`, 일자별/타임라인 | 여행 도메인 |
| 이벤트 타입/아이콘 | `EVENT_ICONS`, `getEventIcon` | 항공/기차/호텔 |
| 요약 탭 | `activeTab === 'summary'` 숙소/포인트 | 청두 전용 |
| 준비물 | `defaultEssentials`, essentials 모달 | 여행 체크리스트 |
| 지도 링크 | `event.map` | 장소 도메인 |
| Notion 버튼 | header `notion.so/moeng/...` | 청두 문서 |
| 헤더 카피 | “중케이숀(청두)”, 2026.04.17–04.21 | 단일 여행 브랜딩 |
| 일정 날짜 파서 | `getEventDateObj` 2026 고정 | 지출 날짜와 무관, 잘못된 패턴 |
| Firebase 공개 문서 모델 | `artifacts/.../trip_data/main` | 새 DB 사용 |
| 익명 인증 | `signInAnonymously` | 권한 모델과 불일치 |
| 소스 내 firebaseConfig | `app.jsx` 16–23 | 시크릿/프로젝트 결합. 신규에 복사 금지 |
| CDN Babel 단일 파일 구조 | `index.html` + `app.jsx` | 테스트·모듈 분할 불가 |
| 여행 lucide import | Plane, Train, Hotel, Camera 등 | 가계부 아이콘만 필요 |
| APP_ID 청두 | `chengdu-trip-2026` | 멀티 프로젝트와 무관 |

## 신규 앱에 가져가면 안 되는 습관

- 날짜를 `"M월 D일"`로 persist
- 멤버를 모듈 상수로 고정
- 정산을 컴포넌트 안에서만 계산하고 저장하지 않기
- 배열 통째 overwrite로 수정

## 레거시 앱의 운명

제품 결정. 이 레포는 청두 여행 도구로 남겨 두고, 공동 가계부는 **새 저장소**를 권장한다. 한 레포에서 `app.jsx`를 점진 삭제하는 것은 범위가 다르다.
