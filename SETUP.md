# CatBench Leaderboard Setup Guide

## Quick start

### 1. Install dependencies

```bash
cd 01_react
npm install
```

### 2. Prepare the data

Generate the JSON inside the `00_html` directory and copy it into `public/`:

```bash
# generate the JSON
cd ../00_html
python generate_leaderboard.py

# copy artifacts into the React app
cp docs/leaderboard_data.json ../01_react/public/
cp CatBench_logo.png ../01_react/public/
```

### 3. Run the dev server

```bash
cd ../01_react
npm run dev
```

Open `http://localhost:5173` to see the leaderboard.

### 4. Build for production

```bash
npm run build
```

The optimized assets land in `dist/`.

## Directory layout

```
01_react/
├── public/              # static assets copied to the root of the build
│   ├── leaderboard_data.json
│   └── CatBench_logo.png
├── src/                 # (kept at the repo root for now)
│   ├── App.jsx
│   ├── catbench-leaderboard.jsx
│   ├── main.jsx
│   ├── index.css
│   └── utils/
│       └── dataTransform.js
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Self-contained folder

Everything you need lives inside this directory:

- ✅ All source files
- ✅ Generated data under `public/`
- ✅ Build configuration
- ✅ No extra system dependencies after `npm install`

## Troubleshooting

### Data not showing up

1. Ensure `public/leaderboard_data.json` exists.
2. Check the browser Network tab to confirm the JSON is fetched.
3. If the file is extremely large, your browser may hit memory limits.

### Build errors

1. Use Node.js v18 or newer.
2. Reinstall modules: `rm -rf node_modules package-lock.json && npm install`.

### Logo missing

1. Verify `public/CatBench_logo.png` is present.
2. Keep the image under ~8 MB; compress if necessary.

