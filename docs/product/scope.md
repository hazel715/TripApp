# 범위

## In scope — MVP (구현됨)

- Passwordless email 인증
- Project CRUD(생성/목록/상세) 및 member 추가/제거
- 전역 Category
- Expense 생성/수정/삭제, Share 설정, 합계 검증
- Quick Memo
- 현재 부담 현황
- 최종 정산 조회 시에만 최소 송금 횟수 계산
- SSE 데이터 변경 알림
- PostgreSQL + Drizzle
- React Web 위 흐름

## Out of scope

- 일정/지도/준비물 (레거시 여행 가이드)
- Firestore persistence
- 외부 FX API 자동 연동
- settlement / transfer / history 테이블
- 비밀번호 인증
- SSE로 화면 강제 refresh, chat/presence
- 기존 청두 지출 임포트 (필수가 아님)
