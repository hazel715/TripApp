# 계산 테스트 케이스

규칙 출처: [../calculation/rounding-rules.md](../calculation/rounding-rules.md), [../calculation/settlement-algorithm.md](../calculation/settlement-algorithm.md), [../calculation/currency-conversion.md](../calculation/currency-conversion.md).

금액은 기준 KRW, minor digits 0 기준. CNY/USD는 별도 표기.

## 변환

| id | 입력 | 기대 |
| --- | --- | --- |
| C1 | KRW 10000, rate 1 | 10000 |
| C2 | CNY 300 major, rate 188.50 | 56550 |
| C3 | USD 10.5 major, rate 1385 | 14543 |
| C4 | CNY 1, rate 188.50 | 189 (`Math.round(188.5)`) |
| C5 | USD 1, rate 1385 | 1385 |

## 균등 분할 (기준 통화 정수)

| id | amt | n | 기대 (정렬된 멤버) |
| --- | --- | --- | --- |
| S1 | 1000 | 3 | 334, 333, 333 |
| S2 | 100 | 2 | 50, 50 |
| S3 | 1 | 3 | 1, 0, 0 — MVP에서 share_minor ≥ 0 허용. 0 share 멤버를 넣을지 제품 결정. 넣지 않으면 참여자를 금액 있는 인원만 |

S3는 구현 전 결정. 권장: 참여자로 선택된 전원에게 행을 만들되 0 허용.

## 정산 (3인, 레거시 시나리오)

멤버 A B C.

| id | 지출 (이미 KRW) | paid / owed / transfers |
| --- | --- | --- |
| T1 | A가 30000, ABC 균등 | paid A 30000; owed 10000 each; T: B→A 10000, C→A 10000 |
| T2 | 지출 없음 | transfers [] |
| T3 | A 10000 ABC, B 10000 ABC, C 10000 ABC | transfers [] (잔액 0) |
| T4 | A가 100 KRW, 참여자 A만 | 모두 0에 가까움, transfers [] |
| T5 | A가 1000, 참여자 B만 | B→A 1000 |
| T6 | 변환 후 T1과 동일해지는 CNY 지출 | C2로 300 CNY @188.50, 참여자 3명 |

## 임계값

| id | 설명 |
| --- | --- |
| R1 | 각 잔액 절댓값 0이면 송금 없음 |
| R2 | 분할 잔차만 있는 경우 transfer 합 = 총 양수 잔액 |

## 퀵메모 파서 (레거시 294–302)

| 입력 | payer | currency | amount major | title 힌트 |
| --- | --- | --- | --- | --- |
| `mj 훠궈 300` | MJ | CNY 기본 | 300 | 훠궈 |
| `혜진 $10 택시` | HJ | USD | 10 | 택시 |
| `jy 3만원 간식` | JY | KRW | 30000 | 간식 |
| `민정 달러 20` | MJ | USD | 20 | (숫자/이름 제거 후) |

매칭 키: mj\|민정\|전민정, jy\|진영\|허진영, hj\|혜진\|박혜진. 신규는 Project 닉네임/별칭 테이블로 일반화해야 하며 하드코딩 한글 이름은 core 기본값이 아니라 Project 설정이다.
