// 그랑서울 피트니스 챌린지 사이트 — 캐릭터 선택 → 헬스장 맵 → 미션 인증 3개 화면을
// 한 서버에서 띄워요. 외부 라이브러리 없이 Node.js 기본 기능만 쓰기 때문에 설치 없이
// 바로 실행할 수 있어요.
//
// 실행: node server.js
// 접속: http://localhost:8787/

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const PROTOTYPES_DIR = path.join(__dirname, 'prototypes');

const PAGES = {
  '/': 'characterselect.html',
  '/characterselect.html': 'characterselect.html',
  '/gymmap.html': 'gymmap.html',
  '/missioncertify.html': 'missioncertify.html',
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // 미션 인증 카드에 쓰는 실제 기구 사진들 (prototypes/images/equipment/*.jpg)
  if (url.startsWith('/images/equipment/') && req.method === 'GET') {
    const filename = path.basename(url);
    if (/^[a-z0-9-]+\.jpg$/.test(filename)) {
      try {
        const buf = fs.readFileSync(path.join(PROTOTYPES_DIR, 'images', 'equipment', filename));
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
        res.end(buf);
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('이미지를 찾을 수 없어요');
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('잘못된 요청이에요');
    }
    return;
  }

  // 자체 호스팅하는 웹폰트 (외부 CDN 의존 없이 안정적으로 로드하기 위해)
  if (url.startsWith('/fonts/') && req.method === 'GET') {
    const filename = path.basename(url);
    if (/^[A-Za-z0-9-]+\.woff2$/.test(filename)) {
      try {
        const buf = fs.readFileSync(path.join(PROTOTYPES_DIR, 'fonts', filename));
        res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=604800' });
        res.end(buf);
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('폰트를 찾을 수 없어요');
      }
    } else {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('잘못된 요청이에요');
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

server.listen(PORT, () => {
  console.log(`그랑서울 피트니스 사이트 실행 중: http://localhost:${PORT}/`);
});
