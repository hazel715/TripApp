# 계산 규칙

계약만 적는다. 절차는 [settlement-algorithm.md](./settlement-algorithm.md), 환전은 [currency-conversion.md](./currency-conversion.md), 반올림은 [rounding-rules.md](./rounding-rules.md).

구현 위치: `packages/domain/src/calculation`. Presentation·SQL·환율 HTTP 클라이언트에 두지 않는다.

## 원칙

- UI는 표시만. 합계·분할·정산·환율 곱을 컴포넌트에서 하지 않는다.
- SQL은 저장과 필터. greedy 매칭이나 `amount * rate`를 쿼리에 넣지 않는다.
- 함수는 순수하다. 시계, DB, fetch를 호출하지 않는다. 필요 값은 인자다.
- 금액은 정수 minor (`bigint` 또는 동등). IEEE `number`로 잔액을 더하지 않는다.
- 외부 시세 JSON이 바뀌어도 이 패키지의 시그니처는 유지한다. 매핑은 Infrastructure.

## 모듈

```
toMinor(majorDigits, currency) -> Money
toMajorDisplay(money) -> string          # 포맷 자체는 Presentation에 맡겨도 됨. 변환만 domain
convert(money, snapshot, baseCurrency) -> Money
splitEqual(money, memberIds) -> Share[]
accumulateBalances(expensesConverted) -> Balances
planTransfers(balances) -> Transfers
```

이름은 제안이다. 공개 API를 이 책임에서 벗어나게 넓히지 않는다.

## 파이프라인

1. 원 통화 Money (Expense.amountMinor)
2. ExpenseFxSnapshot으로 기준 통화 Money (결제 총액 1회 환산)
3. 기준 통화에서 균등 분할 (레거시와 같은 순서)
4. 멤버별 paid / owed / balance
5. transfers

share를 원 통화로 저장한 뒤 각각 환산하는 경로는 1차 표준이 아니다. 바꾸려면 [결정 필요 사항](#결정-필요-사항).

## 레거시 원본

모두 `app.jsx` 안. Domain 모듈이 아니다.

| 함수 | 줄 | 역할 | 신규 위치 |
| --- | --- | --- | --- |
| `getConvertedAmount` | 378–382 | float 곱 + Math.round | `convert` |
| 목록 합계 | 390, 592 | UI reduce | Application이 convert 합을 내려주거나 domain을 한 번 호출 |
| `calculateSettlement` | 392–407 | float 나눗셈 + greedy | `accumulateBalances` + `planTransfers` |
| 퀵메모 금액 | 294–301 | 파싱 | 계층 미정 |

## 테스트

같은 입력 → 같은 transfers. [../testing/calculation-cases.md](../testing/calculation-cases.md).

## 결정 필요 사항

1. share 저장 통화 (원 vs 기준). 파이프라인 3과 연동.
2. 목록 합계를 api가 계산해 줄지, 웹이 domain을 호출할지.
3. 퀵메모 파서를 calculation에 넣을지.
