import React, { useState, useEffect } from 'react'
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import DatasetSelector from './components/DatasetSelector'
import LeaderboardTable from './components/LeaderboardTable'
import ParetoPlots from './components/ParetoPlots'
import AllDatasetsPage from './components/AllDatasetsPage'
import SurfaceEnergyPage from './components/SurfaceEnergyPage'
import DocumentationPage from './components/DocumentationPage'
import { Loader2, Headphones, Info } from 'lucide-react'

// Main leaderboard page component
function MainPage({ meta, mlipMetadata, isDark, currentDataset, setCurrentDataset, datasetData, loading }) {
  return (
    <>
      {/* Hero section with logo — responsive flex (no overlap on zoom/narrow) */}
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo - left (decorative; hidden on small screens to avoid crowding) */}
          <div className="hidden lg:block shrink-0 order-3 lg:order-1">
            <div className="rounded-xl p-2 bg-slate-50">
              <img
                src="/images/CatBench_logo.png"
                alt="CatBench"
                className="h-28 xl:h-36 w-auto"
              />
            </div>
          </div>
          {/* Title and description - centered */}
          <div className="flex-grow min-w-0 text-center order-1 lg:order-2">
            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-display font-bold ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              CatBench Leaderboard
            </h1>
            <p className={`text-base sm:text-lg mt-2 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Benchmarking framework of MLIPs for Adsorption Energy Predictions
            </p>
            <p className={`text-sm mt-1 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Last Updated: March 24, 2026
            </p>
          </div>
          {/* Overview & Surface Energy - right side */}
          <div className="shrink-0 order-2 lg:order-3 flex flex-col gap-2 w-full max-w-[280px] mx-auto lg:mx-0">
            {/* CatBench Overview */}
            <div className={`rounded-xl p-4 ${isDark ? 'bg-slate-800/90' : 'bg-white shadow-md'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Headphones className={`w-5 h-5 ${isDark ? 'text-accent-400' : 'text-accent-600'}`} />
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  CatBench Overview
                </span>
              </div>
              <audio
                controls
                src="/audio/CatBench_summary.mp3"
                className="h-8 w-full"
              />
            </div>
            {/* Surface Energy */}
            <div className="relative group">
              <a
                href="/surface-energy"
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                  ${isDark
                    ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white border border-slate-700/50'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-300 shadow-sm'
                  }
                `}
              >
                <span>Surface Energy Benchmark</span>
                <Info className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              </a>
              {/* Tooltip */}
              <div
                className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 px-3 py-2 text-xs font-normal leading-relaxed text-left whitespace-normal text-slate-200 rounded-lg shadow-xl border border-slate-600 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: '#0f172a' }}
              >
                <span
                  className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent"
                  style={{ borderBottomColor: '#0f172a' }}
                />
                Surface energy predictions on 1,915 binary alloy slabs from MamunHighT2019 dataset
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset selector */}
      {meta && (
        <div className="mb-6">
          <DatasetSelector
            meta={meta}
            currentDataset={currentDataset}
            onSelectDataset={setCurrentDataset}
            isDark={isDark}
          />
        </div>
      )}

      {/* Leaderboard table */}
      <div>
        {loading ? (
          <div className={`rounded-xl p-12 flex items-center justify-center ${
            isDark ? 'bg-slate-900/50' : 'bg-white shadow-sm border border-slate-200'
          }`}>
            <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
            <span className={`ml-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Loading leaderboard...
            </span>
          </div>
        ) : datasetData ? (
          <div key={datasetData.id}>
            <LeaderboardTable data={datasetData} isDark={isDark} mlipMetadata={mlipMetadata} />
            <ParetoPlots data={datasetData} isDark={isDark} />
          </div>
        ) : null}
      </div>
    </>
  )
}

function App() {
  const [meta, setMeta] = useState(null)
  const [mlipMetadata, setMlipMetadata] = useState(null)
  const [currentDataset, setCurrentDataset] = useState(null)
  const [datasetData, setDatasetData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDark, setIsDark] = useState(true)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const toggleTheme = () => setIsDark(!isDark)

  // Load meta.json and mlip_metadata.json on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load both in parallel
        const [metaResponse, mlipResponse] = await Promise.all([
          fetch('/data/meta.json'),
          fetch('/data/mlip_metadata.json')
        ])

        if (!metaResponse.ok) throw new Error('Failed to load metadata')
        const metaData = await metaResponse.json()
        setMeta(metaData)

        // Only parse if response is actually JSON (not HTML fallback)
        if (mlipResponse.ok && mlipResponse.headers.get('content-type')?.includes('application/json')) {
          const mlipData = await mlipResponse.json()
          setMlipMetadata(mlipData)
        }

        // Check for dataset query param
        const datasetParam = searchParams.get('dataset')
        if (datasetParam) {
          setCurrentDataset(datasetParam)
        } else {
          // Default to MamunHighT2019
          setCurrentDataset('MamunHighT2019')
        }
      } catch (err) {
        console.error('Error loading meta:', err)
        setError(err.message)
      }
    }
    loadInitialData()
  }, [searchParams])

  // Load dataset when selection changes
  useEffect(() => {
    if (!currentDataset) return

    const loadDataset = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/data/datasets/${currentDataset}.json`)
        if (!response.ok) throw new Error(`Failed to load dataset: ${currentDataset}`)
        const data = await response.json()
        setDatasetData(data)
      } catch (err) {
        console.error('Error loading dataset:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadDataset()
  }, [currentDataset])

  // Handle dataset selection change
  const handleDatasetSelect = (datasetId) => {
    setCurrentDataset(datasetId)
    navigate(`/?dataset=${datasetId}`)
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-coral-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <Header isDark={isDark} onToggleTheme={toggleTheme} />

      <main className="flex-grow container mx-auto px-4 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <MainPage
                meta={meta}
                mlipMetadata={mlipMetadata}
                isDark={isDark}
                currentDataset={currentDataset}
                setCurrentDataset={handleDatasetSelect}
                datasetData={datasetData}
                loading={loading}
              />
            }
          />
          <Route
            path="/datasets"
            element={
              <AllDatasetsPage
                meta={meta}
                isDark={isDark}
              />
            }
          />
          <Route
            path="/surface-energy"
            element={
              <SurfaceEnergyPage
                isDark={isDark}
              />
            }
          />
          <Route
            path="/docs"
            element={
              <DocumentationPage
                isDark={isDark}
              />
            }
          />
        </Routes>
      </main>

      <Footer meta={meta} isDark={isDark} />
    </div>
  )
}

export default App
