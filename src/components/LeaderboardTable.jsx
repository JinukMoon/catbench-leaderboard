import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ArrowDown, X, Info, ExternalLink, Github, FileText } from 'lucide-react'

// Dataset source links
const DATASET_LINKS = {
  'MamunHighT2019': 'https://www.catalysis-hub.org/publications/MamunHighT2019',
  'FG': 'https://doi.org/10.1038/s43588-023-00437-y',
  'BM': 'https://doi.org/10.1038/s43588-023-00437-y',
  'ComerGeneralized2024': 'https://www.catalysis-hub.org/publications/ComerGeneralized2024',
  'KHLOHC': 'https://zenodo.org/records/17157086',
}

// Dataset descriptions (pure dataset info)
const DATASET_DESCRIPTIONS = {
  'MamunHighT2019': 'Small molecules (H, C, N, O, S, CH, CH₂, CH₃, OH, NH, SH) on 2,035 bimetallic alloy surfaces. 37 metals in binary combinations.',
  'FG': 'Large organic molecules with functional groups (alcohols, amines, thiols, aromatics) on metallic surfaces.',
  'ComerGeneralized2024': 'Small molecules on metal oxide surfaces with diverse oxide compositions.',
  'BM': 'Extended large molecules (up to 30 heteroatoms) for biomass conversion, polyurethane synthesis, and plastic recycling on Ni/Ru/Ag/Au/Pt surfaces.',
  'KHLOHC': 'Liquid Organic Hydrogen Carriers - methylcyclohexane (MCH) and toluene on Pt-based alloys for hydrogen storage applications.',
}

// Metric tooltips based on CatBench paper
const TOOLTIPS = {
  MAE_normal_eV: 'Mean Absolute Error for successfully reproduced structures only.',
  MAE_total_eV: 'Overall MAE across all reactions including anomalies.',
  normal_rate_pct: 'Percentage where MLIP successfully reproduces DFT-optimized configuration.',
  adsorbate_migration_rate_pct: 'Rate where adsorbate relocates to a different but physically plausible binding site.',
  anomaly_total: 'Total anomaly rate (reproduction failure + unphysical relaxation + energy anomaly).',
  anomaly_reproduction_failure: 'Non-deterministic results across multiple relaxation trials.',
  anomaly_unphysical_relaxation: 'Structural collapse or non-convergence during relaxation.',
  anomaly_energy_anomaly: 'Large energy deviation beyond threshold.',
  ADwT_pct: 'Average Distance within Threshold - mean fraction of atoms within distance threshold.',
  AMDwT_pct: 'Average Maximum Distance within Threshold - uses max per-atom displacement.',
  time_per_step_s: 'Computational time per relaxation step.',
}

// Tooltip component (position: 'center' | 'right' | 'left')
function Tooltip({ content, children, position = 'center' }) {
  const [show, setShow] = useState(false)

  const positionClasses = {
    right: 'left-0 mt-2',           // extends right from icon
    left: 'right-0 mt-2',           // extends left from icon
    center: 'left-1/2 -translate-x-1/2 mt-2'
  }[position]

  const arrowClasses = {
    right: 'left-2',
    left: 'right-2',
    center: 'left-1/2 -translate-x-1/2'
  }[position]

  return (
    <span className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {show && (
        <span
          className={`absolute top-full ${positionClasses} w-64 px-3 py-2 text-xs font-normal normal-case tracking-normal leading-relaxed text-left whitespace-normal text-slate-200 rounded-lg shadow-xl border border-slate-600 pointer-events-none`}
          style={{ zIndex: 9999, backgroundColor: '#0f172a', opacity: 1 }}
        >
          <span className={`absolute bottom-full ${arrowClasses} border-4 border-transparent`} style={{ borderBottomColor: '#0f172a' }} />
          {content}
        </span>
      )}
    </span>
  )
}

// Format value based on type
function formatValue(value, format) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  switch (format) {
    case 'mae': return value.toFixed(3)
    case 'pct': return value.toFixed(1)
    case 'time': return value < 0.01 ? value.toExponential(1) : value.toFixed(3)
    default: return value
  }
}

// Viridis colormap heatmap - returns { bg: backgroundColor, text: textColor }
// higherIsBetter: true = bright for high values, false = bright for low values
function getHeatmapStyle(value, min, max, higherIsBetter = false, isDark = true) {
  if (value === null || value === undefined || isNaN(value)) return { bg: '', text: '' }
  if (min === max) return { bg: '', text: '' }

  // Normalize to 0-1
  let normalized = (value - min) / (max - min)

  // Flip if lower is better
  if (!higherIsBetter) normalized = 1 - normalized

  // Default text color based on theme
  const defaultText = isDark ? '#e2e8f0' : '#1e293b'

  // Viridis colormap (solid): dark purple (bad) -> blue -> teal -> green -> yellow (good)
  if (normalized >= 0.9) return { bg: '#fde725', text: '#000000' }  // bright yellow (best)
  if (normalized >= 0.8) return { bg: '#b5de2b', text: '#000000' }  // yellow-green
  if (normalized >= 0.7) return { bg: '#6ece58', text: '#000000' }  // green
  if (normalized >= 0.6) return { bg: '#35b779', text: '#000000' }  // teal-green
  if (normalized >= 0.5) return { bg: '#1f9e89', text: '#ffffff' }  // teal
  if (normalized >= 0.4) return { bg: '#26828e', text: '#ffffff' }  // blue-teal
  if (normalized >= 0.3) return { bg: '#31688e', text: '#ffffff' }  // blue
  if (normalized >= 0.2) return { bg: '#3e4989', text: '#ffffff' }  // purple-blue
  if (normalized >= 0.1) return { bg: '#482878', text: '#ffffff' }  // purple
  return { bg: '#440154', text: '#ffffff' }                          // dark purple (worst)
}

// Convert numbers to subscript in chemical formulas (e.g., CO2 -> CO₂)
// Returns JSX with <sub> tags for better readability
function formatChemicalFormula(text) {
  const parts = text.split(/(\d+)/)
  return (
    <>
      {parts.map((part, i) =>
        /^\d+$/.test(part) ? <sub key={i} className="text-[1em]">{part}</sub> : part
      )}
    </>
  )
}

// Build efficient source_name -> metadata lookup map
// This pre-computes the mapping for O(1) lookups instead of O(n) search
function buildMLIPLookupMap(metadata) {
  if (!metadata) return new Map()

  const lookupMap = new Map()
  const prefixEntries = []

  for (const [key, data] of Object.entries(metadata)) {
    if (key.startsWith('_')) continue

    // Add direct key lookup
    lookupMap.set(key, data)

    // Add all source_names to lookup
    if (data.source_names) {
      for (const name of data.source_names) {
        lookupMap.set(name, data)
      }
    }

    // Store prefix entries for fallback matching
    if (data.prefix) {
      prefixEntries.push({ prefix: data.prefix, data })
    }
  }

  // Store prefix entries in the map for fallback lookup
  lookupMap.set('__prefixes__', prefixEntries)

  return lookupMap
}

// Get MLIP metadata using pre-computed lookup map (O(1) for most cases)
function getMLIPMetadata(lookupMap, mlipName) {
  if (!lookupMap || !mlipName) return null

  // Direct lookup (covers key, source_names)
  if (lookupMap.has(mlipName)) return lookupMap.get(mlipName)

  // Fallback: prefix matching
  const prefixEntries = lookupMap.get('__prefixes__') || []
  for (const { prefix, data } of prefixEntries) {
    if (mlipName.startsWith(prefix)) return data
  }

  return null
}

// Rank display with medals
function RankCell({ rank }) {
  if (rank === 1) return <span className="text-amber-500 font-bold text-lg">🥇</span>
  if (rank === 2) return <span className="text-slate-400 font-bold text-lg">🥈</span>
  if (rank === 3) return <span className="text-orange-400 font-bold text-lg">🥉</span>
  return <span className="text-slate-500 text-sm font-medium">{rank}</span>
}

