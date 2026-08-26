// 혼잡도 계산 로직 — server.js(사이트 전체 서버)와 필요하면 다른 스크립트에서도
// 재사용할 수 있게 분리해뒀어요. 실제 장치 데이터 형식/계산 방식은 backend/README.md
// 참고하세요.

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

function getOccupancy() {
  const config = loadConfig();
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csvText);
  return computeOccupancy(rows, config);
}

module.exports = { loadConfig, parseCsv, computeOccupancy, getOccupancy };
