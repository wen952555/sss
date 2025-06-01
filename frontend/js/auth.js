// frontend/js/auth.js (配合弹窗版)

document.addEventListener('DOMContentLoaded', () => {
    // 弹窗内的登录按钮
    const modalLoginButton = document.getElementById('modalLoginButton');
    modalLoginButton?.addEventListener('click', async () => {
        const phoneEl = document.getElementById('modalLoginPhone');
        const passwordEl = document.getElementById('modalLoginPassword');
        const errorEl = document.getElementById('modalLoginError');
        if(!phoneEl || !passwordEl || !errorEl) return;

        const phone = phoneEl.value.trim();
        const password = passwordEl.value;
        displayError(errorEl, '');

        if (!phone || !password) { displayError(errorEl, '手机号和密码不能为空。'); return; }

        try {
            showLoading(errorEl, true, '登录中...'); // 使用 ui.js 的 showLoading
            const response = await authAPI.login({ phone_number: phone, password: password });
            showLoading(errorEl, false);

            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('isLoggedIn', 'true');
            updateHeaderUserStatus(response.user); // 更新顶部显示
            // 登录成功后，切换到用户管理视图
            showUserModalView('management');
            // 并且加载用户管理界面的数据
            if (typeof window.loadUserManagementData === 'function') {
                window.loadUserManagementData(response.user);
            }
        } catch (error) {
            showLoading(errorEl, false);
            displayError(errorEl, error.message || '登录失败。');
        }
    });

    // 弹窗内的注册按钮
    const modalRegisterButton = document.getElementById('modalRegisterButton');
    modalRegisterButton?.addEventListener('click', async () => {
        const phoneEl = document.getElementById('modalRegisterPhone');
        const passwordEl = document.getElementById('modalRegisterPassword');
        const confirmPasswordEl = document.getElementById('modalRegisterConfirmPassword');
        const nicknameEl = document.getElementById('modalRegisterNickname');
        const errorEl = document.getElementById('modalRegisterError');
        if(!phoneEl || !passwordEl || !confirmPasswordEl || !nicknameEl || !errorEl) return;

        const phone = phoneEl.value.trim();
        const password = passwordEl.value;
        const confirmPassword = confirmPasswordEl.value;
        const nickname = nicknameEl.value.trim();
        displayError(errorEl, '');

        if (!phone || !password || !nickname) { displayError(errorEl, '所有字段均为必填。'); return; }
        if (password !== confirmPassword) { displayError(errorEl, '两次密码不一致。'); return; }
        // ... (其他验证如密码长度、昵称长度)

        try {
            showLoading(errorEl, true, '注册中...');
            const response = await authAPI.register({ phone_number: phone, password: password, nickname: nickname });
            showLoading(errorEl, false);

            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('isLoggedIn', 'true');
            updateHeaderUserStatus(response.user);
            alert('注册成功！'); // 或更友好的提示
            showUserModalView('management');
            if (typeof window.loadUserManagementData === 'function') {
                window.loadUserManagementData(response.user);
            }
        } catch (error) {
            showLoading(errorEl, false);
            displayError(errorEl, error.message || '注册失败。');
        }
    });

    // 弹窗内的登出按钮 (在 user_profile.js 中处理更合适，或者这里也加一个)
    const modalLogoutButton = document.getElementById('modalLogoutButton');
    modalLogoutButton?.addEventListener('click', async () => {
        try {
            await authAPI.logout();
        } catch (error) { console.warn("Logout API error:", error); }
        finally {
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
            updateHeaderUserStatus(null); // 清除顶部显示
            showUserModalView('login'); // 切换回登录视图
            // (可选) 刷新页面或重置试玩游戏
            if (typeof window.resetAndStartNewTrialGame === 'function') {
                window.resetAndStartNewTrialGame();
            } else {
                // window.location.reload(); // 简单粗暴地刷新
            }
        }
    });
});

// 全局函数，用于从其他JS文件（如 game_manager.js）检查初始登录状态
window.checkInitialAuthStatusAndUpdateUI = async function() {
    try {
        const status = await authAPI.checkStatus();
        if (status.isLoggedIn && status.user) {
            localStorage.setItem('currentUser', JSON.stringify(status.user));
            localStorage.setItem('isLoggedIn', 'true');
            updateHeaderUserStatus(status.user);
            return status.user;
        } else {
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
            updateHeaderUserStatus(null);
            return null;
        }
    } catch (error) {
        console.warn('Check initial auth status failed:', error.message);
        localStorage.removeItem('currentUser');
        localStorage.setItem('isLoggedIn', 'false');
        updateHeaderUserStatus(null);
        return null;
    }
};
