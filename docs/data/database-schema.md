# 데이터베이스 스키마 (제안)

기존 Firestore 문서를 복사하지 않는다. 레거시 형태는 [../legacy/legacy-analysis.md](../legacy/legacy-analysis.md). 무결성은 [data-rules.md](./data-rules.md). 개념은 [../domain/domain-model.md](../domain/domain-model.md).

대상 엔진은 PostgreSQL을 **기본안**으로 둔다. 확정은 [결정 필요 사항](#결정-필요-사항).

SQL에 정산 greedy, N빵, 환율 곱을 넣지 않는다. 저장·FK·단순 목록 필터만 한다.

## ER 요약

- users (로그인 주체 — Member와 분리)
- projects
- project_members
- categories
- expenses
- expense_shares
- settlements
- settlement_transfers
- currencies
- fx_quotes          — 시세 (지출과 독립)
- (expenses 안의 fx_* 컬럼) — 스냅샷

여행 테이블 없음.

## currencies

시세가 아니다. 최소 단위만 정의한다.

- `code` CHAR(3) PK
- `minor_digits` SMALLINT NOT NULL  -- 0: KRW, JPY / 2: USD, EUR, CNY 등
- `name` TEXT NOT NULL

시드 후보: KRW 0, JPY 0, USD 2, EUR 2, CNY 2. 1차에 어떤 코드를 **입력 가능**하게 열지는 미정.

## users

- `id` UUID PK
- `email` TEXT UNIQUE NULL
- `display_name` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL

## projects

- `id` UUID PK
- `name` TEXT NOT NULL
- `base_currency` CHAR(3) NOT NULL REFERENCES currencies
- `created_by` UUID NOT NULL REFERENCES users
- `archived_at` TIMESTAMPTZ NULL
- `created_at` TIMESTAMPTZ NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

## project_members

- `id` UUID PK
- `project_id` UUID NOT NULL REFERENCES projects
- `user_id` UUID NULL REFERENCES users
- `nickname` TEXT NOT NULL
- `role` TEXT NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- UNIQUE (project_id, nickname)

`user_id` NULL 허용 여부는 미정.

## categories

- `id` UUID PK
- `project_id` UUID NOT NULL REFERENCES projects
- `name` TEXT NOT NULL
- UNIQUE (project_id, name)

전역 카테고리면 이 테이블 형태가 바뀐다. 미정.

## expenses

지출 달력 날짜와 시스템 시각을 분리한다.

- `id` UUID PK
- `project_id` UUID NOT NULL REFERENCES projects
- `payer_member_id` UUID NOT NULL REFERENCES project_members
- `category_id` UUID NOT NULL REFERENCES categories
- `expense_date` DATE NOT NULL
- `title` TEXT NOT NULL
- `note` TEXT NULL
- `currency` CHAR(3) NOT NULL REFERENCES currencies
- `amount_minor` BIGINT NOT NULL CHECK (amount_minor > 0)
- `fx_rate` NUMERIC(18, 8) NOT NULL CHECK (fx_rate > 0)
- `fx_custom` BOOLEAN NOT NULL DEFAULT FALSE
- `fx_quoted_at` TIMESTAMPTZ NULL
- `settlement_id` UUID NULL REFERENCES settlements
- `created_at` TIMESTAMPTZ NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

`expense_date`: 사용자가 고른 지출일. 시간 없음. 문자열 `"09-10"` / `"4월 17일"` 금지.

`created_at` / `updated_at`: 서버 기록 시각.

이전 초안의 `occurred_on`과 같은 역할이다. 컬럼명은 이 문서에서 `expense_date`로 통일 제안. 확정은 미정.

인덱스: `(project_id, expense_date)`, `(project_id, settlement_id)`.

`fx_rate` 등은 **이 행의 스냅샷**이다. `fx_quotes`를 바꿔도 이 값은 갱신하지 않는다.

기준 통화 지출이면 `fx_rate = 1`을 Application이 넣는다. 트리거 여부는 미정.

## expense_shares

- `id` UUID PK
- `expense_id` UUID NOT NULL REFERENCES expenses ON DELETE CASCADE
- `member_id` UUID NOT NULL REFERENCES project_members
- `share_minor` BIGINT NOT NULL CHECK (share_minor >= 0)
- UNIQUE (expense_id, member_id)

합 = `expenses.amount_minor`는 Application 트랜잭션에서 검증한다. DB 트리거는 선택.

`share_minor`의 통화는 부모 Expense와 같다.

## settlements / settlement_transfers

정산 **기록**용. 계산 과정은 테이블에 풀어 쓰지 않는다.

settlements:

- `id`, `project_id`, `status`, `base_currency`
- `created_at` TIMESTAMPTZ NOT NULL
- `closed_at` TIMESTAMPTZ NULL

settlement_transfers:

- `from_member_id`, `to_member_id`, `amount_minor` (기준 통화)
- `is_paid` BOOLEAN — 1차 사용 여부는 미정
- CHECK (from_member_id <> to_member_id)

## fx_quotes

지출이 아니다. 기본 시세 또는 외부 API를 정규화해 넣은 값.

- `id` UUID PK
- `project_id` UUID NULL REFERENCES projects  -- NULL = 전역 기본
- `quote_currency` CHAR(3) NOT NULL
- `base_currency` CHAR(3) NOT NULL
- `rate` NUMERIC(18, 8) NOT NULL
- `source` TEXT NOT NULL  -- 예: manual, api 이름. 도메인은 문자열 계약을 좁게 유지
- `quoted_at` TIMESTAMPTZ NOT NULL
- UNIQUE (project_id, quote_currency, base_currency)

정산 SELECT가 이 테이블을 조인해 재환산하지 않는다.

외부 API 원본 JSON을 여기 그대로 두지 않는 것을 기본으로 한다. 원본 로그가 필요하면 별도 인프라 테이블(미정).

## 넣지 않는 것

itinerary, essentials, map URL, day 번호, Firestore expenses 배열 JSON.

## 결정 필요 사항

1. DB 엔진 확정 (PostgreSQL 기본안).
2. `expense_date` vs `occurred_on` 최종 컬럼명.
3. `fx_rate` NUMERIC vs 정수 스케일 컬럼 (`rate_unscaled` + `rate_scale`).
4. share 합 트리거 여부.
5. `users` / `categories` / `settlement_transfers.is_paid` 1차 포함.
6. 타임존: `TIMESTAMPTZ` vs `TIMESTAMP`. `expense_date`는 타임존 없는 DATE로 두는 것은 이 문서에서 고정 제안.
