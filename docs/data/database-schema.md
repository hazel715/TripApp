# 데이터베이스 스키마 (제안)

기존 Firestore 문서를 복사하지 않는다. 레거시 형태는 [../legacy/legacy-analysis.md](../legacy/legacy-analysis.md). 무결성은 [data-rules.md](./data-rules.md). 개념은 [../domain/domain-model.md](../domain/domain-model.md).

대상 엔진은 **PostgreSQL** (신규 DB). Legacy Firestore를 persistence로 쓰지 않고, Firestore 문서 구조를 스키마의 기준으로 삼지 않는다.

SQL에 정산 greedy, N빵, 환율 곱을 넣지 않는다. 저장·FK·단순 목록 필터·트랜잭션 일관성만 한다.

금액은 최소 단위 정수 `BIGINT`. 환율은 `NUMERIC(18, 8)` (부동소수점 금지). 사용자가 고른 지출 달력 날짜는 `DATE`. 서버 생성/수정/이벤트 시각은 `TIMESTAMPTZ`.

## ER 요약

- users (로그인 주체 — Member와 분리)
- projects
- project_members
- categories          — 전역. Project FK 없음
- expenses            — settlement_id 없음
- expense_shares
- settlements         — Project 시점 마감 이력
- settlement_transfers
- currencies
- fx_quotes           — 수동/테이블 기본 시세 (지출과 독립)
- (expenses 안의 fx_* 컬럼) — 이 지출에 실제 적용된 스냅샷

여행 테이블 없음.

## currencies

시세가 아니다. 최소 단위만 정의한다.

- `code` CHAR(3) PK
- `minor_digits` SMALLINT NOT NULL  -- 0: KRW, JPY / 2: USD, EUR, CNY 등
- `name` TEXT NOT NULL

시드 예: KRW 0, JPY 0, USD 2, EUR 2, CNY 2. 지원 통화 집합은 몇 개로 고정하지 않고 확장 가능하게 둔다.

## users

- `id` UUID PK
- `email` TEXT UNIQUE NULL
- `display_name` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL

## projects

- `id` UUID PK
- `name` TEXT NOT NULL
- `base_currency` CHAR(3) NOT NULL REFERENCES currencies
- `settlement_status` TEXT NOT NULL DEFAULT 'open'
  -- `'open'` | `'settled'`. Project 전체의 **현재** 정산 상태
- `created_by` UUID NOT NULL REFERENCES users
- `archived_at` TIMESTAMPTZ NULL
- `created_at` TIMESTAMPTZ NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

`settlement_status`: 현재 ledger가 마감되어 있으면 `settled`, 아니면 `open`. Expense 생성/수정/삭제 후 반드시 `open`. Settlement 확정 시 `settled`. 과거 `settlements` 행은 이력으로 남긴다.

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

전역 분류. Project별 데이터가 아니다. 여러 Project 지출을 category로 aggregate할 수 있어야 한다.

- `id` UUID PK
- `name` TEXT NOT NULL
- UNIQUE (name)

`project_id` 없음.

## expenses

지출 달력 날짜와 시스템 시각을 분리한다. Expense는 Settlement에 속하지 않는다. `settlement_id` 컬럼 없음.

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
- `created_at` TIMESTAMPTZ NOT NULL
- `updated_at` TIMESTAMPTZ NOT NULL

`expense_date`: 사용자가 고른 지출일. 시간 없음. 문자열 `"09-10"` / `"4월 17일"` 금지.

`created_at` / `updated_at`: 서버 기록 시각.

인덱스: `(project_id, expense_date)`.

정산 여부는 Expense 행이 아니라 `projects.settlement_status`로 본다.

`fx_rate` 등은 **이 행에 실제 적용된 스냅샷**이다. 같은 Project 안에서도 지출마다 다를 수 있다. payer가 달라도 각 행에 적용 시점의 rate를 둔다. `fx_quotes`나 Project 기본 시세를 바꿔도 이 값은 갱신하지 않는다. 요청의 수동 override면 `fx_custom = TRUE`.

기준 통화 지출이면 `fx_rate = 1`을 Application이 넣는다. 트리거 여부는 미정.

## expense_shares

- `id` UUID PK
- `expense_id` UUID NOT NULL REFERENCES expenses ON DELETE CASCADE
- `member_id` UUID NOT NULL REFERENCES project_members
- `share_minor` BIGINT NOT NULL CHECK (share_minor >= 0)
- UNIQUE (expense_id, member_id)

모든 share의 `share_minor` 합 = 부모 `expenses.amount_minor`. Application 트랜잭션에서 검증한다. DB 트리거는 선택.

MVP부터 share 행을 저장한다. 균등 분할은 기본값일 뿐, 참여자별 실제 부담액을 직접 넣을 수 있다.

`share_minor`의 통화는 부모 Expense와 같다.

결제자만 share 100%인 개인 지출도 유효하다.

## settlements / settlement_transfers

Project 전체 ledger의 **시점 마감 이력**. 개별 Expense의 상태가 아니다. 계산 과정은 테이블에 풀어 쓰지 않는다.

settlements:

- `id` UUID PK
- `project_id` UUID NOT NULL REFERENCES projects
- `status` TEXT NOT NULL  -- 이력 행 자체. Project 현재 `settlement_status`와 별개
- `base_currency` CHAR(3) NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL
- `closed_at` TIMESTAMPTZ NULL

한 행은 그 순간 Project를 닫은 기록이다. 이후 Expense가 바뀌면 Project는 다시 `open`이 되고, 이 행은 삭제하지 않는다.

settlement_transfers:

- `from_member_id`, `to_member_id`, `amount_minor` (기준 통화)
- `is_paid` BOOLEAN — 1차 사용 여부는 미정
- CHECK (from_member_id <> to_member_id)

## fx_quotes

지출이 아니다. 1차의 수동/테이블 기반 기본 시세 (`ManualFxQuote`). 외부 실시간 FX API를 1차에 쓰지 않는다. 포트는 Infrastructure에 둔다.

이 값은 **기본/캐시 시세**다. Expense에 적용되는 환율이 아니다. 적용 순간 `expenses.fx_*`에 스냅샷한다. Project 전체에 환율 하나만을 강제하지 않는다.

- `id` UUID PK
- `project_id` UUID NULL REFERENCES projects  -- NULL = 전역 기본, 값 = 해당 Project 기본 시세
- `quote_currency` CHAR(3) NOT NULL
- `base_currency` CHAR(3) NOT NULL
- `rate` NUMERIC(18, 8) NOT NULL
- `source` TEXT NOT NULL  -- 예: manual. 도메인은 문자열 계약을 좁게 유지
- `quoted_at` TIMESTAMPTZ NOT NULL
- UNIQUE (project_id, quote_currency, base_currency)

정산 SELECT가 이 테이블을 조인해 재환산하지 않는다. 정산은 각 Expense 스냅샷만 사용한다.

외부 API 원본 JSON을 여기 그대로 두지 않는 것을 기본으로 한다. 원본 로그가 필요하면 별도 인프라 테이블(미정).

## 넣지 않는 것

itinerary, essentials, map URL, day 번호, Firestore expenses 배열 JSON.

## 결정 필요 사항

1. share 합 트리거 여부.
2. `users` / `settlement_transfers.is_paid` 1차 포함.
3. `project_members.user_id` NULL 허용.
4. `fx_quotes.project_id` NULL(전역 기본)과 Project 기본 시세를 1차에 둘 다 둘지.
