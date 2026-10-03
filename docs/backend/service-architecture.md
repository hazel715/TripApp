# 서비스 아키텍처

API 경로 목록은 [api.md](./api.md). 데이터 규칙 [../data/data-rules.md](../data/data-rules.md). 계산 [../calculation/calculation-rules.md](../calculation/calculation-rules.md).

구현은 시작하지 않는다. 이 문서는 계층과 디렉터리, 의존 규칙만 적는다.

기존 `app.jsx`를 파일별로 나누는 것이 목적이 아니다. 비즈니스 규칙과 도메인 모델을 추출해 일반적인 그룹 비용 관리 서비스로 재구성한다.

## 레거시

백엔드 없음. 브라우저가 Firestore를 직접 읽고, 같은 파일에서 환산·정산한다. 이 구조를 persistence·realtime으로 재사용하지 않는다.

## 계층과 책임

```
Presentation          apps/web
        ↓ HTTP
Application           apps/api/src/application
        ↓
Domain                packages/domain
        ↑ 포트(인터페이스)
Infrastructure        apps/api/src/infrastructure
```

Infrastructure는 Domain이 정의한 포트(예: `FxQuotePort`, `ExpenseRepository`)를 구현한다. Domain은 React, HTTP, PostgreSQL, Firebase SDK, 외부 API/SDK에 의존하지 않는다.

### Presentation

- 화면, React / Web, form
- `expenseDate`를 `"09-10"` 등으로 **표시**
- 합계·N빵·정산·`amount * rate` 금지
- 서버가 내려준 `amountBaseMinor` 등을 보여 주는 것은 허용
- Command/CRUD는 HTTP. 동기화는 realtime channel (구현 기술은 미정)

### Application

- 유스케이스 오케스트레이션
- 트랜잭션 경계
- Project 단위 동시성 조정 (Project row lock)
- repository 호출
- FX quote 조회 후 Domain에 필요한 값 전달 (`Money`, `FxSnapshot`, share 목록)
- Domain 결과를 persist
- commit 성공 후에만 realtime publish를 Infrastructure에 요청

예: `CreateExpense`, `UpdateExpense`, `DeleteExpense`, `PreviewSettlement`, `ConfirmSettlement`.

### Domain

- 순수 비즈니스 로직·불변식 (share 합 = amount, 참여자 ≥ 1, snapshot rate 필수)
- `Money`, `Expense`, `ExpenseShare`, `Settlement`, FX 관련 계산/검증
- `packages/domain/src/calculation`
  - 지출 환산
  - 균등 분할 (기본 share 생성)
  - 잔액
  - 정산 송금
  - 반올림

외부 환율 JSON, ORM 엔티티, React state, HTTP, PostgreSQL을 모른다.

### Infrastructure

- PostgreSQL repository
- 인증 어댑터 (방식은 미정)
- FX 어댑터 (`ManualFxQuote` / 테이블. 이후 외부 API를 붙일 포트)
- HTTP transport
- realtime transport (WebSocket / SSE 등은 미정)

API 응답 필드명이 바뀌면 어댑터만 수정한다.

## 디렉터리 제안

```
apps/web/src/
  screens/
  components/
  lib/api.ts
  lib/formatDate.ts          # DATE → 표시 문자열
apps/api/src/
  application/
    project/
    expense/
    settlement/
  infrastructure/
    persistence/
    auth/
    fx/
      ManualFxQuoteAdapter.ts
    http/
    realtime/
packages/domain/src/
  model/
  calculation/
    money.ts
    convert.ts
    split.ts
    settle.ts
  policy/
packages/domain/test/
  calculation/
```

프레임워크 폴더 관례(Nest `modules/` 등)는 도구 확정 후 이 논리 구조를 그 관례에 옮긴다.

## 유스케이스와 계산의 경계

처리 순서:

Client → HTTP → Application → Domain 검증/계산 → PostgreSQL transaction → commit 성공 → realtime event → 연결된 클라이언트 동기화.

Realtime event는 consistency 수단이 아니다. source of truth는 PostgreSQL이다.

### 지출 생성/수정/삭제

1. Application: 입력 검증(형식), 멤버가 그 Project인지
2. 트랜잭션 시작. `projects` 행 lock
3. Infrastructure: `fx_quotes`(기본 시세) 또는 요청의 수동 rate. 적용 값은 Domain에 전달
4. Domain: major→minor, snapshot 조립, share (요청 share 또는 균등 기본값), 불변식 (합 = amount)
5. Infrastructure: expense + shares persist. `projects.settlement_status = 'open'`
6. commit
7. realtime publish

이후 `fx_quotes` UPDATE는 기존 지출 행을 다시 계산하지 않음.

### 정산 preview

1. Application: 현재 Project ledger 로드 (SQL은 필터만. `settlement_id`로 지출을 고르지 않음)
2. Domain: 각 지출의 **스냅샷**으로 환산 → 잔액 → transfers
3. Presentation: 표 렌더. `Math.round` 재적용 금지
4. DB에 Settlement를 쓰지 않음

### 정산 확정

트랜잭션:

1. 멤버십
2. `SELECT projects … FOR UPDATE` (Project 행 lock)
3. 현재 Project ledger 조회
4. Domain: preview와 동일 계산·검증
5. INSERT settlement(+ transfers)
6. `projects.settlement_status = 'settled'`
7. commit
8. realtime publish

지출 행에 settlement FK를 쓰지 않는다. Expense 변경과 Settlement 확정이 동시에 와도 Project lock + 트랜잭션이 최종 일관성을 보장한다.

## 환율 어댑터

```
ManualFxQuote / fx_quotes 행
    → infrastructure/fx/*Adapter
    → FxQuote { quote, base, rate, quotedAt }
    → application이 CreateExpense에 전달
    → domain은 FxQuote만 사용
    → persist 시 expenses.fx_rate 스냅샷
```

1차는 실시간 외부 FX API를 쓰지 않는다. 포트는 둔다. 이후 외부 API를 붙이면 어댑터만 추가한다.

Domain에 provider 필드명, 타임스탬프 포맷, 에러 코드를 넣지 않는다.

## Presentation의 계산 미리보기

입력 중 환산액을 보여 주려면:

- A: web이 `packages/domain`을 의존 (같은 함수, 서버와 불일치 위험은 번들 공유로 감소)
- B: debounce로 api preview
- C: Presentation은 대략값도 안 보여 줌

선택하지 않는다. [결정 필요 사항](#결정-필요-사항)

## 실시간

Command/CRUD는 HTTP request-response. Live 동기화는 realtime channel.

구현이 WebSocket인지 SSE인지는 정하지 않는다. Firestore `onSnapshot`을 새 시스템의 realtime으로 쓰지 않는다.

이벤트는 DB commit 이후에만 발행한다.

## 시크릿

DB URL, 인증, (향후) 시세 API 키는 Infrastructure 환경 변수. 브라우저에 관리자 키를 두지 않는다.

## 결정 필요 사항

1. 웹이 domain 패키지를 직접 의존할지.
2. API 프레임워크.
3. 1차 인증 방식.
4. realtime 구현 기술 (WebSocket vs SSE 등).
5. 정산 확정 시 transfer 행 필수 여부.
6. 퀵메모 파서 계층 (Domain vs Application).
