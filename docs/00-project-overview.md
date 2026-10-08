# 프로젝트 개요

이 문서는 **프로젝트 단위 공동 가계부(TripApp)** 의 아키텍처 지도다. 세부 규칙은 하위 문서를 따른다.

- 제품: [product/requirements.md](./product/requirements.md), [product/scope.md](./product/scope.md), [product/user-flows.md](./product/user-flows.md)
- 도메인: [domain/domain-model.md](./domain/domain-model.md)
- 데이터: [data/database-schema.md](./data/database-schema.md)
- 계산: [calculation/calculation-rules.md](./calculation/calculation-rules.md)
- 프론트: [frontend/screens.md](./frontend/screens.md)
- 백엔드: [backend/service-architecture.md](./backend/service-architecture.md)
- 레거시: [legacy/legacy-analysis.md](./legacy/legacy-analysis.md)

## 구현 상태

MVP는 저장소 루트의 `web/`, `api/`, `application/`, `domain/`, `infrastructure/` 에 구현되어 있다.

레거시 `app.jsx` / `index.html` 은 청두 여행 가이드이며 신규 persistence로 사용하지 않는다. Firebase Firestore는 신규 DB가 아니다.

## 한 줄 정의

여러 사람이 참여하는 **Project**마다 지출과 부담(Share)을 기록하고, 정산 통화 기준으로 현재 부담 현황을 보며, 요청 시에만 최소 송금 횟수의 최종 정산을 계산한다.

여행은 별도 엔티티가 아니다. “제주도 여행 1”, “장보기 1”, “공동생활비”는 모두 Project다.

## 핵심 구조

```
Project
├── ProjectMember (owner | member)
├── Expense
│    └── ExpenseShare
└── (정산 결과는 저장하지 않음 — 조회 시 계산)

User
Category          (전역)
FxQuote           (향후 시세 저장. MVP에서 Expense와 자동 연결하지 않음)
```

엔티티 의미는 [domain/domain-model.md](./domain/domain-model.md).

`settlements` / `settlement_transfers` / `settlement_history` 테이블은 두지 않는다.

## 계층

의존 방향은 한 방향이다. 상세는 [backend/service-architecture.md](./backend/service-architecture.md).

```
React Web
    ↓ HTTP
Fastify API
    ↓
Application
    ↓
Domain
    ↓
Infrastructure
    ↓
PostgreSQL
```

| 계층 | 역할 |
| --- | --- |
| Presentation | React Web. 화면, form, 표시 포맷. 가벼운 Quick Memo 힌트 파싱은 가능하나 최종 검증은 서버 |
| API | Fastify. HTTP를 받아 Application use case 호출 |
| Application | 사용자 행동 단위 use case와 orchestration, 트랜잭션 경계 |
| Domain | 순수 비즈니스 규칙. React / Fastify / HTTP / PostgreSQL / Drizzle / Firebase SDK / 외부 FX SDK에 의존하지 않음 |
| Infrastructure | PostgreSQL, Drizzle, Repository 구현, Email, FX adapter port, SSE |

## 잠근 설계

1. 위 계층 분리. Domain은 프레임워크·DB를 import하지 않는다.
2. 금액은 `NUMERIC(18,4)` / Decimal. JS `number`로 잔액을 누적하지 않는다. 0은 금지, 양수·음수 허용.
3. Share 합계 = Expense `settlement_amount`. 저장 거부 조건이다.
4. Share는 부모 Expense의 settlement currency만 사용한다. Share에 currency를 두지 않는다.
5. `settlement_amount`는 `amount * fx_rate`와 같다고 강제하지 않는다. 사용자가 확정한 정산 기준 금액이다.
6. 지출 환율은 사용자가 Expense에 직접 입력한다. `fx_quotes`에서 자동으로 가져오지 않는다.
7. 현재 부담 현황은 참고용이다. 송금 지시로 표현하지 않는다.
8. 최종 정산(최소 송금 목록)은 사용자가 명시적으로 요청했을 때만 계산한다. DB에 저장하지 않는다.
9. Passwordless email 인증. 세션은 PostgreSQL에 저장한다.
10. 실시간은 SSE 변경 알림이다. 화면을 강제 refresh하지 않는다.
11. 실시간 외부 FX API는 MVP에서 구현하지 않는다. Infrastructure에 adapter port만 둔다.

## 디렉터리 구조

```
TripApp/
├── web/                 # React Presentation
├── api/                 # Fastify HTTP
├── application/         # use case (파일 하나 = 사용자 행동)
├── domain/              # 순수 규칙 + repository 인터페이스
├── infrastructure/      # PostgreSQL/Drizzle, email, SSE, FX port
├── docs/
├── app.jsx              # 레거시 (신규 트리에 복사하지 않음)
└── index.html           # 레거시
```

## 레거시와의 관계

- 기존 Firebase 문서를 운영 DB로 쓰지 않는다.
- 재사용할 것은 정산 부호, 지출 UX, Quick Memo 입력 패턴이다. [legacy/reusable-logic.md](./legacy/reusable-logic.md)
- 데이터 이관은 필수가 아니다. [data/migration-strategy.md](./data/migration-strategy.md)
- 레거시의 빈 환율 fallback 상수(`DEFAULT_CNY_RATE` 등)는 신규 정산에 쓰지 않는다.
