# 반올림·정밀도

금액은 `NUMERIC(18,4)` / Decimal. JS float 누적 금지. PostgreSQL NUMERIC은 문자열로 읽고 쓴다.

## 균등 분할

`settlement_amount`를 참여자 수로 나누고 소수 4자리에서 자른 뒤, 합이 원 금액과 같아지도록 나머지 한 명에게 잔차를 더한다.

0이 되는 share는 저장하지 않는다. 그 경우 나머지 참여자에게만 배분하거나, 배분할 수 없으면 검증 실패.

## 환율 곱

저장 시 `amount * fx_rate == settlement_amount`를 강제하지 않는다. 화면에서 힌트 값을 보여줄 수는 있으나 정본은 사용자가 확정한 `settlement_amount`다.

## 잔액

최종 비교는 Decimal. “0”은 스케일 4에서 정확히 0.
