// frontend/config.js
const CONFIG = {
    // 将 API_BASE_URL 修改为你的后端域名
    API_BASE_URL: 'https://9526.ip-ddns.com/backend/api', // 假设你的PHP API文件在 backend/api/ 目录下
                                                        // 如果你的serv00部署路径不同，请相应调整
                                                        // 例如，如果PHP文件直接在 https://9526.ip-ddns.com/ 下的某个文件夹，
                                                        // 比如叫 thirteen_php，那就是 'https://9526.ip-ddns.com/thirteen_php'
    CARD_IMAGE_PATH: './assets/images/' // 这个通常不需要改，确认图片在 frontend/assets/images/ 下即可
};
