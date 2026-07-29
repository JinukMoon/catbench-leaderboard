import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight, ChevronLeft, Loader2, Github, BookOpen } from 'lucide-react'

// Documentation structure — content lives in public/docs/<id>.md
// (split from the CatBench GitHub README; update those files when the README changes)
const DOC_GROUPS = [
  {
    label: 'Getting Started',
    items: [
      { id: 'overview', title: 'Overview' },
      { id: 'installation', title: 'Installation' },
      { id: 'quick-start', title: 'Quick Start' },
      { id: 'tutorials', title: 'Tutorials' },
    ],
  },
  {
    label: 'Adsorption Energy',
    items: [
      { id: 'data-preparation', title: 'Data Preparation' },
      { id: 'calculation', title: 'Calculation' },
      { id: 'analysis', title: 'Analysis' },
      { id: 'output-files', title: 'Output Files' },
    ],
  },
  {
    label: 'Relative Energy',
    items: [
      { id: 'surface-energy', title: 'Surface Energy' },
      { id: 'bulk-formation', title: 'Bulk Formation Energy' },
    ],
  },
  {
    label: 'Equation of State',
    items: [
      { id: 'eos', title: 'EOS Benchmarking' },
    ],
  },
  {
    label: 'Configuration Reference',
    items: [
      { id: 'config-adsorption-calculation', title: 'AdsorptionCalculation' },
      { id: 'config-adsorption-analysis', title: 'AdsorptionAnalysis' },
      { id: 'config-dispersion', title: 'DispersionCorrection' },
      { id: 'config-relative-eos', title: 'Relative & EOS Classes' },
    ],
  },
  {
    label: 'About',
    items: [
      { id: 'citation', title: 'Citation' },
      { id: 'license-contact', title: 'License & Contact' },
    ],
  },
]

const FLAT_SECTIONS = DOC_GROUPS.flatMap((g) => g.items)
const SECTION_IDS = new Set(FLAT_SECTIONS.map((s) => s.id))
const DEFAULT_SECTION = 'overview'

