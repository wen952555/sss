const Lobby = {
    init() {
        this.updateStatus();
        setInterval(() => this.updateStatus(), 10000); // 10秒刷新大厅
    },

    async updateStatus() {
        const res = await fetch(`${API_BASE}?action=get_lobby_status`);
        const resData = await res.json();
        if (resData.code === 200) {
            const data = resData.data;
            document.getElementById('count-8pm').innerText = data.counts['8pm'];
            document.getElementById('count-12pm').innerText = data.counts['12pm'];

            const lbHtml = data.leaderboard.map((u, i) => `
                <div class="flex justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span>${i+1}. ${u.nickname}</span>
                    <span class="text-yellow-500 font-bold">${u.completed_count} 场</span>
                </div>
            `).join('');
            document.getElementById('leaderboard').innerHTML = lbHtml || '<p class="text-slate-500">暂无完成记录</p>';
        }
    },

    async searchUser(phone) {
        if (phone.length < 11) return;
        const res = await fetch(`${API_BASE}?action=search_user&phone=${phone}`);
        const data = await res.json();
        if (data.code === 200) {
            document.getElementById('target-name').innerText = `目标昵称: ${data.data.nickname}`;
        } else {
            document.getElementById('target-name').innerText = "未找到该用户";
        }
    },

    async transfer() {
        const phone = document.getElementById('trans-phone').value;
        const amount = document.getElementById('trans-amount').value;
        if (!phone || !amount) return alert("请填写完整转账信息");
        
        // 实际开发中需增加 action=transfer 的 API 处理，此处为示例
        alert(`已提交申请：向 ${phone} 赠送 ${amount} 积分`);
    }
};