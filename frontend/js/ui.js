// frontend/js/ui.js (添加或修改)

// ... (之前的 displayError, showMessage, createCardElement, clearElement, showLoading, set/get/clearTempState 不变) ...

const userModal = document.getElementById('userModal');
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const userManagementSection = document.getElementById('userManagementSection');
const closeUserModalButton = document.getElementById('closeUserModal');
const showModalRegisterLink = document.getElementById('showModalRegisterLink');
const showModalLoginLink = document.getElementById('showModalLoginLink');
const loggedInUserDisplay = document.getElementById('loggedInUserDisplay'); // 顶部用户信息
const userNicknameDisplay = document.getElementById('userNicknameDisplay');
const userPointsDisplay = document.getElementById('userPointsDisplay');


function openUserModal(view = 'login') { // view: 'login', 'register', 'management'
    if (!userModal) return;
    userModal.style.display = 'block';
    showUserModalView(view);
}

function closeUserModal() {
    if (!userModal) return;
    userModal.style.display = 'none';
    // 清理弹窗内的错误消息
    displayError('modalLoginError', '');
    displayError('modalRegisterError', '');
    showMessage(document.getElementById('giftMessage'), '', 'info');
    document.getElementById('recipientInfo').style.display = 'none';
}

function showUserModalView(viewToShow) {
    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'none';
    if (userManagementSection) userManagementSection.style.display = 'none';

    if (viewToShow === 'login' && loginSection) loginSection.style.display = 'block';
    else if (viewToShow === 'register' && registerSection) registerSection.style.display = 'block';
    else if (viewToShow === 'management' && userManagementSection) userManagementSection.style.display = 'block';
}

// 更新顶部登录用户状态的显示
function updateHeaderUserStatus(userData) {
    if (loggedInUserDisplay && userNicknameDisplay && userPointsDisplay) {
        if (userData && userData.id) {
            userNicknameDisplay.textContent = userData.nickname;
            userPointsDisplay.textContent = userData.points;
            loggedInUserDisplay.style.display = 'inline'; // 或 'block'
        } else {
            loggedInUserDisplay.style.display = 'none';
        }
    }
}


// 事件监听 (可以在各自的JS文件中添加，或者在ui.js集中管理部分通用modal交互)
closeUserModalButton?.addEventListener('click', closeUserModal);
showModalRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); showUserModalView('register'); });
showModalLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showUserModalView('login'); });

// 点击弹窗外部关闭
window.addEventListener('click', (event) => {
    if (event.target == userModal) {
        closeUserModal();
    }
});
