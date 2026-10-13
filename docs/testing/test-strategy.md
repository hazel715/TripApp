# 테스트 전략

Vitest source 테스트만 검색하며 dist 산출물을 중복 실행하지 않는다.

- Domain: Expense/Share 불변식, 음수, 별도 payer, 멤버 역할, Project reopen, 현재 부담·정확한 최소 송금, 완전탐색 oracle 비교.
- Application/API: 메모리 repository/UoW rollback adapter를 주입해 인증·Project·멤버·카테고리·Expense CRUD·통화 override를 Fastify inject로 검증한다. 인증 만료/비활성화·Origin·접근 권한과 실제 HTTP SSE 스트림도 검사한다.
- PostgreSQL: 실제 엔진에서 Drizzle migration 초기/재적용, NUMERIC round-trip, Expense write 이후 실패의 rollback, User FK 보존, 동시 로그인 토큰 소비를 검증한다.
- Web: Decimal 균등 분할 단위 테스트. Chrome smoke로 이메일 callback부터 프로젝트/멤버/지출/현황/최종 송금까지 확인하고 desktop/mobile 스크린샷을 검사했다. 브라우저 smoke는 현재 수동 실행 검증이며 CI 자동 E2E는 추가하지 않았다.

실행: npm test (DB 제외), npm run test:integration (실제 PostgreSQL). 자세한 환경은 README. CI는 PostgreSQL 16 service를 사용한다. 로컬 검증에는 embedded PostgreSQL 18을 사용했다. 마지막 결과는 refactory-progress.md를 따른다.
