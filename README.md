# 그랑서울 피트니스 챌린지 사이트

캐릭터 선택 → 오늘의 헬스장 맵 → 미션 인증으로 이어지는 4주 챌린지 프로토타입이에요.

## 실행 방법

```bash
node server.js
```

`http://localhost:8787/` 접속하면 캐릭터 선택 화면부터 시작해요. 외부 라이브러리
없이 Node.js 기본 기능만 쓰기 때문에 `npm install` 없이 바로 실행돼요.

이 서버 하나가 화면(HTML)과 혼잡도 API(`/api/occupancy`)를 같은 포트에서 함께
서빙해요 — 그래서 헬스장 맵의 "실시간 혼잡도"가 이 서버를 켜두면 실제 계산값으로,
꺼두고 `prototypes/*.html`을 파일로 직접 열면 예전처럼 샘플 값으로 조용히
동작해요.

## 폴더 구성

- `prototypes/` — 화면 3개 (`characterselect.html`, `gymmap.html`, `missioncertify.html`)
- `backend/` — 혼잡도 계산 로직과 입퇴실 데이터 (`occupancy.js`, `config.json`,
  `data/checkins.csv`). 실제 장치 데이터로 바꾸는 방법은 `backend/README.md` 참고
- `server.js` — 위 두 개를 한 포트에서 같이 서빙하는 진입점

## 배포하려면

지금은 로컬에서만 도는 서버예요. 실제로 인터넷에 올리려면 이 저장소를 Node.js를
지원하는 호스팅(예: 사내 서버, 클라우드 VM 등)에 올리고 `node server.js`를 그
서버에서 실행하면 돼요. 포트나 도메인이 바뀌어도 화면 쪽 코드는 상대 경로
(`/api/occupancy`)로 API를 호출하기 때문에 별도 설정 없이 그대로 붙어요.
