import React from 'react';
import ReactDOM from 'react-dom/client'; // 注意这里是 'react-dom/client'
import './index.css'; // 全局样式
import App from './App'; // 你的主应用组件
import reportWebVitals from './reportWebVitals';

// 获取 public/index.html 中的根 DOM 元素
const rootElement = document.getElementById('root');

// 使用 createRoot API (React 18+)
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
