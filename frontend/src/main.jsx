import React from 'react' // 必须显式导入
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 暴力全局挂载，防止某些环境下 React 找不到
window.React = React;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)