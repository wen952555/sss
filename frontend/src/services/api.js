const API_BASE_URL = 'https://9525.ip-ddns.com/api';

export const recognizeCard = async (filename) => {
  try {
    const response = await fetch(`${API_BASE_URL}/recognize_card.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `filename=${encodeURIComponent(filename)}`
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('识别扑克牌出错:', error);
    throw error;
  }
};

// 其他游戏API函数可以在这里添加
