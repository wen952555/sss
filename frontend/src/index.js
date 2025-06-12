import React from 'react';
import ReactDOM from 'react-dom/client'; // 使用新的 React 18 createRoot API
import './index.css'; // 可选的全局 CSS 文件
import App from './App'; // 你的主应用组件
import reportWebVitals from './reportWebVitals'; // 可选的性能监控

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
