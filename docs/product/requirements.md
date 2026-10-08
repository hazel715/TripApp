# 제품 요구사항

범위 경계는 [scope.md](./scope.md), 화면 흐름은 [user-flows.md](./user-flows.md).

## 문제

여러 사람이 특정 목적(장보기, 여행, 회식, 공동생활비)으로 돈을 쓰고, 누가 냈는지와 누가 부담하는지가 다르다. 통화가 섞이면 머리로 정산하기 어렵다.

## 목표

사용자는 이메일 링크로 로그인하고, Project를 만들고, 멤버를 넣고, 지출과 Share를 기록하고, 현재 부담 현황을 보며, 필요할 때만 최소 송금 횟수의 최종 정산을 본다.

## 사용자

- **member**: 지출 기록/조회, 현황·최종 정산 조회
- **owner**: 위 + 멤버 추가/제거, Project 생성 시 생성자가 owner

## 기능 요구사항

### 인증

Passwordless email. 비밀번호 없음. one-time link (짧은 만료, 1회) 후 session.

### Project

생성, 목록, 상세. `default_expense_currency`, `settlement_currency`, status `active` | `closed`.

### Member

이메일로 추가. 역할 owner | member. 제거해도 과거 지출 데이터는 유지.

### Expense / Share

불균등 Share 편집을 MVP에 포함한다. 합 = settlement_amount. 음수 허용. payer ≠ share user 허용.

### Category

전역. Project 소속 아님.

### Quick Memo

예: `점심 12000 민수 철수` → description, amount, participants. Application이 최종 파싱·검증.

### 정산

현재 부담 현황과 최종 정산(최소 송금)을 분리. 송금 결과 미저장.

### 실시간

SSE 변경 알림. 강제 refresh 없음.

### 비기능

- 계산은 테스트로 고정
- 금액은 Decimal
- 레거시 Firebase 키를 신규 코드에 복사하지 않음
