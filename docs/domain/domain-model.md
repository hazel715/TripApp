# 도메인 모델

이 문서는 개념과 계층 위치만 담당한다.

- 지출: [expense.md](./expense.md)
- 정산: [settlement.md](./settlement.md)
- 통화: [currency.md](./currency.md)
- 환율: [exchange-rate.md](./exchange-rate.md)
- 계산 계약: [../calculation/calculation-rules.md](../calculation/calculation-rules.md)
- 컬럼: [../data/database-schema.md](../data/database-schema.md)
- 계층 배치: [../backend/service-architecture.md](../backend/service-architecture.md)

## 집계 루트

```
Project
├── ProjectMember          (owner | member)
├── Expense
│    └── ExpenseShare
└── (정산 엔티티 없음)

User
Category                   (전역)
FxQuote                    (시세 저장소. 지출과 별개)
```

여행, 일정, 장소, Settlement, SettlementTransfer 엔티티는 없다.

## 계층에서의 위치

| 개념 | 계층 | 비고 |
| --- | --- | --- |
| Money, Currency, Expense 불변식 | Domain | |
| 부담 현황, 최소 송금 횟수 | Domain | |
| CreateExpense, GetBurdenStatus, GetFinalSettlement | Application | |
| Drizzle row | Infrastructure | 도메인 모델과 1:1 강제 금지 |
| 날짜 표시 포맷 | Presentation | |

Repository 인터페이스는 Domain, 구현은 Infrastructure.

의미 없는 작은 rule/policy 파일을 엔티티마다 쪼개지 않는다.

## User와 Member

User는 로그인 주체(email). ProjectMember는 Project 안의 역할과 표시 이름이다.

멤버 추가는 이메일로 한다. 해당 User가 없으면 생성한 뒤 멤버로 넣는다.

## 금액 (Money)

Domain은 `decimal` 스케일 4 금액을 쓴다. PostgreSQL `NUMERIC(18,4)`와 맞춘다.

- 0 금지 (Expense amount, settlement_amount, share_amount)
- 양수·음수 허용
- JS `number` 누적 금지

Share 금액의 통화는 부모 Expense의 `settlement_currency`다.

## 날짜

| 개념 | 의미 | 타입 |
| --- | --- | --- |
| expenseDate | 사용자가 말하는 지출 달력 날짜. 시간 없음 | DATE, NULL 허용 |
| createdAt / updatedAt | 레코드 시각 | TIMESTAMPTZ |

UI는 신규 입력 시 오늘 날짜를 기본값으로 보여 준다.
