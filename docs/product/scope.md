# 범위

## In scope — MVP (구현됨)

- Passwordless email 인증
- Project 생성/목록/상세 및 member 추가/제거
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

## 구현 상태 보완 및 후속 범위 (2026-10-15)

위 구현 완료는 핵심 가계부/정산 흐름 기준이다. 통화 선택 UI, 환산 금액 자동 제안, 운영 이메일, Vercel 배포, Codespaces 신규 앱 설정은 아직 미완료다. PostgreSQL 유지와 Firebase 활용을 병행할 방안을 검토하며 Firestore persistence는 이번 요구에도 포함하지 않는다. 정식 타이틀 결정 전 임시 이름은 공동 정산이다.
