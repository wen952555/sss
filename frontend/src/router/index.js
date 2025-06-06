import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import GameRoom from '../views/GameRoom.vue';
import { useGameStore } from '../store/game';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/game/:gameId',
    name: 'GameRoom',
    component: GameRoom,
    props: true, // 将路由参数作为 props 传递给组件
    beforeEnter: (to, from, next) => {
      const gameStore = useGameStore();
      // 如果store中没有gameId，但URL中有，尝试从localStorage恢复或引导
      if (!gameStore.gameId && to.params.gameId) {
        const storedGameId = localStorage.getItem('thirteen_gameId');
        const storedPlayerId = localStorage.getItem('thirteen_playerId');
        if (storedGameId === to.params.gameId && storedPlayerId) {
          gameStore.gameId = storedGameId;
          gameStore.playerId = storedPlayerId;
          gameStore.playerName = localStorage.getItem('thirteen_playerName') || '玩家';
        } else {
          // 如果本地存储不匹配，或没有，则可能需要重新加入或提示
          // 为简单起见，这里允许进入，GameRoom会尝试fetchGameState
          // gameStore.gameId = to.params.gameId; // 也可以直接设置，让fetchGameState决定
        }
      }
      // 如果没有gameId，重定向到首页
      if (!gameStore.gameId && !to.params.gameId) {
         next({ name: 'Home' });
      } else {
         next();
      }
    }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Cloudflare Pages 通常 BASE_URL 为 /
  routes,
});

export default router;
