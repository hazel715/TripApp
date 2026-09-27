# ExchangeRate

변환 수학은 [../calculation/currency-conversion.md](../calculation/currency-conversion.md).

## 레거시 실측

위치: `app.jsx`.

| 항목 | 레거시 동작 |
| --- | --- |
| 통화 모델 | 없음. `'CNY'\|'USD'\|'KRW'` 문자열 |
| 환율 모델 | 지출 객체 필드 `exchangeRate`, `customRate` |
| 조회 | 없음 |
| API | 없음 |
| 캐시 | 없음. 상수 `DEFAULT_CNY_RATE = 188.50`, `DEFAULT_USD_RATE = 1385.00` |
| 기준 통화 | 암묵적 KRW |
| 환산 금액 | `Math.round(amount * rate)` , KRW는 `amount` 그대로 |
| 적용 시점 | 저장 시 폼의 rate가 지출에 복사됨. 이후 상수 변경은 기존 행에 영향 없음 (행에 rate가 있으면). rate 누락 시에만 현재 상수 fallback |
| 수수료 | 없음 |
| 오류 처리 | parse 실패 시 USD/CNY 기본 상수. 네트워크 환율 오류 없음 |
| 직접 입력 | `customRate`가 false면 상수 표시, true면 number input |

이 중 **지출에 환율을 스냅샷**하는 것과 **수동 오버라이드**는 유지할 가치가 있다.

## 신규 모델

1. **FxDefaults** — 앱 또는 Project의 기본 시세. 사람이 고친다. API가 있으면 여기만 갱신.
2. **Expense 스냅샷** — `fxRate`, `fxRateSource` (`default` \| `manual` \| `api`), `fxQuotedAt`
3. **ExchangeRateHistory** (2차) — API 응답 캐시. 정산 재계산의 원천이 아니다. 원천은 항상 지출 스냅샷.

정산은 현재 시세가 아니라 **각 지출의 스냅샷**으로 환산한다. 레거시와 동일한 비즈니스 의미다.

## 환율 의미

레거시 rate는 “외화 1단위 = N KRW”다 (CNY 1 = 188.50원).

신규도 Project.baseCurrency가 KRW일 때 같은 의미로 저장한다.

`rate`는 유리수여야 하므로 DB는 `NUMERIC` (예: 12,6). 계산 시 정수 금액에 곱한 뒤 반올림한다.

## API (2차)

레거시에 구현이 없으므로 설계만 둔다.

- 외부 시세 제공자를 어댑터 뒤로 숨긴다
- 실패 시 마지막 성공 캐시 또는 Project 기본값. 지출 저장을 막지 않고 수동 입력을 요구할 수 있다
- 캐시 TTL은 제품 결정

1차에서는 상수/설정값 + 수동 입력만 구현한다.
