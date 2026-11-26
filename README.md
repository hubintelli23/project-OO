# Project OO — 액션 JRPG 전투 체험판 v1.7.0

3인칭 백뷰(명조: 워더링 웨이브 스타일) 웹 액션 JRPG. three.js(CDN) 사용.

## 실행
ES 모듈을 쓰기 때문에 `index.html`을 더블클릭(file://)하면 열리지 않습니다. 아래처럼 서버로 여세요.
- GitHub Pages에 폴더째 올리기 (그대로 동작)
- 또는 로컬: 폴더에서 `python -m http.server 8000` → http://localhost:8000
- VS Code라면 Live Server 확장

## 조작
| 키 | 동작 |
|---|---|
| W A S D | 이동 |
| Shift | 회피 (피격 직전 회피 = 완벽 회피) |
| 마우스 우클릭 | 대쉬 (이후 이동 유지 시 질주) |
| 마우스 좌클릭 | 공격 1~4타 연계 |
| 좌클릭 홀딩 0.3초 | 강공격 |
| Space | 점프 |
| Space + 좌클릭 | 점프 공격 |
| Space + Ctrl + 좌클릭 | 공중 특수공격 (점프 강공격) |
| Q / E | 스킬 1 / 스킬 2 |
| R | 궁극기 (게이지 100) |
| Tab | 캐릭터 전환 (들어오는 캐릭터의 지원 스킬 자동 발동) |
| F | 아이템 줍기 · 상호작용 |
| G | **권능 스킬** (권능 게이지 100%) |
| M | 지도 |
| Esc | 설정 |

### 특수공격 5종 (v1.6.0 — 새 키 없음)
| 입력 | 동작 |
|---|---|
| Shift(회피) 직후 좌클릭 | 특수공격 1 |
| 우클릭(대쉬) 중·직후 좌클릭 | 특수공격 2 |
| 기본 4타·특수공격 1 직후 좌클릭 | 연계 특수공격 A (리아: 패링 성공 후 / 샤를: Q 정화 직후에도) |
| 특수공격 2 직후 좌클릭 홀딩 | 연계 특수공격 B (이리스·카엘·루시안·베아트리스는 방어력 감소·그로기·속박 대상에게도 / 리아는 자동) |
| Space + Ctrl + 좌클릭 | 공중 특수공격 |

화면 가운데 아래에 지금 나갈 수 있는 특수공격이 표시됩니다. 스킬 트리는 설정(Esc) 또는 타이틀의 **스킬 트리** 버튼 — 적 처치 1포인트, 보스 5포인트.

> Ctrl을 누른 채 W를 누르면 브라우저가 탭을 닫으려 할 수 있습니다. 설정의 **전체화면** 버튼을 쓰면 막힙니다(크롬 계열).

## 휴대폰 조작 (v1.1.0)
휴대폰·태블릿에서 열면 자동으로 터치 조작으로 바뀝니다. 가로 화면 전용입니다.
| 조작 | 동작 |
|---|---|
| 왼쪽 화면 누르고 끌기 | 이동 (누른 자리에 조이스틱 생성) |
| 오른쪽 화면 드래그 | 카메라 회전 |
| 공격 탭 / 0.3초 길게 | 공격 / 강공격 |
| 점프 → 공격 탭 / 길게 | 점프 공격 / 공중 특수공격 |
| 회피 → 공격 · 대쉬 → 공격 | 특수공격 1 · 2 |
| 4타 → 공격 · 특수 2 → 공격 길게 | 연계 특수공격 A · B |
| G 아이콘 (스킬 옆) | 권능 스킬 |
| 회피 · 대쉬 · 전환 | 버튼 |
| Q·E·R 아이콘 | 스킬 · 궁극기 |
| 화면 가운데 "F ○○ 줍기" | 아이템 줍기 · 상호작용 |
| 미니맵 | 지도 (지도 화면은 탭해서 닫기) |
| ☰ | 설정 |

PC에서 터치 화면을 확인하려면 주소 끝에 `?touch=1` 을 붙이세요.

## 마스터 모드 (테스트 모드) — v1.2.0
- 진입/종료: **`** 키 (숫자 1 왼쪽) · 휴대폰은 ☰ 설정 화면 또는 **타이틀** 화면의 버전 표시를 5번 연속 탭
- v1.7.0: 메인 타이틀에서도 진입 가능. 패널의 **스킬 트리 편집**으로 캐릭터별 갈래 −/+·최종 강화 켜기/끄기·전원 최대/초기화 (포인트 무관). 마스터 모드 중 스킬 트리 화면은 편집 모드
- 숫자키 단축: 1 무적 · 2 쿨타임/에테르 무제한 · 3 궁극기 상시 충전 · 4 한 방 처치 · 5 적 정지 · 6 판정 범위 표시 · 7 적 소환 · 8 보스 소환 · 9 회복/부활 · 0 게임 속도
- 패널 버튼은 Esc로 마우스를 풀면 클릭 가능(휴대폰은 바로 터치)
- 마스터 모드로 소환한 적은 진행도(목표 카운트)에 포함되지 않음

## 에셋 교체 (나중에 모델·이미지 추가)
`assets/` 폴더에 파일을 넣고 `js/assets/manifest.js`에 경로만 적으면 됩니다. 비워두면 기본 모델을 씁니다.
- 아바타: `avatars.kain = { url: 'assets/avatars/kain.glb', scale: 1 }`
- 무기: `weapons.katana = { url: 'assets/weapons/katana.glb' }`
- 이펙트: `effects.slash = 'assets/effects/slash.png'`
- 배경: `backgrounds.sky = 'assets/backgrounds/sky.jpg'`, `backgrounds.ground = ...`

## 폴더 구조
```
index.html            화면 뼈대(HUD/메뉴 DOM)만 — 로직 없음
css/style.css         UI 스타일
js/main.js            게임 루프 · 상태(타이틀/전투/일시정지/지도/결과)
js/config.js          버전 · 조작키 · 홀딩 기준(0.3초) · 물리/전투 상수
js/core/input.js      키보드·마우스·포인터 락·홀딩 판정
js/core/touch.js      휴대폰 가상 조이스틱·버튼·카메라 드래그
js/core/camera.js     3인칭 백뷰 카메라
js/core/audio.js      효과음(WebAudio 합성)
js/core/utils.js      공용 함수
js/data/powers.js     권능 1~5 컬러(1→2→3단계)·담당 신
js/data/characters.js 카인/카일라·시엔·리아 기술 데이터(콤보·강공·점프·Q·E·R)
js/data/enemies.js    그믐 제단 적·진영 배치
js/game/party.js      플레이어 컨트롤러(이동·회피·대쉬·콤보·스킬·전환·피격)
js/game/combat.js     판정·피해 계산·타격감
js/game/enemy.js      적 AI(예고 장판·방막·그로기·보스 2페이즈)
js/game/world.js      배치·충돌·지도 데이터
js/assets/avatars.js     아바타 캐릭터 — 외형 표·몸 모델·애니메이션
js/assets/weapons.js     무기 아티팩트 — 무기 모델·장착
js/assets/effects.js     이펙트 — 참격·파동·결계·파티클
js/assets/backgrounds.js 배경 — 하늘·조명·지면·기둥·나무·상자·원경
js/assets/manifest.js    외부 모델·이미지 경로 연결
js/assets/loader.js      GLB·텍스처 로더
js/assets/common.js      재질·메시 헬퍼
js/debug/master.js    마스터 모드(테스트)
updates.json          업데이트 내역
assets/               나중에 넣을 모델·이미지 폴더
js/game/items.js      드롭 아이템·상호작용
js/ui/hud.js          HUD
js/ui/map.js          지도·미니맵
js/ui/menu.js         타이틀·설정·결과 화면
js/ui/codex.js        세계관 도감 (인물·신·세력·용어)
js/data/lore.js       도감 데이터 (기획서 기준)
js/data/characters-extra.js 추가 캐릭터 6명 (이리스·샤를·노아·카엘·루시안·베아트리스)
js/data/combat-doc.js 전투 시스템 기획서 수록 데이터 (도감 '전투 시스템' 탭)
js/data/kits.js       9명의 특수공격 5종·지원 스킬·권능 스킬 G·스킬 트리·인연 시너지 데이터 (v1.6.0)
js/game/kit.js        위 데이터의 동작 처리 — 특수공격 입력·각성·궤적·찬탈·시너지·트리 효과
js/ui/skilltree.js    스킬 트리 화면 (마스터 모드 = 편집 모드)
js/game/treestore.js  스킬 트리 저장소 (타이틀·전투·마스터 공용)
js/data/characters-doc.js 등장인물 능력 수정본 30명 — 문서 원문 데이터 (v1.7.0)
js/data/doc-builder.js    위 30명의 기술 생성기 (무기 계열 템플릿 + 설명 키워드)
```

## 수정 포인트
- 기술 수치/이름/이펙트: `js/data/characters.js` (카인·시엔·리아), `js/data/characters-extra.js` (나머지 6명)
- 특수공격·지원 스킬·권능 스킬·스킬 트리·시너지: `js/data/kits.js` (수치는 임시 값)
- 문서 인물 30명: 이름·설명은 `js/data/characters-doc.js`, 동작·수치는 `js/data/doc-builder.js`의 무기 계열 템플릿
- 파티 편성: 타이틀의 '파티 편성' 버튼 (`js/ui/menu.js`) — 9명 중 3명, 역할 무관
- 권능 컬러: `js/data/powers.js`
- 홀딩 시간·쿨타임·카메라: `js/config.js`
- 모델 교체(GLB 등): `js/game/models.js`의 `buildHumanoid` 반환 구조를 유지하면 됨
