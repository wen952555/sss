// frontend/js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');

    // 表单切换
    showRegisterLink?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        displayError('loginError', ''); displayError('registerError', '');
    });
    showLoginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        displayError('loginError', ''); displayError('registerError', '');
    });

    // 登录逻辑
    const loginButton = document.getElementById('loginButton');
    loginButton?.addEventListener('click', async () => {
        const phone = document.getElementById('loginPhone').value.trim();
        const password = document.getElementById('loginPassword').value;
        displayError('loginError', '');

        if (!phone || !password) {
            displayError('loginError', '手机号和密码不能为空。');
            return;
        }
        try {
            showLoading('loginError'); // 显示加载
            const response = await authAPI.login({ phone_number: phone, password: password });
            // 登录成功，保存用户信息 (例如到localStorage或一个全局状态)
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'lobby.html'; // 跳转到大厅
        } catch (error) {
            displayError('loginError', error.message || '登录失败，请检查您的凭据。');
        } finally {
            // showLoading('loginError', false); // 隐藏加载 (如果加载提示是文本，错误消息会覆盖它)
        }
    });

    // 注册逻辑
    const registerButton = document.getElementById('registerButton');
    registerButton?.addEventListener('click', async () => {
        const phone = document.getElementById('registerPhone').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const nickname = document.getElementById('registerNickname').value.trim();
        displayError('registerError', '');

        if (!phone || !password || !nickname) {
            displayError('registerError', '手机号、密码和昵称不能为空。'); return;
        }
        if (password !== confirmPassword) {
            displayError('registerError', '两次输入的密码不一致。'); return;
        }
        if (password.length < 6) {
            displayError('registerError', '密码长度至少为6位。'); return;
        }
        if (nickname.length < 2 || nickname.length > 15) {
            displayError('registerError', '昵称长度应为2-15个字符。'); return;
        }

        try {
            showLoading('registerError');
            const response = await authAPI.register({
                phone_number: phone,
                password: password,
                nickname: nickname
            });
            // 注册成功，后端通常会自动登录，或者提示用户去登录
            // 这里假设后端注册成功后也返回了用户信息并创建了session
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            localStorage.setItem('isLoggedIn', 'true');
            alert('注册成功！将跳转到游戏大厅。'); // 简单提示
            window.location.href = 'lobby.html';
        } catch (error) {
            displayError('registerError', error.message || '注册失败，请稍后再试。');
        }
    });

    // 页面加载时检查登录状态，如果已登录直接跳转到大厅
    // (这部分逻辑也可以放到 main.js 中做全局路由守卫)
    async function checkInitialAuth() {
        try {
            const status = await authAPI.checkStatus();
            if (status.isLoggedIn) {
                localStorage.setItem('currentUser', JSON.stringify(status.user));
                localStorage.setItem('isLoggedIn', 'true');
                // 如果当前不是 lobby.html，则跳转
                if (!window.location.pathname.endsWith('lobby.html') &&
                    !window.location.pathname.endsWith('room.html') && // 防止在房间页无限重定向
                    !window.location.pathname.endsWith('game.html')) {
                    window.location.href = 'lobby.html';
                }
            } else {
                localStorage.removeItem('currentUser');
                localStorage.setItem('isLoggedIn', 'false');
            }
        } catch (error) {
            console.warn('检查登录状态失败:', error.message);
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
        }
    }
    // 只有在登录页才做这个自动跳转检查，避免在其他页面干扰
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        checkInitialAuth();
    }
});
