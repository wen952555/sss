// 后端API的基础URL
// 在部署到 Cloudflare Pages 时，这个域名应该是你 Serv00 后端的实际域名
// 在部署到 Serv00 时，这个域名应该是你 Serv00 后端的实际域名
const API_BASE_URL = 'https://9525.ip-ddns.com/api'; // 你的Serv00后端域名

export default {
  async request(endpoint, method = 'GET', data = null) {
    const config = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 重要：允许发送和接收cookies (PHP session ID)
    };

    let url = `${API_BASE_URL}/${endpoint}`;

    if (method === 'GET' && data) {
      const params = new URLSearchParams(data);
      url += `?${params}`;
    } else if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error structure' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error);
      throw error; // Re-throw to be caught by the caller
    }
  },

  createGame(playerName, numPlayers) {
    return this.request('create_game', 'POST', { player_name: playerName, num_players: numPlayers });
  },

  joinGame(gameId, playerName) {
    return this.request('join_game', 'POST', { game_id: gameId, player_name: playerName });
  },

  getGameState(gameId) {
    return this.request('get_game_state', 'GET', { game_id: gameId });
  },

  dealCards(gameId) {
    // GET请求，因为通常不带body，并且是幂等操作（对特定游戏而言）
    return this.request('deal_cards', 'GET', { game_id: gameId });
  },

  submitHand(gameId, playerId, hand) {
    // hand: { front: [card_id,...], middle: [...], back: [...] }
    return this.request('submit_hand', 'POST', { game_id: gameId, player_id: playerId, hand: hand });
  }
};
