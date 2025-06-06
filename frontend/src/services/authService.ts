import apiClient from './api';
import type { User } from '@/types'; // 假设 User 类型包含token

interface LoginCredentials {
  username_or_email: string;
  password_string: string; // 根据你的后端API调整字段名
}

interface LoginResponse {
  token: string;
  user: User; // 包含用户基本信息
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // 替换为你的后端登录接口
  // const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  // return response.data;
  console.log("Mock login with:", credentials);
  if (credentials.username_or_email === "test" && credentials.password_string === "password") {
    return Promise.resolve({
      token: "fake-jwt-token",
      user: { id: "user1", name: "Test User", email: "test@example.com", hand: [] } // 补充 User 类型
    });
  }
  return Promise.reject({ message: "Invalid credentials (mock)" });
}

export async function register(userData: any): Promise<User> {
  // const response = await apiClient.post<User>('/auth/register', userData);
  // return response.data;
  console.log("Mock register with:", userData);
  return Promise.resolve({ id: "user2", name: userData.username, email: userData.email, hand: [] });
}

export async function logout(): Promise<void> {
  // const response = await apiClient.post('/auth/logout');
  // return response.data;
  console.log("Mock logout");
  return Promise.resolve();
}
