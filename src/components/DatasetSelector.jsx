import React from 'react'

function DatasetSelector({ meta, currentDataset, onSelectDataset, isDark }) {
  const featuredDatasets = meta?.featured_datasets || []
  const allDatasets = meta?.datasets || []

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {featuredDatasets.map((dataset) => {
        const datasetInfo = allDatasets.find(d => d.id === dataset.id)
        const isActive = currentDataset === dataset.id
        return (
          <button
            key={dataset.id}
            onClick={() => onSelectDataset(dataset.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
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
              <span className={`ml-1.5 text-xs ${
                isActive ? 'text-white/70' : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                ({datasetInfo.reaction_count.toLocaleString()})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default DatasetSelector
