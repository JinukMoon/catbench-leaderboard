# CatBench Leaderboard

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Interactive Web Dashboard for CatBench MLIP Benchmarking Results**

CatBench Leaderboard is a React-based web application that provides an interactive, comprehensive view of Machine Learning Interatomic Potential (MLIP) benchmarking results across diverse catalytic systems. The dashboard displays performance metrics, comparative analyses, and detailed breakdowns for each MLIP model and dataset.

## Features

- 📊 **Interactive Leaderboard**: Sortable and filterable rankings of MLIP models
- 📈 **Pareto Frontier Visualization**: Accuracy vs Efficiency and Robustness vs Efficiency plots
- 🔍 **Detailed Dataset Analysis**: Comprehensive performance breakdowns for each dataset
- 📋 **MLIP-Specific Performance**: Detailed adsorbate-level performance metrics
- 🎨 **Modern UI/UX**: Clean, responsive design with intuitive navigation
- 🔗 **Catalysis Hub Integration**: Direct links to original dataset publications

## Live Demo

Visit the live leaderboard: [https://jinukmoon.github.io/catbench-leaderboard/](https://jinukmoon.github.io/catbench-leaderboard/)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for data generation)

### Installation

```bash
# Clone the repository
git clone https://github.com/JinukMoon/catbench-leaderboard.git
cd catbench-leaderboard

# Install dependencies
npm install

# Generate leaderboard data from Excel results
npm run generate-data

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Generate data
npm run generate-data

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
catbench-leaderboard/
├── public/
│   ├── leaderboard_data.json    # Generated benchmark data
│   └── assets/                  # Image assets
├── results/                     # Excel benchmark results
│   └── cathub/                  # Dataset-specific results
├── src/                         # React source files
│   ├── catbench-leaderboard.jsx # Main component
│   └── utils/                   # Utility functions
├── generate_leaderboard.py      # Data generation script
└── vite.config.js              # Vite configuration
```

## Data Generation

The leaderboard data is automatically generated from Excel benchmark results:

```bash
npm run generate-data
```

This script:
1. Reads Excel files from `results/cathub/`
2. Extracts performance metrics for each MLIP and dataset
3. Generates `public/leaderboard_data.json` with structured data
4. Includes detailed adsorbate-specific breakdowns

## Deployment

### GitHub Pages

This project is configured for automatic deployment to GitHub Pages via GitHub Actions.

1. Push code to the `main` branch
2. GitHub Actions will automatically build and deploy
3. Configure GitHub Pages in repository Settings → Pages → Source: `GitHub Actions`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Key Metrics

The leaderboard tracks the following performance metrics:

- **MAE_total (eV)**: Mean Absolute Error for all calculations
- **MAE_normal (eV)**: Mean Absolute Error for normal (non-anomalous) calculations
- **Normal Rate (%)**: Percentage of calculations classified as normal
- **ADwT (%)**: Average Distance with Threshold
- **Time per Step (s)**: Computational efficiency metric

## Related Projects

- [CatBench Framework](https://github.com/JinukMoon/CatBench): The core benchmarking framework

## License

MIT License - see LICENSE file for details

## Citation

If you use CatBench Leaderboard in your research, please cite:

```bibtex
@software{catbench_leaderboard,
  title = {CatBench Leaderboard: Interactive MLIP Benchmarking Dashboard},
  author = {Moon, Jinuk},
  year = {2025},
  url = {https://github.com/JinukMoon/catbench-leaderboard}
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For questions or issues, please open an issue on [GitHub](https://github.com/JinukMoon/catbench-leaderboard/issues).
