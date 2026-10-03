# Settlement

알고리즘은 [../calculation/settlement-algorithm.md](../calculation/settlement-algorithm.md). 이 문서는 의미와 상태만 다룬다.

## 정의

한 Project의 **현재 ledger**를 기준 통화로 닫는 사건. Project 전체의 시점 마감이다.

개별 Expense의 상태가 아니다. 선택된 지출 집합을 묶지 않는다. Expense에 `settlement_id`를 두지 않는다.

레거시 `calculateSettlement()`는 **조회 시점 계산**이다. 저장·완료 상태가 없다. 신규는 계산과 기록(`settlements` / `settlement_transfers`)을 분리한다.

목적은 특정 Expense에 정산 플래그를 붙이는 것이 아니라, 그 순간 Project 정산이 완료되었음을 기록하는 것이다.

## 상태

Project **현재** 상태 (`projects.settlement_status`):

| 상태 | 의미 |
| --- | --- |
| `open` | 현재 ledger가 마감되지 않음 (미정산) |
| `settled` | 현재 ledger 기준으로 정산이 확정됨 |

API `preview`는 저장하지 않은 계산 결과일 뿐, Project 상태가 아니다.

정산 확정 후 Expense가 생성/수정/삭제되면 기존 마감은 최신이 아니다. Project는 다시 `open`. 과거 `settlements` 행은 이력으로 유지한다.

송금 리마인더, 원클릭 정산, 배치 정산 UX는 이 문서에서 정하지 않는다. transfer 건별 완료 체크(`is_paid`) 1차 사용도 미정.

## 범위

- 대상은 해당 Project의 현재 지출 전체 (ledger)
- Expense를 Settlement에 포함/제외하지 않음
- 동시성은 Project 행 lock + 트랜잭션. 지출을 `settlement_id IS NULL`로 잠그지 않음

## 집계 의미

멤버별로 기준 통화 최소 단위:

- **paid**: 결제자로 기록된 환산액 합
- **owed** (레거시 `spent`): share 환산액 합
- **balance** = paid − owed  
  - 양수: 받을 돈 (채권자)  
  - 음수: 보낼 돈 (채무자)

환산은 각 Expense에 스냅샷된 `fx_rate`만 사용한다. `fx_quotes`를 조인해 다시 곱하지 않는다.

레거시 변수명 `spent`는 “소비액/부담액”이다. 신규 문서에서는 `owed`를 쓴다.

## SettlementTransfer

- fromMember, toMember, amountMinor (기준 통화)
- 합은 각 멤버 balance를 0에 가깝게 만든다 (잔여 오차는 반올림 규칙)

레거시 송금은 `Math.round`된 KRW 정수이고 1원 미만 balance는 무시한다 (`<= -1`, `>= 1`).
