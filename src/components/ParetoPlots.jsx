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

// Point colors
const POINT_COLOR = '#9ca3af' // gray for non-Pareto
const PARETO_STROKE_COLOR = '#ef4444' // red border for Pareto optimal
const ACCURACY_PARETO_LINE = '#ef4444' // red for Accuracy-Efficiency
const ROBUSTNESS_PARETO_LINE = '#3b82f6' // blue for Robustness-Efficiency

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

// Generate staircase path for Pareto frontier (taxi geometry)
function generateParetoPath(points, paretoIndices, minimizeY = true) {
  if (paretoIndices.length < 2) return []

  // Get Pareto points sorted by x
  const paretoPoints = paretoIndices
    .map(i => points[i])
    .sort((a, b) => a.x - b.x)

  // Generate staircase path
  const path = []
  for (let i = 0; i < paretoPoints.length; i++) {
    const current = paretoPoints[i]
    path.push({ x: current.x, y: current.y })

    if (i < paretoPoints.length - 1) {
      const next = paretoPoints[i + 1]
      // For minimize Y: go horizontal first, then vertical (step down)
      // For maximize Y: go vertical first, then horizontal (step up)
      if (minimizeY) {
        path.push({ x: next.x, y: current.y }) // horizontal to next x
      } else {
        path.push({ x: current.x, y: next.y }) // vertical to next y
      }
    }
  }

  return path
}

// Custom tooltip
function CustomTooltip({ active, payload, metricLabel }) {
  if (active && payload && payload.length) {
    const validPayload = payload.find(p => p.payload?.name)
    if (!validPayload) return null
    const data = validPayload.payload
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white font-semibold text-base">{data.name}</p>
        <p className="text-slate-300 text-sm">Time: {data.x.toFixed(1)} ms</p>
        <p className="text-slate-300 text-sm">{metricLabel}: {data.y.toFixed(3)}</p>
        {data.isPareto && <p className="text-red-400 text-xs mt-1 font-semibold">★ Pareto Optimal</p>}
      </div>
    )
  }
  return null
}

// Label renderer factory - creates a renderer with access to data array
function createLabelRenderer(dataArray) {
  return function renderLabel(props) {
    const { x, y, value, index } = props

    // Find the data point by index or name
    const dataPoint = dataArray[index] || dataArray.find(d => d.name === value)
    const isPareto = dataPoint?.isPareto

    return (
      <text
        x={x}
        y={y - 12}
        fill={isPareto ? '#facc15' : '#e2e8f0'}
        fontSize={isPareto ? 14 : 12}
        fontWeight={isPareto ? 'bold' : 'normal'}
        textAnchor="middle"
      >
        {value}
      </text>
    )
  }
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
        time: metrics.time_per_step_s * 1000, // s -> ms for display
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

    return {
      performance: performanceData,
      stability: stabilityData,
      performancePath,
      stabilityPath,
      performancePareto: performancePareto.map(i => performanceData[i].name),
      stabilityPareto: stabilityPareto.map(i => stabilityData[i].name),
    }
  }, [data])

  if (!plotData.performance.length) return null

  const bgColor = isDark ? 'bg-slate-900/50' : 'bg-white'
  const textColor = isDark ? '#e2e8f0' : '#1e293b'
  const gridColor = isDark ? '#334155' : '#e2e8f0'

  return (
    <div className={`mt-8 rounded-xl p-6 ${bgColor} border ${isDark ? 'border-slate-800/50' : 'border-slate-200'}`}>
      <h3 className={`text-3xl font-display font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        Pareto Analysis
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance-Efficiency Plot */}
        <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <h4 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Accuracy-Efficiency
          </h4>
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 30, right: 20, bottom: 50, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
              <XAxis
                dataKey="x"
                name="Time"
                type="number"
                tick={{ fill: textColor, fontSize: 18 }}
                label={{ value: 'Time per step (ms)', position: 'bottom', fill: textColor, fontSize: 24, fontWeight: 'bold', dy: 10 }}
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="y"
                name="MAE"
                type="number"
                tick={{ fill: textColor, fontSize: 18 }}
                label={{ value: 'Normal MAE (eV)', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 24, fontWeight: 'bold', dx: -5, textAnchor: 'middle' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={<CustomTooltip metricLabel="MAE" />}
                cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              {/* Pareto frontier line - RED for Accuracy */}
              {plotData.performancePath.length > 1 && (
                <Scatter
                  data={plotData.performancePath}
                  line={{ stroke: ACCURACY_PARETO_LINE, strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => null}
                  isAnimationActive={false}
                  legendType="none"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Data points */}
              <Scatter data={plotData.performance} isAnimationActive={false}>
                {plotData.performance.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={POINT_COLOR}
                    stroke={entry.isPareto ? ACCURACY_PARETO_LINE : 'none'}
                    strokeWidth={entry.isPareto ? 3 : 0}
                  />
                ))}
                <LabelList dataKey="name" content={createLabelRenderer(plotData.performance)} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Robustness-Efficiency Plot */}
        <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
          <h4 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Robustness-Efficiency
          </h4>
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 30, right: 20, bottom: 50, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
              <XAxis
                dataKey="x"
                name="Time"
                type="number"
                tick={{ fill: textColor, fontSize: 18 }}
                label={{ value: 'Time per step (ms)', position: 'bottom', fill: textColor, fontSize: 24, fontWeight: 'bold', dy: 10 }}
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="y"
                name="Normal Rate"
                type="number"
                tick={{ fill: textColor, fontSize: 18 }}
                label={{ value: 'Normal Rate (%)', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 24, fontWeight: 'bold', dx: -5, textAnchor: 'middle' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={<CustomTooltip metricLabel="Normal Rate" />}
                cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                isAnimationActive={false}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              {/* Pareto frontier line - BLUE for Robustness */}
              {plotData.stabilityPath.length > 1 && (
                <Scatter
                  data={plotData.stabilityPath}
                  line={{ stroke: ROBUSTNESS_PARETO_LINE, strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => null}
                  isAnimationActive={false}
                  legendType="none"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Data points */}
              <Scatter data={plotData.stability} isAnimationActive={false}>
                {plotData.stability.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={POINT_COLOR}
                    stroke={entry.isPareto ? ROBUSTNESS_PARETO_LINE : 'none'}
                    strokeWidth={entry.isPareto ? 3 : 0}
                  />
                ))}
                <LabelList dataKey="name" content={createLabelRenderer(plotData.stability)} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default ParetoPlots
