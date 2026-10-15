# 프론트엔드 컴포넌트

화면 목록은 [screens.md](./screens.md).

레거시 `ChengduTripApp` 단일 파일을 복사하지 않는다. 신규 `web/` 에서 화면 단위로 구성한다.

정산·share 합계의 정본은 API 응답이다. 컴포넌트가 IEEE float로 잔액을 누적하지 않는다.

서버 상태: fetch + 로컬 state. SSE는 알림 플래그만 올린다.

## 온라인/로컬 병행 방향 (2026-10-15)

PostgreSQL/Drizzle 및 현재 레이어 경계를 유지한다. Firebase 활용 제품과 온라인 DB 제공자는 아직 선정하지 않았고 Firestore로 전환하지 않는다. Vercel 배포·운영 이메일·환경별 DB 연결은 아직 준비 단계다. 현재 구현과 후속 검증은 [온라인/로컬 개발 계획](../development-and-deployment.md)을 따른다.
