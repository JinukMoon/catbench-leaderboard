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

  // Compute label offsets using repulsion-based algorithm (like ggrepel/adjustText)
  function computeLabelOffsets(dataPoints) {
    if (dataPoints.length === 0) return {}

    // Get data ranges for normalization
    const xMin = Math.min(...dataPoints.map(d => d.x))
    const xMax = Math.max(...dataPoints.map(d => d.x))
    const yMin = Math.min(...dataPoints.map(d => d.y))
    const yMax = Math.max(...dataPoints.map(d => d.y))
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    // Initialize label positions (normalized coordinates)
    const labels = dataPoints.map((d, i) => ({
      index: i,
      x: (d.x - xMin) / xRange,  // normalized point x
      y: (d.y - yMin) / yRange,  // normalized point y
      lx: (d.x - xMin) / xRange, // label x (will be adjusted)
      ly: (d.y - yMin) / yRange + 0.05, // label y (start above point)
      name: d.name
    }))

    // Candidate positions around each point (dx, dy in normalized units)
    const candidates = [
      { dx: 0, dy: 0.08 },    // top
      { dx: 0, dy: -0.08 },   // bottom
      { dx: 0.06, dy: 0.05 }, // top-right
      { dx: -0.06, dy: 0.05 },// top-left
      { dx: 0.06, dy: -0.05 },// bottom-right
      { dx: -0.06, dy: -0.05 },// bottom-left
      { dx: 0.08, dy: 0 },    // right
      { dx: -0.08, dy: 0 },   // left
      { dx: 0, dy: 0.12 },    // far top
      { dx: 0, dy: -0.12 },   // far bottom
      { dx: 0.10, dy: 0.08 }, // far top-right
      { dx: -0.10, dy: 0.08 },// far top-left
    ]

    // Estimate label size in normalized coordinates
    const labelWidth = 0.12
    const labelHeight = 0.04

    // Check if two label bounding boxes overlap
    function labelsOverlap(l1, l2) {
      const hw = labelWidth / 2
      const hh = labelHeight / 2
      return Math.abs(l1.lx - l2.lx) < labelWidth && Math.abs(l1.ly - l2.ly) < labelHeight
    }

    // Check if label overlaps with any point
    function overlapsPoint(label, points) {
      for (const p of points) {
        if (Math.abs(label.lx - p.x) < labelWidth / 2 && Math.abs(label.ly - p.y) < labelHeight / 2) {
          return true
        }
      }
      return false
    }

    // Score a label position (lower is better)
    function scorePosition(labelIdx, lx, ly) {
      let score = 0
      const testLabel = { lx, ly }

      // Penalty for overlapping other labels
      for (let i = 0; i < labels.length; i++) {
        if (i === labelIdx) continue
        if (labelsOverlap(testLabel, labels[i])) {
          score += 100
        }
        // Soft penalty for being close
        const dist = Math.sqrt((lx - labels[i].lx) ** 2 + (ly - labels[i].ly) ** 2)
        if (dist < labelWidth) {
          score += (labelWidth - dist) * 50
        }
      }

      // Penalty for overlapping points
      for (const p of dataPoints) {
        const px = (p.x - xMin) / xRange
        const py = (p.y - yMin) / yRange
        if (Math.abs(lx - px) < labelWidth / 2 && Math.abs(ly - py) < labelHeight / 2) {
          score += 80
        }
      }

      // Small penalty for distance from own point
      const ownDist = Math.sqrt((lx - labels[labelIdx].x) ** 2 + (ly - labels[labelIdx].y) ** 2)
      score += ownDist * 10

      return score
    }

    // Greedy placement: place labels one by one, choosing best position
    const sortedIndices = [...Array(labels.length).keys()].sort((a, b) => {
      // Prioritize Pareto optimal points
      if (dataPoints[a].isPareto !== dataPoints[b].isPareto) {
        return dataPoints[a].isPareto ? -1 : 1
      }
      return 0
    })

    for (const idx of sortedIndices) {
      let bestScore = Infinity
      let bestPos = { dx: 0, dy: 0.08 }

      for (const cand of candidates) {
        const lx = labels[idx].x + cand.dx
        const ly = labels[idx].y + cand.dy
        const score = scorePosition(idx, lx, ly)

        if (score < bestScore) {
          bestScore = score
          bestPos = cand
        }
      }

      labels[idx].lx = labels[idx].x + bestPos.dx
      labels[idx].ly = labels[idx].y + bestPos.dy
    }

    // Convert back to pixel offsets (approximate)
    const pixelScaleX = 300 // approximate chart width
    const pixelScaleY = 300 // approximate chart height

    const offsets = {}
    for (const label of labels) {
      offsets[label.index] = {
        dx: (label.lx - label.x) * pixelScaleX,
        dy: -(label.ly - label.y) * pixelScaleY // negative because y increases downward in SVG
      }
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
                tick={{ fill: textColor, fontSize: 16 }}
                label={{ value: 'Time per step (s)', position: 'bottom', fill: textColor, fontSize: 20, fontWeight: 'bold', dy: 10 }}
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="y"
                name="MAE"
                type="number"
                tick={{ fill: textColor, fontSize: 16 }}
                label={{ value: 'MAE_normal (eV)', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 20, fontWeight: 'bold', dx: -5, textAnchor: 'middle' }}
                domain={['auto', 'auto']}
              />
              {/* Pareto frontier line - rendered first, no tooltip */}
              {plotData.performancePath.length > 1 && (
                <Scatter
                  data={plotData.performancePath}
                  line={{ stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => null}
                  isAnimationActive={false}
                  legendType="none"
                />
              )}

              {/* Data points with tooltip */}
              <Scatter data={plotData.performance} isAnimationActive={false}>
                <Tooltip content={<CustomTooltip metricLabel="MAE" />} isAnimationActive={false} />
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
                tick={{ fill: textColor, fontSize: 16 }}
                label={{ value: 'Time per step (s)', position: 'bottom', fill: textColor, fontSize: 20, fontWeight: 'bold', dy: 10 }}
                domain={['auto', 'auto']}
              />
              <YAxis
                dataKey="y"
                name="Normal Rate"
                type="number"
                tick={{ fill: textColor, fontSize: 16 }}
                label={{ value: 'Normal Rate (%)', angle: -90, position: 'insideLeft', fill: textColor, fontSize: 20, fontWeight: 'bold', dx: -5, textAnchor: 'middle' }}
                domain={['auto', 'auto']}
              />
              {/* Pareto frontier line - rendered first, no tooltip */}
              {plotData.stabilityPath.length > 1 && (
                <Scatter
                  data={plotData.stabilityPath}
                  line={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                  shape={() => null}
                  isAnimationActive={false}
                  legendType="none"
                />
              )}

              {/* Data points with tooltip */}
              <Scatter data={plotData.stability} isAnimationActive={false}>
                <Tooltip content={<CustomTooltip metricLabel="Normal Rate" />} isAnimationActive={false} />
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
