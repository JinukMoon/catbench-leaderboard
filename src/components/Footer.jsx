import React from 'react'
import { Github, Mail } from 'lucide-react'

function Footer({ meta, isDark = true }) {
  const lastUpdated = meta?.last_updated
    ? new Date(meta.last_updated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null

  return (
    <footer className={`border-t backdrop-blur-xl ${
      isDark ? 'border-slate-800/50 bg-slate-950/80' : 'border-slate-200 bg-white/80'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* About CatBench Section */}
        <div className={`mb-8 pb-8 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            CatBench: Benchmarking Framework for Machine Learning Interatomic Potentials in Adsorption Energy Predictions for Heterogeneous Catalysis
          </h3>

          <div className={`space-y-6 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <p className="text-lg leading-relaxed">
              CatBench provides a unified framework for evaluating MLIP performance across diverse catalytic systems,
              offering automated data processing, calculation workflows, and comprehensive analysis tools for adsorption energies,
              surface energies, bulk formation energies, and equation of state properties.
            </p>

            <p className="text-lg leading-relaxed">
              If you want to use MLIPs in your catalysis research, CatBench enables you to establish quantitative reliability
              through systematic benchmarking against DFT references.
            </p>

            {/* Citation Section */}
            <div className="mt-8">
              <h4 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Citation</h4>
              <p className={`mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                If you use CatBench in your research, please cite:
              </p>
              <pre className={`text-sm p-4 rounded-lg overflow-x-auto ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
{`@article{catbench2025,
  title={CatBench Framework for Benchmarking Machine Learning
         Interatomic Potentials in Adsorption Energy Predictions
         for Heterogeneous Catalysis},
  author={Moon, Jinuk and Jeon, Uchan and Choung, Seokhyun
          and Han, Jeong Woo},
  journal={Cell Reports Physical Science},
  volume={6},
  pages={102968},
  year={2025},
  doi={10.1016/j.xcrp.2025.102968}
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Original Footer Content */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://github.com/JinukMoon/CatBench"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors inline-flex items-center gap-1.5 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="mailto:jumoon@snu.ac.kr"
              className={`transition-colors inline-flex items-center gap-1.5 ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              jumoon@snu.ac.kr
            </a>
          </div>

          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {lastUpdated && <span>Last updated: {lastUpdated} · </span>}
            © {new Date().getFullYear()} CatBench
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
