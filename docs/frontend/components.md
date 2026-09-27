# 프론트엔드 컴포넌트

화면 목록은 [screens.md](./screens.md).

레거시는 `ChengduTripApp` 단일 컴포넌트다. 신규에서 나눌 단위만 적는다. 여행 컴포넌트는 만들지 않는다.

## 재구현할 UI 패턴 (레거시 참고 줄)

| 신규 컴포넌트 | 레거시 위치 | 이유 |
| --- | --- | --- |
| ExpenseList | 581–617 | 그룹핑 헤더 + 행 |
| ExpenseRow | 596–607 | 뱃지/환산/원통화 |
| ExpenseFormModal | 644–681 | 필드 구성 |
| FxRateField | 667–672 | 커스텀 환율 + 환산 미리보기 |
| MemberToggle | 674–676 | N빵 참여자 |
| QuickMemoModal | 633–641 | 한 줄 입력 |
| SettlementModal | 684–702 | 표 + 송금 가이드 |
| ConfirmModal | 754–758 | 삭제 확인 |
| BottomSummaryBar | 613–616 | 총액 + CTA |
| FabStack | 621–630 | 퀵메모/추가 |

환산 미리보기는 폼 입력값을 API/core 함수에 넣어 받은 정수를 보여 준다. 컴포넌트가 `amount * rate`를 직접 하지 않는다. 타이핑 중 디바운스 로컬 호출은 `ledger-core` 순수 함수면 허용 (서버 왕복 불필요).

## 상태

레거시: 전부 `useState` + Firestore `onSnapshot`.

신규 제안:

- 서버 상태: React Query 등
- 모달 열림만 로컬 state
- 전역 클라이언트 스토어에 정산 결과를 중복 저장하지 않음

## 쓰지 않는 레거시 UI

`renderEvent`, 일정 편집 모달, essentials 모달, 요약 탭, 헤더 Notion/체크리스트 버튼, lucide 여행 아이콘 맵.
