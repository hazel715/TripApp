# 온라인 운영과 로컬 개발

최종 정리: 2026-10-15. 이 문서는 운영 계획과 구현 상태를 구분한다.

## 확정된 방향

- 여행 가이드가 아니라 공동 비용 정산 앱이다. 화면에서 TripApp 이름을 제거한다. 임시 표기는 '공동 정산'이며 정식 타이틀은 사용자가 추후 정한다. 저장소/패키지/쿠키 식별자는 이번 변경에서 바꾸지 않는다.
- PostgreSQL + Drizzle, Fastify, Application/Domain 분리를 유지한다.
- 기존 Firebase 프로젝트를 활용하고 싶다는 사용자 선호가 있다. **Firestore로 DB를 전환한다는 뜻은 아니다.** Firebase 관련 제품과 실제 연결 방식은 아직 선정하지 않았다.
- Vercel에서 신규 Web을 온라인으로 확인하고 데이터를 영속 저장하며, 로컬/Codespaces에서 병행 개발한다.
- 로컬 개발 DB와 온라인 운영 DB는 기본적으로 분리한다. 필요하면 별도 온라인 개발 DB를 사용한다. 운영 원장에 테스트를 실행하지 않는다.

## 현재 실제 구현

React/Vite Web, Fastify API, PostgreSQL repository/migration, 자체 passwordless token/session, SSE가 구현되어 있다. Firebase SDK는 신규 앱에 연결되어 있지 않다. 기존 app.jsx의 Firebase 설정은 레거시 전용이다. Vercel 배포 설정·운영 DB·운영 이메일 연결은 아직 구현하지 않았다.

현재 로컬에서 사용 중인 DB 파일과 .env는 Git에 포함되지 않는다. 코드 push는 DB 데이터 전송이나 온라인 배포 완료를 의미하지 않는다.

## 온라인 PostgreSQL 후보

공식 자료 확인일: 2026-10-15. 비용·리전·연결 제한은 실제 생성 시 다시 확인한다. 이번 작업에서 유료 리소스를 생성하거나 특정 서비스를 선택하지 않는다.

- Firebase SQL Connect: Firebase에서 Cloud SQL for PostgreSQL을 사용하는 제품이다. 기존 Data Connect 문서 주소는 현재 SQL Connect로 이동한다. 익숙한 Firebase 환경을 활용할 후보지만 Cloud SQL 비용과 GraphQL/생성 SDK 경계를 검토해야 한다. 현재 Drizzle migration과 별도 schema 관리가 충돌하지 않게 설계해야 하며, Domain/Application을 generated client 호출로 우회하지 않는다. [제품 문서](https://firebase.google.com/docs/sql-connect), [비용 구조](https://firebase.google.com/docs/sql-connect/pricing).
- Google Cloud SQL PostgreSQL: 기존 Fastify/Drizzle의 SQL 연결을 유지하려면 Google Cloud에서 관리형 PostgreSQL을 사용하고 서버 연결 방식을 준비하는 방안도 비교한다. Firebase 프로젝트 재사용 가능 범위와 접근 설정은 실제 프로젝트에서 확인한다.
- Neon: PostgreSQL을 제공하며 Vercel 연동 문서가 있다. 현재 SQL repository를 유지하는 대안으로 비교한다. [Vercel 연동](https://neon.com/docs/guides/vercel-overview).
- Supabase: 관리형 PostgreSQL과 Drizzle 연결을 지원한다. DB만 이용할 수도 있으며 자체 인증을 Supabase Auth로 자동 변경하지 않는다. [Drizzle 연결](https://supabase.com/docs/guides/database/drizzle).

Firebase Auth는 PostgreSQL 저장소와 별개인 인증 선택지다. 현재 자체 email-link/session이 이미 동작하므로 Firebase 활용을 이유로 인증 방식을 임의 교체하지 않는다.

## 배포 전 남은 작업

1. 온라인 PostgreSQL 제공자·리전·개발/운영 DB를 선정하고 서버 전용 연결 정보를 설정한다.
2. 기존 Drizzle migration을 새 DB에 적용한다. 레거시 Firestore 여행 데이터는 자동 복사하지 않는다.
3. Vercel의 build 대상이 루트 레거시 index.html이 아니라 신규 web/이 되도록 workspace 의존성과 web/dist 출력을 설정한다. SPA의 /login/callback 직접 접근도 처리한다.
4. Fastify API의 배포 위치와 실행 진입점을 정한다. 현재 server.ts의 로컬 listen 구조와 production 모드 개발 메일 차단을 그대로 두고 배포 완료라고 표현하지 않는다.
5. Web /api 요청 및 SSE가 실제 온라인 API로 연결되도록 proxy/rewrite를 준비한다. 현재 Vite proxy는 개발 서버 전용이다.
6. WEB_ORIGIN, 로그인 callback 주소, 운영 EmailSender, HTTPS secure session cookie를 연결한다. 로그인 링크를 운영 로그에서 복사하는 방식으로 배포하지 않는다.
7. SSE의 연결 수명과 다중 인스턴스 알림 전달을 실제 배포 환경에서 검증한다. 현재 broker는 단일 프로세스 메모리 방식이다.
8. 로그인→지출 저장→새로고침→데이터 보존, Share 불일치 rollback, 최종 정산, 다른 클라이언트 변경 알림을 온라인에서 검증한다.

## 로컬 / Codespaces 병행

로컬 실행 명령은 README를 따른다. 각 환경의 DATABASE_URL과 WEB_ORIGIN을 별도로 설정한다. 로그인·데이터 저장을 위해 Web, API, PostgreSQL이 모두 실행되어야 한다.

현재 .devcontainer는 Node 18 및 레거시 포트 5500 설정이다. 신규 앱용 Node 24, Web 5173/API 3001 포트 전달과 bind 주소 설정을 후속으로 맞춰야 한다. Codespaces에서 localhost callback을 온라인 callback으로 간주하지 않는다. 비밀값은 .env 또는 플랫폼 secret으로 관리하고 Git에 올리지 않는다.

## 입력 UX 후속 작업

현재 통화는 직접 입력이고 금액/환율 입력 후 확정 정산 금액을 자동 제안하지 않는다. 다음 개선 요구를 미완료 항목으로 기록한다.

- 주요 통화 선택 목록과 기타 코드 입력을 제공한다.
- 같은 통화면 결제 금액, 다른 통화면 Decimal로 결제 금액 × 환율을 계산해 정산 금액을 제안한다.
- 제안 금액을 사용자가 수수료/실제 적용 금액에 맞게 수정할 수 있게 한다. 기존 확정 금액이나 개별 Share를 자동으로 덮어쓰지 않는다.
- 저장 시 Share 합 = 확정 정산 금액 검증과 통화별 정산을 유지한다.
