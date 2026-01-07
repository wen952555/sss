const API_URL = "https://wen76674.serv00.net/api.php";

const Auth = {
    // 注册
    async register(phone, nickname, password) {
        if (password.length !== 6) return alert("密码必须是6位");
        const formData = new FormData();
        formData.append('phone', phone);
        formData.append('nickname', nickname);
        formData.append('password', password);

        const res = await fetch(`${API_URL}?action=register`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.code === 200) {
            alert("注册成功，请登录");
            location.reload();
        } else {
            alert(data.msg || "注册失败");
        }
    },

    // 登录
    async login(phone, password) {
        const formData = new FormData();
        formData.append('phone', phone);
        formData.append('password', password);

        const res = await fetch(`${API_URL}?action=login`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.code === 200) {
            localStorage.setItem('user', JSON.stringify(data.user));
            location.href = 'index.html';
        } else {
            alert("手机号或密码错误");
        }
    },

    getUser() {
        return JSON.parse(localStorage.getItem('user'));
    },

    logout() {
        localStorage.removeItem('user');
        location.href = 'index.html';
    }
};