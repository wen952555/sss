// frontend/src/services/api.js
const API_BASE_URL = 'https://9525.ip-ddns.com/backend/api';

export default {
  async request(endpointWithPhp, method = 'GET', data = null) {
    const config = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    let url = `${API_BASE_URL}/${endpointWithPhp}`;

    if (method === 'GET' && data) {
      const params = new URLSearchParams(data);
      url += `?${params}`;
    } else if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      // console.log(`API Request: ${method} ${url}`, data || ''); // 可用于调试
      const response = await fetch(url, config);
      const responseText = await response.text();
      // console.log(`API Response Status: ${response.status} for ${url}`); // 可用于调试
      // console.log(`API Response Text:`, responseText); // 可用于调试

      if (!response.ok) {
        let errorData = { error: `HTTP error! status: ${response.status} - ${response.statusText}` };
        try { errorData = JSON.parse(responseText); }
        catch (e) { errorData.details = responseText; }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      if (responseText === "") return { success: true, message: "Empty OK response"};
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
    return this.request('deal_cards.php', 'GET', { game_id: gameId });
  },

  submitHand(gameId, playerId, hand) {
    return this.request('submit_hand.php', 'POST', { game_id: gameId, player_id: playerId, hand: hand });
  },

  getAiArrangedHand(gameId, playerId, handCardIds) {
    return this.request('ai_arrange_hand.php', 'POST', {
      game_id: gameId,
      player_id: playerId,
      hand_cards: handCardIds
    });
  }
};
