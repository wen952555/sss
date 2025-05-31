// 使用环境变量配置API地址
const API_BASE_URL = process.env.REACT_APP_API_BASE || 'https://9525.ip-ddns.com/api';

export const recognizeCard = async (filename) => {
  try {
    const formData = new FormData();
    formData.append('filename', filename);

    const response = await fetch(`${API_BASE_URL}/recognize_card.php`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('识别扑克牌出错:', error);
    return {
      success: false,
      message: '网络请求失败: ' + error.message
    };
  }
};
