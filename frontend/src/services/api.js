// frontend/src/services/api.js

// 部署时，这个 URL 应该指向你的 Serv00 后端 API 的实际地址
// 例如：'https://your-serv00-username.serv00.net/your-game-folder/api'
// 或者你配置的自定义域名：'https://9525.ip-ddns.com/backend/api'
const API_BASE_URL = 'https://9525.ip-ddns.com/backend/api'; // 请确保这是正确的

export default {
  /**
   * 通用的 API 请求函数
   * @param {string} endpointWithPhp - API 端点，例如 'create_game.php'
   * @param {string} method - HTTP 方法 (GET, POST, etc.)
   * @param {object|null} data - 要发送的数据 (对于 POST 是 body，对于 GET 是查询参数)
   * @returns {Promise<object>} - 解析后的 JSON 响应
   * @throws {Error} - 如果请求失败或响应不 OK
   */
  async request(endpointWithPhp, method = 'GET', data = null) {
    const config = {
      method: method,
      headers: {
        // 'Content-Type': 'application/json' // 对于 GET 请求，Content-Type 通常不设置或由浏览器自动处理
                                             // 对于 POST，如果发送 JSON，则需要它
      },
      credentials: 'include', // 允许发送和接收 cookies (PHP session ID)
    };

    let url = `${API_BASE_URL}/${endpointWithPhp}`;

    if (method === 'POST' || method === 'PUT') {
        config.headers['Content-Type'] = 'application/json'; // 确保 POST/PUT 有正确的 Content-Type
        if (data) {
            config.body = JSON.stringify(data);
        }
    } else if (method === 'GET' && data) {
      // 对于 GET 请求，将数据作为查询参数附加到 URL
      const params = new URLSearchParams(data);
      url += `?${params}`;
    }


    try {
      // console.log(`API Request: ${method} ${url}`, data || ''); // 调试时取消注释
      const response = await fetch(url, config);
      const responseText = await response.text(); // 先获取文本以防JSON解析错误
      // console.log(`API Response Status: ${response.status} for ${url}`); // 调试时取消注释
      // console.log(`API Response Text Preview:`, responseText.substring(0, 200)); // 调试时取消注释

      if (!response.ok) {
        let errorData = { error: `请求失败，状态码: ${response.status} (${response.statusText})` };
        try {
          // 尝试解析错误响应体（如果它是JSON）
          const parsedError = JSON.parse(responseText);
          if (parsedError && parsedError.error) {
            errorData.error = parsedError.error; // 使用后端提供的错误信息
          }
        } catch (e) {
          // 如果响应不是JSON或解析失败，保留原始HTTP错误，并将响应文本作为详情
          errorData.details = responseText || "服务器没有返回详细错误信息。";
        }
        // console.error('API Error Data:', errorData);
        throw new Error(errorData.error); // 抛出错误，由调用方 catch
      }

      // 处理空响应体的情况 (例如 HTTP 204 No Content)
      if (responseText.trim() === "") {
        // 对于某些成功的操作（如某些PUT或DELETE），服务器可能不返回内容
        // Cloudflare Pages 可能在某些情况下返回空响应但状态是200
        if (response.status === 200 || response.status === 204) {
             return { success: true, message: "操作成功，无返回内容。" };
        }
      }
      
      // 尝试解析JSON响应
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse API JSON response:", responseText, e);
        throw new Error("服务器响应格式错误，无法解析。");
      }

    } catch (error) {
      // console.error(`API request to ${endpointWithPhp} encountered an error:`, error);
      // 将错误向上抛出，以便 store 或组件可以处理
      // 确保抛出的是 Error 对象
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(String(error || "未知网络错误"));
      }
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
    // deal_cards.php 在后端通过 session 验证权限，不需要显式传递 playerId
    return this.request('deal_cards.php', 'GET', { game_id: gameId });
  },

  submitHand(gameId, playerId, hand) {
    // hand: { front: [card_id,...], middle: [...], back: [...] }
    return this.request('submit_hand.php', 'POST', { game_id: gameId, player_id: playerId, hand: hand });
  },

  getAiArrangedHand(gameId, playerId, handCardIds) {
    // handCardIds 是一个包含13个卡牌ID的数组
    return this.request('ai_arrange_hand.php', 'POST', {
      game_id: gameId,
      player_id: playerId,
      hand_cards: handCardIds
    });
  }
};
