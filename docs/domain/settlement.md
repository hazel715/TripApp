# Settlement

알고리즘은 [../calculation/settlement-algorithm.md](../calculation/settlement-algorithm.md). 이 문서는 의미와 상태만 다룬다.

## 정의

한 Project에서 선택된 지출 집합을 기준 통화로 닫는 사건.

레거시 `calculateSettlement()`는 **조회 시점 계산**이다. 저장·완료 상태가 없다. 신규는 계산과 기록을 분리한다.

## 상태

| 상태 | 의미 |
| --- | --- |
| `preview` | 저장하지 않은 계산 결과 (API 응답) |
| `open` | 확정됨. 송금이 남아 있을 수 있음 |
| `closed` | 모든 Transfer가 완료로 표시됨 |

MVP는 `preview`와 즉시 `closed`(송금은 오프라인으로 했다고 가정)만 둬도 된다. `open` + 건별 체크는 2차.

## 포함 지출

- 기본: `settlement_id IS NULL`인 지출 전부
- 한 지출은 최대 한 Settlement에 속한다

## 집계 의미

멤버별로 기준 통화 최소 단위:

- **paid**: 결제자로 기록된 환산액 합
- **owed** (레거시 `spent`): share 환산액 합
- **balance** = paid − owed  
  - 양수: 받을 돈 (채권자)  
  - 음수: 보낼 돈 (채무자)

레거시 변수명 `spent`는 “소비액/부담액”이다. 신규 문서에서는 `owed`를 쓴다.

## SettlementTransfer

- fromMember, toMember, amountMinor (기준 통화)
- 합은 각 멤버 balance를 0에 가깝게 만든다 (잔여 오차는 반올림 규칙)

레거시 송금은 `Math.round`된 KRW 정수이고 1원 미만 balance는 무시한다 (`<= -1`, `>= 1`).
