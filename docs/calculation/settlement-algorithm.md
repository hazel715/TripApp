# 정산 알고리즘

의미는 [../domain/settlement.md](../domain/settlement.md). 반올림은 [rounding-rules.md](./rounding-rules.md). 구현은 Domain `calculation`, UI/SQL 아님.

## 레거시 원본

`app.jsx` `calculateSettlement` 약 392–407행. 표시 약 690–698행.

```
paid, spent, balances = {MJ:0, JY:0, HJ:0}
for each expense:
  amt = getConvertedAmount(exp)          # Math.round된 KRW number
  paid[payer] += amt
  balances[payer] += amt
  splitAmt = amt / included.length       # float
  for person in included:
    spent[person] += splitAmt
    balances[person] -= splitAmt

debtors = balances[p] <= -1
creditors = balances[p] >= 1
sort desc, greedy min, transfer amount = round(pay)
```

문제: 멤버 3명 고정, float 나눗셈, 정산 미저장, `|balance|<1`을 float에 적용.

발견한 **다른 정산 규칙**(통화별 별도 송금, 정산일 재평가, 수수료)은 없다. 환산 후 한 통화로 닫는다.

## 신규 (정수 greedy)

입력: 이미 기준 통화 **정수** minor인 지출 목록 + 스냅샷 환산 완료분.

1. 지출마다 결제 총액을 한 번 convert.
2. `splitEqual`로 부담액 (정수).
3. `paid[payer] += convertedTotal`, `owed[member] += share`.
4. `balance = paid - owed`.
5. `|balance| < 1` minor → 0 (KRW·JPY는 1원/1엔, USD는 1센트).
6. 채무자/채권자 절댓값 내림차순, `min`으로 transfer. 추가 반올림 없음.

ILP 최소 송금 수는 요구하지 않는다. 레거시 greedy의 정수화다.

함수는 ORM/React 타입을 import하지 않는다.

```
accumulateBalances(items) -> { paid, owed, balance } per member
planTransfers(balanceMap) -> { transfers, remainder }
```

`remainder` 처리(무시 vs 최대 채권자 흡수)는 [결정 필요 사항](#결정-필요-사항).

## 환전 후 정산

항상 기준 통화로 변환한 다음 정산한다. 통화별 송금 모드는 없음.

시세 테이블이 아니라 각 지출 스냅샷만 사용한다.

## 결정 필요 사항

1. `remainder` 흡수 여부.
2. 정산에 포함할 지출 집합 (미정산 전부 vs 선택).
3. 멤버 중 지출에 한 번도 안 나온 사람을 0행으로 넣을지.
