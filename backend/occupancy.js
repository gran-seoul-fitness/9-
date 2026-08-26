// 혼잡도 계산 로직 — server.js(사이트 전체 서버)와 필요하면 다른 스크립트에서도
// 재사용할 수 있게 분리해뒀어요. 실제 장치 데이터 형식/계산 방식은 backend/README.md
// 참고하세요.
//
// 값의 우선순위: 직원이 admin.html에서 직접 입력한 최근 값(manual) > 입퇴실 기록
// CSV로 계산한 값(csv) > (둘 다 없으면 총 0명). RNS DB 연동이 준비되기 전까지는
// manual이 사실상의 실제 값이에요.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const CSV_PATH = path.join(__dirname, 'data', 'checkins.csv');
const MANUAL_PATH = path.join(__dirname, 'data', 'manual-occupancy.json');
const MANUAL_STALE_MS = 3 * 60 * 60 * 1000; // 3시간 넘게 갱신 안 되면 오래된 값으로 취급

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
function totalFromCsv() {
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csvText);
  return rows.filter((r) => !r['퇴실시각']).length;
}

function loadManualOccupancy() {
  try {
    return JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveManualOccupancy(totalCount) {
  const data = { totalCount, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(MANUAL_PATH), { recursive: true });
  fs.writeFileSync(MANUAL_PATH, JSON.stringify(data, null, 2));
  return data;
}

// 구역별(웨이트/유산소/GX/스트레칭) 인원은 실측 불가 — 항상 정원 비율로 추정
function distributeByZone(totalCount, config) {
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
  return zones;
}

function getOccupancy() {
  const config = loadConfig();

  let totalCount;
  let source;
  let sourceUpdatedAt;

  const manual = loadManualOccupancy();
  const manualFresh = manual && (Date.now() - new Date(manual.updatedAt).getTime()) < MANUAL_STALE_MS;

  if (manualFresh) {
    totalCount = manual.totalCount;
    source = 'manual';
    sourceUpdatedAt = manual.updatedAt;
  } else {
    totalCount = totalFromCsv();
    source = 'csv';
    sourceUpdatedAt = new Date().toISOString();
  }

  return {
    totalCount,
    totalCapacity: config.capacityTotal,
    zones: distributeByZone(totalCount, config),
    source, // 'manual' | 'csv' — 지금 이 값이 어디서 온 건지
    sourceUpdatedAt,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  loadConfig,
  parseCsv,
  getOccupancy,
  loadManualOccupancy,
  saveManualOccupancy,
};
