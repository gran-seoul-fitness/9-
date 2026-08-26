// 그랑서울 피트니스 챌린지 사이트 — 화면(캐릭터 선택 → 헬스장 맵 → 미션 인증)과
// 혼잡도 API를 한 서버에서 같이 띄워요. 외부 라이브러리 없이 Node.js 기본 기능만
// 쓰기 때문에 설치 없이 바로 실행할 수 있어요.
//
// 실행: node server.js
// 접속: http://localhost:8787/
//
// 혼잡도 데이터를 실제 장치 데이터로 바꾸는 방법은 backend/README.md 참고하세요.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { getOccupancy, loadConfig } = require('./backend/occupancy');

const PROTOTYPES_DIR = path.join(__dirname, 'prototypes');

const PAGES = {
  '/': 'characterselect.html',
  '/characterselect.html': 'characterselect.html',
  '/gymmap.html': 'gymmap.html',
  '/missioncertify.html': 'missioncertify.html',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/occupancy' && req.method === 'GET') {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(getOccupancy()));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  const page = PAGES[url];
  if (page) {
    try {
      const html = fs.readFileSync(path.join(PROTOTYPES_DIR, page), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('페이지를 불러오지 못했어요: ' + String(err));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

const config = loadConfig();
server.listen(config.port, () => {
  console.log(`그랑서울 피트니스 사이트 실행 중: http://localhost:${config.port}/`);
});
