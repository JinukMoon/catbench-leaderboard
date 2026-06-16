import React from 'react'
import { Link } from 'react-router-dom'
import { Github, Sun, Moon, FileText, Database, BookOpen } from 'lucide-react'

function Header({ isDark, onToggleTheme }) {
  return (
    <header className={`sticky top-0 z-50 backdrop-blur-xl border-b ${
      isDark ? 'bg-slate-950/80 border-slate-800/50' : 'bg-white/80 border-slate-200'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-x-4 gap-y-2 flex-wrap min-h-[5rem] py-2">
          {/* Title */}
          <Link to="/" className="group shrink-0">
            <span className={`font-display font-bold text-xl sm:text-2xl transition-colors ${
              isDark ? 'text-white group-hover:text-accent-400' : 'text-slate-900 group-hover:text-accent-600'
            }`}>
              CatBench Leaderboard
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center flex-wrap justify-end gap-x-4 gap-y-2">
            <span className={`text-base hidden lg:inline whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              120+ Catalysis Hub datasets →
            </span>
            <Link
              to="/datasets"
              className={`transition-colors text-base font-medium flex items-center gap-2 px-4 py-2 rounded-lg ${
                isDark
                  ? 'text-white bg-accent-600 hover:bg-accent-500'
                  : 'text-white bg-accent-600 hover:bg-accent-500'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="hidden sm:inline">Browse All</span>
            </Link>
            <Link
              to="/docs"
              className={`transition-colors text-base font-medium flex items-center gap-2 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="hidden sm:inline">Docs</span>
            </Link>
            <a
              href="https://www.cell.com/cell-reports-physical-science/fulltext/S2666-3864(25)00567-3"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors text-base font-medium flex items-center gap-2 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">Paper</span>
            </a>
            <a
              href="https://github.com/JinukMoon/CatBench"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors text-base font-medium flex items-center gap-2 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Github className="w-5 h-5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-lg transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
