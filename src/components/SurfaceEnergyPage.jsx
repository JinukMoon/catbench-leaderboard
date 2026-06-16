import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, Info, Layers, FileText, Github } from 'lucide-react'

// Data is already in J/m² from xlsx

// Build efficient source_name -> metadata lookup map
function buildMLIPLookupMap(metadata) {
  if (!metadata) return new Map()

  const lookupMap = new Map()
  const prefixEntries = []

  for (const [key, data] of Object.entries(metadata)) {
    if (key.startsWith('_')) continue

    lookupMap.set(key, data)

    if (data.source_names) {
      for (const name of data.source_names) {
        lookupMap.set(name, data)
      }
    }

    if (data.prefix) {
      prefixEntries.push({ prefix: data.prefix, data })
    }
  }

  lookupMap.set('__prefixes__', prefixEntries)
  return lookupMap
}

// Get MLIP metadata using pre-computed lookup map
function getMLIPMetadata(lookupMap, mlipName) {
  if (!lookupMap || !mlipName) return null

  if (lookupMap.has(mlipName)) return lookupMap.get(mlipName)

  const prefixEntries = lookupMap.get('__prefixes__') || []
  for (const { prefix, data } of prefixEntries) {
    if (mlipName.startsWith(prefix)) return data
  }

  return null
}

// Viridis heatmap - returns { bg: backgroundColor, text: textColor }
function getHeatmapStyle(value, min, max, higherIsBetter = false, isDark = true) {
  if (value === null || value === undefined || isNaN(value)) return { bg: '', text: '' }
  if (min === max) return { bg: '', text: '' }

  let normalized = (value - min) / (max - min)
  if (!higherIsBetter) normalized = 1 - normalized

  if (normalized >= 0.9) return { bg: '#fde725', text: '#000000' }
  if (normalized >= 0.8) return { bg: '#b5de2b', text: '#000000' }
  if (normalized >= 0.7) return { bg: '#6ece58', text: '#000000' }
  if (normalized >= 0.6) return { bg: '#35b779', text: '#000000' }
  if (normalized >= 0.5) return { bg: '#1f9e89', text: '#ffffff' }
  if (normalized >= 0.4) return { bg: '#26828e', text: '#ffffff' }
  if (normalized >= 0.3) return { bg: '#31688e', text: '#ffffff' }
  if (normalized >= 0.2) return { bg: '#3e4989', text: '#ffffff' }
  if (normalized >= 0.1) return { bg: '#482878', text: '#ffffff' }
  return { bg: '#440154', text: '#ffffff' }
}

