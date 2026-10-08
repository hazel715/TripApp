# 통화 변환

MVP에서 정산은 **이미 저장된 `settlement_amount`** 를 더한다. 조회 시점에 `amount * fx_rate`를 다시 하지 않는다.

사용자가 입력한 의미:

```
1 currency = fx_rate settlement_currency
```

자동 시세 적용 없음. `fx_quotes`를 정산 SELECT에 조인하지 않는다.
