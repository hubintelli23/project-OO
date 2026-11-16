# Project OO — 액션 JRPG 전투 체험판 v1.1.0

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
| 좌클릭 홀딩 0.5초 | 강공격 |
| Space | 점프 |
| Space + 좌클릭 | 점프 공격 |
| Space + Ctrl + 좌클릭 | 점프 강공격 |
| Q / E | 스킬 1 / 스킬 2 |
| R | 궁극기 (게이지 100) |
| Tab | 캐릭터 전환 |
| F | 아이템 줍기 · 상호작용 |
| M | 지도 |
| Esc | 설정 |

> Ctrl을 누른 채 W를 누르면 브라우저가 탭을 닫으려 할 수 있습니다. 설정의 **전체화면** 버튼을 쓰면 막힙니다(크롬 계열).

## 휴대폰 조작 (v1.1.0)
휴대폰·태블릿에서 열면 자동으로 터치 조작으로 바뀝니다. 가로 화면 전용입니다.
| 조작 | 동작 |
|---|---|
| 왼쪽 화면 누르고 끌기 | 이동 (누른 자리에 조이스틱 생성) |
| 오른쪽 화면 드래그 | 카메라 회전 |
| 공격 탭 / 0.5초 길게 | 공격 / 강공격 |
| 점프 → 공격 탭 / 길게 | 점프 공격 / 점프 강공격 |
| 회피 · 대쉬 · 전환 | 버튼 |
| Q·E·R 아이콘 | 스킬 · 궁극기 |
| 화면 가운데 "F ○○ 줍기" | 아이템 줍기 · 상호작용 |
| 미니맵 | 지도 (지도 화면은 탭해서 닫기) |
| ☰ | 설정 |

PC에서 터치 화면을 확인하려면 주소 끝에 `?touch=1` 을 붙이세요.

## 폴더 구조
```
index.html            화면 뼈대(HUD/메뉴 DOM)만 — 로직 없음
css/style.css         UI 스타일
js/main.js            게임 루프 · 상태(타이틀/전투/일시정지/지도/결과)
js/config.js          버전 · 조작키 · 홀딩 기준(0.5초) · 물리/전투 상수
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
js/game/effects.js    참격·파동·결계·파티클 이펙트
js/game/models.js     캐릭터 모델(프리미티브)·절차적 애니메이션
js/game/world.js      지형·장애물·제단·보물 상자
js/game/items.js      드롭 아이템·상호작용
js/ui/hud.js          HUD
js/ui/map.js          지도·미니맵
js/ui/menu.js         타이틀·설정·결과 화면
```

## 수정 포인트
- 기술 수치/이름/이펙트: `js/data/characters.js`
- 권능 컬러: `js/data/powers.js`
- 홀딩 시간·쿨타임·카메라: `js/config.js`
- 모델 교체(GLB 등): `js/game/models.js`의 `buildHumanoid` 반환 구조를 유지하면 됨
