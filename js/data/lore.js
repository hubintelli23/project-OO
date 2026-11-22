// =============================================================
//  세계관 도감 데이터 — project OO 기획서(hwp·cell)에서 옮겨 적음
//  · 기획서에 없는 항목은 비워 둠 (지어내지 않음)
//  · power: 권능 번호 → js/data/powers.js 컬러 사용
//  · inGame: 현재 게임에 등장하는 형태 (플레이어블 / 보스)
// =============================================================
export const LORE_GODS = [
 {
  "tier": "원초의 신",
  "name": "아바돈",
  "title": "소멸의 신"
 },
 {
  "tier": "원초의 신",
  "name": "테흠",
  "title": "창조의 신"
 },
 {
  "tier": "메인 신",
  "name": "솔라리스",
  "title": "태양의 신",
  "desc": "천계 · 스킬 강화 · 신성력(성휘)"
 },
 {
  "tier": "메인 신",
  "name": "루나리스",
  "title": "달의 신",
  "desc": "마계 · 기프트 강화 · 신성력(월영)"
 },
 {
  "tier": "메인 신",
  "name": "클레오르",
  "title": "황혼의 신",
  "desc": "현계 · 초월 · 신성력(황혼)"
 },
 {
  "tier": "권능의 신",
  "name": "메티스",
  "en": "Metis",
  "title": "기반의 신",
  "power": 1,
  "desc": "모든 생명과 에테르의 단단한 뿌리이자 흔들리지 않는 근원"
 },
 {
  "tier": "권능의 신",
  "name": "아레스티아",
  "en": "Arestia",
  "title": "투쟁의 신",
  "power": 2,
  "desc": "적의 방어를 부수고 섬멸하는 서늘하고 강렬한 파괴의 오라"
 },
 {
  "tier": "권능의 신",
  "name": "에르미아",
  "en": "Ermia",
  "title": "자애의 신",
  "power": 3,
  "desc": "온기와 공명으로 아군을 감싸고 파티를 정화하는 수호의 결계"
 },
 {
  "tier": "권능의 신",
  "name": "에레보스",
  "en": "Erebos",
  "title": "심연의 신",
  "power": 4,
  "desc": "규율 밖의 공허 속에서 타인의 자원과 생명을 찬탈하는 금기의 힘"
 },
 {
  "tier": "권능의 신",
  "name": "자피엘",
  "en": "Zafiel",
  "title": "궤적의 신",
  "power": 5,
  "desc": "한계를 뛰어넘는 고속의 잔향과 시공간을 가로지르는 칼날"
 },
 {
  "tier": "능력의 신",
  "name": "아르케온",
  "title": "기프트의 신",
  "desc": "기프트 부여 및 강화"
 },
 {
  "tier": "능력의 신",
  "name": "레조넌",
  "title": "파동의 신"
 }
];

export const LORE_GROUPS = [
 {
  "id": "kain-party",
  "name": "주인공 · 조력자",
  "sub": null
 },
 {
  "id": "hyunwol",
  "name": "현월기사단",
  "sub": "시엔 측근 기사단"
 },
 {
  "id": "council",
  "name": "학원중앙회",
  "sub": "아카데미 학생회"
 },
 {
  "id": "students",
  "name": "재학생 연합",
  "sub": "일반 학생"
 },
 {
  "id": "staff",
  "name": "교직원",
  "sub": ""
 },
 {
  "id": "seonghwi-knights",
  "name": "성휘기사단",
  "sub": "천계"
 },
 {
  "id": "wolyoung-knights",
  "name": "월영기사단",
  "sub": "마계"
 },
 {
  "id": "altar-seonghwi",
  "name": "성휘제단",
  "sub": "신성제단 A"
 },
 {
  "id": "altar-wolyoung",
  "name": "월영제단",
  "sub": "신성제단 B"
 },
 {
  "id": "altar-hwanghon",
  "name": "황혼제단",
  "sub": "신성제단 C"
 },
 {
  "id": "altar-geumeum",
  "name": "그믐제단",
  "sub": "신성제단 D — 별도의 제단이자 신성제단의 흑막, 신성의 힘을 믿지 않는 이단자"
 }
];

