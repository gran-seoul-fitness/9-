// 그랑서울 피트니스 챌린지 사이트 — 화면(캐릭터 선택 → 헬스장 맵 → 미션 인증)과
// 혼잡도 API를 한 서버에서 같이 띄워요. 외부 라이브러리 없이 Node.js 기본 기능만
// 쓰기 때문에 설치 없이 바로 실행할 수 있어요.
//
// 실행: node server.js
// 접속: http://localhost:8787/            (회원 화면)
//      http://localhost:8787/admin.html   (직원용 인원 카운터 — 인증/보안 없음, 사내망 전용)
//
// 혼잡도 데이터를 실제 장치 데이터(RNS)로 바꾸는 방법은 backend/README.md 참고하세요.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { getOccupancy, loadConfig, saveManualOccupancy } = require('./backend/occupancy');

const PROTOTYPES_DIR = path.join(__dirname, 'prototypes');
const ADMIN_PIN = '7777';

const PAGES = {
  '/': 'characterselect.html',
  '/characterselect.html': 'characterselect.html',
  '/gymmap.html': 'gymmap.html',
  '/missioncertify.html': 'missioncertify.html',
  '/admin.html': 'admin.html',
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
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

  // 직원이 admin.html에서 +/-로 누른 값을 저장해요. 인증 없음 — 사내망 밖으로
  // 노출하지 마세요 (backend/README.md 참고).
  if (url === '/api/occupancy/manual' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (body.pin !== ADMIN_PIN) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'PIN이 올바르지 않아요' }));
        return;
      }
      const totalCount = parseInt(body.totalCount, 10);
      if (Number.isNaN(totalCount) || totalCount < 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'totalCount는 0 이상의 숫자여야 해요' }));
        return;
      }
      saveManualOccupancy(totalCount);
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
