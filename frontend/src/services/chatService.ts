import apiClient from './api';

interface ChatMessageData { // 前端发送的消息结构
  roomId: string;
  text: string;
}
interface ReceivedMessage { // 后端返回的消息结构
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string; // ISO Date string
}

export async function sendMessage(data: ChatMessageData): Promise<ReceivedMessage> {
  // const response = await apiClient.post<ReceivedMessage>('/chat/messages', data);
  // return response.data;
  console.log("Mock sending chat message:", data);
  return Promise.resolve({
    id: Date.now().toString(),
    senderId: "currentUser", // 替换为真实ID
    senderName: "Me",
    text: data.text,
    timestamp: new Date().toISOString()
  });
}

export async function fetchMessages(roomId: string, since?: string): Promise<ReceivedMessage[]> {
  // let url = `/chat/rooms/${roomId}/messages`;
  // if (since) {
  //   url += `?since=${since}`; // 用于增量获取
  // }
  // const response = await apiClient.get<ReceivedMessage[]>(url);
  // return response.data;
  console.log("Mock fetching messages for room:", roomId, "since:", since);
  return Promise.resolve([]);
}