// Sort indicator component
function SortIndicator({ active, direction }) {
  if (!active) return null
  return direction === 'asc'
    ? <ArrowUp className="w-3 h-3 inline ml-1" />
    : <ArrowDown className="w-3 h-3 inline ml-1" />
}

// Modal for adsorbate breakdown
function AdsorbateModal({ mlip, metadata, onClose, isDark, datasetId }) {
  if (!mlip) return null

  const breakdown = mlip.adsorbate_breakdown || {}
  const adsorbates = Object.entries(breakdown).sort((a, b) => b[1].num_total - a[1].num_total)

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Modal - centered with transform */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-5xl w-[95%] max-h-[85vh] overflow-hidden rounded-xl shadow-2xl ${
          isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-3">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {metadata?.display_name || mlip.name}
              </h3>
              {metadata?.version && (
                <span className={`text-sm px-2 py-0.5 rounded ${
                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  {metadata.version}
                </span>
              )}
              {metadata?.task && (
                <span className={`text-sm px-2 py-0.5 rounded ${
                  isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'
                }`}>
                  task: {metadata.task}
                </span>
              )}
              {metadata?.paper_url && (
                <a
                  href={metadata.paper_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded transition-colors ${
                    isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-accent-400 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-500 hover:text-accent-600 hover:bg-slate-200'
                  }`}
                  onClick={e => e.stopPropagation()}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Paper
                </a>
              )}
              {metadata?.repo_url && (
                <a
                  href={metadata.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded transition-colors ${
                    isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-accent-400 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-500 hover:text-accent-600 hover:bg-slate-200'
                  }`}
                  onClick={e => e.stopPropagation()}
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>
              )}
            </div>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Adsorbate-level breakdown · {adsorbates.length} adsorbates
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[calc(85vh-80px)]">
          <table className={`w-full text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <tr>
                <th className={`px-4 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Adsorbate
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div>MAE_normal</div>
                  <div className="text-xs font-normal opacity-70">(eV)</div>
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div>MAE_total</div>
                  <div className="text-xs font-normal opacity-70">(eV)</div>
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div>ADwT</div>
                  <div className="text-xs font-normal opacity-70">(%)</div>
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div>AMDwT</div>
                  <div className="text-xs font-normal opacity-70">(%)</div>
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Total
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Normal
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Migration
                </th>
                <th className={`px-3 py-3 text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Anomaly
                </th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-slate-800/50' : 'divide-y divide-slate-100'}>
              {adsorbates.map(([adsId, ads]) => (
                <tr key={adsId} className={`transition-colors ${
                  isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                }`}>
                  <td className={`px-4 py-2 text-center font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {datasetId === 'FG' || datasetId === 'BM' ? adsId : formatChemicalFormula(adsId)}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {formatValue(ads.MAE_normal, 'mae')}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {formatValue(ads.MAE_total, 'mae')}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {formatValue(ads.ADwT, 'pct')}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {formatValue(ads.AMDwT, 'pct')}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {ads.num_total || '—'}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {ads.num_normal || '—'}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {ads.num_adsorbate_migration || 0}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {ads.num_anomaly_total || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}

function LeaderboardTable({ data, isDark = true, mlipMetadata = null }) {
  const [sortKey, setSortKey] = useState('MAE_normal_eV')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedMLIP, setSelectedMLIP] = useState(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedMLIP) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedMLIP])

  // Build pre-computed lookup map (only rebuild when metadata changes)
  const mlipLookupMap = useMemo(() => {
    return buildMLIPLookupMap(mlipMetadata)
  }, [mlipMetadata])

  // Transform data into rows
  const rows = useMemo(() => {
    if (!data?.results) return []
    return Object.entries(data.results).map(([name, metrics]) => ({
      name,
      ...metrics,
    }))
  }, [data])

  // Enrich rows with cached metadata (display_name)
  const enrichedRows = useMemo(() => {
    return rows.map(row => {
      const metadata = getMLIPMetadata(mlipLookupMap, row.name)
      return {
        ...row,
        displayName: metadata?.display_name || row.name,
        metadata
      }
    })
  }, [rows, mlipLookupMap])

  // Sort rows
  const sortedRows = useMemo(() => {
    const sorted = [...enrichedRows].sort((a, b) => {
      let aVal, bVal

      // Handle nested anomaly rates
      if (sortKey.startsWith('anomaly_')) {
        const subKey = sortKey.replace('anomaly_', '')
        aVal = a.anomaly_rates_pct?.[subKey]
        bVal = b.anomaly_rates_pct?.[subKey]
      } else {
        aVal = a[sortKey]
        bVal = b[sortKey]
      }

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
    return sorted.map((row, i) => ({ ...row, rank: i + 1 }))
  }, [enrichedRows, sortKey, sortDirection])

  // Calculate column stats for heatmap
  const columnStats = useMemo(() => {
    if (!rows.length) return {}

    const getMinMax = (key, nested = null) => {
      const values = rows
        .map(r => nested ? r[nested]?.[key] : r[key])
        .filter(v => v !== null && v !== undefined && !isNaN(v))
      if (!values.length) return { min: 0, max: 1 }
      return { min: Math.min(...values), max: Math.max(...values) }
    }

    return {
      MAE_normal_eV: getMinMax('MAE_normal_eV'),
      MAE_total_eV: getMinMax('MAE_total_eV'),
      normal_rate_pct: getMinMax('normal_rate_pct'),
      adsorbate_migration_rate_pct: getMinMax('adsorbate_migration_rate_pct'),
      anomaly_total: getMinMax('total', 'anomaly_rates_pct'),
      anomaly_reproduction_failure: getMinMax('reproduction_failure', 'anomaly_rates_pct'),
      anomaly_unphysical_relaxation: getMinMax('unphysical_relaxation', 'anomaly_rates_pct'),
      anomaly_energy_anomaly: getMinMax('energy_anomaly', 'anomaly_rates_pct'),
      ADwT_pct: getMinMax('ADwT_pct'),
      AMDwT_pct: getMinMax('AMDwT_pct'),
      time_per_step_s: getMinMax('time_per_step_s'),
    }
  }, [rows])

  const handleSort = (key, defaultDir = 'asc') => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(defaultDir)
    }
  }

  // Common styles
  const thBase = `px-3 py-3 text-base font-semibold text-center cursor-pointer select-none transition-colors border border-black`
  const thColor = isDark
    ? 'text-slate-300 hover:text-white'
    : 'text-slate-700 hover:text-slate-900'
  const thActive = 'text-accent-500'
  const borderB = isDark ? 'border-b border-slate-800' : 'border-b border-slate-200'

  return (
    <div className={`rounded-t-xl overflow-hidden ${
      isDark ? 'bg-slate-900/50 border border-slate-800/50' : 'bg-white border border-slate-200 shadow-sm'
    }`} id="leaderboard">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${borderB}`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`font-display font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {data.display_name}
            </h2>
            {data.has_d3 && (
              <Tooltip content="D3 dispersion correction applied to MLIPs for fair comparison with vdW-corrected DFT reference" position="right">
                <span className={`px-2 py-0.5 text-xs font-medium rounded cursor-help ${
                  isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                }`}>
                  D3
                </span>
              </Tooltip>
            )}
            {DATASET_DESCRIPTIONS[data.id] && (
              <Tooltip content={DATASET_DESCRIPTIONS[data.id]} position="right">
                <Info className={`w-4 h-4 ${
                  isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                } transition-colors cursor-help`} />
              </Tooltip>
            )}
            {(() => {
              // Get link from DATASET_LINKS or generate catalysis-hub URL
              const datasetLink = DATASET_LINKS[data.id] ||
                (data.source === 'catalysis-hub' ? `https://www.catalysis-hub.org/publications/${data.id}` : null)
              return datasetLink && (
                <a
                  href={datasetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1 rounded transition-colors ${
                    isDark
                      ? 'text-slate-500 hover:text-accent-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-accent-600 hover:bg-slate-200'
                  }`}
                  title="View source publication"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )
            })()}
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {sortedRows.length} models · {data.reaction_count?.toLocaleString()} reactions
          </p>
        </div>
        <div className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Click any row for model info & per-adsorbate breakdown
        </div>
        <div className={`text-sm text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Click headers to sort
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={`w-full text-xl font-display ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          <thead>
            {/* Row 1: Main headers + Anomaly group */}
            <tr className={isDark ? 'bg-slate-900/80' : 'bg-slate-50'}>
              <th rowSpan={2} className={`${thBase} ${thColor} ${borderB} w-12`}>#</th>
              <th rowSpan={2} className={`${thBase} ${thColor} ${borderB} text-left min-w-[130px]`}
                  onClick={() => handleSort('name')}>
                MLIP
                <SortIndicator active={sortKey === 'name'} direction={sortDirection} />
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'MAE_normal_eV' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('MAE_normal_eV')}>
                <div>MAE_normal<SortIndicator active={sortKey === 'MAE_normal_eV'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(eV)</span> <Tooltip content={TOOLTIPS.MAE_normal_eV}><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'MAE_total_eV' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('MAE_total_eV')}>
                <div>MAE_total<SortIndicator active={sortKey === 'MAE_total_eV'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(eV)</span> <Tooltip content={TOOLTIPS.MAE_total_eV}><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'normal_rate_pct' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('normal_rate_pct', 'desc')}>
                <div>Normal rate<SortIndicator active={sortKey === 'normal_rate_pct'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(%)</span> <Tooltip content={TOOLTIPS.normal_rate_pct}><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'adsorbate_migration_rate_pct' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('adsorbate_migration_rate_pct')}>
                <div>Ads. migration<SortIndicator active={sortKey === 'adsorbate_migration_rate_pct'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(%)</span> <Tooltip content={TOOLTIPS.adsorbate_migration_rate_pct}><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
              <th colSpan={4} className={`${thBase} ${thColor} ${borderB} border-l ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                Anomaly rates (%)
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'ADwT_pct' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('ADwT_pct', 'desc')}>
                <div>ADwT<SortIndicator active={sortKey === 'ADwT_pct'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(%)</span> <Tooltip content={TOOLTIPS.ADwT_pct}><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'AMDwT_pct' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('AMDwT_pct', 'desc')}>
                <div>AMDwT<SortIndicator active={sortKey === 'AMDwT_pct'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(%)</span> <Tooltip content={TOOLTIPS.AMDwT_pct}><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
              <th rowSpan={2} className={`${thBase} ${sortKey === 'time_per_step_s' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('time_per_step_s')}>
                <div>Time/step<SortIndicator active={sortKey === 'time_per_step_s'} direction={sortDirection} /></div>
                <div className="text-sm font-normal flex items-center justify-center gap-1"><span className="opacity-70">(s)</span> <Tooltip content={TOOLTIPS.time_per_step_s} position="left"><Info className="w-4 h-4 inline opacity-50" /></Tooltip></div>
              </th>
            </tr>
            {/* Row 2: Anomaly sub-headers */}
            <tr className={isDark ? 'bg-slate-900/60' : 'bg-slate-50/80'}>
              <th className={`${thBase} ${sortKey === 'anomaly_total' ? thActive : thColor} ${borderB} border-l ${isDark ? 'border-slate-700' : 'border-slate-300'}`}
                  onClick={() => handleSort('anomaly_total')}>
                Total
                <Tooltip content={TOOLTIPS.anomaly_total}><Info className="w-4 h-4 inline ml-1 opacity-50" /></Tooltip>
                <SortIndicator active={sortKey === 'anomaly_total'} direction={sortDirection} />
              </th>
              <th className={`${thBase} ${sortKey === 'anomaly_reproduction_failure' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('anomaly_reproduction_failure')}>
                Reprod.
                <Tooltip content={TOOLTIPS.anomaly_reproduction_failure}><Info className="w-4 h-4 inline ml-1 opacity-50" /></Tooltip>
                <SortIndicator active={sortKey === 'anomaly_reproduction_failure'} direction={sortDirection} />
              </th>
              <th className={`${thBase} ${sortKey === 'anomaly_unphysical_relaxation' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('anomaly_unphysical_relaxation')}>
                Unphys.
                <Tooltip content={TOOLTIPS.anomaly_unphysical_relaxation}><Info className="w-4 h-4 inline ml-1 opacity-50" /></Tooltip>
                <SortIndicator active={sortKey === 'anomaly_unphysical_relaxation'} direction={sortDirection} />
              </th>
              <th className={`${thBase} ${sortKey === 'anomaly_energy_anomaly' ? thActive : thColor} ${borderB}`}
                  onClick={() => handleSort('anomaly_energy_anomaly')}>
                Energy
                <Tooltip content={TOOLTIPS.anomaly_energy_anomaly}><Info className="w-4 h-4 inline ml-1 opacity-50" /></Tooltip>
                <SortIndicator active={sortKey === 'anomaly_energy_anomaly'} direction={sortDirection} />
              </th>
            </tr>
          </thead>
          <tbody className={isDark ? 'divide-y divide-slate-800/30' : 'divide-y divide-slate-100'}>
            {sortedRows.map((row) => (
              <tr
                key={row.name}
                onClick={() => setSelectedMLIP(row)}
                className={`cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-3 py-3 text-center border border-black">
                  <RankCell rank={row.rank} />
                </td>
                <td className={`px-3 py-3 text-left font-semibold border border-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {row.displayName}
                </td>
                {(() => { const s = getHeatmapStyle(row.MAE_normal_eV, columnStats.MAE_normal_eV?.min, columnStats.MAE_normal_eV?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.MAE_normal_eV, 'mae')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.MAE_total_eV, columnStats.MAE_total_eV?.min, columnStats.MAE_total_eV?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.MAE_total_eV, 'mae')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.normal_rate_pct, columnStats.normal_rate_pct?.min, columnStats.normal_rate_pct?.max, true, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.normal_rate_pct, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.adsorbate_migration_rate_pct, columnStats.adsorbate_migration_rate_pct?.min, columnStats.adsorbate_migration_rate_pct?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.adsorbate_migration_rate_pct, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.anomaly_rates_pct?.total, columnStats.anomaly_total?.min, columnStats.anomaly_total?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.anomaly_rates_pct?.total, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.anomaly_rates_pct?.reproduction_failure, columnStats.anomaly_reproduction_failure?.min, columnStats.anomaly_reproduction_failure?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.anomaly_rates_pct?.reproduction_failure, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.anomaly_rates_pct?.unphysical_relaxation, columnStats.anomaly_unphysical_relaxation?.min, columnStats.anomaly_unphysical_relaxation?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.anomaly_rates_pct?.unphysical_relaxation, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.anomaly_rates_pct?.energy_anomaly, columnStats.anomaly_energy_anomaly?.min, columnStats.anomaly_energy_anomaly?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.anomaly_rates_pct?.energy_anomaly, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.ADwT_pct, columnStats.ADwT_pct?.min, columnStats.ADwT_pct?.max, true, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.ADwT_pct, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.AMDwT_pct, columnStats.AMDwT_pct?.min, columnStats.AMDwT_pct?.max, true, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.AMDwT_pct, 'pct')}
                </td>
                )})()}
                {(() => { const s = getHeatmapStyle(row.time_per_step_s, columnStats.time_per_step_s?.min, columnStats.time_per_step_s?.max, false, isDark); return (
                <td className="px-3 py-3 text-center tabular-nums border border-black" style={{ backgroundColor: s.bg, color: s.text, fontFamily: 'Arial, sans-serif' }}>
                  {formatValue(row.time_per_step_s, 'time')}
                </td>
                )})()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adsorbate Modal */}
      {selectedMLIP && (
        <AdsorbateModal
          mlip={selectedMLIP}
          metadata={selectedMLIP.metadata}
          onClose={() => setSelectedMLIP(null)}
          isDark={isDark}
          datasetId={data.id}
        />
      )}
    </div>
  )
}

export default LeaderboardTable
