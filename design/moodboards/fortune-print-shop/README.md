# 꼬북점 무드보드 01 — 부적 인쇄소

> 꼬북이만 남기고, 사주의 인상을 다시 찍다.

기존의 민트·아이보리·둥근 카드 UI를 버리고, 한국 활판 인쇄소와 리소그래프 편집물의 문법으로 사주를 재구성한 방향이다. 꼬북이의 민트는 UI 컬러가 아닌 **캐릭터 전용색**으로 제한한다.

## 핵심 문법

- **세계관:** 현대적인 부적 인쇄소, 개인의 사주를 한 장의 인쇄물처럼 제작한다.
- **그래픽:** 한지 섬유, 마른 먹, 인주, 찢긴 모서리, 활자 블록, 2색 인쇄 오차, 등껍질 격자.
- **정보 구조:** 사주 4기둥은 세로 활자 스트립, 팔자 8글자는 금속 활자 셀, 오행은 5개의 색·재질 토큰으로 표현한다.
- **UI 형태:** 반복되는 둥근 카드 대신 점괘표, 영수증, 봉투, 도장판, 세로 편집 그리드를 쓴다.
- **모션:** 도장 찍기, 종이 펼치기, 절취선 뜯기, 활자가 한 칸씩 찍히기.
- **톤:** 신비롭기보다 자신감 있고 장난스러우며, 수집하고 싶은 편집물.

## 캐릭터 고정 규칙

둥근 민트색 머리, 굵은 네이비 외곽선, 흰 하이라이트가 있는 타원형 네이비 눈, 복숭아색 볼, 작은 물결 미소, 크림색 분절 배갑, 청록 육각 등껍질, 짧고 통통한 팔다리와 흰 발톱을 바꾸지 않는다. 기본형과 표정·행동 포즈만 쓰며 도사·무당·보살 코스튬은 계승하지 않는다.

## 팔레트

| 역할 | 색상 | 값 |
|---|---:|---:|
| 먹 | ![#17140F](https://placehold.co/16x16/17140F/17140F.png) | `#17140F` |
| 한지 | ![#F0E4CA](https://placehold.co/16x16/F0E4CA/F0E4CA.png) | `#F0E4CA` |
| 인주 | ![#D84632](https://placehold.co/16x16/D84632/D84632.png) | `#D84632` |
| 군청 | ![#244D91](https://placehold.co/16x16/244D91/244D91.png) | `#244D91` |
| 황토 | ![#D1A237](https://placehold.co/16x16/D1A237/D1A237.png) | `#D1A237` |
| 꼬북 민트 | ![#A8E4DC](https://placehold.co/16x16/A8E4DC/A8E4DC.png) | `#A8E4DC` · 캐릭터 전용 |

## 타이포

- 큰 제목과 한자: 묵직한 명조 또는 목판 인쇄처럼 압력이 느껴지는 세리프.
- UI 제목: 넓고 단단한 ExtraBold 고딕.
- 날짜·점수·간지 데이터: 등폭 모노스페이스.
- 작은 회색 글자 대신 크기와 굵기 차이, 굵은 괘선으로 위계를 만든다.

## 피해야 할 것

보라색 점성술, 달·별 클리셰, 타로 카드, 수정구, 파스텔 웰니스, 반투명 흰 카드, 글래스모피즘, 매끈한 그라데이션, 코스튬 페르소나.

## 최종 ImageGen 프롬프트

```text
Use case: productivity-visual
Asset type: landscape visual foundation for a high-end mobile app brand moodboard
Primary request: Create one bold, cohesive visual direction for a Korean saju app based on the concept "contemporary fortune print shop". Preserve the mint turtle mascot identity from the inputs, while replacing every other existing app convention with an unmistakable new art direction.
Input images: Image 1 is the primary exact mascot identity anchor; Image 2 is the exact face, body proportion, and color anchor.
Scene/backdrop: a tactile contemporary Korean letterpress and risograph studio — layered hanji paper, bold ink slabs, perforated fortune slips, movable-type blocks, stamped seals, registration marks, shell-scute grids, and four vertical pillar strips.
Subject: the exact mascot appears once as a clean uncostumed sticker-like cutout in a generous hero area. No redesign, no clothing, no beard, no hat, no staff, no extra characters.
Style/medium: premium Korean editorial graphic design; risograph misregistration, woodblock texture, rough torn paper, modern brutalist layout, playful but authoritative; flat 2D, not vintage souvenir styling.
Composition/framing: wide 16:9 landscape collage with a strong editorial grid; one large hero field, several material and motif tiles, and two or three abstract mobile UI fragments with blank label areas. Clear hierarchy and generous whitespace.
Lighting/mood: tactile, confident, mischievous, warm, handmade, collectible.
Color palette: ink black #17140F, hanji cream #F0E4CA, seal vermilion #D84632, royal indigo #244D91, ochre #D1A237. The mascot's mint is the only mint in the entire board.
Materials/textures: fibrous hanji, dry ink, rubber stamp, letterpress indentation, rough deckled edge, slight two-color print misregistration.
Constraints: Preserve the mascot's round mint head, dark navy thick outline, glossy oval navy eyes with white highlights, peach cheeks, tiny wavy smile, cream segmented belly, teal hex-pattern shell, short rounded limbs, and white claws. No text, no letters, no numbers, no pseudo-writing, no logos, no watermark; keep all label zones blank for later typography.
Avoid: generic purple astrology, moon-and-star clichés, tarot cards, crystal balls, pastel wellness UI, beige rounded-card SaaS layouts, glassmorphism, glossy gradients, 3D rendering, anime restyling, traditional shaman or scholar costumes, clutter, photorealism.
```

생성은 Codex 기본 내장 ImageGen 모드로 진행했고, 정확한 한글·한자와 사주 4기둥 구조는 로컬 후편집으로 추가했다.
