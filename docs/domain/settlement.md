# Settlement (계산, 저장하지 않음)

알고리즘은 [../calculation/settlement-algorithm.md](../calculation/settlement-algorithm.md).

정산은 엔티티가 아니다. 테이블도 없다. Project ledger를 읽어 계산한다.

두 기능을 섞지 않는다.

## A. 현재 부담 현황

여행 중 언제든 조회한다.

사용자별:

- 실제 결제액: payer인 Expense의 `settlement_amount` 합
- Share 총액: 해당 user의 `share_amount` 합
- 차액 = 결제액 − Share 총액

참고용이다. 송금 지시로 표현하지 않는다.

## B. 최종 정산

사용자가 명시적으로 “최종 정산 보기”를 요청한 때만 송금 제안을 계산한다.

`balance = 결제액 − Share 총액`

- 양수: 받을 금액
- 음수: 지불할 금액

이어서 **최소 송금 횟수**를 보장하는 송금 목록을 만든다. Greedy만으로 끝내지 않는다.

결과는 DB에 저장하지 않는다.

## Project status

`active` | `closed`. 레거시/이전 초안의 `open`/`settled`와 다르다.

Expense 변경이 있으면 closed → active.

정산 조회가 Project를 closed로 바꾸지 않는다. closed는 운영상 마감 표시이며, 변경이 생기면 다시 연다.
