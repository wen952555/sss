// frontend/src/config.js
// 在Serv00部署后端后，端口14722可能是通过某种映射访问的，
// 或者直接就是你的Serv00实例的IP/域名加端口。
// 确保这里的URL是你的浏览器可以访问到的后端Socket.IO服务地址。
// 如果Serv00提供的是如 panel.serv00.com 然后通过端口映射，
// 那么这里的URL可能是 ws://your_serv00_username.serv00.net:YOUR_ASSIGNED_HTTP_PORT
// 但你给出的是 https://9525.ip-ddns.com:14722，这通常意味着你的Serv00实例直接暴露了这个端口
// 并且配置了SSL。如果Serv00的免费计划不直接支持自定义端口的HTTPS，你可能需要用HTTP。
// 假设你的DDNS和端口配置正确，并且后端支持HTTPS或前端通过代理。

// const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "ws://localhost:14722"; // 本地开发用
const BACKEND_URL = "wss://9525.ip-ddns.com:14722"; // 你的后端部署地址 (用 wss 如果后端支持SSL)
// 如果后端没有SSL，用 "ws://9525.ip-ddns.com:14722"

export { BACKEND_URL };
