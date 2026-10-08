# 프론트엔드 컴포넌트

화면 목록은 [screens.md](./screens.md).

레거시 `ChengduTripApp` 단일 파일을 복사하지 않는다. 신규 `web/` 에서 화면 단위로 구성한다.

정산·share 합계의 정본은 API 응답이다. 컴포넌트가 IEEE float로 잔액을 누적하지 않는다.

서버 상태: fetch + 로컬 state. SSE는 알림 플래그만 올린다.
