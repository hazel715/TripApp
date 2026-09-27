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
├── Member                 (구현명 ProjectMember)
├── Expense
│    └── ExpenseShare
├── Settlement
│    └── SettlementTransfer
└── (시세 기본값, 카테고리 — Project 설정)

Currency                   (코드 + minorDigits. 환율이 아님)
ExchangeRateQuote          (시세. 지출과 별개)
ExpenseFxSnapshot          (지출에 속한 값. 시세가 아님)
```

여행, 일정, 장소 엔티티는 없다.

## 계층에서의 위치

| 개념 | 계층 | 비고 |
| --- | --- | --- |
| Money, Currency, Expense 불변식 | Domain | |
| convert / splitEqual / settle | Domain / calculation | |
| CreateExpense, PreviewSettlement | Application | 스냅샷할 rate를 인프라에서 받아 domain에 넘김 |
| Expense 행, fx_defaults 행 | Infrastructure | |
| "09-10" 포맷 | Presentation | `expenseDate`를 포맷할 뿐 |

## User와 Member

핵심 다이어그램의 Member는 **Project 안의 참여자**다.

전역 로그인 주체 User는 멀티 프로젝트 때문에 필요할 가능성이 크다. Member와 User를 1:1로 강제할지는 [결정 필요 사항](#결정-필요-사항).

## 금액 (Money)

Domain은 금액과 통화를 한 값으로 다룬다.

```
Money { currencyCode, amountMinor: integer }
Currency { code, minorDigits }   # 0 = KRW/JPY, 2 = USD/EUR/CNY 등
```

- `amountMinor`는 그 통화의 최소 단위 개수다. KRW 1000원 → 1000. USD 10.50 → 1050. JPY 500 → 500.
- Domain 계산의 입출력은 이 정수다. `number` 누적 금지.
- UI major 입력(`10.50`) → minor 변환은 Domain 함수다. 컴포넌트가 `* 100` 하지 않는 것을 원칙으로 한다.

## 날짜

| 개념 | 의미 | 타입 |
| --- | --- | --- |
| expenseDate | 사용자가 말하는 지출 달력 날짜. 시간 없음 | DATE |
| createdAt | 레코드 생성 | TIMESTAMP(TZ) |
| updatedAt | 레코드 수정 | TIMESTAMP(TZ) |

둘을 섞지 않는다. 자정 지난 뒤 어제 영수증을 넣는 경우가 있다.

미지정 날짜 문자열(`일자 미지정`)은 도메인에 없다.

## 환율 두 종류

| 종류 | 역할 | 정산에 쓰나 |
| --- | --- | --- |
| ExchangeRateQuote / fx_defaults | 지금 쓸 기본 시세, 또는 API 캐시 | 아니오. 신규 지출 폼을 채울 때만 |
| ExpenseFxSnapshot | 그 지출을 저장할 때 복사한 rate | 예. 유일한 환산 원천 |

레거시도 행에 `exchangeRate`를 저장한다. 다른 비즈니스 규칙(매일 재평가, 정산일 시세)은 발견되지 않았다. 빈 rate의 **현재 상수 fallback**만 제거한다. [../domain/exchange-rate.md](./exchange-rate.md)

## 레거시 매핑

| 레거시 | 신규 Domain |
| --- | --- |
| 앱 전체 | Project |
| `MEMBERS` | Member |
| `expenses[]` | Expense + ExpenseShare[] |
| `included[]` | Share 균등 생성 입력 |
| `exchangeRate` | ExpenseFxSnapshot |
| `DEFAULT_*_RATE` | ExchangeRateQuote |
| `calculateSettlement()` | calculation.settle (저장은 Settlement) |

## 결정 필요 사항

1. User 없이 Member만 둘지.
2. Category를 엔티티로 둘지 Expense의 문자열/코드로 둘지.
3. SettlementTransfer를 1차에 저장할지, preview만 할지.
4. Money 구현을 `bigint`만 쓸지, 언어 decimal 라이브러리를 쓸지. 어느 쪽이든 JS float 누적은 금지.
5. ExpenseShare.shareMinor의 통화: 원 통화 vs 기준 통화. 초안은 원 통화 share + 정산 시 총액 환산 후 분할. [../calculation/currency-conversion.md](../calculation/currency-conversion.md)
