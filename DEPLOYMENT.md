# GitHub Pages 배포 가이드

이 문서는 CatBench Leaderboard를 GitHub Pages에 배포하는 방법을 설명합니다.

## 사전 준비

1. GitHub 저장소 생성 (또는 기존 저장소 사용)
2. 프로젝트를 GitHub에 push

## 배포 절차

### 1. GitHub 저장소 설정

1. GitHub 저장소로 이동
2. **Settings** → **Pages** 메뉴로 이동
3. **Source** 섹션에서:
   - **Source**: `GitHub Actions` 선택
4. 저장

### 2. Base 경로 설정

`vite.config.js`에서 base 경로를 저장소 이름에 맞게 설정하세요:

- **커스텀 도메인 사용** (예: `catbench.org`): `base: '/'`
- **저장소 이름이 `catbench-leaderboard`인 경우**: `base: '/catbench-leaderboard/'`
- **저장소 이름이 `username.github.io`인 경우**: `base: '/'`

현재 설정은 환경 변수 `VITE_BASE_PATH`로 오버라이드할 수 있으며, GitHub Actions 워크플로우에서 자동으로 설정됩니다.

### 3. 자동 배포

다음과 같은 경우 자동으로 배포가 시작됩니다:

- `main` 브랜치에 push할 때
- GitHub Actions 탭에서 수동으로 워크플로우 실행

### 4. 배포 확인

1. GitHub 저장소의 **Actions** 탭에서 배포 상태 확인
2. 배포 완료 후 **Settings** → **Pages**에서 사이트 URL 확인
3. 일반적으로 URL 형식:
   - `https://username.github.io/repository-name/`
   - 또는 커스텀 도메인: `https://catbench.org/`

## 커스텀 도메인 설정 (선택사항)

### 1. DNS 설정

도메인 제공업체에서 다음 DNS 레코드 추가:

- **A 레코드**: GitHub Pages IP 주소
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- 또는 **CNAME 레코드**: `username.github.io`

### 2. GitHub 저장소 설정

1. 저장소 **Settings** → **Pages**로 이동
2. **Custom domain** 섹션에 도메인 입력 (예: `catbench.org`)
3. **Enforce HTTPS** 체크 (권장)

### 3. CNAME 파일 생성 (자동 생성됨)

GitHub가 자동으로 `public/CNAME` 파일을 생성하지만, 수동으로 생성하려면:

```bash
echo "catbench.org" > public/CNAME
```

## 로컬 테스트

배포 전 로컬에서 빌드 테스트:

```bash
# 데이터 생성
npm run generate-data

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 문제 해결

### 빌드 실패

- GitHub Actions 로그 확인
- `npm run generate-data`가 로컬에서 정상 작동하는지 확인
- Python 버전 확인 (Python 3.8+ 필요)

### 404 에러

- `vite.config.js`의 `base` 경로가 올바른지 확인
- 저장소 이름과 base 경로가 일치하는지 확인

### 자산(이미지 등)이 로드되지 않음

- `public/` 폴더의 파일들이 올바른 경로에 있는지 확인
- 이미지 경로가 상대 경로로 시작하는지 확인 (`/assets/...` 형식)

## 수동 배포 (GitHub Actions 없이)

GitHub Actions를 사용하지 않고 수동으로 배포하려면:

```bash
# 1. 데이터 생성
npm run generate-data

# 2. 빌드
npm run build

# 3. gh-pages 브랜치에 배포 (gh-pages 패키지 필요)
npm install -g gh-pages
gh-pages -d dist
```

## 추가 리소스

- [GitHub Pages 공식 문서](https://docs.github.com/en/pages)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html#github-pages)

