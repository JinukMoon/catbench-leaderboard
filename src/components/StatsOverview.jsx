import React from 'react'
import { Activity, Beaker, Clock, Target } from 'lucide-react'

function StatsOverview({ data }) {
  const mlipCount = Object.keys(data.results || {}).length
  const reactionCount = data.reaction_count || 0
  const adsorbateCount = data.adsorbates?.length || 0

  // Calculate best metrics
  const results = Object.values(data.results || {})
  const bestMAE = results.length > 0
    ? Math.min(...results.map(r => r.MAE_normal_eV || Infinity))
    : null
  const bestADwT = results.length > 0
    ? Math.max(...results.map(r => r.ADwT_pct || 0))
    : null

  const stats = [
    {
      icon: Activity,
      label: 'MLIPs Evaluated',
      value: mlipCount,
      color: 'text-accent-400',
    },
    {
      icon: Beaker,
      label: 'Reactions',
      value: reactionCount.toLocaleString(),
      color: 'text-emerald-400',
    },
    {
      icon: Target,
      label: 'Best MAE (Normal)',
      value: bestMAE ? `${bestMAE.toFixed(3)} eV` : '—',
      color: 'text-amber-400',
    },
    {
      icon: Clock,
      label: 'Best ADwT',
      value: bestADwT ? `${bestADwT.toFixed(1)}%` : '—',
      color: 'text-violet-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="stat-card"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
            <stat.icon className={`w-5 h-5 ${stat.color} opacity-60`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsOverview
