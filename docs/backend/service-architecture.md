# 서비스 아키텍처

API 경로 목록은 [api.md](./api.md). 데이터 규칙 [../data/data-rules.md](../data/data-rules.md). 계산 [../calculation/calculation-rules.md](../calculation/calculation-rules.md).

구현은 시작하지 않는다. 이 문서는 계층과 디렉터리, 의존 규칙만 적는다.

## 레거시

백엔드 없음. 브라우저가 Firestore를 직접 읽고, 같은 파일에서 환산·정산한다. 이 구조를 재사용하지 않는다.

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

Infrastructure는 Domain이 정의한 포트(예: `FxQuotePort`, `ExpenseRepository`)를 구현한다. Domain이 SDK를 import하지 않는다.

### Presentation

- 화면, React component, form
- `expenseDate`를 `"09-10"` 등으로 **표시**
- 합계·N빵·정산·`amount * rate` 금지
- 서버가 내려준 `amountBaseMinor` 등을 보여 주는 것은 허용

### Application

- 사용자 요청 유스케이스
- 멤버십·트랜잭션 경계
- Infrastructure에서 quote를 읽고, Domain에 `Money` + `FxSnapshot`으로 전달
- Domain 결과를 persist

예: `CreateExpense`, `UpdateExpense`, `PreviewSettlement`, `ConfirmSettlement`.

### Domain

- 불변식 (share 합, 참여자 ≥ 1, snapshot rate 필수)
- `packages/domain/src/calculation`
  - 지출 환산
  - 균등 분할
  - 잔액
  - 정산 송금
  - 반올림

외부 환율 JSON, ORM 엔티티, React state를 모른다.

### Infrastructure

- PostgreSQL
- 인증
- 환율 HTTP 클라이언트 → Domain `FxQuote`로 매핑하는 어댑터
- 라우트/DTO

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
      SomeProviderAdapter.ts
    http/
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

### 지출 생성

1. Application: 입력 검증(형식), 멤버가 그 Project인지
2. Infrastructure: `fx_quotes` 또는 요청의 수동 rate
3. Domain: major→minor, snapshot 조립, 균등 split, 불변식
4. Infrastructure: INSERT expense + shares. 스냅샷 컬럼 포함
5. 이후 시세 UPDATE는 이 행을 다시 계산하지 않음

### 정산 preview

1. Application: 미정산 지출 로드 (SQL은 필터만)
2. Domain: 각 지출의 **스냅샷**으로 환산 → 잔액 → transfers
3. Presentation: 표 렌더. `Math.round` 재적용 금지

### 정산 확정

트랜잭션:

1. 멤버십
2. `SELECT … WHERE settlement_id IS NULL FOR UPDATE`
3. Domain preview와 동일 함수
4. INSERT settlement(+ transfers), UPDATE expenses

## 환율 어댑터

```
External API JSON
    → infrastructure/fx/*Adapter.parse()
    → FxQuote { quote, base, rateScaled, quotedAt }
    → application이 CreateExpense에 전달
    → domain은 FxQuote만 사용
```

Domain에 provider 필드명, 타임스탬프 포맷, 에러 코드를 넣지 않는다.

1차에서 외부 API를 안 써도 포트는 둔다. 구현은 `ManualFxQuote` / 테이블 읽기.

## Presentation의 계산 미리보기

입력 중 환산액을 보여 주려면:

- A: web이 `packages/domain`을 의존 (같은 함수, 서버와 불일치 위험은 번들 공유로 감소)
- B: debounce로 api preview
- C: Presentation은 대략값도 안 보여 줌

선택하지 않는다. [결정 필요 사항](#결정-필요-사항)

## 실시간

1차는 요청-응답을 기본안으로 둔다. Firestore `onSnapshot` 재현은 미정.

## 시크릿

DB URL, 인증, 시세 API 키는 Infrastructure 환경 변수. 브라우저에 관리자 키를 두지 않는다.

## 결정 필요 사항

1. 웹이 domain 패키지를 직접 의존할지.
2. API 프레임워크.
3. 1차 인증 방식.
4. 정산 확정 시 transfer 행 필수 여부.
5. 퀵메모 파서 계층 (Domain vs Application).
