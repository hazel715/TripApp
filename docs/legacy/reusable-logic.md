# 재사용 로직 (KEEP / REIMPLEMENT)

제거는 [removal-plan.md](./removal-plan.md). 현재 파일은 사실상 `app.jsx` 한 개라 **파일 단위 KEEP(복사)** 은 거의 없다. 가치는 알고리즘과 UX다.

## KEEP

새 저장소에 파일을 그대로 두지 않는다. 아래는 **명세로 보존**하고 core 테스트로 고정할 동작이다.

| 항목 | 경로 | 이유 |
| --- | --- | --- |
| 지출 환율 스냅샷 | `app.jsx` `saveExpense` exchangeRate/customRate | 나중에 시세가 바뀌어도 그 지출 정산이 흔들리지 않음 |
| KRW 단축 | `getConvertedAmount` KRW 분기 | 기준 통화 identity |
| 기본 시세 상수 의미 | `DEFAULT_CNY_RATE`, `DEFAULT_USD_RATE` | 값이 아니라 “Project 기본율” 개념 |
| 정산 부호 | balance = paid − share, 양수=받을 돈 | 표 UI와 일치 |
| greedy 송금 | `calculateSettlement` while/min | 3~10명 규모에 충분, 동작이 예측 가능 |
| 1 minor 미만 무시 | `<= -1` / `>= 1` | 잔돈 루프 방지 |
| 전체 환산 후 N빵 | amt 변환 후 `included.length`로 나눔 | [../calculation/currency-conversion.md](../calculation/currency-conversion.md) 표준 |
| 퀵메모 의도 | `saveQuickMemo` 정규식 | 현장 입력 UX. 별칭은 일반화 |
| `만원` ×10000 | 301행 | KRW 편의 |
| 그룹핑 3축 | date/payer/category | 가계부 조회 패턴 |
| 동시 추가 의도 | `arrayUnion` | “읽기-수정-쓰기 전체 배열” 대신 행 INSERT로 재현 |
| 커스텀 환율 체크박스 UX | 667–672행 | 수동 오버라이드 |

KEEP은 **복사해 쓸 코드**가 아니라 **회귀 테스트로 잠글 규칙**이다. `app.jsx`를 packages로 옮기지 마라. Firebase 키, 익명 auth, 배열 저장은 KEEP이 아니다.

## REIMPLEMENT

| 항목 | 경로 | 이유 |
| --- | --- | --- |
| 지출 엔티티 | expenses 배열 원소 | Project/Share/일자 DATE/minor 정수 필요 |
| 멤버 | `MEMBERS` 상수 | ProjectMember + User |
| 카테고리 | `CATEGORIES` | Project 또는 테이블 |
| `getConvertedAmount` | 378–382 | float `amount * rate` → INTEGER 공식 |
| `calculateSettlement` | 392–407 | 하드코딩 3키, float 나눗셈, UI 내부 |
| 퀵메모 파서 | 294–305 | 한글 실명 하드코딩. 별칭 주입형으로 |
| 지출 폼/목록/정산 모달 | 581–702 | 결합도 높은 JSX. 컴포넌트 분리 + core 호출 |
| Confirm modal | 754–758 | 재사용 가능하나 앱에서 분리 |
| 클라우드 동기화 | `syncToCloud`, snapshot | PostgreSQL API로 교체 |
| 인증 | anonymous | 실제 계정 |
| 금액 input | `type=number` parseFloat | major 입력 → minor 변환 |
| 정렬 | `localeCompare` on 한글 날짜 | `occurred_on` DATE 정렬 |
| ID | `Date.now().toString()` | UUID |
| 정산 결과 | 모달 IIFE | preview API + 저장 |

## 보존 시 주의

레거시 정산의 float 나눗셈과 `Math.round(transfer)`는 **버그 재현용**으로만 테스트 픽스처에 남길 수 있다. 프로덕션 정본은 정수 분배 ([../calculation/rounding-rules.md](../calculation/rounding-rules.md)).
