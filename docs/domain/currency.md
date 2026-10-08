# Currency

환율 적용은 [exchange-rate.md](./exchange-rate.md).

## 정의

ISO 4217 코드 `CHAR(3)`. 별도의 currencies 테이블은 MVP에 두지 않는다. 코드 형식을 Domain에서 검증한다.

금액 저장은 통화별 minor 정수가 아니라 `NUMERIC(18,4)` 다.

지원 통화를 세 개로 하드코딩하지 않는다. UI는 KRW / CNY / USD를 빠르게 고를 수 있게 두고, 다른 코드도 입력 가능하다.

## 기준 통화

Project `settlement_currency`가 정산 기준이다. `default_expense_currency`는 지출 입력 기본값이다.

Expense는 두 값을 행에 저장할 수 있고, 입력 시 override 가능하다.
