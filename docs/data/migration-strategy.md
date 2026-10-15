# 데이터 이관 전략

신규 PostgreSQL은 빈 DB에서 시작한다. 기존 Firestore 문서와 여행용 `app.jsx`는 보존하며 신규 앱에서 읽거나 쓰지 않는다.

## 스키마 migration

정본은 `infrastructure/src/postgres/schema.ts`와 `migrations/`다. `npm run db:generate`로 SQL/snapshot을 생성하고 `npm run db:migrate`로 적용한다. migration은 `.env`의 DATABASE_URL을 사용한다. 테스트에서 초기 적용 및 재적용을 검증한다.

## 레거시 데이터 임포트

자동 임포트는 구현하지 않았다. 필요해지면 별도 오프라인 도구로 User/Project/Member를 먼저 매핑한다. 날짜는 `expense_date`의 YYYY-MM-DD 또는 NULL, 금액은 NUMERIC(18,4) 문자열로 변환한다. 과거 적용 환율과 확정 정산 금액을 분리하고, share 합이 정산 금액과 일치하도록 검증해야 한다. 일정/준비물은 가져오지 않는다. 레거시 float/greedy 결과와 신규 정밀 계산 결과의 차이를 별도로 검토해야 한다.

## 온라인/로컬 병행 방향 (2026-10-15)

PostgreSQL/Drizzle 및 현재 레이어 경계를 유지한다. Firebase 활용 제품과 온라인 DB 제공자는 아직 선정하지 않았고 Firestore로 전환하지 않는다. Vercel 배포·운영 이메일·환경별 DB 연결은 아직 준비 단계다. 현재 구현과 후속 검증은 [온라인/로컬 개발 계획](../development-and-deployment.md)을 따른다.
