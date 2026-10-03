# 데이터 규칙

스키마는 [database-schema.md](./database-schema.md). 계산 불변량은 [../calculation/calculation-rules.md](../calculation/calculation-rules.md).

## 식별

- 공개 ID는 UUID. 레거시 `Date.now()` 문자열은 충돌 가능하므로 쓰지 않는다.
- 닉네임은 식별자가 아니다. 레거시 `payer: 'MJ'` 방식은 이름 변경에 깨진다.

## Project 격리

- 지출/정산/멤버 쿼리는 `project_id`로 제한한다.
- 다른 Project 멤버 ID를 payer/share에 넣을 수 없다.
- Category는 전역이다. `project_id` 없음. `categories.name`은 전역 UNIQUE.

## 멤버 수명

- 지출 또는 transfer에 한 번이라도 등장한 멤버는 `DELETE`하지 않는다. `is_active = false`.
- 비활성 멤버는 새 지출의 결제자/참여자 후보에서 뺀다.

## 지출

- `expense_date`는 `DATE`. 타임존 변환을 피하기 위해 사용자가 입력한 현지 달력 날짜를 그대로 저장한다.
- `created_at` / `updated_at`은 서버 `TIMESTAMPTZ`. `expense_date`와 다를 수 있다.
- `amount_minor`, `share_minor`는 최소 단위 정수 (`BIGINT`).
- 모든 share 합 = `amount_minor`. 저장 한 트랜잭션에서 검증.
- Expense에 `settlement_id` 없음. 정산 여부는 Expense에 저장하지 않는다.
- Expense 생성/수정/삭제는 해당 Project의 `settlement_status`를 `open`으로 되돌린다 (invalidation / reopen).
- `settled` 이후에도 Expense 변경을 금지하지 않는다.

## 환율

- `fx_rate` / `fx_quotes.rate`는 `NUMERIC(18, 8)`. 부동소수점 타입 금지.
- 저장 후 `fx_quotes`를 바꿔도 기존 지출 `fx_rate`는 불변.
- 같은 Project 안에서도 지출마다 적용 환율이 다를 수 있다. 적용 순간 스냅샷한다. 지출별 수동 override 가능 (`fx_custom`).
- 기준 통화 지출의 `fx_rate`는 1.
- 1차는 `ManualFxQuote` / 테이블. 실시간 외부 FX API는 쓰지 않는다.

## 정산

- Project 단위. `projects.settlement_status`는 `'open'` | `'settled'`.
- `settlements` / `settlement_transfers`는 그 시점 마감 이력이다.

## 동시성

레거시는 추가에 `arrayUnion`, 수정에 배열 전체 `updateDoc`을 쓴다. 수정과 동시 추가는 경쟁한다.

신규:

- PostgreSQL 트랜잭션과 제약이 최종 consistency를 보장한다.
- Expense 생성/수정/삭제와 Settlement 확정은 같은 Project 행을 트랜잭션 안에서 lock한다 (`SELECT … FOR UPDATE`는 **Project 행**).
- 지출을 `settlement_id IS NULL`로 잠그지 않는다.
- realtime event는 commit 성공 후에만 발행한다. event 자체는 consistency 수단이 아니다.

## 소프트 삭제

지출 삭제는 MVP에서 hard delete. 감사 로그는 2차. 삭제 시에도 Project는 `open`.
