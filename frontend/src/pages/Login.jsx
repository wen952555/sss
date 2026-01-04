/* frontend/src/pages/Login.jsx */
const handleRegister = async () => {
    const res = await api.post('/auth/register', { phone, password });
    if (res.short_id) {
        alert(`注册成功！您的系统ID是: ${res.short_id}`);
        localStorage.setItem('token', res.token);
    }
};