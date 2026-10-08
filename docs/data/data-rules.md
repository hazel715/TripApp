# 데이터 규칙

스키마는 [database-schema.md](./database-schema.md). 계산 불변량은 [../calculation/calculation-rules.md](../calculation/calculation-rules.md).

## 식별

- 공개 ID는 UUID. 레거시 `Date.now()` 문자열은 쓰지 않는다.
- 표시 이름(`display_name`)은 식별자가 아니다. FK는 `user_id`.

## Project 격리

- 지출/멤버 쿼리는 `project_id`로 제한한다.
- 다른 Project 멤버를 payer/share에 넣을 수 없다 (신규 저장 시 현재 멤버여야 함).
- Category는 전역이다. `categories.name` UNIQUE.

## 사용자 수명

- 탈퇴/비활성화(`users.status = deactivated`)해도 Expense/Share/Project 데이터를 삭제하지 않는다.
- User 행 DELETE는 하위 지출이 있으면 DB가 거부한다 (`ON DELETE RESTRICT`).
- 멤버 제거는 `project_members` 행만 지운다. 과거 payer/share FK는 유지된다.

## 지출

- `expense_date`는 `DATE`, NULL 허용. UI는 오늘을 기본값으로 넣는다.
- `created_at` / `updated_at`은 서버 `TIMESTAMPTZ`.
- 금액 0 금지. 양수·음수 허용.
- 모든 share 합 = `settlement_amount`. 한 트랜잭션에서 검증. 불일치 시 저장 거부.
- Expense 금액 변경과 Share 변경은 같은 트랜잭션.
- Expense에 settlement FK 없음. 송금 결과는 저장하지 않는다.
- closed Project의 Expense 변경 성공 시 status → `active`.
- 지출 삭제는 MVP에서 hard delete (share CASCADE).

## 환율

- `fx_rate` / `fx_quotes.rate`는 `NUMERIC(18,8)`.
- 동일 통화면 `fx_rate` NULL 가능.
- `settlement_amount`를 `amount * fx_rate`로 강제하지 않는다.
- MVP는 사용자 직접 입력. `fx_quotes` 자동 적용 없음.
- 이후 `fx_quotes`를 바꿔도 기존 Expense 행을 재계산하지 않는다.

## 정산

- 현재 부담 현황과 최종 송금 제안은 모두 계산 결과다. 테이블에 쓰지 않는다.
- 최종 송금 목록은 명시적 조회 API에서만 반환한다.

## 동시성

- PostgreSQL 트랜잭션이 최종 consistency를 보장한다.
- Expense 생성/수정/삭제는 Project 행을 트랜잭션에서 lock할 수 있다.
- SSE는 commit 성공 후에만 발행한다.
