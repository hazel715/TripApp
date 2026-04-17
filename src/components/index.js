
export const DEFAULT_CNY_RATE = 188.50; 
export const DEFAULT_USD_RATE = 1385.00; 
export const MEMBERS = ['MJ', 'JY', 'HJ'];
export const CATEGORIES = ['숙소', '교통', '관광', '식음료', '기타'];

const EVENT_ICONS = [
  { type: 'flight', label: '항공' }, { type: 'train', label: '기차' },
  { type: 'bus', label: '버스/차' }, { type: 'hotel', label: '숙소' },
  { type: 'camera', label: '관광' }, { type: 'food', label: '식사' },
  { type: 'coffee', label: '휴식' }, { type: 'info', label: '기타' }
];

export const defaultEssentials = [
    { category: "필수 서류 및 결제", items: ["여권 (유효기간 6개월 이상)", "중국 비자 (사전 발급)", "알리페이 / 위챗페이 (카드 미리 등록 필수)"] },
    { category: "건강 및 상비약", items: ["고산병 약 (홍징톈 등 - 황룡 대비)", "소화제, 진통제, 멀미약", "해산물 알레르기 안내 메모 (중국어 캡쳐)"] },
    { category: "의류 및 준비물", items: ["편안한 트래킹화/운동화 (구채구 많이 걸음)", "바람막이 및 겹쳐 입을 겉옷 (산악 지대 변덕스러운 날씨)", "작은 우산 또는 우비"] },
    { category: "기타 유용템", items: ["VPN 앱 설치 (구글, 카톡, 유튜브 사용 시 필수)", "대용량 보조배터리", "휴대용 티슈/물티슈 (식당, 화장실 대비)"] }
  ];
  
export const defaultItinerary = [
    {
      day: 1, date: "4월 17일 (금)", title: "청두 도착 및 공항 이동",
      events: [
        { time: "20:00", type: "flight", desc: "인천공항 출발 (OZ323)", map: "https://maps.google.com/?q=Incheon+International+Airport", tip: "중국 입국 시 필요한 건강신고서(해관코드)를 미리 작성하고 캡처해 두면 수속이 빠릅니다." },
        { time: "23:10", type: "flight", desc: "청두 톈푸 국제공항 도착", map: "https://maps.google.com/?q=Chengdu+Tianfu+International+Airport", memo: { title: "공항버스 탑승 가이드", content: "1단계: 제2터미널(T2) 도착 후 1층(L1) 9~11번 게이트 근처 공항버스 승강장에서 'Line 4' 탑승!" }, tip: "공항버스 비용 약 15~25위안. 위챗페이/알리페이 준비 필수!" },
        { time: "24:30", type: "hotel", desc: "청두 레이먼트 호텔 휴식", map: "https://www.google.com/maps/d/u/0/viewer?mid=1m3qTxlrAv17vMEjNgDRjb2Yfv2WgFcE", tip: "청두동역과 인접하여 다음날 이동에 최적입니다." }
      ]
    },
    {
      day: 2, date: "4월 18일 (토)", title: "황룡 대자연 관광",
      events: [
        { time: "09:39", type: "train", desc: "청두동역 기차 탑승", map: "https://maps.google.com/?q=Chengdu+East+Railway+Station" },
        { time: "11:30", type: "bus", desc: "송판역 ➔ 황룡 (승합차 합승)" },
        { time: "12:30", type: "camera", desc: "황룡 에메랄드빛 연못 구경", map: "https://maps.google.com/?q=Huanglong+Scenic+Area", tip: "해발 3천미터 이상! 고산병 약을 미리 복용하세요." },
        { time: "19:30", type: "hotel", desc: "구채구 Holiday INN 휴식" }
      ]
    },
    {
      day: 3, date: "4월 19일 (일)", title: "구채구 핵심 투어",
      events: [
        { time: "08:00", type: "camera", desc: "구채구 관광 시작", map: "https://maps.google.com/?q=Jiuzhaigou+Valley+National+Park", tip: "Y자 코스 셔틀버스 이용. 가장 높은 곳에서 내려오며 구경하세요." },
        { time: "19:00", type: "train", desc: "황룡구채역 ➔ 청두동역 (기차)" },
        { time: "22:00", type: "hotel", desc: "신위안 호텔(Xinyuan) 체크인" }
      ]
    },
    {
      day: 4, date: "4월 20일 (월)", title: "진영 해피 벌스데이",
      events: [
        { isSlot: true, time: "20:00 이전", desc: "~ 20:00 까지 자유 일정" },
        { time: "22:00", type: "flight", desc: "톈푸 국제공항 도착 및 수속" }
      ]
    },
    {
      day: 5, date: "4월 21일 (화)", title: "인천 귀국",
      events: [
        { time: "00:10", type: "flight", desc: "청두 톈푸 공항 출발 (OZ323)" },
        { time: "05:10", type: "flight", desc: "인천 국제공항 도착 및 해산" }
      ]
    }
  ];