import axios from 'axios';

// 因为有了 _worker.js，这里直接请求本域名的 /api 即可
const api = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：自动带上 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('game_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginOrRegister = (mobile, password) => 
    api.post('/auth.php?action=login_or_register', { mobile, password });

export const searchUser = (mobile) => 
    api.post('/auth.php?action=search_user', { mobile });

export const transferPoints = (target_id, amount) => 
    api.post('/auth.php?action=transfer', { target_id, amount });

export const joinGame = (level) => 
    api.get(`/lobby.php?action=join_game&level=${level}`);

export const getHand = () => 
    api.get('/game.php?action=get_hand');

export const submitHand = (sessionId, deckId, arranged) => 
    api.post('/game.php?action=submit_hand', { session_id: sessionId, deck_id: deckId, arranged });

export default api;