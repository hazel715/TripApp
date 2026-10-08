# 서비스 아키텍처

API 경로 목록은 [api.md](./api.md). 데이터 규칙 [../data/data-rules.md](../data/data-rules.md). 계산 [../calculation/calculation-rules.md](../calculation/calculation-rules.md).

기존 `app.jsx`를 파일별로 나누는 것이 목적이 아니다. 비즈니스 규칙과 도메인 모델을 추출해 일반적인 그룹 비용 관리 서비스로 재구성한다.

## 구현 상태

Fastify API, Application use case, Domain, Infrastructure(PostgreSQL/Drizzle, 콘솔 Email, 인메모리 SSE)가 구현되어 있다.

## 레거시

백엔드 없음. 브라우저가 Firestore를 직접 읽고, 같은 파일에서 환산·정산한다. 이 구조를 persistence·realtime으로 재사용하지 않는다.

## 계층과 책임

```
Presentation          web/
        ↓ HTTP
API                   api/
        ↓
Application           application/
        ↓
Domain                domain/
        ↑ repository 인터페이스
Infrastructure        infrastructure/
        ↓
PostgreSQL
```

Domain은 React, Fastify, HTTP, PostgreSQL, Drizzle, Firebase SDK, 외부 FX API SDK에 의존하지 않는다.

### Presentation

- React Web
- `expenseDate` 표시, form, 변경 알림(bell)
- 합계·정산·최소 송금 계산의 정본은 서버
- Quick Memo 입력 중 가벼운 힌트 파싱은 허용. 저장은 Application이 검증

### API

- Fastify
- HTTP 요청을 Application use case에 위임
- Settlement 전용 route/controller를 두지 않는다
- 현재 부담 현황·최종 정산은 Project 조회 endpoint로 제공한다

### Application

- 사용자 행동 단위 파일 (하나의 파일 = 하나의 use case)
- 트랜잭션 경계
- Domain 검증 후 Infrastructure persist
- DB commit 성공 후에만 SSE publish

### Domain

- Money, Expense, ExpenseShare, Project, 부담 현황, 최소 송금 횟수 계산
- Repository **인터페이스**
- 외부 I/O 없음

### Infrastructure

- PostgreSQL + Drizzle schema/repository
- Email provider (MVP: 개발용 콘솔/로그 adapter)
- FX quote adapter port (MVP: 자동 연동 없음)
- SSE broker
- Auth token/session 저장

## 디렉터리

```
api/src/
  server.ts
  app.ts
  routes/
    auth.routes.ts
    projects.routes.ts
    expenses.routes.ts
    categories.routes.ts
  controllers/
  plugins/
    auth.ts
    db.ts
    sse.ts
  middleware/
    error-handler.ts
    request-context.ts
application/
  auth/
  projects/
  expenses/
  categories/
  quick-memo/
domain/
  user/
  project/
  expense/
  category/
  shared/
infrastructure/
  postgres/
  auth/
  email/
  fx/
  sse/
web/src/
```

## 처리 순서

Client → HTTP → Application → Domain 검증/계산 → PostgreSQL transaction → commit 성공 → SSE event.

SSE는 consistency 수단이 아니다. source of truth는 PostgreSQL이다. 클라이언트는 변경됨을 인지한 뒤 적절한 시점에 재조회한다.

### 지출 생성/수정/삭제

한 트랜잭션에서 Expense와 Share를 함께 처리한다. Share 합 ≠ `settlement_amount` 이면 저장을 거부한다.

closed Project에서 Expense 변경이 성공하면 Project를 `active`로 전환한다.

### 현재 부담 현황

전체 Expense/Share 기준으로 사용자별 실제 결제액, Share 총액, 차액을 계산한다. 송금 목록을 붙이지 않는다.

### 최종 정산

사용자가 명시적으로 최종 정산을 요청한 요청에서만 최소 송금 횟수 목록을 계산해 반환한다. DB에 쓰지 않는다.

## 환율 어댑터

MVP는 사용자가 Expense의 `currency`, `settlement_currency`, `fx_rate`, `settlement_amount`를 직접 입력한다.

`fx_quotes` 테이블은 향후 외부 FX API용 저장 구조다. Expense와 자동 연결하지 않는다.

```
FxQuotePort (domain/application 경계)
    → infrastructure/fx adapter
    → 현재는 미사용 (수동 입력)
```

## 인증

Passwordless email: one-time login link → 기존 사용자는 login, 없으면 signup → PostgreSQL session.

## 시크릿

`DATABASE_URL`, 세션 서명/쿠키, (향후) 메일·시세 API 키는 Infrastructure 환경 변수. 브라우저에 관리자 키를 두지 않는다.
