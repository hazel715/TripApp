# 범위

요구사항의 우선순위와 제외 항목만 다룬다. 기능 명세는 [requirements.md](./requirements.md).

## In scope — 1차 (MVP)

- Project CRUD 및 목록
- Project 멤버 추가/비활성
- 지출 생성/수정/삭제
- 균등 분할 (참여자 선택)
- KRW / CNY / USD, 지출 시점 환율 스냅샷, 수동 환율
- 일자·결제자·카테고리 그룹 조회
- 정산 미리보기 + 정산 실행 저장
- 기준 통화 KRW Project (다른 기준 통화는 스키마만 열어 둘 수 있음)

## In scope — 2차

- 불균등 ExpenseShare 편집
- 환율 조회 API 및 캐시
- 초대/권한 세분화
- 정산 부분 완료(송금 건별 체크)
- 지출 첨부(영수증) — 도메인에 아직 없음
- 멀티 기준 통화 Project

## Out of scope (레거시에서 제거)

여행 전용 기능. 제거 파일/블록 목록은 [../legacy/removal-plan.md](../legacy/removal-plan.md).

- 일정/타임라인 (`itinerary`, Day N, 이벤트 타입 flight/train/hotel 등)
- 지도 링크, 숙소 요약 탭
- 준비물 체크리스트 (`essentials`)
- 청두 하드코딩 카피, Notion 링크
- 익명 공개 단일 Firestore 문서 모델
- CDN Babel 단일 파일 앱을 신규 코드베이스로 유지하는 것

## 레거시에서 범위로 가져오는 것

동작은 가져오되 코드는 재구현한다. [../legacy/reusable-logic.md](../legacy/reusable-logic.md)

- 지출 폼: 결제자, 카테고리, 일자, 제목, 금액, 통화, 환율, 포함 인원, 메모
- 퀵메모 파서 (자연어 한 줄 입력)
- 그룹핑: 일자/결제자/카테고리
- 정산 표: 결제액, 실부담, 잔액, 송금 가이드
- 환율을 지출에 고정하는 모델

## MVP에 넣지 않는 UI

- 여행 요약 탭
- 일자별/타임라인 일정 뷰
- 준비물 모달
