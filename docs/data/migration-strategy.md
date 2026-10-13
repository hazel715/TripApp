# 데이터 이관 전략

신규 PostgreSQL은 빈 DB에서 시작한다. 기존 Firestore 문서와 여행용 `app.jsx`는 보존하며 신규 앱에서 읽거나 쓰지 않는다.

## 스키마 migration

정본은 `infrastructure/src/postgres/schema.ts`와 `migrations/`다. `npm run db:generate`로 SQL/snapshot을 생성하고 `npm run db:migrate`로 적용한다. migration은 `.env`의 DATABASE_URL을 사용한다. 테스트에서 초기 적용 및 재적용을 검증한다.

## 레거시 데이터 임포트

자동 임포트는 구현하지 않았다. 필요해지면 별도 오프라인 도구로 User/Project/Member를 먼저 매핑한다. 날짜는 `expense_date`의 YYYY-MM-DD 또는 NULL, 금액은 NUMERIC(18,4) 문자열로 변환한다. 과거 적용 환율과 확정 정산 금액을 분리하고, share 합이 정산 금액과 일치하도록 검증해야 한다. 일정/준비물은 가져오지 않는다. 레거시 float/greedy 결과와 신규 정밀 계산 결과의 차이를 별도로 검토해야 한다.
