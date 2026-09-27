# Currency

환율 적용은 [exchange-rate.md](./exchange-rate.md), 변환 공식은 [../calculation/currency-conversion.md](../calculation/currency-conversion.md).

## 정의

ISO 4217 코드와 최소 단위(minor unit) 메타데이터. 환율 값이 아니다.

## 1차 지원

| code | 이름 | minor digits | 레거시 |
| --- | --- | --- | --- |
| KRW | 원 | 0 (1원) | 있음, 환율 1 |
| CNY | 위안 | 2 | 있음, 기본 188.50 KRW |
| USD | 달러 | 2 | 있음, 기본 1385.00 KRW |

레거시는 통화를 select 3개로 하드코딩한다. 모델/테이블이 없다.

## 금액 저장

UI는 `300`, `10.50`처럼 보여도 DB는 `amountMinor`만 저장한다.

- KRW 300 → 300
- CNY 300.00 → 30000
- USD 10.50 → 1050

레거시는 `parseFloat(amount)` 후 `amount * rate`를 JS number로 한다. 신규는 이 방식을 쓰지 않는다.

## 기준 통화

Project.baseCurrency. MVP는 KRW만 사용하더라도 컬럼은 둔다.

표시 금액은 항상 기준 통화로 합산한다. 레거시 목록의 `toLocaleString()원`과 같다.
