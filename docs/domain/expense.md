# Expense

계산 규칙은 [../calculation/calculation-rules.md](../calculation/calculation-rules.md). 컬럼은 [../data/database-schema.md](../data/database-schema.md).

## 정의

Project 안에서 한 번의 지출. 결제자 1명, 부담자 1명 이상. Project에 속한다. Settlement에 속하지 않는다. `settlement_id` 없음.

정산 여부는 Expense에 두지 않는다. Project의 `settlement_status` (`open` | `settled`)로 본다.

생성 UX: 금액 입력 → 참여자 선택 → 기본 equal split → 각 참여자 share를 바로 수정할 수 있다.

## 필드 (개념)

| 개념 | 레거시 (`app.jsx`) | 신규 |
| --- | --- | --- |
| id | `Date.now().toString()` | UUID |
| project | 없음 (전역 1문서) | Project FK |
| expenseDate | `date` 문자열 `"4월 17일"` / `"일자 미지정"` | `DATE`, NULL 금지. 미정일은 제품에서 없앤다 |
| title | `title` | 필수 문자열 |
| amount | `amount` number (원 통화 단위) | 원 통화 **최소 단위 정수** `amountMinor` (`BIGINT`) |
| currency | `CNY` \| `USD` \| `KRW` | Currency code. 지원 집합은 고정하지 않음 |
| fxRate | `exchangeRate` (원당 KRW) | 이 지출에 적용된 기준 통화 비율 스냅샷 `NUMERIC(18, 8)`. 기준 통화 지출은 1 |
| fxCustom | `customRate` boolean | 동일. 지출별 수동 override 가능 |
| payer | `payer` 닉네임 | ProjectMember FK |
| category | 한글 라벨 | 전역 Category FK |
| note | `note` | 선택 |
| createdAt / updatedAt | 없음 (퀵메모만 note에 시각) | `TIMESTAMPTZ` |
| settlement | 없음 | 없음. Project `settlement_status`만 사용 |

`fxRate`는 저장 시점 스냅샷이다. 같은 Project 안에서도 지출마다 다를 수 있다. 이후 기본 시세가 바뀌어도 이 값은 바꾸지 않는다.

## ExpenseShare

레거시는 `included: string[]`만 있고 인원수로 나눈다. 부담 금액 컬럼이 없다.

신규 (MVP부터):

- Expense 1 : N ExpenseShare
- 각 행: member, `shareMinor` (지출 **원 통화** 최소 단위, `BIGINT`)
- 모든 share 합 = `amountMinor`
- 각 share는 참여자별 **실제 부담액**
- equal split은 기본값이다. 유일한 방식이 아니다. 사용자는 생성 시 각 share를 즉시 수정할 수 있다

결제자가 share에 없을 수 있다. 레거시와 같다. 이 경우 결제자는 돈을 냈지만 그 지출의 소비 부담은 다른 사람에게만 있다.

개인 지출도 유효하다. 예: payer = A, share = A 100%. A의 net impact = 0.

## 검증

- title 비공백, amountMinor > 0
- payer는 해당 Project의 활성 또는 당시 멤버
- share 최소 1행, 합 = amountMinor
- 기준 통화가 아니면 fxRate > 0. 기준 통화면 fxRate = 1
- 정산 완료(`settled`) 이후에도 Expense 생성/수정/삭제를 거부하지 않는다. 대신 해당 Project를 `open`으로 되돌린다

레거시 검증은 title/amount만 있고 included가 빈 배열이 될 수 있다. 빈 참여자는 신규에서 거부한다 (`length || 1` 방어 코드가 있던 이유).
