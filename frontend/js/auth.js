const API_BASE = "https://wen76674.serv00.net/api.php";
let isLoginMode = true;

// 切换登录/注册 UI
function switchAuth() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? '欢迎回归' : '账号注册';
    document.getElementById('auth-nick').classList.toggle('hidden', isLoginMode);
    document.getElementById('btn-primary').innerText = isLoginMode ? '立即登录' : '立即注册';
    document.getElementById('auth-switch-text').innerText = isLoginMode ? '没有账号？' : '已有账号？';
}

// 统一处理按钮点击
async function handleAuth() {
    const phone = document.getElementById('auth-phone').value;
    const pass = document.getElementById('auth-pass').value;
    const nick = document.getElementById('auth-nick').value;

    if (!phone || !pass) return alert("请填写手机号和密码");

    const fd = new FormData();
    fd.append('phone', phone);
    fd.append('password', pass);
    if (!isLoginMode) fd.append('nickname', nick);

    const action = isLoginMode ? 'login' : 'register';
    try {
        const res = await fetch(`${API_BASE}?action=${action}`, { method: 'POST', body: fd });
        const resData = await res.json();
        
        if (resData.code === 200) {
            if (isLoginMode) {
                localStorage.setItem('game_user', JSON.stringify(resData.data));
                checkLogin();
            } else {
                alert("注册成功，请登录");
                switchAuth();
            }
        } else {
            alert(resData.msg);
        }
    } catch (e) {
        alert("网络错误，请稍后再试");
    }
}

// 检查登录状态并切换 Section
function checkLogin() {
    const user = JSON.parse(localStorage.getItem('game_user'));
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('lobby-section').classList.remove('hidden');
        document.getElementById('welcome-msg').innerText = `玩家：${user.nickname} | 积分：${user.points}`;
        Lobby.init();
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('lobby-section').classList.add('hidden');
    }
}

const Auth = {
    logout: () => {
        localStorage.removeItem('game_user');
        location.reload();
    }
}

window.onload = checkLogin;