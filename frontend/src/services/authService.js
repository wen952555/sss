// frontend_react/src/services/authService.js

// 模拟数据库存储用户数据
// 在真实应用中，这将由后端API和数据库处理
const mockUserDatabase = [];
// 模拟积分数据 { userId: points }
const mockUserPoints = {};
// 模拟活动token存储 { token: userId }
const mockActiveTokens = {};

let nextUserIdCounter = 1000; // 用于生成4位ID (1000-9999)

const generateUniqueId = () => {
  // 在真实应用中，需要确保ID的唯一性并处理冲突
  if (nextUserIdCounter > 9999) nextUserIdCounter = 1000; // 仅为演示重置
  return nextUserIdCounter++;
};

const generateToken = () => {
  // 生成一个简单的唯一token
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
};

// 模拟API请求延迟
const simulateDelay = (ms = 300 + Math.random() * 400) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  register: async ({ phone, password }) => {
    await simulateDelay();
    if (!phone || !password) {
        throw new Error("手机号和密码不能为空");
    }
    if (mockUserDatabase.find(user => user.phone === phone)) {
      throw new Error("此手机号已被注册");
    }
    const id = generateUniqueId();
    // 在真实应用中，密码应该被哈希存储
    const newUser = { phone, password, id: id.toString() }; //确保ID是字符串
    mockUserDatabase.push(newUser);
    mockUserPoints[id.toString()] = 100; // 初始积分100
    
    console.log("Mock DB (Register):", JSON.stringify(mockUserDatabase), JSON.stringify(mockUserPoints));

    // 注册后自动登录
    const token = generateToken();
    mockActiveTokens[token] = id.toString();
    return { user: { phone, id: id.toString(), points: mockUserPoints[id.toString()] }, token };
  },

  login: async ({ phone, password }) => {
    await simulateDelay();
    if (!phone || !password) {
        throw new Error("手机号和密码不能为空");
    }
    const user = mockUserDatabase.find(u => u.phone === phone && u.password === password);
    if (!user) {
      throw new Error("手机号或密码错误");
    }
    const token = generateToken();
    mockActiveTokens[token] = user.id; // user.id 已经是字符串
    
    console.log("Mock DB (Login): User found -", user, "Points -", mockUserPoints[user.id]);
    return { user: { phone: user.phone, id: user.id, points: mockUserPoints[user.id] || 0 }, token };
  },

  logout: async (token) => {
    await simulateDelay();
    if (mockActiveTokens[token]) {
      delete mockActiveTokens[token];
      console.log("Mock DB (Logout): Token invalidated for user", mockActiveTokens[token]);
      return { success: true, message: "成功退出登录" };
    }
    // return { success: false, message: "无效的会话或已退出" }; // 如果token不存在也算成功退出
    return { success: true, message: "已退出登录（或会话无效）" };
  },

  getUserProfile: async (token) => {
    await simulateDelay();
    const userId = mockActiveTokens[token];
    if (!userId) {
      throw new Error("未授权或会话已过期，请重新登录");
    }
    const user = mockUserDatabase.find(u => u.id === userId);
    if (!user) {
      // This case should ideally not happen if token maps to a valid user
      delete mockActiveTokens[token]; // Clean up bad token
      throw new Error("用户信息查找失败，请重新登录");
    }
    return { phone: user.phone, id: user.id, points: mockUserPoints[user.id] || 0 };
  },

  transferPoints: async ({ fromUserId, toPhone, toId, amount, token }) => {
    await simulateDelay();
    const currentUserId = mockActiveTokens[token];
    // Ensure fromUserId from payload matches the user associated with the token
    if (currentUserId !== fromUserId.toString()) { 
        console.error("Auth Error: Token user ID does not match fromUserId", {currentUserId, fromUserId});
        throw new Error("操作未授权或会话错误");
    }

    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error("赠送积分数量必须是正整数");
    }
    
    const fromUserPoints = mockUserPoints[fromUserId.toString()];
    if (fromUserPoints === undefined || fromUserPoints < numericAmount) {
      throw new Error("您的积分不足");
    }

    const toUserIdStr = toId.toString(); // Ensure toId is string for comparison
    const toUser = mockUserDatabase.find(u => u.phone === toPhone && u.id === toUserIdStr);
    if (!toUser) {
      throw new Error("接收方手机号或ID不匹配，请确认后重试");
    }
    if (toUser.id === fromUserId.toString()) {
        throw new Error("不能给自己赠送积分");
    }

    mockUserPoints[fromUserId.toString()] -= numericAmount;
    mockUserPoints[toUser.id] = (mockUserPoints[toUser.id] || 0) + numericAmount;

    console.log("Mock DB (Transfer): Points updated - ", JSON.stringify(mockUserPoints));
    return { success: true, message: `成功赠送 ${numericAmount} 积分给 ${toUser.phone}`, newFromUserPoints: mockUserPoints[fromUserId.toString()] };
  },

  checkAuthStatus: async (token) => {
    await simulateDelay(100);
    const userId = mockActiveTokens[token];
    if (!userId) return null;
    const user = mockUserDatabase.find(u => u.id === userId);
    if (!user) {
        delete mockActiveTokens[token]; // Clean up invalid token
        return null;
    }
    return { phone: user.phone, id: user.id, points: mockUserPoints[user.id] || 0 };
  }
};
