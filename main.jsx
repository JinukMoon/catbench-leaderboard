import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Configure the favicon using the Vite base URL
const favicon = document.getElementById('favicon');
if (favicon) {
  favicon.href = `${import.meta.env.BASE_URL}CatBench_logo.png`;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

