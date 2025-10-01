// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { dealCards } = require('./gameLogic'); // 引入游戏逻辑

const app = express();
// 生产环境的 CORS 精确配置
const corsOptions = {
  origin: 'https://xxx.9525.ip-ddns.com', // 你的前端域名
  methods: ["GET", "POST"]
};
app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions
});

app.get('/', (req, res) => {
  res.send('<h1>十三水后端服务器 v1.0</h1>');
});

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  // 监听 "开始游戏" 事件
  socket.on('start_game', () => {
    console.log(`玩家 ${socket.id} 请求开始新游戏`);
    
    // 发牌
    const hands = dealCards();

    // 这里为了演示，我们只给当前请求的玩家发牌 (player1)
    // 真实游戏中，你需要一个房间系统来给房间里的每个玩家发牌
    socket.emit('deal_hand', hands.player1); 
    console.log(`已向玩家 ${socket.id} 发送手牌`);
  });

  socket.on('disconnect', () => {
    console.log('玩家断开:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});
