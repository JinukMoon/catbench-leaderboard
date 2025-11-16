# CatBench Leaderboard 설정 가이드

## 빠른 시작

### 1. 의존성 설치

```bash
cd 01_react
npm install
```

### 2. 데이터 준비

`00_html` 폴더에서 데이터를 생성하고 복사:

```bash
# 00_html에서 JSON 생성
cd ../00_html
python generate_leaderboard.py

# 01_react로 데이터 복사
cp docs/leaderboard_data.json ../01_react/public/
cp CatBench_logo.png ../01_react/public/
```

### 3. 개발 서버 실행

```bash
cd ../01_react
npm run dev
```

브라우저에서 `http://localhost:5173`을 열면 리더보드를 확인할 수 있습니다.

### 4. 빌드 및 배포

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

## 폴더 구조

```
01_react/
├── public/              # 정적 파일 (자동으로 루트로 복사됨)
│   ├── leaderboard_data.json
│   └── CatBench_logo.png
├── src/                 # 소스 코드 (현재 루트에 있음)
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

## 독립 실행

이 폴더는 완전히 독립적으로 작동합니다:

- ✅ 모든 소스 코드 포함
- ✅ 모든 데이터 파일 포함 (`public/`)
- ✅ 빌드 설정 완료
- ✅ 외부 의존성 없음 (npm install 후)

## 문제 해결

### 데이터가 보이지 않는 경우

1. `public/leaderboard_data.json` 파일이 있는지 확인
2. 브라우저 개발자 도구의 Network 탭에서 파일 로드 확인
3. 파일 크기가 너무 크면 브라우저 메모리 문제일 수 있음

### 빌드 오류

1. Node.js 버전 확인 (v18 이상 권장)
2. `rm -rf node_modules package-lock.json && npm install`

### 로고가 보이지 않는 경우

1. `public/CatBench_logo.png` 파일이 있는지 확인
2. 파일 크기가 8MB 이하인지 확인 (너무 크면 최적화 필요)

