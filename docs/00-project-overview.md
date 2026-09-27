# 프로젝트 개요

이 문서는 신규 **프로젝트 단위 공동 가계부**의 아키텍처 지도다. 세부 규칙은 하위 문서를 따른다.

- 제품: [product/requirements.md](./product/requirements.md), [product/scope.md](./product/scope.md), [product/user-flows.md](./product/user-flows.md)
- 도메인: [domain/domain-model.md](./domain/domain-model.md)
- 데이터: [data/database-schema.md](./data/database-schema.md)
- 계산: [calculation/calculation-rules.md](./calculation/calculation-rules.md)
- 프론트: [frontend/screens.md](./frontend/screens.md)
- 백엔드: [backend/service-architecture.md](./backend/service-architecture.md)
- 레거시: [legacy/legacy-analysis.md](./legacy/legacy-analysis.md)

## 한 줄 정의

여러 사람이 참여하는 **Project**마다 지출을 기록하고, 통화가 달라도 기준 통화로 환산한 뒤, 누가 누구에게 얼마를 보내야 하는지 계산한다.

여행은 존재하지 않는다. “제주도 여행 1”, “장보기 1”, “공동생활비”는 모두 같은 Project다.

## 핵심 구조

```
Project
├── Member
├── Expense
│    └── ExpenseShare
├── Settlement
└── Currency / ExchangeRate
```

엔티티 의미는 [domain/domain-model.md](./domain/domain-model.md).

## 계층

의존 방향은 한 방향이다. 상세는 [backend/service-architecture.md](./backend/service-architecture.md).

```
Presentation     UI, React, form, 날짜 표시 포맷
       ↓
Application      유스케이스. 권한 확인 후 domain 호출, 트랜잭션 경계
       ↓
Domain           금액, 분할, 환산, 정산, 불변식. 외부 I/O 없음
       ↓
Infrastructure   PostgreSQL, 인증, 환율 시세 어댑터
```

계산은 Domain의 `calculation`에만 둔다. Presentation과 SQL은 비즈니스 계산을 하지 않는다.

## 레거시와의 관계

현재 저장소는 청두 여행 가이드와 가계부가 `app.jsx` 한 파일에 결합된 정적 웹앱이다.

- 기존 Firebase 문서를 운영 DB로 쓰지 않는다.
- 기존 스키마를 복사하지 않는다.
- 기존 앱 코드를 이 단계에서 삭제하거나 대량 수정하지 않는다.
- 재사용할 것은 정산/환율/지출 UX 패턴이다. [legacy/reusable-logic.md](./legacy/reusable-logic.md)
- 데이터 이관은 필수가 아니다. [data/migration-strategy.md](./data/migration-strategy.md)

### 환율: 레거시와 충돌하는 규칙이 있는지

**없다.** 레거시도 지출 저장 시 `exchangeRate`를 행에 붙인다. 정산은 그 값을 쓴다.

다른 중요 규칙 하나: rate가 **비어 있으면** 계산 시점에 앱 상수(`DEFAULT_CNY_RATE` / `DEFAULT_USD_RATE`)로 fallback한다. 이것은 스냅샷이 아니라 “현재 기본율”이다. 신규는 이 fallback을 정산에 쓰지 않는다. 저장 시 스냅샷을 필수화한다.

## 잠근 설계 (이 문서에서 고정)

1. 4계층 분리. Domain은 DB/HTTP/React를 import하지 않는다.
2. 금액은 통화별 **minor 정수**. JS `number`로 잔액을 누적하지 않는다.
3. 지출 환율은 Expense 스냅샷. 시세 테이블과 분리.
4. `expenseDate` = DATE, `createdAt` / `updatedAt` = TIMESTAMP. UI 문자열은 저장하지 않는다.
5. KRW·JPY처럼 minor digits = 0인 통화와 USD·EUR·CNY처럼 digits = 2인 통화를 `Currency.minorDigits`로 구분한다.

기술 스택 제품명(Nest vs Fastify 등)은 고정하지 않는다. 아래 결정 필요 사항.

## 제안 디렉터리 구조 (신규 저장소)

배포 단위와 계층을 맞춘다. 패키지 매니저/프레임워크 이름은 미정.

```
apps/
  web/                          # Presentation
    src/
      screens/
      components/
      lib/                      # HTTP 클라이언트, 날짜 포맷만
  api/                          # Application + Infrastructure 호스트
    src/
      application/              # 유스케이스 (CreateExpense, PreviewSettlement, …)
      infrastructure/
        persistence/            # SQL, 매퍼
        auth/
        fx/                     # 외부 시세 어댑터 (domain 모델로 변환)
        http/                   # 라우트, DTO
packages/
  domain/                       # Domain (I/O 없음)
    src/
      model/                    # Project, Expense, Money, Currency, …
      calculation/              # 환산, 분할, 정산
      policy/                   # 불변식 검증
    test/
docs/                           # 본 문서 세트
```

Presentation이 Domain을 직접 의존할지는 [결정 필요 사항](#결정-필요-사항). 기본 의존 그림은 web → api → domain 이다.

여행 일정, 지도, 준비물 디렉터리는 만들지 않는다.

레거시 `app.jsx`는 신규 트리에 복사하지 않는다.

## 추천 구현 순서

구현은 아직 시작하지 않는다. 순서만 제안한다.

1. `packages/domain` calculation + 테스트
2. Infrastructure persistence + Application Project/Member
3. Expense 유스케이스 (DATE, snapshot FX, shares)
4. Settlement preview / 확정
5. Presentation 목록·폼 (표시 포맷만)
6. 퀵메모, 권한, (선택) 시세 API 어댑터

## 위험

- Presentation에 레거시처럼 `amount * rate`를 남기면 계층이 다시 붕괴한다.
- rate 누락 fallback을 재현하면 과거 정산이 시세 변경에 흔들린다.
- `number`로 NUMERIC을 읽으면 환율 곱에서 다시 오차가 난다.
- 익명 공개 Firestore를 신규 인프라로 재사용하면 권한 경계가 없다.

## 결정 필요 사항

임의로 정하지 않은 항목이다. 구현 전에 확정한다.

1. API 프레임워크와 모노레포 도구.
2. Presentation이 `packages/domain`을 직접 호출해 입력 중 미리보기를 할지, api만 호출할지.
3. 1차 지원 통화 목록. 카탈로그에 JPY·EUR를 넣을지, 입력 가능 통화는 KRW/CNY/USD만인지.
4. Project 기준 통화를 KRW 외로 허용할지.
5. `fx_rate` 저장을 NUMERIC으로 두고 domain에서 정수 스케일로 바꿀지, DB에도 스케일 정수만 둘지.
6. 컬럼명 `expense_date` vs 이전 초안의 `occurred_on`.
7. 로그인 없는 로컬 Member(`user_id` NULL) 허용 여부.
8. 카테고리 전역 vs Project 소속.
9. 정산 잔여 1 minor를 채권자 흡수 vs remainder로만 반환.
10. 균등 분할 시 0 minor share 행을 남길지.
11. 정산 확정 후 지출 수정/취소 정책.
12. 실시간 동기화 1차 포함 여부.
13. 기존 청두 지출 임포트 여부.
14. 퀵메모 파서를 Domain에 둘지 Application에 둘지 (파싱은 계산이 아니라 입력 해석).
