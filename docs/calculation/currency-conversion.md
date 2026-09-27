# 통화 변환

메타: [../domain/currency.md](../domain/currency.md). 시세 vs 스냅샷: [../domain/exchange-rate.md](../domain/exchange-rate.md). 반올림: [rounding-rules.md](./rounding-rules.md).

Domain `convert`만 이 공식을 가진다. 환율 API 파서는 Infrastructure.

## 레거시 원본

`app.jsx` `getConvertedAmount` 378–382.

```
if KRW: return amount
rate = exchangeRate || (USD ? 1385 : 188.50)
return Math.round(amount * rate)
```

의미: 외화 1 major × KRW 시세 → 원. 빈 스냅샷은 **현재 상수**로 메운다.

신규 정산은 빈 스냅샷을 오류로 본다. 저장 유스케이스가 스냅샷을 채운다.

기본 상수와 커스텀 체크는 시세/폼 문제이지 convert 공식이 아니다.

## 스냅샷 의미 (고정)

`FxSnapshot.rate`: quote **1 major** = `rate` base **major**. 레거시와 같다 (CNY 1 = 188.50 KRW).

정산은 지금 `fx_quotes`가 아니라 이 값만 사용한다.

## 정수 공식 (float 곱 금지)

```
baseMinor = halfUp(
  amountMinor * rateUnscaled * 10^(baseDigits - quoteDigits)
  / rateScale
)
```

`rateUnscaled / rateScale`은 `NUMERIC` rate를 정수화한 것이다. 중간값을 JS `number`에 넣지 않는다.

### 검산 (레거시와 같은 숫자)

CNY 300 major, digits 2, minor 30000, rate 188.50, base KRW digits 0  
→ `30000 * 188.50 / 100` = 56550.

USD 10.50, minor 1050, rate 1385  
→ `1050 * 1385 / 100` = 14542.5 → half-up 14543.

JPY는 KRW와 같이 digits 0이면 위안·달러와 자릿수 보정이 다르다. 예: JPY 500, rate가 “1엔 = N base major”로 스냅샷되면 `500 * rateUnscaled / rateScale * 10^(baseDigits - 0)`.

EUR는 USD와 같이 digits 2.

## 분배와의 순서

1차 표준: **총액을 기준 통화로 한 번 환산한 뒤** 그 정수 금액을 `splitEqual`. 레거시(`amt` 환산 후 `/ n`)와 같다.

원 통화 share를 각각 convert하면 합이 1 minor 어긋날 수 있다. 그 경로는 표준이 아니다.

## 어댑터 경계

허용되지 않음: Domain이 `rates.USD_KRW` 같은 provider 필드를 읽음.

허용: Infrastructure가 `(USD, KRW, rate, quotedAt)`으로 정규화.

## 결정 필요 사항

1. `rate`를 DB NUMERIC으로 두고 변환 직전에만 정수 스케일할지.
2. `rateScale` 고정값 (예: 10^8) .
3. base가 KRW가 아닌 Project에서 스냅샷 의미 (quote 1 major = base 몇 major)를 그대로 쓸지.
4. 수수료를 rate에 포함할지. 레거시는 없음.
