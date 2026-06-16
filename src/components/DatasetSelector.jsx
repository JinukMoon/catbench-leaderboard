import React, { useState } from 'react'
import { Info, ExternalLink } from 'lucide-react'
import { DATASET_DESCRIPTIONS, EXTERNAL_LINKS } from '../constants/datasets'

function DatasetSelector({ meta, currentDataset, onSelectDataset, isDark }) {
  const featuredDatasets = meta?.featured_datasets || []
  const allDatasets = meta?.datasets || []
  const [hoveredDataset, setHoveredDataset] = useState(null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-3xl mx-auto">
      {featuredDatasets.map((dataset) => {
        const datasetInfo = allDatasets.find(d => d.id === dataset.id)
        const isActive = currentDataset === dataset.id
        const description = DATASET_DESCRIPTIONS[dataset.id]
        const externalLink = EXTERNAL_LINKS[dataset.id]
        return (
          <div key={dataset.id} className="relative">
            <button
              onClick={() => onSelectDataset(dataset.id)}
              className={`
                w-full px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5
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
              {externalLink && (
                <a
                  href={externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`p-0.5 rounded transition-colors ${
                    isActive ? 'text-white/60 hover:text-white' : isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                  }`}
                  title="View dataset source"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
