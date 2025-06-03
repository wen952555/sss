import React from 'react';
import ReactDOM from 'react-dom/client'; // 适用于 React 18+
// 如果你使用的是 React 17 或更早版本，请使用:
// import ReactDOM from 'react-dom';
import './index.css'; // 全局 CSS 文件 (可选)
import App from './App'; // 你的主应用组件
import reportWebVitals from './reportWebVitals'; // 用于性能监测 (可选)

// React 18+ 的方式
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 如果你使用的是 React 17 或更早版本，请取消注释以下代码并注释掉上面的 React 18+ 代码：
/*
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
*/

// 如果你想开始测量应用的性能，可以传递一个函数
// 来记录结果 (例如: reportWebVitals(console.log))
// 或者发送到一个分析端点。了解更多: https://bit.ly/CRA-vitals
reportWebVitals();
