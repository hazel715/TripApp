# 정산 알고리즘

의미는 [../domain/settlement.md](../domain/settlement.md). 구현은 Domain. UI/SQL 아님.

## 현재 부담 현황

저장·송금 없이 집계만 한다.

```
paid[user] += expense.settlement_amount   if payer
shareTotal[user] += share.share_amount
difference[user] = paid - shareTotal
```

이 화면에서 transfers를 계산하지 않는다.

## 최종 정산 — 최소 송금 횟수

입력: 사용자별 `balance` (difference와 동일). 합은 0.

0에 가까운 잔액(스케일 4에서 0)은 제외한다.

소규모 인원(일반적인 여행/모임)을 전제로, 부분집합 합이 0이 되는 분할을 최대화한다.

```
n = 0이 아닌 잔액 인원 수
maxZeroGroups = 잔액 합이 0인 서로소 부분집합의 최대 개수
minTransfers = n - maxZeroGroups
```

각 영합 그룹 안에서 채무자→채권자 매칭으로 실제 송금 행을 만든다. 그룹 크기 k이면 송금 k-1건.

Greedy 전체 매칭만으로 끝내지 않는다. 예: 이미 상쇄되는 부분 그룹이 있으면 그 그룹을 먼저 닫아 횟수를 줄인다.

음수 Expense/Share가 있어도 같은 잔액 정의로 처리한다.

결과를 DB에 쓰지 않는다.