export const LORE_PEOPLE = [
 {
  "name": "카인",
  "group": "kain-party",
  "power": 4,
  "weapon": "카타나 / 직검 (도검 계열)",
  "pos": "메인 딜러 · 주인공",
  "concept": "예리한 발도술과 신성 무력화(Anti-Divine) 파쇄 특화",
  "ult": "진명 해방: 집행",
  "sex": "남",
  "hair": "잿빛 은발",
  "style": "댄디컷",
  "eye": "백금색",
  "inGame": "플레이어블"
 },
 {
  "name": "카일라",
  "group": "kain-party",
  "power": 4,
  "weapon": "카타나 / 직검 (도검 계열)",
  "pos": "메인 딜러 · 주인공",
  "concept": "예리한 발도술과 신성 무력화(Anti-Divine) 파쇄 특화",
  "ult": "진명 해방: 집행",
  "sex": "여",
  "hair": "잿빛 은발",
  "style": "허리까지 내려오는 스트레이트 장발",
  "eye": "백금색",
  "inGame": "플레이어블"
 },
 {
  "name": "리아 폰 에스더",
  "group": "kain-party",
  "power": 3,
  "weapon": "한손검 & 신성 소형 방패",
  "pos": "서포터 · 소꿉친구",
  "ult": "진명 해방: 적색 수호의 장",
  "sex": "여",
  "inGame": "플레이어블"
 },
 {
  "name": "시엔 벨라토르",
  "group": "kain-party",
  "power": 5,
  "weapon": "쌍검 / 아크 카타나",
  "pos": "서브 딜러 · 선배",
  "ult": "진명 해방: 황혼 궤멸",
  "sex": "여",
  "inGame": "플레이어블"
 },
 {
  "name": "이리스 폰 아인스",
  "group": "hyunwol",
  "en": "Iris von Eins",
  "sex": "여",
  "power": 5,
  "weapon": "레이피어 & 패링 다거 (Rapier & Dagger)",
  "pos": "서브 딜러 (기사단장 / 주력 전위)",
  "concept": "제 5 권능의 속도 및 궤적 교란 파동을 활용해 급소를 신속하게 찌르고 빠지는 고속 서브 딜러",
  "ult": "진명 해방: 섬광의 궤적 (True Release: Flash Trace)",
  "hair": "로얄 골드",
  "style": "허리까지 오는 풍성한 하이 포니테일 장발",
  "eye": "로얄 블루"
 },
 {
  "name": "샤를 롯 베르네",
  "group": "hyunwol",
  "en": "Charles Lot Verne",
  "sex": "여",
  "power": 3,
  "weapon": "마도 지팡이 & 룬 오르브 (Staff & Orb)",
  "pos": "상태이상 해제 (부단장 / 전술 참모)",
  "concept": "제 3 권능의 정화 및 수호 파동으로 아군의 상태이상을 해제하고 전술적 보호막을 치는 정밀 제어 서포터",
  "ult": "진명 해방: 절대 정화 구역 (True Release: Absolute Cleansing)",
  "hair": "파스텔 하늘색",
  "style": "땋아 내린 머리",
  "eye": "회색"
 },
 {
  "name": "노아 발렌타인",
  "group": "hyunwol",
  "en": "Noah Valentine",
  "sex": "여",
  "power": 3,
  "weapon": "신성 단도 & 장막 (Twin Daggers)",
  "pos": "보호막 치유사 (기습 및 암습 담당)",
  "concept": "제 3 권능의 방어형 결계와 신성 치유를 결합하여 적의 공격을 차단하는 동시에 아군의 치유막을 생성하는 치유형 암살자",
  "ult": "진명 해방: 신성 수호 결계 (True Release: Holy Sanctuary)",
  "hair": "검붉은 색",
  "style": "레이어드 언더컷",
  "eye": "크림슨 레드"
 },
 {
  "name": "카엘 라드 스톰",
  "group": "hyunwol",
  "en": "Kael Rad Storm",
  "sex": "남",
  "power": 5,
  "weapon": "마도 너클 & 숄더 가드 (Magical Gauntlets)",
  "pos": "무투파 돌격가 (중장갑 및 진형 수호)",
  "concept": "제 5 권능의 유기적인 기동력과 고속 파동을 너클에 실어 전선을 단숨에 파고드는 무투파 파쇄가",
  "ult": "진명 해방: 폭쇄 유성권 (True Release: Meteor Strike)",
  "hair": "잿빛 회색",
  "style": "7대3 가르마 헤어",
  "eye": "엠버 호박색"
 },
 {
  "name": "루시안 폰 발렌시아",
  "group": "council",
  "en": "Lucian von Valencia",
  "sex": "남",
  "power": 2,
  "weapon": "마도 서번트 레이저 펜듈럼 (Magical Pendulum)",
  "pos": "단일 딜러 / 라이벌 (학생회 부회장)",
  "concept": "제 2 권능 황금빛 입자를 집속하여 원거리에서 적의 급소를 정밀 타격하는 정통 엘리트 라이벌",
  "ult": "진명 해방: 천상 입자 포격",
  "hair": "딥 퍼플",
  "style": "삼지창 머리",
  "eye": "보라색"
 },
 {
  "name": "베아트리스 에블린",
  "group": "council",
  "en": "Beatrice Evelyn",
  "sex": "여",
  "power": 5,
  "weapon": "마도 환영 대체인 (Chain Scythe)",
  "pos": "제어형 광역 딜러 (학생회 집행부장)",
  "concept": "제 5 권능의 마력을 사슬 낫에 두르고 넓은 범위를 쓸어담아 적들을 한데 모으는 광역 제어자",
  "ult": "진명 해방: 집행자의 가시 환영 (True Release: Thorn Execution)",
  "hair": "미드나잇 블랙",
  "style": "직모 장발",
  "eye": "마젠타"
 },
 {
  "name": "트리스탄 베인",
  "group": "council",
  "en": "Tristan Bane",
  "sex": "남",
  "power": 1,
  "weapon": "대형 방패 & 중메이스 (Shield & Mace)",
  "pos": "제압형 탱커 (학생회 선도부장)",
  "concept": "제 1 권능의 단단하고 정갈한 신성 결계를 방패에 실어 적의 공격을 무력화하는 최전선 탱커",
  "ult": "진명 해방: 절대 신성 방벽 (True Release: Holy Wall)",
  "hair": "애쉬 브라운",
  "style": "단정한 미디엄 헤어",
  "eye": "회색"
 },
 {
  "name": "클로에 하몬",
  "group": "council",
  "en": "Chloe Harmon",
  "sex": "여",
  "power": 3,
  "weapon": "마도 결계 컴퍼스 & 카드 (Compass & Cards)",
  "pos": "전문 결계사 (학생회 서기)",
  "concept": "제 3 권능의 공간 회로를 컴퍼스로 그려내어 적을 가두고 아군의 방어를 지원하는 결계 마도사",
  "ult": "진명 해방: 차원 결계 봉인 (True Release: Dimensional Seal)",
  "hair": "페일 핑크",
  "style": "땋은 머리 포인트가 들어간 롱 웨이브 헤어",
  "eye": "민트 블루"
 },
 {
  "name": "에단 로이드",
  "group": "students",
  "en": "Ethan Lloyd",
  "sex": "남",
  "power": 2,
  "weapon": "한손 검 & 대검 (Twin Swords)",
  "pos": "근접 지속 딜러 (기사학과 3학년)",
  "concept": "제 2 권능 황금빛 마력을 두 자루의 검에 실어 끊임없는 연속 참격을 퍼붓는 지속 딜러",
  "ult": "진명 해방: 황금 검기 난무 (True Release: Golden Blade)",
  "hair": "연녹색",
  "style": "터프한 야생 스타일 숏 컷",
  "eye": "연녹색"
 },
 {
  "name": "레오 클로이츠",
  "group": "students",
  "en": "Leo Kreutz",
  "sex": "남",
  "power": 1,
  "weapon": "숄더 쉴드 & 대형 해머 (Shield & Hammer)",
  "pos": "방어형 도발가 (수호격투학과 2학년)",
  "concept": "제 1 권능의 신성력을 해머와 어깨 방패에 충전하여 적의 시선을 집중시키고 전선을 지키는 탱커",
  "ult": "진명 해방: 불굴의 신성 요새 (True Release: Sacred Fortress)",
  "hair": "로얄 골드",
  "style": "미디움 컷",
  "eye": "엠버 호박색"
 },
 {
  "name": "마일라 폴린",
  "group": "students",
  "en": "Myla Pauline",
  "sex": "여",
  "power": 5,
  "weapon": "마도 환영 단경 (Mirror & Wand)",
  "pos": "원거리 기만 (마도환술학과 2학년)",
  "concept": "제 5 권능의 파동을 거울에 반사시켜 환영을 만들어내고 원거리에서 적을 기만하는 환술사",
  "ult": "진명 해방: 환영의 미궁 (True Release: Phantom Maze)",
  "hair": "청록색",
  "style": "로우 사이드 포니테일",
  "eye": "민트 블루"
 },
 {
  "name": "올리비아 베넷",
  "group": "students",
  "en": "Olivia Bennett",
  "sex": "여",
  "power": 5,
  "weapon": "아티팩트 드론 (Floating Artifacts)",
  "pos": "아티팩트 지원 (마도공학과 1학년)",
  "concept": "제 5 권능을 동력원으로 삼는 아티팩트 드론을 조종하여 아군의 화력과 방어를 지원하는 보조가",
  "ult": "진명 해방: 아티팩트 오버로드 (True Release: Artifact Overload)",
  "hair": "미드나잇 인디고",
  "style": "어께 밑으로 떨어지는 장발",
  "eye": "로열 블루"
 },
 {
  "name": "발데르 칼로스",
  "group": "staff",
  "en": "Balder Carlos",
  "sex": "남",
  "power": 2,
  "weapon": "단죄의 대검 & 처형 사슬 (Executioner Greatsword)",
  "pos": "단죄형 교관 (실전 전투학 수석교수)",
  "concept": "제 2 권능의 보라색의 정화력을 대검에 실어 적의 죄를 묻고 단죄하는 묵직한 엄격 교관",
  "ult": "진명 해방: 최후의 단죄 (True Release: Final Judgment)"
 },
 {
  "name": "제네시스 보르토",
  "group": "staff",
  "en": "Genesis Berto",
  "sex": "여",
  "power": 1,
  "weapon": "봉인 의장 & 봉인 인장 (Sealing Scepter)",
  "pos": "봉인형 집행관 (결계 및 결속봉인학 교수)",
  "concept": "제 1 권능의 완전무결한 봉인 파동을 사용하여 적의 권능과 스킬 사용을 강제 봉인하는 제어관",
  "ult": "진명 해방: 천상 결속 봉인 (True Release: Celestial Seal)"
 },
 {
  "name": "셀레나 테레사",
  "group": "staff",
  "en": "Selena Teresa",
  "sex": "여",
  "power": 3,
  "weapon": "신성 지팡이 & 성수병 (Holy Staff)",
  "pos": "고위 치유사 (신성 치유학 교수 겸 신성제단 치유사)",
  "concept": "제 3 권능의 따스한 황금빛 신성력으로 대규모 광역 치유 및 아군 전체 부활/강화를 담당하는 치유사",
  "ult": "진명 해방: 자애의 성모 (True Release: Graceful Sanctuary)",
  "hair": "은백색",
  "style": "웨이브 장발",
  "eye": "민트 블루"
 },
 {
  "name": "지그문트 펠",
  "group": "staff",
  "en": "Sigmund Fell",
  "sex": "남",
  "power": 3,
  "weapon": "연금술 보구 가방 & 렌치 (Alchemy Bag & Wrench)",
  "pos": "아이템 지원 (마도아티팩트·연금학 교수 겸 제단 물자관리관)",
  "concept": "제 3 권능의 마력을 투입해 연금술 시약과 보구를 현장에서 즉석 제조해 아군에게 드롭하는 버퍼",
  "ult": "진명 해방: 연금술의 전당 (True Release: Alchemy Treasury)",
  "hair": "샌드 브라운",
  "style": "미디엄 레이어드 헤어",
  "eye": "애쉬 카키"
 },
 {
  "name": "가브리엘라",
  "group": "seonghwi-knights",
  "sex": "여",
  "hair": "플레티넘 골드",
  "style": "금빛 생머리 장발",
  "eye": "백금색"
 },
 {
  "name": "아우렐리우스",
  "group": "seonghwi-knights",
  "sex": "남",
  "hair": "딥 샤페인 골드",
  "style": "댄디컷",
  "eye": "로열 블루"
 },
 {
  "name": "세르스티아",
  "group": "seonghwi-knights",
  "sex": "여",
  "hair": "파스텔 엘로우",
  "style": "차분한 생머리 장발",
  "eye": "민트 블루"
 },
 {
  "name": "라피엘",
  "group": "seonghwi-knights",
  "sex": "남",
  "hair": "황금 빛 꿀 색",
  "style": "울프 레이어드 컷",
  "eye": "로열 블루"
 },
 {
  "name": "벨리바르",
  "group": "wolyoung-knights",
  "sex": "남",
  "hair": "딥 바이올렛",
  "style": "8대2 가르마 헤어",
  "eye": "크림슨 레드"
 },
 {
  "name": "모르가나",
  "group": "wolyoung-knights",
  "sex": "여",
  "hair": "다크 라벤더",
  "style": "흑발 웨이브 헤어",
  "eye": "네이비"
 },
 {
  "name": "자히코",
  "group": "wolyoung-knights",
  "sex": "남",
  "hair": "애쉬 실버",
  "style": "투블럭 숏컷",
  "eye": "블러드 레드"
 },
 {
  "name": "릴리스",
  "group": "wolyoung-knights",
  "sex": "여",
  "hair": "차콜 퍼플",
  "style": "생머리",
  "eye": "파스텔 블루"
 },
 {
  "name": "아르젠트 루시엘",
  "group": "altar-seonghwi"
 },
 {
  "name": "세라피나 벨크로스",
  "group": "altar-seonghwi"
 },
 {
  "name": "카시안 로월",
  "group": "altar-seonghwi"
 },
 {
  "name": "루미에라 세레니스",
  "group": "altar-wolyoung"
 },
 {
  "name": "에이든 노크티스",
  "group": "altar-wolyoung"
 },
 {
  "name": "미레아 플로렌",
  "group": "altar-wolyoung"
 },
 {
  "name": "벨리안 아스테아",
  "group": "altar-hwanghon"
 },
 {
  "name": "라비엔 크로이츠",
  "group": "altar-hwanghon"
 },
 {
  "name": "엘리시아 베른",
  "group": "altar-hwanghon"
 },
 {
  "name": "모르벤 카르시스",
  "group": "altar-geumeum"
 },
 {
  "name": "니벨라 셰이드",
  "group": "altar-geumeum"
 },
 {
  "name": "오르펠 네크리온",
  "group": "altar-geumeum",
  "inGame": "보스"
 }
];

export const LORE_TERMS = [
 {
  "name": "에테르",
  "desc": "생명체를 구성하는 데 근원이 되는 기운이자 에너지"
 },
 {
  "name": "신성력",
  "desc": "신들이 부여해준 기프트의 능력을 사용하는 데 소모하는 에너지"
 },
 {
  "name": "권능",
  "desc": "권능의 신 다섯이 내려주는 힘. 제 1 권능(기본·가장 흔함), 제 2 권능(딜러), 제 3 권능(서포터), 제 4 권능(주인공 전용), 제 5 권능(서브 딜러). 단계마다 컬러가 바뀜"
 },
 {
  "name": "신성 방막",
  "desc": "제 1 권능의 방어막. 깨지면 그로기 상태"
 }
];
