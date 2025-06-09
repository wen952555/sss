import React from 'react';
import ReactDOM from 'react-dom/client'; // 使用新的 React 18 createRoot API
import './index.css'; // 可选的全局 CSS 文件
import App from './App'; // 你的主应用组件
import reportWebVitals from './reportWebVitals';
// import { AuthProvider } from './contexts/AuthContext'; // 如果你使用了 AuthContext

// 对于 React 18+
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/*
    // 如果你有全局上下文提供者，可以像这样包裹 App 组件
    <AuthProvider>
      <App />
    </AuthProvider>
    */}
    <App /> {/* 简化版，先确保 App 能渲染 */}
  </React.StrictMode>
);

// 如果你想让你的应用离线工作并且加载更快，你可以将 unregister() 改为 register()。
// 注意这会带来一些问题。学习更多关于 service workers: https://cra.link/PWA
// serviceWorkerRegistration.unregister(); // CRA 默认包含 service worker 功能，可以按需启用

// 如果你想开始在你的应用中测量性能，传递一个函数
// 来记录结果 (例如: reportWebVitals(console.log))
// 或者发送到一个分析端点。学习更多: https://bit.ly/CRA-vitals
reportWebVitals();
