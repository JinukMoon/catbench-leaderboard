# Development Server Guide

## Local development (same machine)

### 1. Start the dev server

```bash
cd 01_react
npm install  # run once
npm run dev
```

### 2. Open the browser

Your terminal should show something similar to:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in your browser to see the app.

## Developing on a remote server

### Option 1: SSH port forwarding (recommended)

Forward the dev-server port when connecting:

```bash
# forward port 5173 during SSH login
ssh -L 5173:localhost:5173 user@your-server

# then on the server
cd 01_react
npm run dev
```

You can now visit `http://localhost:5173` from your local machine.

### Option 2: Expose the dev server on the network

Allow Vite to listen on all interfaces:

```bash
# temporary flag
npm run dev -- --host
```

Or update `vite.config.js`:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // listen on every interface
    port: 5173
  },
  // ...
})
```

After that, use the **Network** URL shown in the terminal.

## Hot Module Replacement

While `npm run dev` is running you get:
- ✅ Automatic reload when code changes
- ✅ Component state preserved across edits
- ✅ Fast feedback loop

## Stop the dev server

Press `Ctrl + C` in the terminal.

## Change the port

Use a different port on demand:

```bash
npm run dev -- --port 3000
```

Or configure it permanently in `vite.config.js`:

```js
server: {
  port: 3000
}
```

