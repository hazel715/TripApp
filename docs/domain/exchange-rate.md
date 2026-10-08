# ExchangeRate

## 레거시

지출 필드 `exchangeRate` + 앱 상수 fallback. 빈 rate면 현재 상수로 정산한다. 신규는 이 fallback을 쓰지 않는다.

## 신규

Expense에 사용자가 넣은 `fx_rate`와 `settlement_amount`가 정산 원천이다.

의미: `1 expense currency = fx_rate settlement currency`.

예: 100 USD, fx_rate 1350, settlement KRW, settlement_amount 135000.

`settlement_amount`는 수수료·카드 환율·반올림 때문에 `amount * fx_rate`와 다를 수 있다.

동일 통화면 `fx_rate`는 NULL일 수 있다.

## fx_quotes

테이블은 존재한다. MVP에서 Expense 폼을 자동으로 채우지 않는다.

외부 FX API는 구현하지 않는다. Infrastructure `FxQuotePort`만 둔다.
