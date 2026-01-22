import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Database, ArrowLeft, ExternalLink, Link as LinkIcon } from 'lucide-react'
import { EXTERNAL_LINKS, getDisplaySource } from '../constants/datasets'

function AllDatasetsPage({ meta, isDark }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')

  const allDatasets = meta?.datasets || []

  // Filter datasets
  const filteredDatasets = useMemo(() => {
    return allDatasets.filter(dataset => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        dataset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.display_name.toLowerCase().includes(searchQuery.toLowerCase())

      // Source filter
      const matchesSource = sourceFilter === 'all' || dataset.source === sourceFilter

      return matchesSearch && matchesSource
    })
  }, [allDatasets, searchQuery, sourceFilter])

  // Group by source for stats
  const sourceStats = useMemo(() => {
    const stats = { 'catalysis-hub': 0, 'literature': 0, 'ccel': 0 }
    allDatasets.forEach(d => {
      if (stats[d.source] !== undefined) {
        stats[d.source]++
      }
    })
    return stats
  }, [allDatasets])

  const handleDatasetClick = (datasetId) => {
    navigate(`/?dataset=${datasetId}`)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Featured Datasets
        </button>

        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          All Datasets
        </h1>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Browse {allDatasets.length} benchmark datasets from Catalysis Hub and other sources
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-grow">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
              isDark
                ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:border-accent-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-accent-500'
            } focus:outline-none focus:ring-2 focus:ring-accent-500/20`}
          />
        </div>

        {/* Source Filter */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All', count: allDatasets.length },
            { id: 'catalysis-hub', label: 'Catalysis-Hub', count: sourceStats['catalysis-hub'] },
            { id: 'literature', label: 'Literature', count: sourceStats['literature'] },
            { id: 'ccel', label: 'CCEL', count: sourceStats['ccel'] },
          ].map(source => (
            <button
              key={source.id}
              onClick={() => setSourceFilter(source.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                sourceFilter === source.id
                  ? 'bg-accent-500 text-white'
                  : isDark
                    ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {source.label}
              <span className={`ml-1.5 ${
                sourceFilter === source.id ? 'text-white/70' : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                ({source.count})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dataset Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDatasets.map(dataset => (
          <div
            key={dataset.id}
            onClick={() => handleDatasetClick(dataset.id)}
            className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
              isDark
                ? 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600'
                : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm'
            } ${dataset.featured ? 'ring-2 ring-accent-500/30' : ''}`}
          >
            <div className="flex items-start justify-between mb-2">
              <Database className={`w-5 h-5 ${isDark ? 'text-accent-400' : 'text-accent-600'}`} />
              {dataset.featured && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isDark ? 'bg-accent-500/20 text-accent-400' : 'bg-accent-100 text-accent-600'
                }`}>
                  Featured
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {dataset.display_name}
              </h3>
              {dataset.source === 'catalysis-hub' && (
                <a
                  href={`https://www.catalysis-hub.org/publications/${dataset.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`p-1 rounded transition-colors flex-shrink-0 ${
                    isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                  title="View on Catalysis Hub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {EXTERNAL_LINKS[dataset.id] && (
                <a
                  href={EXTERNAL_LINKS[dataset.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`p-1 rounded transition-colors flex-shrink-0 ${
                    isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                  }`}
                  title="View dataset source"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {dataset.reaction_count?.toLocaleString() || 0} reactions
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded ${
                dataset.source === 'catalysis-hub'
                  ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                  : dataset.source === 'literature'
                    ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    : isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
              }`}>
                {getDisplaySource(dataset)}
              </span>

              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {dataset.mlip_count} MLIPs
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* No results */}
      {filteredDatasets.length === 0 && (
        <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No datasets found matching your search.</p>
        </div>
      )}
    </div>
  )
}

export default AllDatasetsPage
