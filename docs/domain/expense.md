# Expense

계산 규칙은 [../calculation/calculation-rules.md](../calculation/calculation-rules.md). 컬럼은 [../data/database-schema.md](../data/database-schema.md).

## 정의

Project 안에서 한 번의 지출. 결제자 1명, Share 1행 이상. Project에 속한다. Settlement에 속하지 않는다.

생성 UX: 금액·정산금액·환율 입력 → 참여자 선택 → 기본 equal split → 각 share를 수정할 수 있다.

## 필드 (개념)

| 개념 | 레거시 (`app.jsx`) | 신규 |
| --- | --- | --- |
| id | `Date.now().toString()` | UUID |
| project | 없음 | Project FK |
| expenseDate | `"4월 17일"` 문자열 | `DATE`, NULL 허용. UI 기본값 오늘 |
| description | `title` | 필수 |
| amount | JS number | 결제 통화 `NUMERIC(18,4)` |
| currency | `CNY` \| `USD` \| `KRW` | CHAR(3), 행에 반드시 저장 |
| fxRate | `exchangeRate` | `1 currency = fx_rate settlement_currency`. 동일 통화면 NULL 가능 |
| settlementAmount | `amount * rate` 근사 | 사용자가 확정. 곱과 강제 일치하지 않음 |
| settlementCurrency | 암묵적 KRW | CHAR(3) |
| payer | 닉네임 | `payer_user_id` |
| category | 한글 라벨 | 전역 Category FK, NULL 허용 |
| shares | `included[]` 균등만 | ExpenseShare.share_amount |

## ExpenseShare

- PK `(expense_id, user_id)`
- `share_amount`는 settlement 기준. currency 없음
- `SUM(share_amount) = settlement_amount` 필수
- 음수 Share = 해당 사용자 부담 감소
- 0 금지
- payer가 share에 없을 수 있다 (대신 결제)

## 검증

- description 비공백
- amount ≠ 0, settlement_amount ≠ 0, 각 share ≠ 0
- share 최소 1행, 합 = settlement_amount
- payer·share user는 해당 Project 멤버 (신규/수정 시)
- closed여도 변경 가능. 성공 시 Project `active`
