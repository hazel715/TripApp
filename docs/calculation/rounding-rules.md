# 반올림 규칙

변환 식: [currency-conversion.md](./currency-conversion.md). 정산: [settlement-algorithm.md](./settlement-algorithm.md).

이 파일의 규칙만 Domain conversion/split/settle이 따른다. UI `toLocaleString`으로 다시 반올림하지 않는다.

## 목표

- 원장에는 그 통화의 최소 단위만 남긴다.
- KRW·JPY: 1원/1엔 (minorDigits = 0).
- USD·EUR·CNY: 0.01 (minorDigits = 2). 다른 digits는 Currency 테이블.
- 잔액 누적에 JS float를 쓰지 않는다.

## 환산: 양수 half-up to base minor

레거시 `Math.round`는 양수 0.5를 올림한다. 지출 금액은 양수다.

표준: **양수 half-up** (정확히 0.5 minor → 1 minor 올림).

음수 Money는 저장하지 않는다. 음수 잔액은 정산 부호일 뿐 환산 입력이 아니다.

구현은 정수 나눗셈의 나머지와 `2*rem >= divisor`로 판단한다. `Math.round` on float 금지.

## 균등 분할: 정수 몫·나머지

레거시 `amt / n` float는 쓰지 않는다.

```
q = floor(amt / n)
r = amt % n
정렬된 memberId 앞 r명은 q+1, 나머지 q
```

최대 오차 vs 레거시: n-1 minor. 의도된 변경이다.

0 minor를 받는 참여자 행을 남길지는 [결정 필요 사항](#결정-필요-사항).

## 정산 매칭

transfer 금액은 이미 정수 `min`. `Math.round` 없음.

`|balance| < 1` **해당 기준 통화 minor** 이면 0.

## 표시

Presentation은 정수 minor를 minorDigits로 나눠 문자열을 만든다. 그 과정에서 반올림 정책을 바꾸지 않는다.

## 수수료

없음. 넣을 경우 이 파일과 convert를 개정한다. 지금은 rate 수동 입력으로만 반영한다.

## 결정 필요 사항

1. banker’s rounding (half-to-even)으로 바꿀지. 현재 제안은 레거시 정렬 half-up.
2. 0 share 행.
3. 분할 멤버 순서: `memberId` 정렬 vs 사용자가 고른 included 순서 (레거시).
