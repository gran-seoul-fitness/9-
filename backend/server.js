// 혼잡도 API만 단독으로 띄우고 싶을 때 쓰는 서버예요.
// 챌린지 사이트(캐릭터 선택~맵~미션 인증)까지 한 번에 띄우려면 대신 저장소 루트의
// `node server.js`를 실행하세요 — 그게 이 API와 화면을 같은 포트에서 함께 서빙해요.
//
// 실행: node backend/server.js
// 확인: http://localhost:8787/api/occupancy
//
// 실제 장치 데이터 형식/연동 방법은 backend/README.md를 참고하세요.

const http = require('http');
const { loadConfig, getOccupancy } = require('./occupancy');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/api/occupancy' && req.method === 'GET') {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(getOccupancy()));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

const config = loadConfig();
server.listen(config.port, () => {
  console.log(`혼잡도 API 서버 실행 중: http://localhost:${config.port}/api/occupancy`);
});
