# 재사용 로직 (KEEP / REIMPLEMENT)

현재 파일은 사실상 `app.jsx` 한 개라 **파일 단위 KEEP(복사)** 은 없다.

## KEEP (명세로 보존)

- 지출에 적용 환율/정산액을 행에 남긴다
- balance = paid − share, 양수 = 받을 돈
- Quick Memo 한 줄 입력 UX (별칭은 Project display_name으로 일반화)
- 그룹 비용 UX: 결제자, 참여자, 카테고리
- payer가 참여자가 아닐 수 있음

## 명시적으로 버린 레거시 규칙

- Firestore / 익명 auth / 배열 문서
- `DEFAULT_*_RATE` fallback으로 정산
- JS float `amount * rate` 및 greedy-only 송금
- 금액 0만 거절하고 음수 없음 → 신규는 0 금지, 음수 허용
- 정산 결과를 화면에 greedy로 항상 표시 → 신규는 최종 정산 요청 시에만 송금 목록
- 하드코딩 3명 멤버

`app.jsx`를 packages로 옮기지 않는다. Firebase 키를 신규 코드에 복사하지 않는다.
