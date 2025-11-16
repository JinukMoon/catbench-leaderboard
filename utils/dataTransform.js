/**
 * 데이터 변환 유틸리티 함수
 * leaderboard_data.json의 구조를 컴포넌트에서 사용하기 쉬운 형태로 변환
 */

/**
 * JSON 데이터를 컴포넌트에서 사용할 수 있는 형태로 변환
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @param {string} datasetName - 선택된 데이터셋 이름 (예: 'MamunHigh2019', 'FG2023')
 * @returns {Array} 변환된 모델 데이터 배열
 */
export function transformDataForDataset(jsonData, datasetName) {
  if (!jsonData || !jsonData.mlips) {
    return [];
  }

  const models = [];

  for (const [mlipName, mlipData] of Object.entries(jsonData.mlips)) {
    // 특정 데이터셋의 메트릭 가져오기
    const datasetMetrics = mlipData.datasets?.[datasetName];
    
    if (!datasetMetrics) {
      continue;
    }

    // 메트릭 키 매핑 (JSON 키 -> 컴포넌트에서 사용하는 키)
    const model = {
      model: mlipName,
      maeTotal: datasetMetrics['MAE_total (eV)'] ?? null,
      maeNormal: datasetMetrics['MAE_normal (eV)'] ?? null,
      normalRate: datasetMetrics['Normal rate (%)'] ?? null,
      adsorbateMigration: null, // JSON에 없으면 null
      reproductionFailure: null,
      unphysicalRelaxation: null,
      energyAnomaly: null,
      adwt: datasetMetrics['ADwT (%)'] ?? null,
      amdwt: null, // JSON에 없으면 null
      timePerStep: datasetMetrics['Time_per_step (s)'] ?? null,
    };

    models.push(model);
  }

  return models;
}

/**
 * 모든 데이터셋에서 평균 메트릭을 계산하여 변환
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @returns {Array} 평균 메트릭을 가진 모델 데이터 배열
 */
export function transformDataForAverage(jsonData) {
  if (!jsonData || !jsonData.mlips) {
    return [];
  }

  const models = [];

  for (const [mlipName, mlipData] of Object.entries(jsonData.mlips)) {
    const datasets = mlipData.datasets || {};
    const averageMetrics = mlipData.average_metrics || {};

    // 평균 메트릭 사용
    const model = {
      model: mlipName,
      maeTotal: averageMetrics['MAE_total (eV)']?.mean ?? null,
      maeNormal: averageMetrics['MAE_normal (eV)']?.mean ?? null,
      normalRate: averageMetrics['Normal rate (%)']?.mean ?? null,
      adsorbateMigration: null,
      reproductionFailure: null,
      unphysicalRelaxation: null,
      energyAnomaly: null,
      adwt: averageMetrics['ADwT (%)']?.mean ?? null,
      amdwt: null,
      timePerStep: averageMetrics['Time_per_step (s)']?.mean ?? null,
    };

    models.push(model);
  }

  return models;
}

/**
 * 사용 가능한 데이터셋 목록 가져오기
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @returns {Array} 데이터셋 이름 배열
 */
export function getAvailableDatasets(jsonData) {
  if (!jsonData || !jsonData.datasets) {
    return [];
  }

  return Object.keys(jsonData.datasets).sort();
}

/**
 * 특정 데이터셋의 정보 가져오기
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @param {string} datasetName - 데이터셋 이름
 * @returns {Object} 데이터셋 정보
 */
export function getDatasetInfo(jsonData, datasetName) {
  if (!jsonData || !jsonData.datasets || !jsonData.datasets[datasetName]) {
    return null;
  }

  return jsonData.datasets[datasetName];
}

/**
 * 랭킹 데이터 가져오기
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @param {string} rankingType - 'overall', 'accuracy', 'success_rate', 'speed', 'coverage'
 * @returns {Array} 랭킹 배열
 */
export function getRankings(jsonData, rankingType = 'overall') {
  if (!jsonData || !jsonData.rankings || !jsonData.rankings[rankingType]) {
    return [];
  }

  return jsonData.rankings[rankingType];
}

/**
 * 특정 MLIP의 흡착물별 성능 데이터 가져오기 (전체 데이터셋 통합)
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @param {string} mlipName - MLIP 이름
 * @returns {Array} 흡착물별 성능 데이터 배열
 */
export function getAdsorbateBreakdown(jsonData, mlipName) {
  if (!jsonData || !jsonData.adsorbate_breakdown || !jsonData.adsorbate_breakdown[mlipName]) {
    return null;
  }

  const mlipData = jsonData.adsorbate_breakdown[mlipName];
  const columns = mlipData.columns || [];
  const dataRows = mlipData.data || [];

  // 데이터를 객체 배열로 변환
  return dataRows.map(row => {
    const rowObj = {};
    columns.forEach((col, idx) => {
      rowObj[col] = row[idx];
    });
    return rowObj;
  });
}

/**
 * 특정 데이터셋의 특정 MLIP의 흡착물별 성능 데이터 가져오기
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @param {string} datasetName - 데이터셋 이름
 * @param {string} mlipName - MLIP 이름
 * @returns {Array} 흡착물별 성능 데이터 배열
 */
export function getDatasetMlipAdsorbateBreakdown(jsonData, datasetName, mlipName) {
  if (!jsonData || !jsonData.excel_data || !jsonData.excel_data[datasetName]) {
    return null;
  }

  const datasetSheets = jsonData.excel_data[datasetName];
  if (!datasetSheets[mlipName]) {
    return null;
  }

  const mlipData = datasetSheets[mlipName];
  const columns = mlipData.columns || [];
  const dataRows = mlipData.data || [];

  // 데이터를 객체 배열로 변환
  return dataRows.map(row => {
    const rowObj = {};
    columns.forEach((col, idx) => {
      // Handle duplicate column names (e.g., "Adsorbate_name - Adsorbate_name" -> "Adsorbate_name")
      const cleanCol = col.includes(' - ') && col.split(' - ')[0] === col.split(' - ')[1] 
        ? col.split(' - ')[0] 
        : col;
      rowObj[cleanCol] = row[idx];
      // Also keep original for backward compatibility
      if (cleanCol !== col) {
        rowObj[col] = row[idx];
      }
    });
    return rowObj;
  });
}

/**
 * 모든 MLIP의 흡착물별 성능 데이터 가져오기
 * @param {Object} jsonData - leaderboard_data.json의 데이터
 * @returns {Object} MLIP별 흡착물 데이터 객체
 */
export function getAllAdsorbateBreakdowns(jsonData) {
  if (!jsonData || !jsonData.adsorbate_breakdown) {
    return {};
  }

  const result = {};
  for (const [mlipName, mlipData] of Object.entries(jsonData.adsorbate_breakdown)) {
    result[mlipName] = getAdsorbateBreakdown(jsonData, mlipName);
  }
  return result;
}

