# API (제안)

서버 구조는 [service-architecture.md](./service-architecture.md). 계산은 HTTP 뒤에서도 `ledger-core`를 호출한다.

인증: Bearer. 모든 Project 스코프 리소스는 멤버십 검사.

## Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `POST /projects/:id/members`
- `PATCH /projects/:id/members/:memberId` (닉네임, is_active)

## Categories

- `GET /projects/:id/categories`
- `POST /projects/:id/categories`

## Expenses

- `GET /projects/:id/expenses?groupBy=occurredOn|payer|category`
- `POST /projects/:id/expenses`
- `PATCH /projects/:id/expenses/:expenseId`
- `DELETE /projects/:id/expenses/:expenseId`
- `POST /projects/:id/expenses/quick-memo` body `{ text }` — 파싱은 서버/core

응답의 `amountBaseMinor`는 서버가 채운다. 클라이언트가 합계의 원천이 아니다. 그룹 합계는 서버가 내려주거나, core로 클라이언트 재계산하되 **동일 함수**여야 한다.

## FX

- `GET /projects/:id/fx-defaults`
- `PUT /projects/:id/fx-defaults`

1차에 시세 API 프록시 없음.

## Settlement

- `POST /projects/:id/settlements/preview` — 미정산 지출 기준 계산 결과. DB 미기록
- `POST /projects/:id/settlements` — 확정. 지출에 settlement_id 기록
- `GET /projects/:id/settlements`

레거시에 REST가 없다. Firestore `updateDoc`/`arrayUnion`/`arrayRemove`/`onSnapshot`이 전부다.

## 에러

- 400 검증 (빈 참여자, amount≤0)
- 409 정산된 지출 수정, 정산 중 동시 확정
- 403 비멤버
