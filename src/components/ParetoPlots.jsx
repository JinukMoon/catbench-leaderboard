import React, { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
  LabelList
} from 'recharts'

// MLIP model colors (consistent with Python version)
const MODEL_COLORS = {
  'AlphaNet': '#e41a1c',
  'CHGNet': '#377eb8',
  'DPA-3': '#4daf4a',
  'DPA-3-FT': '#4daf4a',
  'Eqnorm': '#984ea3',
  'eSEN': '#ff7f00',
  'GRACE': '#ffff33',
  'GRACE-2L': '#ffff33',
  'MACE': '#a65628',
  'MACE-MPA': '#a65628',
  'MatterSim': '#f781bf',
  'ORB': '#999999',
  'SevenNet-MF': '#66c2a5',
  'SevenNet-MF-ompa': '#66c2a5',
  'UMA-s': '#fc8d62',
  'UMA-m': '#8da0cb',
  'UMA-s-oc20': '#fc8d62',
  'UMA-m-oc20': '#8da0cb',
  'MATLANTIS': '#e5c494',
  'MATLANTISv8': '#e5c494',
}

// Find Pareto frontier indices
function findParetoFrontier(points, minimizeX = true, minimizeY = true) {
  const paretoIndices = []

  for (let i = 0; i < points.length; i++) {
    let isPareto = true
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        const dominated = minimizeX && minimizeY
          ? (points[j].x <= points[i].x && points[j].y <= points[i].y &&
             (points[j].x < points[i].x || points[j].y < points[i].y))
          : minimizeX && !minimizeY
          ? (points[j].x <= points[i].x && points[j].y >= points[i].y &&
             (points[j].x < points[i].x || points[j].y > points[i].y))
          : false

        if (dominated) {
          isPareto = false
          break
        }
      }
    }
    if (isPareto) {
      paretoIndices.push(i)
    }
  }

  return paretoIndices
}

// Generate step-line path for Pareto frontier
function generateParetoPath(points, paretoIndices, minimizeY = true) {
  if (paretoIndices.length < 2) return []

  const paretoPoints = paretoIndices
    .map(i => points[i])
    .sort((a, b) => a.x - b.x)

  const pathPoints = []
  for (let i = 0; i < paretoPoints.length - 1; i++) {
    pathPoints.push({ x: paretoPoints[i].x, y: paretoPoints[i].y })
    if (minimizeY) {
      // Step down: horizontal then vertical
      pathPoints.push({ x: paretoPoints[i + 1].x, y: paretoPoints[i].y })
    } else {
      // Step up: horizontal then vertical
      pathPoints.push({ x: paretoPoints[i + 1].x, y: paretoPoints[i].y })
    }
  }
  pathPoints.push(paretoPoints[paretoPoints.length - 1])

  return pathPoints
}

// Custom tooltip
function CustomTooltip({ active, payload, label, metricLabel }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-white font-semibold text-base">{data.name}</p>
        <p className="text-slate-300 text-sm">Time: {data.x.toFixed(3)} s</p>
        <p className="text-slate-300 text-sm">{metricLabel}: {data.y.toFixed(3)}</p>
        {data.isPareto && <p className="text-amber-400 text-xs mt-1">Pareto Optimal</p>}
      </div>
    )
  }
  return null
}

// Custom label renderer using pre-computed offsets
function renderAdjustedLabel(props) {
  const { x, y, value, payload } = props
  const dx = payload?.labelDx || 0
  const dy = payload?.labelDy || -18

  return (
    <text
      x={x + dx}
      y={y + dy}
      fill="#e2e8f0"
      fontSize={13}
      fontWeight="bold"
      textAnchor="middle"
    >
      {value}
    </text>
  )
}