function SurfaceEnergyPage({ isDark }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortDirection, setSortDirection] = useState('asc')
  const [mlipMetadataRaw, setMlipMetadataRaw] = useState(null)

  // Load data and metadata
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dataResponse, metaResponse] = await Promise.all([
          fetch('/data/surface_energy.json'),
          fetch('/data/mlip_metadata.json')
        ])

        if (dataResponse.ok) {
          const json = await dataResponse.json()
          setData(json)
        }
        if (metaResponse.ok) {
          const metaJson = await metaResponse.json()
          setMlipMetadataRaw(metaJson)
        }
      } catch (err) {
        console.error('Error loading surface energy data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Build MLIP lookup map
  const mlipLookupMap = useMemo(() => {
    return buildMLIPLookupMap(mlipMetadataRaw)
  }, [mlipMetadataRaw])

  const sortedRows = useMemo(() => {
    if (!data?.results) return []

    const rows = Object.entries(data.results).map(([name, metrics]) => {
      const metadata = getMLIPMetadata(mlipLookupMap, name)
      return {
        name,
        displayName: metadata?.display_name || name,
        mae: metrics.MAE, // Already in J/m²
        metadata
      }
    })

    return rows.sort((a, b) => {
      return sortDirection === 'asc' ? a.mae - b.mae : b.mae - a.mae
    })
  }, [data, sortDirection, mlipLookupMap])

  // Calculate min/max for heatmap
  const { min, max } = useMemo(() => {
    if (!sortedRows.length) return { min: 0, max: 1 }
    const values = sortedRows.map(r => r.mae)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [sortedRows])

  const toggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  if (loading) {
    return (
      <div className={`rounded-xl p-12 flex items-center justify-center ${
        isDark ? 'bg-slate-900/50' : 'bg-white shadow-sm border border-slate-200'
      }`}>
        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Loading...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`rounded-xl p-12 text-center ${
        isDark ? 'bg-slate-900/50' : 'bg-white shadow-sm border border-slate-200'
      }`}>
        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Failed to load data</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Leaderboard
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Layers className={`w-8 h-8 ${isDark ? 'text-accent-400' : 'text-accent-600'}`} />
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {data.display_name}
          </h1>
        </div>
        <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {data.description}
        </p>
        <p className={`text-sm mt-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          {data.slab_count.toLocaleString()} slabs from {data.source}
        </p>
      </div>

      {/* Table */}
      <div className={`rounded-xl overflow-x-auto ${
        isDark ? 'bg-slate-900/50 border border-slate-800' : 'bg-white border border-slate-200 shadow-sm'
      }`}>
        <table className={`w-full text-xl font-display ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          <thead>
            <tr className={isDark ? 'bg-slate-900/80' : 'bg-slate-50'}>
              <th className={`px-3 py-3 text-center text-base font-semibold border border-black w-12 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                #
              </th>
              <th className={`px-3 py-3 text-left text-base font-semibold border border-black min-w-[130px] ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                MLIP
              </th>
              <th
                className={`px-3 py-3 text-center text-base font-semibold border border-black cursor-pointer select-none transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={toggleSort}
              >
                <div className="flex items-center justify-center gap-1">
                  MAE (J/m<sup>2</sup>)
                  {sortDirection === 'asc'
                    ? <ArrowUp className="w-3 h-3" />
                    : <ArrowDown className="w-3 h-3" />
                  }
                </div>
              </th>
            </tr>
          </thead>
          <tbody className={isDark ? 'divide-y divide-slate-800/30' : 'divide-y divide-slate-100'}>
            {sortedRows.map((row, index) => {
              const style = getHeatmapStyle(row.mae, min, max, false, isDark)
              return (
                <tr
                  key={row.name}
                  className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                >
                  <td className={`px-3 py-3 text-center border border-black ${
                    isDark ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    <span className="text-sm font-medium">{index + 1}</span>
                  </td>
                  <td className={`px-3 py-3 text-left font-semibold border border-black ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{row.displayName}</span>
                      {row.metadata?.paper_url && (
                        <a
                          href={row.metadata.paper_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                            isDark
                              ? 'bg-slate-800 text-slate-400 hover:text-accent-400 hover:bg-slate-700'
                              : 'bg-slate-100 text-slate-500 hover:text-accent-600 hover:bg-slate-200'
                          }`}
                          onClick={e => e.stopPropagation()}
                        >
                          <FileText className="w-3 h-3" />
                        </a>
                      )}
                      {row.metadata?.repo_url && (
                        <a
                          href={row.metadata.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                            isDark
                              ? 'bg-slate-800 text-slate-400 hover:text-accent-400 hover:bg-slate-700'
                              : 'bg-slate-100 text-slate-500 hover:text-accent-600 hover:bg-slate-200'
                          }`}
                          onClick={e => e.stopPropagation()}
                        >
                          <Github className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-3 py-3 text-center tabular-nums border border-black"
                    style={{
                      backgroundColor: style.bg,
                      color: style.text,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    {row.mae.toFixed(4)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
        <div className="flex items-start gap-2">
          <Info className={`w-5 h-5 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <p className="font-medium mb-1">About Surface Energy Benchmark</p>
            <p>
              Surface energy (J/m²) is calculated for 1,915 binary alloy slabs from the MamunHighT2019 dataset.
              Lower MAE indicates better agreement with DFT reference values.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SurfaceEnergyPage
