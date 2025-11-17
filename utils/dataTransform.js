/**
 * Data transformation helpers
 * Convert the leaderboard_data.json structure into shapes that are easier to consume in React components.
 */

/**
 * Transform metrics for a specific dataset into a normalized array.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @param {string} datasetName - selected dataset name (for example 'MamunHigh2019' or 'FG2023')
 * @returns {Array} normalized model data
 */
export function transformDataForDataset(jsonData, datasetName) {
  if (!jsonData || !jsonData.mlips) {
    return [];
  }

  const models = [];

  for (const [mlipName, mlipData] of Object.entries(jsonData.mlips)) {
    // retrieve metrics for the requested dataset
    const datasetMetrics = mlipData.datasets?.[datasetName];
    
    if (!datasetMetrics) {
      continue;
    }

    // map JSON keys to the property names the UI expects
    const model = {
      model: mlipName,
      maeTotal: datasetMetrics['MAE_total (eV)'] ?? null,
      maeNormal: datasetMetrics['MAE_normal (eV)'] ?? null,
      normalRate: datasetMetrics['Normal rate (%)'] ?? null,
      adsorbateMigration: null, // fall back to null when the key is absent
      reproductionFailure: null,
      unphysicalRelaxation: null,
      energyAnomaly: null,
      adwt: datasetMetrics['ADwT (%)'] ?? null,
      amdwt: null, // fall back to null when the key is absent
      timePerStep: datasetMetrics['Time_per_step (s)'] ?? null,
    };

    models.push(model);
  }

  return models;
}

/**
 * Transform average metrics computed across every dataset.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @returns {Array} normalized model data containing averaged metrics
 */
export function transformDataForAverage(jsonData) {
  if (!jsonData || !jsonData.mlips) {
    return [];
  }

  const models = [];

  for (const [mlipName, mlipData] of Object.entries(jsonData.mlips)) {
    const datasets = mlipData.datasets || {};
    const averageMetrics = mlipData.average_metrics || {};

    // rely on the pre-computed average metrics block
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
 * Get the list of available dataset names.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @returns {Array} sorted array of dataset names
 */
export function getAvailableDatasets(jsonData) {
  if (!jsonData || !jsonData.datasets) {
    return [];
  }

  return Object.keys(jsonData.datasets).sort();
}

/**
 * Fetch metadata for a specific dataset.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @param {string} datasetName - dataset name
 * @returns {Object} dataset metadata or null
 */
export function getDatasetInfo(jsonData, datasetName) {
  if (!jsonData || !jsonData.datasets || !jsonData.datasets[datasetName]) {
    return null;
  }

  return jsonData.datasets[datasetName];
}

/**
 * Retrieve leaderboard rankings.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @param {string} rankingType - one of 'overall', 'accuracy', 'success_rate', 'speed', 'coverage'
 * @returns {Array} ranking entries
 */
export function getRankings(jsonData, rankingType = 'overall') {
  if (!jsonData || !jsonData.rankings || !jsonData.rankings[rankingType]) {
    return [];
  }

  return jsonData.rankings[rankingType];
}

/**
 * Retrieve adsorbate-level performance for a given MLIP aggregated across datasets.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @param {string} mlipName - MLIP identifier
 * @returns {Array} adsorbate rows
 */
export function getAdsorbateBreakdown(jsonData, mlipName) {
  if (!jsonData || !jsonData.adsorbate_breakdown || !jsonData.adsorbate_breakdown[mlipName]) {
    return null;
  }

  const mlipData = jsonData.adsorbate_breakdown[mlipName];
  const columns = mlipData.columns || [];
  const dataRows = mlipData.data || [];

  // convert the tabular data into an array of objects
  return dataRows.map(row => {
    const rowObj = {};
    columns.forEach((col, idx) => {
      rowObj[col] = row[idx];
    });
    return rowObj;
  });
}

/**
 * Retrieve adsorbate-level metrics for a specific MLIP within a specific dataset.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @param {string} datasetName - dataset name
 * @param {string} mlipName - MLIP identifier
 * @returns {Array} adsorbate rows
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

  // convert the tabular data into an array of objects
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
 * Retrieve adsorbate breakdowns for every MLIP.
 * @param {Object} jsonData - leaderboard_data.json payload
 * @returns {Object} map of MLIP -> adsorbate rows
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

