# 그랑서울 피트니스 챌린지 사이트

캐릭터 선택 → 오늘의 헬스장 맵 → 미션 인증으로 이어지는 4주 챌린지 프로토타입이에요.

## 실행 방법

```bash
node server.js
```

`http://localhost:8787/` 접속하면 캐릭터 선택 화면부터 시작해요. 외부 라이브러리
없이 Node.js 기본 기능만 쓰기 때문에 `npm install` 없이 바로 실행돼요.

## 폴더 구성

- `prototypes/` — 화면 3개 (`characterselect.html`, `gymmap.html`, `missioncertify.html`)
  와 미션 인증 카드에 쓰는 실제 기구 사진들 (`prototypes/images/equipment/`)
- `server.js` — 위 화면들을 서빙하는 진입점

## 배포하려면

지금은 로컬에서만 도는 서버예요. 실제로 인터넷에 올리려면 이 저장소를 Node.js를
지원하는 호스팅(예: 사내 서버, 클라우드 VM 등)에 올리고 `node server.js`를 그
서버에서 실행하면 돼요.
