# 계산 테스트 케이스

금액은 settlement 기준 문자열(Decimal).

## Share 합

| id | 설명 | 기대 |
| --- | --- | --- |
| SH1 | shares 100+50, settlement 150 | 저장 허용 |
| SH2 | shares 100+50, settlement 149 | 거부 |
| SH3 | 음수 share 포함, 합 = settlement | 허용 |
| SH4 | share 0 | 거부 |
| SH5 | payer가 share에 없음 | 허용 |

## 부담 현황

| id | 지출 | 기대 |
| --- | --- | --- |
| B1 | A가 360000 결제, shares A 164000 외 | A 차액 +196000 |
| B2 | 전원 잔액 합 | 0 |

## 최소 송금

| id | balances | 기대 |
| --- | --- | --- |
| T1 | A +30000, B -10000, C -20000 | B→A 10000, C→A 20000 (2건) |
| T2 | 모두 0 | [] |
| T3 | A +10, B -10, C +5, D -5 | 2건 (두 쌍이 독립 상쇄) |
| T4 | 여러 채권자/채무자 | 횟수 = n - max zero-sum groups |
| T5 | 음수 Expense 포함 잔액 | 같은 알고리즘 |
