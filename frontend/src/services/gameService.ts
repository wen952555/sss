import axios from 'axios';
import { API_BASE_URL } from '@/config';
import type { GameState, Card } from '@/types'; // 假设后端会返回类似GameState的结构

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 示例：从后端获取初始游戏状态（例如一副洗好的牌）
export async function fetchInitialGameState(): Promise<{deck: Card[]}> { // 简化返回类型
  try {
    // 实际后端接口可能是 /game/new 或 /game/state
    const response = await apiClient.get('/initial-deck.php'); // 指向PHP文件
    return response.data;
  } catch (error) {
    console.error('Error fetching initial game state:', error);
    // 实际应用中应有更完善的错误处理
    // 此处返回一个本地生成的牌堆作为降级方案
    console.warn('Falling back to local deck generation.');
    const { createDeck, shuffleDeck } = await import('@/utils/cardUtils');
    return { deck: shuffleDeck(createDeck()) };
  }
}

// 示例：提交理好的牌 (占位)
export async function submitArrangedHand(playerId: string, hand: Card[][]): Promise<any> {
  // const response = await apiClient.post(`/game/player/${playerId}/arrange`, { hand });
  // return response.data;
  console.log('Submitting hand for player', playerId, hand);
  return Promise.resolve({ success: true, message: "Hand submitted (mock)" });
}
