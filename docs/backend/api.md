# API

서버 구조는 [service-architecture.md](./service-architecture.md). 계산은 HTTP 뒤에서도 domain 계산을 호출한다.

인증: Passwordless email + PostgreSQL session cookie. Project 스코프 리소스는 멤버십을 검사한다.

Command/CRUD는 HTTP. 변경이 commit된 뒤에 SSE로 “데이터 변경됨”을 알린다. 화면 강제 refresh는 하지 않는다.

Base path: `/api`.

## Auth

- `POST /api/auth/login-link` `{ email }` — one-time link 발송
- `POST /api/auth/verify` `{ token }` — 1회 검증 후 session 발급
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Projects

- `GET /api/projects`
- `POST /api/projects` `{ name, defaultExpenseCurrency, settlementCurrency }`
- `GET /api/projects/:id`
- `POST /api/projects/:id/members` `{ email, role?, displayName? }`
- `DELETE /api/projects/:id/members/:userId`

Settlement 전용 CRUD API는 없다.

- `GET /api/projects/:id/balances` — 현재 부담 현황 (송금 목록 없음)
- `GET /api/projects/:id/settlement` — 최종 정산 + 최소 송금 횟수 결과 (명시적 조회)

## Categories

전역. Project 스코프가 아니다.

- `GET /api/categories`
- `POST /api/categories` `{ name }`

## Expenses

- `GET /api/projects/:id/expenses`
- `POST /api/projects/:id/expenses`
- `PATCH /api/projects/:id/expenses/:expenseId`
- `DELETE /api/projects/:id/expenses/:expenseId`
- `POST /api/projects/:id/expenses/quick-memo` `{ text }` — Application이 파싱·검증

생성 body: `description`, `amount`, `currency`, `settlementAmount`, `settlementCurrency`, `fxRate`, `payerUserId`, `categoryId`, `expenseDate`, `shares` 또는 `participantUserIds`(균등 분할 기본값).

Share를 보내면 그 값이 저장된다. 합 = `settlementAmount`.

closed Project여도 Expense 변경을 거절하지 않는다. 성공 시 Project는 `active`.

## Realtime

- `GET /api/projects/:id/events` — SSE. `project.changed` 등 변경 알림

## 에러

- 400 검증 (금액 0, share 합 불일치, 빈 설명 등)
- 401 미인증
- 403 비멤버
- 404 없음
