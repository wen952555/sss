const Lobby = {
    // 获取大厅状态与人数
    async updateStatus() {
        const res = await fetch(`${API_URL}?action=get_lobby_status`);
        const data = await res.json();
        
        document.getElementById('count-8pm').innerText = data.counts['8pm'] || 0;
        document.getElementById('count-12pm').innerText = data.counts['12pm'] || 0;

        // 渲染排行榜 (完成场次数)
        const listHtml = data.leaderboard.map(user => `
            <div class="flex justify-between items-center border-b border-slate-700 py-2">
                <span>${user.nickname}</span>
                <span class="bg-yellow-600 px-2 rounded text-sm">${user.completed_count} 场</span>
            </div>
        `).join('');
        document.getElementById('leaderboard').innerHTML = listHtml;
    },

    // 搜索用户
    async searchUser(phone) {
        if (phone.length < 11) return;
        const res = await fetch(`${API_URL}?action=search_user&phone=${phone}`);
        const data = await res.json();
        if (data.nickname) {
            document.getElementById('transfer-target-name').innerText = `目标昵称: ${data.nickname}`;
        } else {
            document.getElementById('transfer-target-name').innerText = `用户不存在`;
        }
    },

    // 赠送积分
    async transfer(toPhone, amount) {
        const user = Auth.getUser();
        if (!user) return alert("请先登录");
        
        const formData = new FormData();
        formData.append('to_phone', toPhone);
        formData.append('amount', amount);
        formData.append('from_uid', user.id);

        const res = await fetch(`${API_URL}?action=transfer`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.code === 200) {
            alert("赠送成功！");
            location.reload();
        } else {
            alert(data.msg || "赠送失败");
        }
    }
};

// 每10秒自动刷新大厅
if (document.getElementById('lobby')) {
    Lobby.updateStatus();
    setInterval(() => Lobby.updateStatus(), 10000);
}