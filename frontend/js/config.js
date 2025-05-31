// frontend/js/config.js
// 重要：确保你的后端API (9525.ip-ddns.com) 已经配置了HTTPS/SSL
const API_BASE_URL = "https://9525.ip-ddns.com/backend/api"; // *** 已修改为 HTTPS ***

const API_ENDPOINTS = {
    auth: `${API_BASE_URL}/auth.php`,
    userProfile: `${API_BASE_URL}/user_profile.php`,
    rooms: `${API_BASE_URL}/rooms.php`,
    game: `${API_BASE_URL}/game.php`,
};

// 卡牌图片路径
const CARD_IMAGE_PATH = 'assets/cards/'; // 根据你的实际前端目录结构调整，如果cards文件夹在根目录，可能是 'cards/'
