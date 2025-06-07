// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // 注意这里是 react-dom/client for React 18+
// import './index.css'; // 如果你有全局的 index.css 样式文件
import App from './App';
// import reportWebVitals from './reportWebVitals'; // 可选

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
