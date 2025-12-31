import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://wen76674.serv00.net/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//统一处理响应
const handleResponse = (response) => {
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.error || '请求失败');
    }
  };
  
  const handleError = (error) => {
    const message = error.response?.data?.error || error.message || '网络错误，请稍后再试';
    return { success: false, error: message };
  };


export const authAPI = {
    login: async (phone, password) => {
        try {
          const response = await api.post('/auth/login', { phone, password });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      register: async (phone, password) => {
        try {
          const response = await api.post('/auth/register', { phone, password });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
};

export const userAPI = {
    getProfile: async () => {
        try {
          const response = await api.get('/user/profile');
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      searchByPhone: async (phone) => {
        try {
          const response = await api.get(`/user/search?phone=${phone}`);
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      transferPoints: async (recipient_id, amount) => {
        try {
          const response = await api.post('/user/transfer', { recipient_id, amount });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
};

export const gameAPI = {
    createRoom: async (max_players, bet_amount) => {
        try {
          const response = await api.post('/game/create_room', { max_players, bet_amount });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      joinRoom: async (room_id) => {
        try {
          const response = await api.post('/game/join_room', { room_id });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      leaveRoom: async () => {
        try {
          const response = await api.post('/game/leave_room');
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      startGame: async (room_id) => {
        try {
          const response = await api.post('/game/start_game', { room_id });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      submitCards: async (game_id, cards) => {
        try {
          const response = await api.post('/game/submit_cards', { game_id, cards });
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
};

export const adminAPI = {
    getAllUsers: async () => {
        try {
          const response = await api.get('/admin/users');
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      updateUser: async (user_id, updates) => {
        try {
          const response = await api.put(`/admin/user/${user_id}`, updates);
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
      
      deleteUser: async (user_id) => {
        try {
          const response = await api.delete(`/admin/user/${user_id}`);
          return handleResponse(response);
        } catch (error) {
          return handleError(error);
        }
      },
};