function ParetoPlots({ data, isDark = true }) {
  // Transform data for plots
  const plotData = useMemo(() => {
    if (!data?.results) return { performance: [], stability: [] }

    const points = Object.entries(data.results)
      .filter(([_, metrics]) =>
        metrics.MAE_normal_eV != null &&
        metrics.normal_rate_pct != null &&
        metrics.time_per_step_s != null
      )
      .map(([name, metrics]) => ({
        name,
        time: metrics.time_per_step_s,
        mae: metrics.MAE_normal_eV,
        normalRate: metrics.normal_rate_pct,
      }))

    // Performance plot data (Time vs MAE)
    const performanceData = points.map(p => ({
      name: p.name,
      x: p.time,
      y: p.mae,
      isPareto: false
    }))

    // Stability plot data (Time vs Normal Rate)
    const stabilityData = points.map(p => ({
      name: p.name,
      x: p.time,
      y: p.normalRate,
      isPareto: false
    }))

    // Find Pareto frontiers
    const performancePareto = findParetoFrontier(performanceData, true, true)
    const stabilityPareto = findParetoFrontier(stabilityData, true, false)

    // Mark Pareto optimal points
    performancePareto.forEach(i => { performanceData[i].isPareto = true })
    stabilityPareto.forEach(i => { stabilityData[i].isPareto = true })

    // Generate Pareto paths
    const performancePath = generateParetoPath(performanceData, performancePareto, true)
    const stabilityPath = generateParetoPath(stabilityData, stabilityPareto, false)

    // Pre-compute label offsets to avoid overlap
    const perfLabelOffsets = computeLabelOffsets(performanceData)
    const stabLabelOffsets = computeLabelOffsets(stabilityData)

    // Add offsets to data
    performanceData.forEach((d, i) => {
      d.labelDx = perfLabelOffsets[i]?.dx || 0
      d.labelDy = perfLabelOffsets[i]?.dy || -18
    })
    stabilityData.forEach((d, i) => {
      d.labelDx = stabLabelOffsets[i]?.dx || 0
      d.labelDy = stabLabelOffsets[i]?.dy || -18
    })

    return {
      performance: performanceData,
      stability: stabilityData,
      performancePath,
      stabilityPath,
      performancePareto: performancePareto.map(i => performanceData[i].name),
      stabilityPareto: stabilityPareto.map(i => stabilityData[i].name),
    }
  }, [data])

  // Compute label offsets based on data proximity
  function computeLabelOffsets(dataPoints) {
    const offsets = {}
    const baseOffset = -18

    // Group nearby points
    for (let i = 0; i < dataPoints.length; i++) {
      let dy = baseOffset
      let dx = 0
      let conflicts = 0

      for (let j = 0; j < dataPoints.length; j++) {
        if (i === j) continue

        const xDiff = Math.abs(dataPoints[i].x - dataPoints[j].x)
        const yDiff = Math.abs(dataPoints[i].y - dataPoints[j].y)

        // Normalize by data range
        const xRange = Math.max(...dataPoints.map(d => d.x)) - Math.min(...dataPoints.map(d => d.x))
        const yRange = Math.max(...dataPoints.map(d => d.y)) - Math.min(...dataPoints.map(d => d.y))

        const relX = xDiff / (xRange || 1)
        const relY = yDiff / (yRange || 1)

        // If points are close, adjust labels
        if (relX < 0.08 && relY < 0.08) {
          conflicts++
          // Alternate directions based on relative position
          if (dataPoints[i].y > dataPoints[j].y) {
            dy = -25 - (conflicts * 12)
          } else {
            dy = 25 + (conflicts * 12)
          }
          if (dataPoints[i].x > dataPoints[j].x) {
            dx = 20
          } else {
            dx = -20
          }
        }
      }

      offsets[i] = { dx, dy }
    }

    return offsets
  }

  if (!plotData.performance.length) return null

  const bgColor = isDark ? 'bg-slate-900/50' : 'bg-white'
  const textColor = isDark ? '#e2e8f0' : '#1e293b'
  const gridColor = isDark ? '#334155' : '#e2e8f0'

  return (
    <div className={`mt-8 rounded-xl p-6 ${bgColor} border ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
      <h3 className={`text-xl font-display font-semibold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Pareto Analysis
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance-Efficiency Plot */}
        <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Accuracy-Efficiency
          </h4>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 30, right: 30, bottom: 50, left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
              <XAxis
                dataKey="x"
                name="Time"
                type="number"
                tick={{ fill: textColor, fontSize: 14 }}
                label={{ value: 'Time per step (s)', position: 'bottom', fill: textColor, fontSize: 16, fontWeight: 'bold', dy: 10 }}
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="y"
                name="MAE"
                type="number"
                tick={{ fill: textColor, fontSize: 14 }}
                label={{ value: 'MAE_normal (eV)', angle: -90, position: 'left', fill: textColor, fontSize: 16, fontWeight: 'bold', dx: -20 }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip metricLabel="MAE" />} isAnimationActive={false} />

              {/* Pareto frontier line */}
              {plotData.performancePath.length > 1 && (
                <Scatter
                  data={plotData.performancePath}
                  line={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => null}
                  isAnimationActive={false}
                />
              )}

              {/* Data points */}
              <Scatter data={plotData.performance} isAnimationActive={false}>
                {plotData.performance.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MODEL_COLORS[entry.name] || '#888888'}
                    stroke={entry.isPareto ? '#fbbf24' : '#000'}
                    strokeWidth={entry.isPareto ? 3 : 1}
                  />
                ))}
                <LabelList dataKey="name" content={renderAdjustedLabel} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Robustness-Efficiency Plot */}
        <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <h4 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Robustness-Efficiency
          </h4>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 30, right: 30, bottom: 50, left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
              <XAxis
                dataKey="x"
                name="Time"
                type="number"
                tick={{ fill: textColor, fontSize: 14 }}
                label={{ value: 'Time per step (s)', position: 'bottom', fill: textColor, fontSize: 16, fontWeight: 'bold', dy: 10 }}
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="y"
                name="Normal Rate"
                type="number"
                tick={{ fill: textColor, fontSize: 14 }}
                label={{ value: 'Normal Rate (%)', angle: -90, position: 'left', fill: textColor, fontSize: 16, fontWeight: 'bold', dx: -20 }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip metricLabel="Normal Rate" />} isAnimationActive={false} />

              {/* Pareto frontier line */}
              {plotData.stabilityPath.length > 1 && (
                <Scatter
                  data={plotData.stabilityPath}
                  line={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => null}
                  isAnimationActive={false}
                />
              )}

              {/* Data points */}
              <Scatter data={plotData.stability} isAnimationActive={false}>
                {plotData.stability.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MODEL_COLORS[entry.name] || '#888888'}
                    stroke={entry.isPareto ? '#fbbf24' : '#000'}
                    strokeWidth={entry.isPareto ? 3 : 1}
                  />
                ))}
                <LabelList dataKey="name" content={renderAdjustedLabel} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ParetoPlots
