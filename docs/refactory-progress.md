# Refactory progress

기록일: 2026-10-13. 작업 브랜치: feature/refactory.
기준 commit: de799630a0e928bf5bc729ebc027c216273cf661 (임시커밋).

## Completed

- 기준 HEAD와 깨끗한 작업 트리 확인. 기존 Domain/Application 초안을 재사용하고 레거시 app.jsx/index.html 보존.
- Phase A: Decimal/TypeScript 오류 수정, Money·FX·Expense/Share 검증, 실제 달력 날짜와 NUMERIC 범위 검사, 통화별 현황/정산, 정확한 최소 송금 회귀 검증.
- PostgreSQL/Drizzle: 핵심 7개와 auth 2개 테이블, FK/복합 PK/UNIQUE/index, 생성된 SQL migration/snapshot, repository와 실제 transaction 연결.
- Fastify API: auth/projects/expenses/categories controller/route, 인증 cookie, 검증·권한·오류 처리, 현재 현황/최종정산 Project read endpoint.
- Passwordless: token hash·만료·원자적 1회 소비, 신규/기존 User, session 발급·만료·로그아웃, deactivated 사용자 차단, 개발 EmailSender.
- Expense/Share: 생성/수정/삭제·목록, 균등 분할·개별 Share, 음수·별도 payer, 불일치 거절, closed→active, write 이후 rollback.
- Settlement: 통화별 paid/share/balance, 최종 요청에서만 정확한 최소 송금. settlement/transfer/history 테이블 없음.
- SSE: commit 후 Expense/member 알림, 실제 HTTP stream, 멤버/세션 재확인, Web은 강제 refresh 없이 알림만 표시.
- React MVP: 로그인·프로젝트·멤버·카테고리·Expense/Share 폼·현재 현황·명시적 최종 정산·변경 알림. 날짜 기본값 오늘/NULL 허용.
- Quick Memo: 서버 파싱, 이름 매칭/중복 이름 거절, Decimal 만원 변환, 음수·통화 표기 입력 보존.
- README/관련 docs 동기화, PostgreSQL 16 CI workflow 추가, lint/format/test 도구 구성.
- 의미 있는 기능 단위 commit 유지. 최종 docs commit은 git log에서 확인한다.

## Remaining

요청한 MVP의 필수 구현 Phase는 남아 있지 않다. 아래 운영 준비/범위 밖 기능은 구현 완료로 표현하지 않는다.

- 실제 이메일 provider 및 운영 배포 구성.
- 다중 API 프로세스용 공유 realtime broker/replay.
- 외부 FX 자동 연동, 레거시 데이터 임포트.
- 자동 브라우저 E2E를 CI에 포함하는 후속 작업 (현재 Chrome smoke는 로컬 검증).

## Tests

- 최종 Vitest: source 8개 파일, **42/42 통과**, 실제 PostgreSQL 테스트 3개 포함.
- 일반 npm test: DB integration은 명시적으로 skip. npm run test:integration은 실제 DB 테스트를 실행한다.
- 모든 workspace typecheck 통과.
- 전체 ESLint 통과.
- 모든 workspace build 통과. 마지막 Quick Memo 보강 후 Application build도 통과.
- Drizzle generate: No schema changes. migration 초기 적용·재적용 통과.
- PostgreSQL 18.4 로컬 테스트: 정확한 NUMERIC round-trip, write 후 실패 rollback, FK 보존, 동시 token 소비, 실제 Fastify→PostgreSQL HTTP flow 통과.
- Chrome smoke: 이메일 login callback→Project→member→Expense(별도 payer)→현황→최종 송금 흐름 통과. desktop/mobile screenshot 확인, 페이지 넘침/uncaught JS error 없음.
- Node 24.19 환경. 시스템 Node/npm/Docker가 PATH에 없어 bundled Node와 임시 npm 실행기를 사용했다. PostgreSQL 검증은 embedded 테스트 엔진으로 완료했다.
- 원격 CI는 아직 실행하지 않았다. workflow는 PostgreSQL 16을 사용한다.
- production dependency audit 0건. 전체 audit은 Drizzle 개발 도구의 moderate 4건이 남아 있다 (critical/high 0건).

## Known issues

- 정확한 최종 정산의 운영 계산 한도는 통화별 nonzero balance 20명. 초과 시 명시적 검증 오류를 반환하며 greedy로 대체하지 않는다.
- SSE는 단일 프로세스 메모리 broker이며 유실 이벤트 replay는 없다. 재조회 시 PostgreSQL이 정본이다.
- 개발 EmailSender는 링크를 API 로그로 출력한다. 기본 server는 production 모드에서 해당 adapter 사용을 거절한다.
- Project 수동 close/delete, User 비활성화 UI/API는 제공하지 않는다. schema·보존 규칙·자동 reopen은 구현했다.
- PostgreSQL transaction 동시 충돌은 409로 반환하며 사용자가 재시도해야 한다.
- .test-data에 로컬 테스트 DB/화면 검증 산출물이 남아 있으나 Git에서 제외한다. 검증용 API/Web/PostgreSQL 프로세스는 종료했다.

## Next step

README의 개발 실행 절차로 사용한다. 운영 배포가 필요해지면 EmailSender와 secure cookie/공유 broker를 준비한다. 후속 구현 시 git status, git log --oneline -10, 이 문서를 먼저 확인하고 완료 Phase를 반복하지 않는다.
