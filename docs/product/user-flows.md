# 사용자 흐름

화면 구성은 [../frontend/screens.md](../frontend/screens.md).

## 1. 로그인

1. 이메일을 넣는다.
2. one-time link를 받는다 (개발 환경은 서버 로그).
3. 링크를 연다. 기존 사용자는 login, 없으면 signup.
4. session이 발급되고 Project 목록으로 간다.

## 2. Project

1. 이름, 기본 지출 통화, 정산 통화를 넣고 만든다. 생성자는 owner.
2. 이메일로 멤버를 추가한다.
3. 상세에서 지출 목록을 본다.

## 3. 지출

1. 결제자, 카테고리, 일자(기본 오늘), 설명, amount, currency, fx_rate, settlement_amount, settlement_currency, Share를 넣는다.
2. Share를 생략하면 선택한 참여자에게 settlement_amount를 균등 분할한다.
3. 합이 맞지 않으면 저장되지 않는다.
4. 수정/삭제도 동일 규칙. closed Project는 저장 후 active.

## 4. Quick Memo

한 줄 예: `점심 12000 민수 철수`. 서버가 파싱한 뒤 사용자가 확인·저장할 수 있다.

## 5. 현황과 최종 정산

1. 현재 부담 현황: 결제액 / Share / 차액. 송금 목록 없음.
2. “최종 정산 보기”를 눌렀을 때만 최소 송금 목록이 보인다.

## 6. 변경 알림

다른 클라이언트가 커밋하면 SSE로 알림이 온다. 사용자가 새로고침/재조회를 선택할 수 있다. 화면이 자동으로 덮이지 않는다.
