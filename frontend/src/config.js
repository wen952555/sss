// frontend/src/config.js

// 方案1: 如果您直接在 Serv00 上为 9525.ip-ddns.com:14722 配置了 WSS (SSL/TLS)
// const BACKEND_URL = "wss://9525.ip-ddns.com:14722";

// 方案2: 如果您使用了 Cloudflare Tunnel，并且 Tunnel 提供了新的安全 WSS 地址
// 请将下面的 YOUR_CLOUDFLARE_TUNNEL_WSS_URL 替换为您实际的 Tunnel WSS 地址
// 例如: "wss://your-tunnel-name.trycloudflare.com" 或 "wss://api.yourdomain.com"
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "wss://9525.ip-ddns.com:14722"; // <--- 您需要根据实际情况设置这个值

// console.log("Backend URL configured to:", BACKEND_URL);

export { BACKEND_URL };
