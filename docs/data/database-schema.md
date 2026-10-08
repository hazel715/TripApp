# 데이터베이스 스키마

기존 Firestore 문서를 복사하지 않는다. 레거시 형태는 [../legacy/legacy-analysis.md](../legacy/legacy-analysis.md). 무결성은 [data-rules.md](./data-rules.md). 개념은 [../domain/domain-model.md](./domain/domain-model.md).

대상 엔진은 **PostgreSQL**. ORM/query builder는 **Drizzle**.

SQL에 최소 송금 매칭이나 환율 곱을 넣지 않는다. 저장·FK·목록 필터·트랜잭션 일관성만 한다.

금액은 `NUMERIC(18,4)`. 환율은 `NUMERIC(18,8)`. JS/IEEE float 컬럼을 쓰지 않는다. 지출 달력 날짜는 `DATE` (NULL 허용). 서버 시각은 `TIMESTAMPTZ`.

구현: `infrastructure/postgres/schema.ts` 및 `infrastructure/postgres/migrations/`.

## ER 요약

- users
- projects
- project_members
- categories — 전역. `project_id` 없음
- expenses
- expense_shares
- fx_quotes — Expense와 FK로 연결하지 않음
- login_tokens, sessions — 인증 (도메인 핵심 테이블과 분리)

**만들지 않는 테이블:** `settlements`, `settlement_transfers`, `settlement_history`, 여행/일정 테이블.

## users

- `id` UUID PK
- `email` TEXT UNIQUE NOT NULL
- `status` TEXT NOT NULL — `active` | `deactivated`
- `created_at` TIMESTAMPTZ NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

탈퇴/비활성화해도 Project / Expense / ExpenseShare 행을 지우지 않는다. User FK는 `ON DELETE RESTRICT`.

## projects

- `id` UUID PK
- `name` TEXT NOT NULL
- `default_expense_currency` CHAR(3) NOT NULL
- `settlement_currency` CHAR(3) NOT NULL
- `status` TEXT NOT NULL — `active` | `closed`
- `created_at` / `updated_at` TIMESTAMPTZ NOT NULL

currency 컬럼은 입력 기본값/정산 기준값이다. Expense는 행마다 snapshot/override를 저장한다.

closed Project에서 Expense 입력/수정/삭제가 일어나면 `active`로 전환한다.

Project 삭제 시 member / expense / expense_share는 CASCADE로 함께 정리한다.

## project_members

- `project_id` UUID NOT NULL REFERENCES projects ON DELETE CASCADE
- `user_id` UUID NOT NULL REFERENCES users ON DELETE RESTRICT
- `role` TEXT NOT NULL — `owner` | `member`
- `display_name` TEXT NOT NULL — Quick Memo 매칭 및 화면 표시용 (복합 PK 외 구현 필드)

PK: `(project_id, user_id)`

## categories

- `id` UUID PK
- `name` TEXT UNIQUE NOT NULL

`project_id` 없음.

## expenses

- `id` UUID PK
- `project_id` UUID NOT NULL REFERENCES projects ON DELETE CASCADE
- `payer_user_id` UUID NOT NULL REFERENCES users ON DELETE RESTRICT
- `category_id` UUID NULL REFERENCES categories ON DELETE SET NULL
- `description` TEXT NOT NULL
- `amount` NUMERIC(18,4) NOT NULL — 결제 통화 금액. 0 금지, 음수 허용
- `currency` CHAR(3) NOT NULL — 실제 결제 통화 (Project 기본값을 복사해 저장)
- `fx_rate` NUMERIC(18,8) NULL — `1 expense currency = fx_rate settlement currency`. 동일 통화면 NULL 가능
- `settlement_amount` NUMERIC(18,4) NOT NULL — 정산에 쓰는 금액. `amount * fx_rate`와 같다고 강제하지 않음
- `settlement_currency` CHAR(3) NOT NULL
- `expense_date` DATE NULL — UI 기본값은 오늘
- `created_at` / `updated_at` TIMESTAMPTZ NOT NULL

인덱스: `(project_id, expense_date)`.

Payer가 Share 참여자일 필요는 없다.

## expense_shares

- `expense_id` UUID NOT NULL REFERENCES expenses ON DELETE CASCADE
- `user_id` UUID NOT NULL REFERENCES users ON DELETE RESTRICT
- `share_amount` NUMERIC(18,4) NOT NULL — 0 금지, 음수 허용 (부담 감소)

PK: `(expense_id, user_id)`

currency 컬럼 없음. 부모 Expense의 settlement 기준만 사용한다.

불변식: `SUM(share_amount) = expenses.settlement_amount` (Application/Domain에서 검증, 한 트랜잭션).

## fx_quotes

향후 외부 FX API용. MVP에서 Expense에 자동 연결하지 않는다.

- `id` UUID PK
- `base_currency` CHAR(3) NOT NULL
- `quote_currency` CHAR(3) NOT NULL
- `rate` NUMERIC(18,8) NOT NULL — `1 base = rate quote`
- `quote_date` DATE NOT NULL
- `source` TEXT NOT NULL
- `created_at` / `updated_at` TIMESTAMPTZ NOT NULL

UNIQUE `(base_currency, quote_currency, quote_date)`

## 인증 테이블

- `login_tokens`: email, token_hash, expires_at, consumed_at
- `sessions`: user_id, token_hash, expires_at

One-time token은 짧은 만료, 1회 사용.
