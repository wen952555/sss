// frontend/js/user_profile.js

let mgmtCurrentUser = null; // 在用户管理界面中当前登录的用户信息

document.addEventListener('DOMContentLoaded', () => {
    const findRecipientButton = document.getElementById('findRecipientButton');
    const confirmGiftButton = document.getElementById('confirmGiftButton');
    // 注意：登出按钮的事件监听器已移至 auth.js (modalLogoutButton)，
    // 或者也可以在这里复制一份，但要避免重复绑定。
    // 我们假设 auth.js 中的 modalLogoutButton 处理登出。

    findRecipientButton?.addEventListener('click', handleFindRecipient);
    confirmGiftButton?.addEventListener('click', handleConfirmGift);
});

// 由 auth.js 或 game_manager.js 在用户登录/状态检查后调用
window.loadUserManagementData = function(userData) {
    mgmtCurrentUser = userData;
    if (mgmtCurrentUser && document.getElementById('mgmtUserNickname') && document.getElementById('mgmtUserPoints')) {
        document.getElementById('mgmtUserNickname').textContent = mgmtCurrentUser.nickname;
        document.getElementById('mgmtUserPoints').textContent = mgmtCurrentUser.points;
    }
    // 清理之前的查找结果
    document.getElementById('recipientInfo').style.display = 'none';
    document.getElementById('giftRecipientPhone').value = '';
    document.getElementById('giftAmount').value = '';
    showMessage(document.getElementById('giftMessage'), '', 'info');
};

async function handleFindRecipient() {
    const phoneInput = document.getElementById('giftRecipientPhone');
    const recipientInfoDiv = document.getElementById('recipientInfo');
    const foundRecipientNameEl = document.getElementById('foundRecipientName');
    const giftMessageEl = document.getElementById('giftMessage');

    if (!phoneInput || !recipientInfoDiv || !foundRecipientNameEl || !giftMessageEl) return;
    const phoneToFind = phoneInput.value.trim();
    showMessage(giftMessageEl, '', 'info'); // 清空消息

    if (!phoneToFind) {
        showMessage(giftMessageEl, '请输入要查找的手机号。', 'error');
        return;
    }
    if (phoneToFind === mgmtCurrentUser?.phone_number) {
        showMessage(giftMessageEl, '不能向自己赠送积分。', 'error');
        return;
    }

    try {
        showLoading(giftMessageEl, true, '查找中...');
        const response = await userProfileAPI.findUserByPhone(phoneToFind);
        showLoading(giftMessageEl, false);

        if (response && response.user_found && response.user_found.id) {
            foundRecipientNameEl.textContent = `${response.user_found.nickname} (ID: ${response.user_found.id})`;
            recipientInfoDiv.dataset.recipientId = response.user_found.id; // 存储找到的ID
            recipientInfoDiv.style.display = 'block';
            showMessage(giftMessageEl, `已找到用户 ${response.user_found.nickname}。请输入赠送数量。`, 'success');
        } else {
            const errorMsg = response?.error?.message || '未找到该用户。';
            showMessage(giftMessageEl, errorMsg, 'error');
            recipientInfoDiv.style.display = 'none';
        }
    } catch (error) {
        showLoading(giftMessageEl, false);
        showMessage(giftMessageEl, error.message || '查找用户失败。', 'error');
        recipientInfoDiv.style.display = 'none';
    }
}

async function handleConfirmGift() {
    const recipientInfoDiv = document.getElementById('recipientInfo');
    const amountInput = document.getElementById('giftAmount');
    const giftMessageEl = document.getElementById('giftMessage');

    if (!recipientInfoDiv || !amountInput || !giftMessageEl) return;

    const recipientId = parseInt(recipientInfoDiv.dataset.recipientId);
    const amount = parseInt(amountInput.value);
    showMessage(giftMessageEl, '', 'info');

    if (!recipientId || isNaN(recipientId)) {
        showMessage(giftMessageEl, '请先查找并确认接收用户。', 'error');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showMessage(giftMessageEl, '请输入有效的赠送积分数量。', 'error');
        return;
    }
    if (mgmtCurrentUser && mgmtCurrentUser.points < amount) {
        showMessage(giftMessageEl, '您的积分不足。', 'error');
        return;
    }

    try {
        showLoading(giftMessageEl, true, '正在赠送...');
        const response = await userProfileAPI.giftPoints({
            receiver_id: recipientId,
            amount: amount,
            description: `来自 ${mgmtCurrentUser.nickname} 的赠送` // 可选描述
        });
        showLoading(giftMessageEl, false);

        if (response && response.message) {
            showMessage(giftMessageEl, response.message, 'success');
            // 更新当前用户的积分显示
            if (response.sender_new_points && mgmtCurrentUser) {
                mgmtCurrentUser.points = response.sender_new_points;
                document.getElementById('mgmtUserPoints').textContent = mgmtCurrentUser.points;
                // 同时更新顶部header的积分显示 (如果它也显示积分)
                const topPointsEl = document.getElementById('userPointsDisplay');
                if(topPointsEl) topPointsEl.textContent = mgmtCurrentUser.points;
                // 更新 localStorage 中的 currentUser 数据
                localStorage.setItem('currentUser', JSON.stringify(mgmtCurrentUser));
            }
            // 清理输入
            recipientInfoDiv.style.display = 'none';
            document.getElementById('giftRecipientPhone').value = '';
            amountInput.value = '';
        } else {
            const errorMsg = response?.error?.message || '赠送失败，响应无效。';
            showMessage(giftMessageEl, errorMsg, 'error');
        }
    } catch (error) {
        showLoading(giftMessageEl, false);
        showMessage(giftMessageEl, error.message || '赠送积分时发生错误。', 'error');
    }
}
