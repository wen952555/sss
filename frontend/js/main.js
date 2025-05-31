// frontend/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // 全局初始化代码
    console.log("十三水前端应用已加载");

    // 简单的基于hash的路由示例 (如果不用多个HTML文件)
    // window.addEventListener('hashchange', handleRouteChange);
    // handleRouteChange(); // 初始加载时处理当前hash

    // 检查初始登录状态 (如果 auth.js 中没有做，或者想在这里统一处理)
    // 如果在 auth.js 中有 checkInitialAuth() 并且只在登录页调用，这里可以不用重复
    // 但如果想做一个全局的路由守卫，这里是合适的地方
    // (async () => {
    //     try {
    //         const status = await authAPI.checkStatus();
    //         const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    //
    //         if (status.isLoggedIn) {
    //             localStorage.setItem('currentUser', JSON.stringify(status.user));
    //             localStorage.setItem('isLoggedIn', 'true');
    //             if (currentPage === 'index.html') {
    //                 window.location.href = 'lobby.html';
    //             }
    //         } else {
    //             localStorage.removeItem('currentUser');
    //             localStorage.setItem('isLoggedIn', 'false');
    //             if (currentPage !== 'index.html' && currentPage !== '') { // '' 表示根路径，也认为是index
    //                 window.location.href = 'index.html';
    //             }
    //         }
    //     } catch (error) {
    //         console.warn('全局检查登录状态失败:', error.message);
    //         localStorage.removeItem('currentUser');
    //         localStorage.setItem('isLoggedIn', 'false');
    //         // 强制跳转到登录页，如果不在登录页
    //         const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    //         if (currentPage !== 'index.html' && currentPage !== '') {
    //             window.location.href = 'index.html';
    //         }
    //     }
    // })();
});

// function handleRouteChange() {
//     const hash = window.location.hash.slice(1); // 移除 '#'
//     // 根据hash加载不同内容或执行不同JS模块的初始化
//     // 例如: if (hash === '/lobby') { initLobbyPage(); }
// }
