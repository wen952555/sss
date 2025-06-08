const auth = {
  isAuthenticated: () => {
    return localStorage.getItem('token') !== null;
  },
  
  login: (token, userId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  getUserId: () => {
    return localStorage.getItem('userId');
  }
};

export default auth;
