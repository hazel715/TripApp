# 서비스 아키텍처

React Web → HTTP → Fastify API → Application use case → Domain 검증/계산과 repository port → Infrastructure 구현 → PostgreSQL.

## 구현 상태와 레거시

같은 저장소의 web/api/application/domain/infrastructure에 MVP를 구현했다. 루트 app.jsx/index.html은 보존된 여행 가이드이며 신규 persistence나 realtime으로 사용하지 않는다.

## 책임과 의존성

- Presentation: React 화면/form/표시와 알림. API의 계산 결과를 표시한다. 균등 분할은 UX 편의로 Decimal을 사용하지만 저장 시 서버가 최종 검증한다.
- API: Fastify HTTP 입력 검증·인증·Application 호출·응답 직렬화. Settlement 전용 route/controller와 CRUD는 없다. Project 하위 read endpoint에서 현재 현황/최종정산을 조회한다.
- Application: 사용자 행동별 파일. auth·Expense·member 변경을 orchestration하고 트랜잭션 성공 후 변경 알림을 보낸다. Quick Memo 자연어 파싱은 이 계층에 있다.
- Domain: Money/Expense/Share/Project/Member/User/Category 규칙, 부담 현황, 정확한 최소 송금 계산과 repository interface. React/Fastify/HTTP/PostgreSQL/Drizzle/Firebase/외부 FX SDK에 의존하지 않는다.
- Infrastructure: PostgreSQL/Drizzle repository·transaction, 개발 EmailSender, SSE broker, clock/ID/token hash. DB 모델을 Domain 모델에 무조건 1:1 강제하지 않는다.

## 실제 디렉터리

```text
api/src/
  app.ts, server.ts
  routes/{auth,projects,expenses,categories}.routes.ts
  controllers/{auth,projects,expenses,categories}.controller.ts
  plugins/{auth,db,sse}.ts
  middleware/{error-handler,request-context}.ts
application/src/{auth,projects,expenses,categories,quick-memo}/
domain/src/{user,project,expense,category,shared}/
infrastructure/src/{postgres,email,realtime,testing}/
web/src/
```

Repository interface는 Domain에 두며 auth repository도 domain/src/user/auth-repository.ts에 있다. Application의 ports.ts는 Clock/ID/Email/변경 알림 등 orchestration 경계와 auth 타입 re-export다.

## Transaction과 동시성

Expense/Share 생성·수정·삭제 및 closed → active, member와 신규 User 생성, one-time token 소비·User 생성·session 발급을 PostgreSQL transaction으로 처리한다. AsyncLocalStorage로 같은 transaction 연결을 repository에 전달한다. Project 변경은 부모 행을 lock하고 REPEATABLE READ를 사용한다. 동시 충돌은 API에서 409로 반환하며 실패한 transaction의 변경 알림은 발행하지 않는다.

현황/최종정산도 snapshot transaction 안에서 읽는다. Expense settlement currency override를 허용하므로 통화별로 계산한다. 저장된 settlement_amount만 사용하고 조회 중 FX 환산은 하지 않는다.

## SSE

인증된 Project 멤버만 변경 알림을 구독한다. 세션 만료·비활성화·멤버 제거를 heartbeat/발행 시 다시 확인한다. commit 성공 후 project.changed를 보내며 Web은 알림 표시만 올린다. 재조회는 사용자 행동이다. SSE는 consistency의 정본이 아니며 PostgreSQL이 정본이다.

현재 broker는 단일 API 프로세스 메모리 방식으로 event replay와 다중 인스턴스 전달은 지원하지 않는다.

## 인증과 외부 adapter

Passwordless email → 15분 one-time link → 기존 로그인/신규 가입 → 기본 30일 session. 원문 token 대신 hash를 저장하고 HttpOnly/SameSite=Lax cookie를 사용한다. 운영에서는 secure cookie가 필요하다. 개발 EmailSender는 링크를 서버 로그에 출력한다. 현재 기본 server는 production에서 개발 adapter 사용을 거절한다.

FX는 사용자가 currency/fx_rate/settlement_amount를 확정한다. fx_quotes와 Domain FxQuotePort를 준비했지만 외부 API adapter는 미구현·미사용이다.

DATABASE_URL과 향후 Email/FX 키는 서버 환경 변수이며 브라우저에 관리자 키를 전달하지 않는다. 실행과 제한은 README, endpoint는 api.md를 참고한다.

## 온라인/로컬 병행 방향 (2026-10-15)

PostgreSQL/Drizzle 및 현재 레이어 경계를 유지한다. Firebase 활용 제품과 온라인 DB 제공자는 아직 선정하지 않았고 Firestore로 전환하지 않는다. Vercel 배포·운영 이메일·환경별 DB 연결은 아직 준비 단계다. 현재 구현과 후속 검증은 [온라인/로컬 개발 계획](../development-and-deployment.md)을 따른다.
