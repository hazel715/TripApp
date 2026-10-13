# TripApp Refactory

프로젝트 단위 공동 가계부 MVP. 기존 `app.jsx`와 루트 `index.html`은 청두 여행 레거시로 보존하며, 신규 웹은 `web/`에서 실행한다.

React → Fastify HTTP API → Application → 순수 Domain과 repository port → Infrastructure(PostgreSQL/Drizzle). 정산 결과는 저장하지 않는다.

## 개발 실행

Node.js 24 LTS 권장(최소 22.12), npm, PostgreSQL 16 이상이 필요하다. Docker를 사용할 수 있으면:

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d
npm run db:migrate
```

Docker 없이 PostgreSQL을 직접 실행하는 경우 `.env`의 `DATABASE_URL`을 수정한다. 두 터미널에서 각각:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

웹: http://localhost:5173, API: http://localhost:3001. `WEB_ORIGIN`과 실제 브라우저 주소의 origin은 일치해야 한다. Vite는 `/api`를 API로 proxy한다.

이메일을 입력하면 **개발용 메일 adapter가 API 터미널에 로그인 링크를 출력**한다. 링크를 브라우저에서 열면 신규 가입/로그인되고 HttpOnly session cookie가 발급된다. 링크는 15분, 1회 사용이며 세션 기본 만료는 30일이다. `.env`에서 기간을 변경할 수 있다. DB에는 원문 token 대신 SHA-256 hash만 저장한다.

운영 이메일 provider는 아직 연결하지 않았다. 기본 서버는 `NODE_ENV=production`에서 개발용 이메일을 사용하지 않도록 시작을 거절한다. 운영 연결 시 `EmailSender` 구현을 주입하고 secure cookie를 사용해야 한다.

## MVP 사용

1. 로그인 후 프로젝트 이름·기본 결제 통화·정산 통화를 지정한다.
2. owner가 이메일·표시 이름으로 멤버를 추가한다. 기존 지출은 멤버 제거/사용자 비활성화로 삭제되지 않는다.
3. 전역 카테고리를 선택하거나 추가한다.
4. 지출 금액·통화·환율·확정 정산 금액을 입력하고 참여자를 선택한다. 균등 분할을 기본 적용하며 개별 부담액을 수정할 수 있다.
5. Share 합이 정산 금액과 같아야 저장된다. 결제자가 참여자일 필요는 없다. 0 금액은 금지하고 음수는 허용한다.
6. 현재 부담 현황에는 통화별 결제·부담·차액만 표시한다. **최종 정산 보기**를 눌러야 최소 송금 횟수 제안을 조회한다.
7. SSE 변경 알림이 오면 상단 알림 버튼으로 재조회한다. 입력 중인 화면은 자동 갱신하지 않는다.

Quick Memo 예: `점심 12000 민수 철수`, `환불 -0.0001만원 철수`. 서버 파싱 결과를 폼에서 확인한 뒤 저장한다.

Expense의 정산 통화 override를 허용하므로 현황/최종 정산은 **통화별 배열**을 반환한다. 다른 통화 금액을 직접 합산하거나 조회 시 환산하지 않는다. 외부 FX 자동 연동은 없으며 `fx_quotes`는 향후 저장 구조만 준비했다.

## 검증

```powershell
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run db:generate
```

`npm test`는 단위/API 테스트를 실행하고 실제 DB 테스트는 명시적으로 skip한다. `npm run test:integration`은 테스트 전용 PostgreSQL을 포트 15439에 띄워 migration·transaction·동시 인증을 검증하고 종료한다. 테스트 데이터는 무시되는 `.test-data/`에 남는다. PostgreSQL 실행 환경 제약이 있으면 테스트 전용 DB를 제공한다:

```powershell
$env:TEST_DATABASE_URL="postgres://user:password@localhost:5432/tripapp_test"
npm run test:integration
```

운영 DB 주소를 테스트에 사용하지 않는다. TEST_DATABASE_URL DB에는 migration과 고유 ID의 테스트 행이 생성된다. CI는 PostgreSQL 16 service를 사용한다.

`npm run build`는 모든 TS workspace와 React 정적 산출물(`web/dist`)을 검증·생성한다. 현재 API 실행 방식은 `tsx`를 사용하는 workspace 소스 실행이다. 운영 배포/메일 연결은 별도 작업이다.

## 구조

- `domain/src/`: Money, Expense/Share, Project/Member, User, Category, repository port, 정확한 최소 송금 계산
- `application/src/`: 인증·프로젝트·멤버·지출·카테고리·현황/최종정산·Quick Memo use case
- `infrastructure/src/postgres/`: Drizzle schema, migration, PostgreSQL repository, transaction
- `infrastructure/src/email/`, `realtime/`: 개발 이메일, 단일 API 프로세스 SSE broker
- `api/src/`: Fastify controller/route, 인증 cookie, 검증, SSE endpoint
- `web/src/`: React 화면, Expense/Share 입력
- `docs/`: 결정사항과 구현 문서; 현재 상태는 [refactory-progress.md](docs/refactory-progress.md)

세부 endpoint는 [API 문서](docs/backend/api.md), 데이터 모델은 [DB 문서](docs/data/database-schema.md)를 참고한다.

## 현재 제한

- 정확한 최종 정산은 통화별 **0이 아닌 잔액 20명까지** 계산한다. 초과 시 근사 결과를 반환하지 않고 명시적으로 거절한다. 알고리즘은 O(n·2ⁿ)이며 소규모 여행/모임 대상이다.
- SSE broker는 단일 프로세스 메모리 방식이며 끊긴 동안의 이벤트 replay가 없다. 다중 API 인스턴스 운영에는 공유 broker가 필요하다. 원장은 PostgreSQL에 보존된다.
- Project 삭제·상태 수동 변경, User 비활성화 UI/API는 MVP에서 제공하지 않는다. 상태/보존 규칙과 closed → active 동작은 구현·테스트했다.
- 자동 FX, 실서비스 이메일 발송, 레거시 데이터 임포트는 미구현이며 확정된 MVP 범위 밖이다.

개발 의존성 감사에는 Drizzle 도구 관련 moderate 4건이 남아 있다. 운영 의존성 감사는 0건이며 상세 검증 상태는 진행 문서를 참고한다.
