import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/Home.vue'; // 确保 Home.vue 被命名为 HomeView 或你实际的文件名
import GameRoomView from '../views/GameRoom.vue'; // 确保 GameRoom.vue 被命名为 GameRoomView 或你实际的文件名
import { useGameStore } from '../store/game';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    // 路由守卫：如果用户已在游戏中，直接尝试跳转到游戏房间
    beforeEnter: (to, from, next) => {
      const gameStore = useGameStore();
      if (gameStore.gameId && gameStore.playerId) {
        // 检查 gameState 是否存在，如果不存在，GameRoom 会尝试 fetch
        // 这里只是基于 gameId 和 playerId 判断是否“可能”在一个游戏中
        // next({ name: 'GameRoom', params: { gameId: gameStore.gameId }, replace: true });
        // 更好的做法是让 GameRoom 自己去处理恢复逻辑，这里只放行
        next();
      } else {
        next();
      }
    }
  },
  {
    path: '/game/:gameId',
    name: 'GameRoom',
    component: GameRoomView,
    props: true, // 将路由参数 :gameId 作为 props 传递给 GameRoomView 组件
    beforeEnter: (to, from, next) => {
      const gameStore = useGameStore();
      const gameIdFromRoute = to.params.gameId;

      if (!gameIdFromRoute) {
        // 如果没有 gameId 参数，重定向到首页
        next({ name: 'Home' });
        return;
      }

      // 如果 store 中没有 gameId，或者与路由中的 gameId 不符，
      // 尝试从 localStorage 恢复或设置。GameRoomView 内部的 onMounted 也会处理。
      if (!gameStore.gameId || gameStore.gameId !== gameIdFromRoute) {
        const storedGameId = localStorage.getItem('thirteen_gameId');
        const storedPlayerId = localStorage.getItem('thirteen_playerId');

        if (storedGameId === gameIdFromRoute && storedPlayerId) {
          gameStore.gameId = storedGameId;
          gameStore.playerId = storedPlayerId;
          gameStore.playerName = localStorage.getItem('thirteen_playerName') || '玩家';
        } else {
          // 如果 localStorage 与路由不符，清理旧的 store 数据，并准备让 GameRoomView 处理
          gameStore.clearGameData(); // 清理可能存在的旧游戏数据
          gameStore.gameId = gameIdFromRoute; // 让 GameRoomView 知道要加载哪个游戏
          // PlayerName 此时可能是默认的，加入游戏时会重新设置
        }
      }
      // 允许进入 GameRoom，GameRoomView 的 onMounted 会负责 fetchGameState 和启动轮询
      next();
    }
  },
  {
    // 捕获所有未匹配的路由，重定向到首页
    path: '/:catchAll(.*)*',
    redirect: { name: 'Home' }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // For Cloudflare Pages, BASE_URL is usually '/'
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 切换路由时，滚动到页面顶部
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// 全局后置守卫，可以用于例如页面标题更新等
router.afterEach((to, from) => {
  const defaultTitle = '十三水在线';
  if (to.name === 'GameRoom' && to.params.gameId) {
    document.title = `房间 ${to.params.gameId.slice(-4)} - ${defaultTitle}`;
  } else if (to.name === 'Home') {
    document.title = `首页 - ${defaultTitle}`;
  } else {
    document.title = defaultTitle;
  }
});

export default router;
