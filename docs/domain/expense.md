# Expense

계산 규칙은 [../calculation/calculation-rules.md](../calculation/calculation-rules.md). 컬럼은 [../data/database-schema.md](../data/database-schema.md).

## 정의

Project 안에서 한 번의 지출. 결제자 1명, 부담자 1명 이상.

## 필드 (개념)

| 개념 | 레거시 (`app.jsx`) | 신규 |
| --- | --- | --- |
| id | `Date.now().toString()` | UUID |
| project | 없음 (전역 1문서) | Project FK |
| occurredOn | `date` 문자열 `"4월 17일"` / `"일자 미지정"` | `DATE`, NULL 금지. 미정일은 제품에서 없앤다 |
| title | `title` | 필수 문자열 |
| amount | `amount` number (원 통화 단위) | 원 통화 **최소 단위 정수** `amountMinor` |
| currency | `CNY` \| `USD` \| `KRW` | Currency code |
| fxRate | `exchangeRate` (원당 KRW) | 기준 통화 1단위당 비율 스냅샷. KRW→KRW는 1 |
| fxCustom | `customRate` boolean | 동일 |
| payer | `payer` 닉네임 | ProjectMember FK |
| category | 한글 라벨 | Category FK 또는 Project 내 코드 |
| note | `note` | 선택 |
| createdAt / updatedAt | 없음 (퀵메모만 note에 시각) | timestamptz |
| settlement | 없음 | nullable Settlement FK (정산에 묶이면 설정) |

## ExpenseShare

레거시는 `included: string[]`만 있고 인원수로 나눈다. 부담 금액 컬럼이 없다.

신규:

- Expense 1 : N ExpenseShare
- 각 행: member, `shareMinor` (지출 **원 통화** 최소 단위)
- 모든 share 합 = `amountMinor`
- MVP 입력: 참여자 선택 → 서버가 균등 분할 함수로 share를 만든다
- 2차: 사용자가 share를 직접 수정

결제자가 share에 없을 수 있다. 레거시와 같다. 이 경우 결제자는 돈을 냈지만 그 지출의 소비 부담은 다른 사람에게만 있다.

## 검증

- title 비공백, amountMinor > 0
- payer는 해당 Project의 활성 또는 당시 멤버
- share 최소 1행
- currency가 기준 통화가 아니면 fxRate > 0
- 수정 시 이미 Settlement에 묶인 지출은 거부하거나 정산을 먼저 취소 (제품 결정)

레거시 검증은 title/amount만 있고 included가 빈 배열이 될 수 있다. 빈 참여자는 신규에서 거부한다 (`length || 1` 방어 코드가 있던 이유).
