# 개발 서버 사용 가이드

## 로컬 개발 (같은 컴퓨터에서)

### 1. 개발 서버 실행

```bash
cd 01_react
npm install  # 처음 한 번만
npm run dev
```

### 2. 브라우저에서 접근

터미널에 다음과 같은 메시지가 표시됩니다:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**로컬 브라우저에서 `http://localhost:5173`을 열면 됩니다!**

## 원격 서버에서 개발하는 경우

### 방법 1: SSH 포트 포워딩 (권장)

SSH로 서버에 접속할 때 포트 포워딩:

```bash
# SSH 접속 시 포트 포워딩 추가
ssh -L 5173:localhost:5173 user@your-server

# 그 다음 서버에서
cd 01_react
npm run dev
```

이렇게 하면 로컬 브라우저에서 `http://localhost:5173`으로 접근 가능합니다.

### 방법 2: 네트워크 접근 허용

Vite 설정을 변경하여 네트워크에서 접근 가능하게:

```bash
# vite.config.js에 host 추가하거나
npm run dev -- --host
```

또는 `vite.config.js` 수정:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 모든 네트워크 인터페이스에서 접근 허용
    port: 5173
  },
  // ...
})
```

그러면 터미널에 표시된 Network 주소로 접근할 수 있습니다.

## 핫 리로드 (Hot Module Replacement)

개발 서버 실행 중:
- ✅ 코드 수정 시 자동으로 브라우저 새로고침
- ✅ 상태 유지 (React 컴포넌트 상태 보존)
- ✅ 빠른 반영 속도

## 개발 서버 중지

터미널에서 `Ctrl + C`를 누르면 서버가 중지됩니다.

## 포트 변경

다른 포트를 사용하고 싶다면:

```bash
npm run dev -- --port 3000
```

또는 `vite.config.js`에 추가:

```js
server: {
  port: 3000
}
```

