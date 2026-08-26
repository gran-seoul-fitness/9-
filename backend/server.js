// 그랑서울 피트니스 - 혼잡도 API 서버
//
// 입퇴실 기록 장치(RNS 등)가 내보낸 CSV를 읽어서 "지금 헬스장에 몇 명이 있는지"를
// 계산해 JSON으로 내려주는 아주 작은 서버예요. 외부 라이브러리 없이 Node.js 기본
// 기능만 사용하므로 `node server.js`로 바로 실행할 수 있어요.
//
// 실행: node server.js
// 확인: http://localhost:8787/api/occupancy
//
// 실제 장치와 연동하는 방법:
//  1) data/checkins.csv 를 실제 내보내기 파일로 덮어써주세요 (파일명은 같아야 해요).
//  2) 컬럼 형식이 다르면 이 파일의 parseCsv()/computeOccupancy() 부분만 실제 컬럼에
//     맞춰 고치면 돼요 — 실제 내보내기 파일 샘플을 보내주시면 그 부분은 제가 맞춰드릴게요.
//  3) RNS가 폴더에 파일을 자동으로 갱신해주는 기능이 있다면, 이 서버는 매 요청마다
//     파일을 새로 읽기 때문에 폴더 갱신만으로 최신값이 반영돼요. 그런 기능이 없다면
//     당분간은 사람이 새 내보내기 파일로 이 경로의 파일을 주기적으로 바꿔줘야 해요.
//
// 지금 이 장치는 보통 "입구 하나"에서 전체 인원만 체크하는 경우가 많아서, 구역별
// (웨이트/유산소/GX/스트레칭) 인원은 실제로 못 잴 가능성이 높아요. 그래서 전체 인원은
// 실제 계산값을, 구역별 인원은 config.json의 구역 비중으로 "추정"해서 채워요. 만약
// CSV에 zone 컬럼이 실제로 채워져 있다면(구역별 리더가 따로 있는 경우) 그 값을 그대로 써요.

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

// rows: [{ id, timestamp, type: 'IN'|'OUT', zone }]
function computeOccupancy(rows, config) {
  rows = rows.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const byId = new Map(); // id -> { inside, zone }
  let anonymousBalance = 0; // id가 없는 행을 위한 보조 카운터
  let sawZoneData = false;

  for (const row of rows) {
    const type = (row.type || '').toUpperCase();
    const zone = row.zone || '';
    if (zone) sawZoneData = true;

    if (row.id) {
      const prev = byId.get(row.id) || { inside: false, zone: null };
      if (type === 'IN') { prev.inside = true; if (zone) prev.zone = zone; }
      else if (type === 'OUT') { prev.inside = false; }
      byId.set(row.id, prev);
    } else {
      if (type === 'IN') anonymousBalance++;
      else if (type === 'OUT') anonymousBalance--;
    }
  }

  const realZoneCounts = {};
  let totalFromIds = 0;
  byId.forEach((v) => {
    if (!v.inside) return;
    totalFromIds++;
    if (v.zone && config.byZone[v.zone] !== undefined) {
      realZoneCounts[v.zone] = (realZoneCounts[v.zone] || 0) + 1;
    }
  });

  const totalCount = Math.max(0, totalFromIds + anonymousBalance);
  const zoneKeys = Object.keys(config.byZone);
  const zones = {};

  const haveFullZoneBreakdown = sawZoneData &&
    zoneKeys.every((z) => realZoneCounts[z] !== undefined) &&
    zoneKeys.reduce((sum, z) => sum + (realZoneCounts[z] || 0), 0) === totalCount;

  if (haveFullZoneBreakdown) {
    zoneKeys.forEach((z) => {
      zones[z] = { count: realZoneCounts[z] || 0, capacity: config.byZone[z], estimated: false };
    });
  } else {
    // 구역별 실측 데이터가 없으면, 설정된 구역 정원 비중으로 추정해서 채워요.
    const capacityTotal = zoneKeys.reduce((sum, z) => sum + config.byZone[z], 0);
    let distributed = 0;
    zoneKeys.forEach((z, i) => {
      const isLast = i === zoneKeys.length - 1;
      const share = isLast ? totalCount - distributed : Math.round(totalCount * (config.byZone[z] / capacityTotal));
      distributed += share;
      zones[z] = { count: Math.max(0, share), capacity: config.byZone[z], estimated: true };
    });
  }

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
