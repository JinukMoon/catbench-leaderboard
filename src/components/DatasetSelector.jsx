import React, { useState } from 'react'
import { Info } from 'lucide-react'

// Dataset descriptions (same as LeaderboardTable)
const DATASET_DESCRIPTIONS = {
  'MamunHighT2019': 'Small molecules (H, C, N, O, S, CH, CH₂, CH₃, OH, NH, SH) on 2,035 bimetallic alloy surfaces. 37 metals in binary combinations.',
  'FG': 'Large organic molecules with functional groups (alcohols, amines, thiols, aromatics) on metallic surfaces.',
  'ComerGeneralized2024': 'Small molecules on metal oxide surfaces with diverse oxide compositions.',
  'BM': 'Extended large molecules (up to 30 heteroatoms) for biomass conversion, polyurethane synthesis, and plastic recycling on Ni/Ru/Ag/Au/Pt surfaces.',
  'KHLOHC': 'Liquid Organic Hydrogen Carriers - methylcyclohexane (MCH) and toluene on Pt-based alloys for hydrogen storage applications.',
}

function DatasetSelector({ meta, currentDataset, onSelectDataset, isDark }) {
  const featuredDatasets = meta?.featured_datasets || []
  const allDatasets = meta?.datasets || []
  const [hoveredDataset, setHoveredDataset] = useState(null)

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {featuredDatasets.map((dataset) => {
        const datasetInfo = allDatasets.find(d => d.id === dataset.id)
        const isActive = currentDataset === dataset.id
        const description = DATASET_DESCRIPTIONS[dataset.id]
        return (
          <div key={dataset.id} className="relative">
            <button
              onClick={() => onSelectDataset(dataset.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                ${isActive
                  ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
                  : isDark
                    ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white border border-slate-700/50'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-300 shadow-sm'
                }
              `}
            >
              {dataset.display_name}
              {datasetInfo && (
                <span className={`text-xs ${
                  isActive ? 'text-white/70' : isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  ({datasetInfo.reaction_count.toLocaleString()})
                </span>
              )}
              {description && (
                <span
                  className="relative"
                  onMouseEnter={() => setHoveredDataset(dataset.id)}
                  onMouseLeave={() => setHoveredDataset(null)}
                >
                  <Info className={`w-3.5 h-3.5 ${
                    isActive ? 'text-white/60' : isDark ? 'text-slate-500' : 'text-slate-400'
                  }`} />
                </span>
              )}
            </button>

            {/* Tooltip - same style as LeaderboardTable */}
            {hoveredDataset === dataset.id && description && (
              <div
                className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 px-3 py-2 text-xs font-normal leading-relaxed text-left whitespace-normal text-slate-200 rounded-lg shadow-xl border border-slate-600 pointer-events-none"
                style={{ backgroundColor: '#0f172a' }}
              >
                <span
                  className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                  style={{ borderBottomColor: '#0f172a' }}
                />
                {description}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default DatasetSelector
