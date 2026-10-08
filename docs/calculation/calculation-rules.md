# 계산 규칙

절차는 [settlement-algorithm.md](./settlement-algorithm.md). 구현 위치: `domain/` (순수 함수). Presentation·SQL에 두지 않는다.

## 원칙

- UI는 표시. 최소 송금·잔액 정본은 Domain
- SQL은 저장과 필터
- 함수는 순수하다
- 금액은 Decimal / NUMERIC. IEEE `number`로 잔액을 더하지 않는다
- `SUM(shares) == settlement_amount` 가 깨진 원장은 저장되지 않으므로, 잔액 총합은 0이다

## 모듈

```
assertSharesMatchSettlement(expense)
splitSettlementAmount(total, userIds) -> shares
accumulateBurden(expenses) -> { paid, shareTotal, difference } per user
planMinTransfers(balances) -> transfers
```

균등 분할은 settlement_amount를 참여자 수로 나누고 나머지(스케일 4)를 한 참여자에게 더해 합을 맞춘다. 0이 되는 share 행은 만들지 않는다.

## 파이프라인

1. 각 Expense의 `settlement_amount` (이미 정산 통화)
2. payer에 paid 가산, 각 share에 shareTotal 가산
3. difference = paid − shareTotal
4. (최종 정산 요청 시에만) 0이 아닌 잔액으로 최소 횟수 송금 계산

원 통화 amount는 정산 합산에 쓰지 않는다.
