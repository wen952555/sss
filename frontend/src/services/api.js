// 后端API的基础URL
const API_BASE_URL = 'https://9525.ip-ddns.com/backend/api'; // 你的Serv00后端 /api 目录的URL

export default {
  async request(endpointWithPhp, method = 'GET', data = null) { // endpoint теперь включает .php
    const config = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // 'X-Requested-With': 'XMLHttpRequest' // 有些PHP框架会检查这个
      },
      credentials: 'include', // 重要：允许发送和接收cookies (PHP session ID)
    };

    let url = `${API_BASE_URL}/${endpointWithPhp}`; // 直接拼接 .php 文件名

    if (method === 'GET' && data) {
      const params = new URLSearchParams(data);
      url += `?${params}`;
    } else if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      console.log(`API Request: ${method} ${url}`, data || '');
      const response = await fetch(url, config);
      const responseText = await response.text(); // 首先获取文本以调试
      console.log(`API Response Status: ${response.status} for ${url}`);
      console.log(`API Response Text:`, responseText);

      if (!response.ok) {
        let errorData = { error: `HTTP error! status: ${response.status} - ${response.statusText}` };
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // 如果响应不是JSON，使用上面的通用错误
          errorData.details = responseText;
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      if (responseText === "") return { success: true, message: "Empty OK response"}; // 处理空响应
      return JSON.parse(responseText);
    } catch (error) {
      console.error(`API request to ${endpointWithPhp} failed:`, error);
      throw error;
    }
  },

  createGame(playerName, numPlayers) {
    return this.request('create_game.php', 'POST', { player_name: playerName, num_players: numPlayers });
  },

  joinGame(gameId, playerName) {
    return this.request('join_game.php', 'POST', { game_id: gameId, player_name: playerName });
  },

  getGameState(gameId) {
    return this.request('get_game_state.php', 'GET', { game_id: gameId });
  },

  dealCards(gameId) {
    // GET请求，因为通常不带body，并且是幂等操作（对特定游戏而言）
    // 后端 deal_cards.php 会从 session 验证权限
    return this.request('deal_cards.php', 'GET', { game_id: gameId });
  },

  submitHand(gameId, playerId, hand) {
    // hand: { front: [card_id,...], middle: [...], back: [...] }
    // 后端 submit_hand.php 会从 session 验证 playerId
    return this.request('submit_hand.php', 'POST', { game_id: gameId, player_id: playerId, hand: hand });
  }
};
