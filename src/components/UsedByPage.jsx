import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ExternalLink, BookMarked } from 'lucide-react'

function UsedByPage({ isDark }) {
  const navigate = useNavigate()
  const [publications, setPublications] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    fetch('/publications.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load publications')
        return res.json()
      })
      .then((data) => setPublications(data.publications || []))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
          isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leaderboard
      </button>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BookMarked className={`w-8 h-8 ${isDark ? 'text-accent-400' : 'text-accent-600'}`} />
          <h1 className={`text-3xl sm:text-4xl font-display font-bold ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Used By
          </h1>
        </div>
        <p className={`mt-2 text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Published research powered by CatBench
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className={`rounded-xl p-8 text-center ${
          isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-white shadow-sm border border-slate-200 text-slate-600'
        }`}>
          {error}
        </div>
      )}

      {/* Publication cards */}
      {publications && (
        <div className="flex flex-col gap-5">
          {publications.map((pub) => (
            <a
              key={pub.id}
              href={pub.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group rounded-xl overflow-hidden transition-all flex flex-col sm:flex-row ${
                isDark
                  ? 'bg-slate-900/60 border border-slate-800 hover:border-accent-500/50 hover:bg-slate-900'
                  : 'bg-white shadow-sm border border-slate-200 hover:border-accent-400 hover:shadow-md'
              }`}
            >
              {/* Preview image — large, with slight breathing room */}
              {pub.image && (
                <div className={`sm:w-80 shrink-0 p-3 flex ${
                  isDark ? 'bg-slate-800/40' : 'bg-slate-50'
                }`}>
                  <img
                    src={pub.image}
                    alt={pub.title}
                    className="w-full h-48 sm:h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Text */}
              <div className="p-5 flex flex-col justify-center min-w-0">
                {/* Venue + year badge */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isDark ? 'bg-accent-500/15 text-accent-300' : 'bg-accent-50 text-accent-700'
                  }`}>
                    {pub.venue}
                  </span>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {pub.year}
                  </span>
                </div>

                {/* Title */}
                <h2 className={`text-base sm:text-lg font-semibold leading-snug transition-colors ${
                  isDark
                    ? 'text-white group-hover:text-accent-300'
                    : 'text-slate-900 group-hover:text-accent-600'
                }`}>
                  {pub.title}
                  <ExternalLink className={`inline-block w-4 h-4 ml-1.5 -mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity ${
                    isDark ? 'text-slate-300' : 'text-slate-500'
                  }`} />
                </h2>

                {/* Authors */}
                <p className={`mt-1.5 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {pub.authors}
                </p>

                {/* How CatBench was used */}
                {pub.used && (
                  <p className={`mt-2.5 text-sm leading-relaxed border-l-2 pl-3 ${
                    isDark ? 'text-slate-300 border-accent-500/60' : 'text-slate-700 border-accent-400'
                  }`}>
                    {pub.used}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className={`mt-8 text-sm text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Using CatBench in your research?{' '}
        <a
          href="mailto:jumoon@snu.ac.kr"
          className={`underline underline-offset-2 ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Let us know
        </a>{' '}
        and we'll feature it here.
      </p>
    </div>
  )
}

export default UsedByPage