function sectionFromHash() {
  const h = window.location.hash.replace(/^#/, '')
  return SECTION_IDS.has(h) ? h : DEFAULT_SECTION
}

function DocumentationPage({ isDark }) {
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState(sectionFromHash)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const cacheRef = useRef({})
  const contentTopRef = useRef(null)

  // Sync with browser back/forward
  useEffect(() => {
    const onHashChange = () => setActiveId(sectionFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Fetch section markdown (cached)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (cacheRef.current[activeId]) {
        setContent(cacheRef.current[activeId])
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/docs/${activeId}.md`)
        const text = res.ok ? await res.text() : '*Failed to load this section.*'
        cacheRef.current[activeId] = text
        if (!cancelled) setContent(text)
      } catch {
        if (!cancelled) setContent('*Failed to load this section.*')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeId])

  const goToSection = useCallback((id) => {
    if (!SECTION_IDS.has(id)) return
    if (window.location.hash !== `#${id}`) {
      window.location.hash = id   // fires hashchange → setActiveId
    } else {
      setActiveId(id)
    }
    // Scroll content to top (small delay so the new content mounts first)
    requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
      window.scrollTo({ top: 0 })
    })
  }, [])

  const activeSection = FLAT_SECTIONS.find((s) => s.id === activeId) || FLAT_SECTIONS[0]
  const activeIndex = FLAT_SECTIONS.findIndex((s) => s.id === activeId)
  const prevSection = activeIndex > 0 ? FLAT_SECTIONS[activeIndex - 1] : null
  const nextSection = activeIndex < FLAT_SECTIONS.length - 1 ? FLAT_SECTIONS[activeIndex + 1] : null
  const activeGroup = DOC_GROUPS.find((g) => g.items.some((s) => s.id === activeId))

  // ---- Markdown renderers (theme-aware) ----
  const mdComponents = {
    img: ({ node, ...props }) => (
      <img
        {...props}
        className="max-w-full h-auto rounded-lg my-5 mx-auto"
        style={{ maxWidth: 'min(100%, 620px)' }}
        loading="lazy"
      />
    ),
    // react-markdown v10: no `inline` prop — inline code renders via `code`,
    // fenced blocks via `pre` (the .md-pre CSS resets the chip style inside).
    code: ({ node, className, children, ...props }) => (
      <code
        className={`px-1.5 py-0.5 rounded font-mono text-sm whitespace-nowrap ${
          isDark ? 'bg-slate-800 text-accent-400' : 'bg-slate-200 text-accent-600'
        }`}
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ node, children, ...props }) => (
      <pre className={`md-pre p-4 rounded-lg overflow-x-auto font-mono text-sm my-4 leading-relaxed ${
        isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
      }`} {...props}>
        {children}
      </pre>
    ),
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-5">
        <table className={`w-full text-sm ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`} {...props} />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th className={`px-3 py-2.5 text-left font-semibold border-b-2 ${
        isDark ? 'border-slate-600 text-slate-200' : 'border-slate-300 text-slate-800'
      }`} {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className={`px-3 py-2.5 align-top border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`} {...props} />
    ),
    tr: ({ node, ...props }) => (
      <tr className={`transition-colors ${
        isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
      }`} {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote className={`border-l-4 pl-4 my-4 ${
        isDark ? 'border-yellow-500 bg-yellow-900/20 text-yellow-200' : 'border-yellow-500 bg-yellow-50 text-yellow-800'
      } p-3 rounded-r-lg`} {...props} />
    ),
    h2: ({ node, children, ...props }) => (
      <h2 className={`text-2xl font-bold mt-8 mb-4 pb-2 border-b ${
        isDark ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'
      }`} {...props}>{children}</h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3 className={`text-xl font-semibold mt-6 mb-3 ${
        isDark ? 'text-white' : 'text-slate-900'
      }`} {...props}>{children}</h3>
    ),
    p: ({ node, ...props }) => (
      <p className={`my-3 leading-relaxed ${
        isDark ? 'text-slate-300' : 'text-slate-600'
      }`} {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className={`list-disc list-inside my-3 space-y-1 ${
        isDark ? 'text-slate-300' : 'text-slate-600'
      }`} {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className={`list-decimal list-inside my-3 space-y-1 ${
        isDark ? 'text-slate-300' : 'text-slate-600'
      }`} {...props} />
    ),
    a: ({ node, href, ...props }) => {
      // Internal section links (#section-id) switch the docs page in place
      if (href?.startsWith('#') && SECTION_IDS.has(href.slice(1))) {
        return (
          <a
            href={href}
            className="text-accent-500 hover:underline cursor-pointer"
            onClick={(e) => { e.preventDefault(); goToSection(href.slice(1)) }}
            {...props}
          />
        )
      }
      return (
        <a
          href={href}
          className="text-accent-500 hover:underline"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          {...props}
        />
      )
    },
    strong: ({ node, ...props }) => (
      <strong className={isDark ? 'text-white' : 'text-slate-900'} {...props} />
    ),
    hr: ({ node, ...props }) => (
      <hr className={`my-8 ${isDark ? 'border-slate-700' : 'border-slate-300'}`} {...props} />
    ),
  }

  const sidebarItemClass = (id) => `
    w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors
    ${id === activeId
      ? (isDark ? 'bg-accent-600/20 text-accent-300 font-semibold' : 'bg-accent-50 text-accent-700 font-semibold')
      : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
    }
  `

  return (
    <div className="max-w-7xl mx-auto animate-fade-in" ref={contentTopRef}>
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
          isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leaderboard
      </button>

      {/* Mobile section picker */}
      <div className="lg:hidden mb-4">
        <select
          value={activeId}
          onChange={(e) => goToSection(e.target.value)}
          className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium border ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {DOC_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex gap-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-60 shrink-0">
          <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-8">
            <div className={`flex items-center gap-2 mb-4 px-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <BookOpen className={`w-5 h-5 ${isDark ? 'text-accent-400' : 'text-accent-600'}`} />
              <span className="font-display font-bold text-lg">Documentation</span>
            </div>
            {DOC_GROUPS.map((group) => (
              <div key={group.label} className="mb-5">
                <div className={`px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((s) => (
                    <button key={s.id} onClick={() => goToSection(s.id)} className={sidebarItemClass(s.id)}>
                      {s.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {/* Section header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isDark ? 'text-accent-400' : 'text-accent-600'
                }`}>
                  {activeGroup?.label}
                </div>
                <h1 className={`text-3xl font-display font-bold ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeSection.title}
                </h1>
              </div>
              <a
                href="https://github.com/JinukMoon/CatBench#readme"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1.5 text-xs mt-2 transition-colors ${
                  isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Github className="w-3.5 h-3.5" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Markdown body */}
          {loading && !content ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-accent-500 animate-spin" />
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {content}
            </ReactMarkdown>
          )}

          {/* Prev / Next navigation */}
          <div className={`mt-12 pt-6 border-t flex items-stretch gap-4 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {prevSection ? (
              <button
                onClick={() => goToSection(prevSection.id)}
                className={`flex-1 text-left p-4 rounded-xl border transition-colors group ${
                  isDark
                    ? 'border-slate-800 hover:border-accent-500/50 bg-slate-900/40'
                    : 'border-slate-200 hover:border-accent-400 bg-white'
                }`}
              >
                <div className={`flex items-center gap-1 text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </div>
                <div className={`text-sm font-semibold transition-colors ${
                  isDark ? 'text-slate-300 group-hover:text-accent-300' : 'text-slate-700 group-hover:text-accent-600'
                }`}>
                  {prevSection.title}
                </div>
              </button>
            ) : <div className="flex-1" />}
            {nextSection ? (
              <button
                onClick={() => goToSection(nextSection.id)}
                className={`flex-1 text-right p-4 rounded-xl border transition-colors group ${
                  isDark
                    ? 'border-slate-800 hover:border-accent-500/50 bg-slate-900/40'
                    : 'border-slate-200 hover:border-accent-400 bg-white'
                }`}
              >
                <div className={`flex items-center justify-end gap-1 text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <div className={`text-sm font-semibold transition-colors ${
                  isDark ? 'text-slate-300 group-hover:text-accent-300' : 'text-slate-700 group-hover:text-accent-600'
                }`}>
                  {nextSection.title}
                </div>
              </button>
            ) : <div className="flex-1" />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentationPage
