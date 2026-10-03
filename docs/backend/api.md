# API (제안)

서버 구조는 [service-architecture.md](./service-architecture.md). 계산은 HTTP 뒤에서도 domain 계산을 호출한다.

인증은 모든 Project 스코프 리소스에 멤버십 검사를 전제로 한다. **인증 방식은 미정.**

Command/CRUD는 HTTP request-response. 변경이 commit된 뒤에 realtime으로 동기화한다. realtime 구현 기술은 미정.

## Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `POST /projects/:id/members`
- `PATCH /projects/:id/members/:memberId` (닉네임, is_active)

목록·상세 응답에 현재 `settlement_status` (`open` | `settled`)를 포함한다.

## Categories

전역. Project 스코프가 아니다.

- `GET /categories`
- `POST /categories`

## Expenses

- `GET /projects/:id/expenses?groupBy=expenseDate|payer|category`
- `POST /projects/:id/expenses`
- `PATCH /projects/:id/expenses/:expenseId`
- `DELETE /projects/:id/expenses/:expenseId`
- `POST /projects/:id/expenses/quick-memo` body `{ text }` — 파싱은 서버/core

생성 body는 amount, 참여자, share를 받는다. share를 생략하면 equal split이 기본값이다. share를 보내면 그 값이 저장된다. 합 = `amount_minor`.

응답의 `amountBaseMinor`는 서버가 채운다. 클라이언트가 합계의 원천이 아니다. 그룹 합계는 서버가 내려주거나, core로 클라이언트 재계산하되 **동일 함수**여야 한다.

생성/수정/삭제가 성공하면 해당 Project `settlement_status`는 `open`. Project가 `settled`여도 Expense 변경을 409로 거절하지 않는다.

적용 환율은 이 요청에서 스냅샷한다. 기본 시세가 있어도 persist 값으로 고정한다. 수동 rate override 가능.

## FX

- `GET /projects/:id/fx-defaults`
- `PUT /projects/:id/fx-defaults`

1차에 시세 API 프록시 없음. 기본값은 `ManualFxQuote` / `fx_quotes`. 여기 값을 바꿔도 기존 Expense `fx_rate`는 바꾸지 않는다.

## Settlement

Project 현재 ledger의 마감. 지출에 settlement FK를 쓰지 않는다.

- `POST /projects/:id/settlements/preview` — 현재 Project ledger 기준 계산 결과. DB 미기록
- `POST /projects/:id/settlements` — 확정. settlement 이력 저장, Project `settlement_status = settled`
- `GET /projects/:id/settlements` — 마감 이력

레거시에 REST가 없다. Firestore `updateDoc`/`arrayUnion`/`arrayRemove`/`onSnapshot`이 전부다. 신규는 그 패턴을 재현하지 않는다.

## 에러

- 400 검증 (빈 참여자, amount≤0, share 합 ≠ amount)
- 409 실제 동시성/충돌 (예: 같은 Project lock 하에서 정산 확정과 지출 변경이 경합해 한쪽이 실패한 경우)
- 403 비멤버
