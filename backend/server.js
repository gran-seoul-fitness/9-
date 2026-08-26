// 그랑서울 피트니스 - 혼잡도 API 서버
//
// 입퇴실 기록 장치(RNS)가 내보낸 "시설물 이용현황" 파일을 읽어서 "지금 몇 명이
// 있는지"를 계산해 JSON으로 내려주는 아주 작은 서버예요. 외부 라이브러리 없이
// Node.js 기본 기능만 사용하므로 `node server.js`로 바로 실행할 수 있어요.
//
// 실행: node server.js
// 확인: http://localhost:8787/api/occupancy
//
// ===== 실제 장치 데이터 형식 (관리자 화면에서 확인한 컬럼) =====
// 순번, 회원정보, 이용락카, 키번호, 성별, 회원구분, 이용대상, 입장시각, 퇴실시각
// - 한 행 = 한 번의 방문(입장~퇴실). 로그가 아니라 방문 단위 레코드예요.
// - 퇴실시각이 비어있으면 아직 안에 있는 사람이에요. → 이 개수가 "현재 인원"이에요.
// - 이용락카는 "여자사우나"/"남자사우나"처럼 성별 락커 구분이라, 웨이트/유산소/GX/
//   스트레칭 같은 운동존 정보는 이 장치로는 알 수 없어요. 그래서 구역별 인원은
//   항상 config.json의 구역 정원 비율로 "추정"해서 채워요 (전체 인원만 실측치).
//
// ===== 실제 데이터로 바꾸는 방법 =====
// 1) 관리자 화면의 [Excel] 또는 [Text] 내보내기로 실제 파일을 받아서
//    data/checkins.csv 자리에 덮어써주세요 (컬럼 구성이 위와 같다면 그대로 동작해요).
// 2) 내보낸 파일이 엑셀(.xlsx)이면 "다른 이름으로 저장 → CSV" 로 한 번 변환해주세요.
// 3) 실제로 내보내보니 컬럼 순서/이름/인코딩(EUC-KR 등)이 다르면 알려주세요 —
//    parseCsv()/computeOccupancy() 부분만 그 형식에 맞게 고치면 돼요.
// 4) 이 서버는 요청마다 파일을 새로 읽으므로, 파일 내용만 최신으로 유지되면
//    재시작 없이 최신값이 반영돼요. 예약 내보내기 기능이 있다면 그 파일이 이 자리에
//    떨어지도록 설정하는 걸 추천해요.

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const CSV_PATH = path.join(__dirname, 'data', 'checkins.csv');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row = {};
    header.forEach((key, i) => { row[key] = cells[i] || ''; });
    return row;
  });
}

// rows: [{ 순번, 회원정보, 이용락카, 키번호, 성별, 회원구분, 이용대상, 입장시각, 퇴실시각 }]
// 퇴실시각이 빈 행 = 아직 시설에 있는 사람 → 그 개수가 현재 총 인원이에요.
function computeOccupancy(rows, config) {
  const totalCount = rows.filter((r) => !r['퇴실시각']).length;

  // 이 장치는 운동존(웨이트/유산소/GX/스트레칭) 구분 없이 전체 인원만 알려주기
  // 때문에, 구역별 인원은 항상 설정된 정원 비율로 추정해서 채워요.
  const zoneKeys = Object.keys(config.byZone);
  const capacityTotal = zoneKeys.reduce((sum, z) => sum + config.byZone[z], 0);
  const zones = {};
  let distributed = 0;
  zoneKeys.forEach((z, i) => {
    const isLast = i === zoneKeys.length - 1;
    const share = isLast ? totalCount - distributed : Math.round(totalCount * (config.byZone[z] / capacityTotal));
    distributed += share;
    zones[z] = { count: Math.max(0, share), capacity: config.byZone[z], estimated: true };
  });

  return {
    totalCount,
    totalCapacity: config.capacityTotal,
    zones,
    updatedAt: new Date().toISOString(),
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/api/occupancy' && req.method === 'GET') {
    try {
      const config = loadConfig();
      const csvText = fs.readFileSync(CSV_PATH, 'utf8');
      const rows = parseCsv(csvText);
      const data = computeOccupancy(rows, config);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
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
